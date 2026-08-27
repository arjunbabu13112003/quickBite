import { Platform } from 'react-native';

export const getApiBaseUrl = (): string => {
  // Always use the EXPO_PUBLIC_API_BASE_URL environment variable from .env
  // No localhost, 127.0.0.1, or 10.0.2.2 fallbacks on the physical phone
  const url = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.220.92:5000';
  return url;
};

export const startBaseUrlDetection = (): Promise<string> => {
  return Promise.resolve(getApiBaseUrl());
};

export const resolveApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${base}${cleanPath}`;
  return fullUrl;
};


