const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const getAuthHeaders = () => {
  const token = localStorage.getItem('qb_token') || sessionStorage.getItem('qb_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    // Clear session and redirect to login on unauthorized
    localStorage.removeItem('qb_token');
    sessionStorage.removeItem('qb_token');
    localStorage.removeItem('qb_user');
    localStorage.removeItem('qb_current_hotel');
    localStorage.removeItem('accessToken');
    window.location.href = '/login?expired=true';
    throw new Error('Session Expired');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `API Error: Status ${res.status}`);
  }
  return res.json();
};

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  getMyHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotel-admins/my-hotels`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotelDetails: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotelOrders: async (hotelId, status = '') => {
    const url = status 
      ? `${API_BASE_URL}/hotels/${hotelId}/orders?status=${status}`
      : `${API_BASE_URL}/hotels/${hotelId}/orders`;
    const res = await fetch(url, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  updateOrderStatus: async (hotelId, orderId, status) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  updateHotelOpenStatus: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/open-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getHotelRatingSummary: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/rating-summary`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotelFoods: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  }
};
