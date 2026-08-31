import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getApiBaseUrl, resolveApiUrl, startBaseUrlDetection } from './apiResolver';

const TOKEN_KEY = 'deliveryPartnerAccessToken';

export { resolveApiUrl };

export const setAuthToken = async (token: string | null) => {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};

export const getAuthToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

// --- CENTRALIZED API ERROR AND CONNECTIVITY HANDLING ---
export const qbEvents = {
  listeners: new Set<any>(),
  subscribe(listener: any) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  emit(message: string, onRetry?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(message, onRetry);
      } catch (e) {
        console.error("Error in listener:", e);
      }
    });
  }
};

const getFriendlyApiError = async (error: any, response: any, urlStr = '') => {
  if (error) {
    console.warn("[API Technical Error]", error);
  }
  if (response) {
    console.warn("[API Response Error Status]", response.status);
    try {
      const clone = response.clone();
      const text = await clone.text();
      console.warn("[API Response Error Body]", text.substring(0, 500));
    } catch (e) {}
  }

  let status = response ? response.status : 0;
  let message = "Server is temporarily unavailable. Please try again.";

  if (response) {
    try {
      const clone = response.clone();
      const errData = await clone.json();
      if (errData && typeof errData.message === 'string') {
        const isTechnical = /sql|database|query|table|row|column|exception|nest|internal|stack/i.test(errData.message);
        if (!isTechnical && errData.message.trim() !== '') {
          message = errData.message;
        }
      }
    } catch (e) {}
  }

  const isAuthEndpoint = urlStr.includes('/delivery-partners/login');

  if (status === 401) {
    if (isAuthEndpoint) {
      // For login endpoint, keep the original parsed message (e.g. "Invalid email/mobile or password.")
    } else {
      message = "Session expired. Please log in again.";
    }
  } else if (status === 403) {
    message = "You don't have permission to access this.";
  } else if (status === 404) {
    message = "Requested data was not found.";
  } else if (status >= 500) {
    message = "Server is temporarily unavailable. Please try again.";
  } else if (!response && error) {
    message = "Server is temporarily unavailable. Please try again.";
    if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) {
      message = "No internet connection. Please check your network and try again.";
    }
  }

  return { status, message };
};

const qbFetch = async (url: string | Request, options?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : (url && (url as any).url) || '';
  if (!urlStr.includes(':5000')) {
    return globalThis.fetch(url, options);
  }

  try {
    const res = await globalThis.fetch(url, options);
    if (!res.ok) {
      const err = await getFriendlyApiError(null, res, urlStr);
      const isAuthEndpoint = urlStr.includes('/delivery-partners/login');
      if (res.status === 401 && !isAuthEndpoint) {
        qbEvents.emit("UNAUTHORIZED", null);
      }
      throw err;
    }
    return res;
  } catch (error: any) {
    // If the error was already processed and thrown by the if (!res.ok) block,
    // it will have status and message. We should just rethrow it instead of re-wrapping.
    if (error && typeof error.status === 'number' && typeof error.message === 'string') {
      throw error;
    }
    const err = await getFriendlyApiError(error, null, urlStr);
    throw err;
  }
};

const fetch = qbFetch;

export const requestWithHandling = async (requestFn: () => Promise<any>, onRetry?: () => Promise<any>, isBackground = false) => {
  try {
    return await requestFn();
  } catch (err: any) {
    if (isBackground || err.status === 404 || err.status === 403 || err.status === 401) {
      throw err;
    }
    if (onRetry) {
      qbEvents.emit(err.message || "Server is temporarily unavailable. Please try again.", onRetry);
    }
    throw err;
  }
};

