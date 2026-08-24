import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'deliveryPartnerAccessToken';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.220.92:5000';

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

export const api = {
  login: async (dto: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-partners/login`, {
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
        throw new Error(`Connection timeout. Backend at ${API_BASE_URL} is unreachable.`);
      }
      throw new Error(err.message ? `${err.message} (URL: ${API_BASE_URL})` : `Failed to connect to backend at ${API_BASE_URL}`);
    }
  },

  getMe: async () => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No token found');
    }
    
    const res = await fetch(`${API_BASE_URL}/delivery-partners/me`, {
      method: 'GET',
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
      throw new Error(errData.message || 'Failed to fetch profile.');
    }
    
    return await res.json();
  },

  getIncomingAssignment: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/incoming-assignment`, {
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
      throw new Error(errData.message || 'Failed to fetch incoming assignment');
    }

    return await res.json();
  },

  acceptAssignment: async (assignmentId: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/assignments/${assignmentId}/accept`, {
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

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/assignments/${assignmentId}/decline`, {
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

  getActiveDelivery: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/active-delivery`, {
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
      throw new Error(errData.message || 'Failed to fetch active delivery');
    }

    return await res.json();
  },

  updateOnlineStatus: async (isOnline: boolean) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No token found');
    }

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/online-status`, {
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

  getDashboardStats: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/dashboard`, {
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
      throw new Error(errData.message || 'Failed to fetch dashboard stats');
    }

    return await res.json();
  },

  getCompletedOrders: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/orders/history`, {
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
      throw new Error(errData.message || 'Failed to fetch completed orders');
    }

    return await res.json();
  },

  getAvailableOrders: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/available-orders`, {
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

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/orders/${orderId}/claim`, {
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

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/orders/${orderId}/status`, {
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

  collectCodCash: async (orderId: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cod/collect`, {
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

    const res = await fetch(`${API_BASE_URL}/delivery-partners/me/active-delivery/location`, {
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

    const res = await fetch(`${API_BASE_URL}/notifications/partner/me`, {
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

    const res = await fetch(`${API_BASE_URL}/notifications/partner/me/${id}/read`, {
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

    const res = await fetch(`${API_BASE_URL}/notifications/partner/me/read-all`, {
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

    const res = await fetch(`${API_BASE_URL}/notifications/partner/me`, {
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
