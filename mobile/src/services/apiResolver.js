import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let resolvedBaseUrl = null;
let hasLogged = false;

// 1. Synchronous helper to get the default/configured API URL based on Expo build metadata
const getDefaultApiBaseUrl = () => {
  let hostname = null;

  if (__DEV__) {
    // Try to get hostname from Expo config extra.backendIp (dynamic host IP injected at build/bundling time)
    const backendIp = Constants.expoConfig?.extra?.backendIp || Constants.manifest?.extra?.backendIp;
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
    if (!hostname && Constants.experienceUrl) {
      try {
        const match = Constants.experienceUrl.match(/^[a-z]+:\/\/([^:/]+)/);
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
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || Constants.manifest?.debuggerHost;
      if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          hostname = ip;
        }
      }
    }
  }

  let url;
  if (hostname) {
    url = `http://${hostname}:5000`;
    return url;
  }

  // Last resort: EXPO_PUBLIC_API_BASE_URL env var (auto-written by app.config.js)
  url = process.env.EXPO_PUBLIC_API_BASE_URL || '';

  if (!url) {
    url = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
  }

  if (Platform.OS === 'android') {
    url = url.replace(/(localhost|127\.0\.0\.1)/g, '10.0.2.2');
  }

  return url;
};

// 2. Perform connection checks to candidate URLs and cache the active one
export const startBaseUrlDetection = () => {
  if (resolvedBaseUrl) return Promise.resolve(resolvedBaseUrl);

  if (!__DEV__) {
    resolvedBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    return Promise.resolve(resolvedBaseUrl);
  }

  return new Promise((resolve) => {
    const defaultUrl = getDefaultApiBaseUrl();
    const localhostUrl = 'http://localhost:5000';
    const emulatorUrl = 'http://10.0.2.2:5000';

    const candidates = [];
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

    const testUrl = async (url) => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000); // 3000ms timeout for wireless debugging latency
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
            console.log(`[API Base Resolver] No active backend detected. Falling back to default URL: ${resolvedBaseUrl}`);
            resolve(resolvedBaseUrl);
          }
        });
    });
  });
};

// Start background detection immediately in DEV mode
if (__DEV__) {
  startBaseUrlDetection();
}

export const getApiBaseUrl = () => {
  if (resolvedBaseUrl) {
    return resolvedBaseUrl;
  }
  return getDefaultApiBaseUrl();
};

export const resolveApiUrl = (path) => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${base}${cleanPath}`;
  if (__DEV__) {
    if (fullUrl.includes(':5000') || fullUrl.includes('/delivery-partners') || fullUrl.includes('/users') || fullUrl.includes('/orders')) {
      console.log(`[API] Request URL: ${fullUrl}`);
    }
  }
  return fullUrl;
};

