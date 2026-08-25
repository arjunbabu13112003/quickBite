import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let hasLogged = false;

export const getApiBaseUrl = () => {
  let hostname = null;

  if (__DEV__) {
    // 1. Primary: app.config.js injects PC LAN IP at bundling time via extra.backendIp
    const backendIp = Constants.expoConfig?.extra?.backendIp || Constants.manifest?.extra?.backendIp;
    if (backendIp && backendIp !== 'localhost' && backendIp !== '127.0.0.1') {
      hostname = backendIp;
    }

    // 2. Fallback: Parse hostname from React Native NativeModules scriptURL
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

    // 3. Fallback: Expo experienceUrl
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

    // 4. Fallback: Expo config hostUri / debuggerHost
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
    if (__DEV__ && !hasLogged) {
      console.log(`[API] Runtime host: ${hostname}`);
      console.log(`[API] Base URL: ${url}`);
      hasLogged = true;
    }
    return url;
  }

  // 5. Last resort: EXPO_PUBLIC_API_BASE_URL env var (auto-written by app.config.js)
  url = process.env.EXPO_PUBLIC_API_BASE_URL || '';

  if (!url) {
    url = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
  }

  if (Platform.OS === 'android') {
    url = url.replace(/(localhost|127\.0\.0\.1)/g, '10.0.2.2');
  }

  if (__DEV__ && !hasLogged) {
    console.log(`[API] Fallback Base URL: ${url}`);
    hasLogged = true;
  }

  return url;
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
