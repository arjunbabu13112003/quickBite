import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let hasLogged = false;

export const getApiBaseUrl = (): string => {
  let hostname: string | null = null;

  if (__DEV__) {
    // 1. Try to get hostname from Expo config extra.backendIp (dynamic host IP injected at build/bundling time)
    const backendIp = (Constants.expoConfig?.extra?.backendIp || Constants.manifest?.extra?.backendIp) as string | undefined;
    if (backendIp && backendIp !== 'localhost' && backendIp !== '127.0.0.1') {
      hostname = backendIp;
    }

    // 2. Try to parse hostname from React Native's NativeModules scriptURL
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
        console.warn('[API Base Resolver] Failed to parse scriptURL:', e);
      }
    }

    // 3. Try to get hostname from Expo experienceUrl (if loaded via Expo Launcher)
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

    // 4. Try to get hostname from Expo config hostUri or debuggerHost if other methods missed
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

  let url: string;
  if (hostname) {
    url = `http://${hostname}:5000`;
    if (!hasLogged) {
      console.log(`[API] Runtime host: ${hostname}`);
      console.log(`[API] Base URL: ${url}`);
      hasLogged = true;
    }
    return url;
  }

  // 5. Fallback to EXPO_PUBLIC_API_BASE_URL environment variable
  url = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  
  if (!url) {
    if (Platform.OS === 'android') {
      url = 'http://10.0.2.2:5000';
    } else {
      url = 'http://127.0.0.1:5000';
    }
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

export const resolveApiUrl = (path: string): string => {
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