const apiMethods = {
  login: async (dto: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(resolveApiUrl('/delivery-partners/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Invalid email/mobile or password.');
      }
      
      const data = await res.json();
      if (data.accessToken) {
        await setAuthToken(data.accessToken);
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timeout. Backend is unreachable.');
      }
      throw err;
    }
  },

  getMe: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No token found');
        }
        const res = await fetch(resolveApiUrl('/delivery-partners/me'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return await res.json();
      },
      () => api.getMe(),
      true // isBackground
    );
  },

  updateProfile: async (name: string, email: string) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No token found');
    }
    
    const res = await fetch(resolveApiUrl('/delivery-partners/me'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, email }),
    });
    
    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to update profile.');
    }
    
    return await res.json();
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmNewPassword: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/delivery-partners/me/change-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to change password.');
    }

    return await res.json();
  },

  getIncomingAssignment: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) throw new Error('No token found');
        const res = await fetch(resolveApiUrl('/delivery-partners/me/incoming-assignment'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return await res.json();
      },
      () => api.getIncomingAssignment()
    );
  },

  acceptAssignment: async (assignmentId: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/delivery-partners/me/assignments/${assignmentId}/accept`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to accept assignment');
    }

    return await res.json();
  },

  declineAssignment: async (assignmentId: number, declineReason?: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/delivery-partners/me/assignments/${assignmentId}/decline`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ declineReason }),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to decline assignment');
    }

    return await res.json();
  },

  getActiveDelivery: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) throw new Error('No token found');
        const res = await fetch(resolveApiUrl('/delivery-partners/me/active-delivery'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return await res.json();
      },
      () => api.getActiveDelivery()
    );
  },

  updateOnlineStatus: async (isOnline: boolean) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No token found');
    }

    const res = await fetch(resolveApiUrl('/delivery-partners/me/online-status'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ isOnline }),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to update online status.');
    }

    return await res.json();
  },

  heartbeat: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) throw new Error('No token found');
        const res = await fetch(resolveApiUrl('/delivery-partners/me/heartbeat'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        return await res.json();
      },
      () => api.heartbeat(),
      true // isBackground
    );
  },

  getDashboardStats: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) throw new Error('No token found');
        const res = await fetch(resolveApiUrl('/delivery-partners/me/dashboard'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return await res.json();
      },
      () => api.getDashboardStats()
    );
  },

  getCompletedOrders: async (): Promise<any> => {
    return requestWithHandling(
      async () => {
        const token = await getAuthToken();
        if (!token) throw new Error('No token found');
        const res = await fetch(resolveApiUrl('/delivery-partners/me/orders/history'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return await res.json();
      },
      () => api.getCompletedOrders()
    );
  },

  getAvailableOrders: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/delivery-partners/me/available-orders'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch available orders');
    }

    return await res.json();
  },

  claimAvailableOrder: async (orderId: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/delivery-partners/me/orders/${orderId}/claim`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to claim available order');
    }

    return await res.json();
  },

  updateDeliveryOrderStatus: async (orderId: number, status: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/delivery-partners/me/orders/${orderId}/status`), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status }),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to update order status');
    }

    return await res.json();
  },

  verifyActiveDeliveryPin: async (
    pin: string,
    bypassLatitude?: number,
    bypassLongitude?: number,
    bypassDistance?: number,
    bypassTimestamp?: string
  ) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/delivery-partners/me/active-delivery/verify-pin'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pin,
        bypassLatitude,
        bypassLongitude,
        bypassDistance,
        bypassTimestamp
      }),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Incorrect delivery PIN. Please check with the customer.');
    }

    return await res.json();
  },

  collectCodCash: async (orderId: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/orders/${orderId}/cod/collect`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to confirm cash collection');
    }

    return await res.json();
  },

  updateActiveDeliveryLocation: async (dto: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    capturedAt?: string;
  }) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/delivery-partners/me/active-delivery/location'), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to update active delivery location');
    }

    return await res.json();
  },

  getPartnerNotifications: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/notifications/partner/me'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch partner notifications');
    }

    return await res.json();
  },

  markPartnerNotificationAsRead: async (id: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl(`/notifications/partner/me/${id}/read`), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to mark notification as read');
    }

    return await res.json();
  },

  markAllPartnerNotificationsAsRead: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/notifications/partner/me/read-all'), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to mark all notifications as read');
    }

    return await res.json();
  },

  clearAllPartnerNotifications: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(resolveApiUrl('/notifications/partner/me'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      await setAuthToken(null);
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to clear all notifications');
    }

    return await res.json();
  },
};

export const api = new Proxy(apiMethods, {
  get(target, prop) {
    const originalMethod = target[prop as keyof typeof target];
    if (typeof originalMethod === 'function') {
      return async (...args: any[]) => {
        await startBaseUrlDetection();
        return (originalMethod as Function)(...args);
      };
    }
    return originalMethod;
  }
});
