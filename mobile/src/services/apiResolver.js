import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let resolvedBaseUrl = null;
let currentDetectionId = 0;
let activeDetectionPromise = null;
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
export const startBaseUrlDetection = (force = false) => {
  if (force) {
    resolvedBaseUrl = null;
    activeDetectionPromise = null;
  }

  if (resolvedBaseUrl) {
    return Promise.resolve(resolvedBaseUrl);
  }

  if (activeDetectionPromise) {
    return activeDetectionPromise;
  }

  const detectionId = ++currentDetectionId;

  if (!__DEV__) {
    resolvedBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    return Promise.resolve(resolvedBaseUrl);
  }

  activeDetectionPromise = new Promise((resolve) => {
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

    console.log(`[API Base Resolver] Testing candidate URLs (Run #${detectionId}): ${candidates.join(', ')}`);

    const timeoutHandles = [];

    const testUrl = (url) => {
      return new Promise((resResolve, resReject) => {
        const timer = setTimeout(() => {
          resReject(new Error('timeout'));
        }, 3000);
        timeoutHandles.push(timer);

        global.fetch(`${url}/health`, { method: 'GET' })
          .then((res) => {
            clearTimeout(timer);
            if (res.status === 200) {
              resResolve(url);
            } else {
              resReject(new Error('status not 200'));
            }
          })
          .catch((err) => {
            clearTimeout(timer);
            resReject(err);
          });
      });
    };

    let resolved = false;
    let failedCount = 0;

    const cleanup = () => {
      timeoutHandles.forEach(h => clearTimeout(h));
      if (currentDetectionId === detectionId) {
        activeDetectionPromise = null;
      }
    };

    candidates.forEach((url) => {
      testUrl(url)
        .then((successfulUrl) => {
          if (detectionId !== currentDetectionId) {
            return;
          }
          if (!resolved) {
            resolved = true;
            resolvedBaseUrl = successfulUrl;
            console.log(`[API Base Resolver] Active backend detected: ${resolvedBaseUrl}`);
            cleanup();
            resolve(resolvedBaseUrl);
          }
        })
        .catch(() => {
          if (detectionId !== currentDetectionId) {
            return;
          }
          failedCount++;
          if (failedCount === candidates.length && !resolved) {
            resolved = true;
            resolvedBaseUrl = defaultUrl;
            console.log(`[API Base Resolver] No active backend detected. Falling back to default URL: ${resolvedBaseUrl}`);
            cleanup();
            resolve(resolvedBaseUrl);
          }
        });
    });
  });

  return activeDetectionPromise;
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

