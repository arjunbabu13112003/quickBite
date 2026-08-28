import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let resolvedBaseUrl: string | null = null;

const getDefaultApiBaseUrl = (): string => {
  let hostname: string | null = null;

  // Try to get hostname from Expo config extra.backendIp (dynamic host IP injected at build/bundling time)
  const backendIp = Constants.expoConfig?.extra?.backendIp || (Constants.manifest as any)?.extra?.backendIp;
  if (backendIp && backendIp !== 'localhost' && backendIp !== '127.0.0.1') {
    hostname = backendIp;
  }

  // Fallback: Parse hostname from React Native NativeModules scriptURL
  if (!hostname) {
    try {
      let scriptURL = NativeModules.SourceCode?.scriptURL;
      if (!scriptURL && NativeModules.SourceCode?.getConstants) {
        scriptURL = NativeModules.SourceCode.getConstants()?.scriptURL;
      }
      if (scriptURL) {
        const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
        if (match && match[1]) {
          const ip = match[1];
          if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            hostname = ip;
          }
        }
      }
    } catch (e) {
      console.warn('[API Resolver] Failed to parse scriptURL:', e);
    }
  }

  // Fallback: Expo experienceUrl
  if (!hostname && (Constants as any).experienceUrl) {
    try {
      const match = (Constants as any).experienceUrl.match(/^[a-z]+:\/\/([^:/]+)/);
      if (match && match[1]) {
        const ip = match[1];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          hostname = ip;
        }
      }
    } catch (e) {}
  }

  // Fallback: Expo config hostUri / debuggerHost
  if (!hostname) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri || (Constants.manifest as any)?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        hostname = ip;
      }
    }
  }

  let url: string;
  if (hostname) {
    url = `http://${hostname}:5000`;
    return url;
  }

  // Last resort: EXPO_PUBLIC_API_BASE_URL env var
  url = process.env.EXPO_PUBLIC_API_BASE_URL || '';

  if (!url) {
    url = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
  }

  if (Platform.OS === 'android') {
    url = url.replace(/(localhost|127\.0\.0\.1)/g, '10.0.2.2');
  }

  return url;
};

export const getApiBaseUrl = (): string => {
  if (resolvedBaseUrl) {
    return resolvedBaseUrl;
  }
  return getDefaultApiBaseUrl();
};

export const startBaseUrlDetection = (): Promise<string> => {
  if (resolvedBaseUrl) {
    return Promise.resolve(resolvedBaseUrl);
  }

  return new Promise((resolve) => {
    const defaultUrl = getDefaultApiBaseUrl();
    const localhostUrl = 'http://localhost:5000';
    const emulatorUrl = 'http://10.0.2.2:5000';

    const candidates: string[] = [];
    candidates.push(localhostUrl); // Try localhost first for adb reverse
    
    // Add env url if configured
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (envUrl && !candidates.includes(envUrl)) {
      candidates.push(envUrl);
    }

    if (defaultUrl && !candidates.includes(defaultUrl) && !defaultUrl.includes('localhost') && !defaultUrl.includes('127.0.0.1') && !defaultUrl.includes('10.0.2.2')) {
      candidates.push(defaultUrl);
    }
    if (Platform.OS === 'android' && !candidates.includes(emulatorUrl)) {
      candidates.push(emulatorUrl);
    }

    console.log(`[API Base Resolver] Testing candidate URLs: ${candidates.join(', ')}`);

    const testUrl = async (url: string) => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
        const res = await fetch(`${url}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(id);
        if (res.status === 200) {
          return url;
        }
      } catch (e) {
        // ignore
      }
      throw new Error('failed');
    };

    let resolved = false;
    let failedCount = 0;

    candidates.forEach((url) => {
      testUrl(url)
        .then((successfulUrl) => {
          if (!resolved) {
            resolved = true;
            resolvedBaseUrl = successfulUrl;
            console.log(`[API Base Resolver] Active backend detected: ${resolvedBaseUrl}`);
            resolve(resolvedBaseUrl);
          }
        })
        .catch(() => {
          failedCount++;
          if (failedCount === candidates.length && !resolved) {
            resolved = true;
            resolvedBaseUrl = defaultUrl;
            console.log(`[API Base Resolver] No active backend detected. Falling back to: ${resolvedBaseUrl}`);
            resolve(resolvedBaseUrl);
          }
        });
    });
  });
};

export const resolveApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${base}${cleanPath}`;
  return fullUrl;
};

// Start background detection immediately in DEV mode
// @ts-ignore
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  startBaseUrlDetection();
}


