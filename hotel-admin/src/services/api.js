const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// --- CENTRALIZED API ERROR AND CONNECTIVITY HANDLING ---
export const qbEvents = {
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  emit(message, onRetry) {
    this.listeners.forEach(listener => {
      try {
        listener(message, onRetry);
      } catch (e) {
        console.error("Error in listener:", e);
      }
    });
  }
};

const getFriendlyApiError = async (error, response, urlStr = '') => {
  if (error) {
    console.error("[API Technical Error]", error);
  }
  if (response) {
    console.error("[API Response Error Status]", response.status);
    try {
      const clone = response.clone();
      const text = await clone.text();
      console.error("[API Response Error Body]", text.substring(0, 500));
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

  const isAuthEndpoint = urlStr.includes('/users/login') || urlStr.includes('/users/register') || urlStr.includes('/delivery-partners/login');

  if (status === 401) {
    if (isAuthEndpoint) {
      // For auth endpoints, keep the original parsed message (e.g. "Invalid email/mobile or password.")
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
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      message = "No internet connection. Please check your network and try again.";
    }
  }

  return { status, message };
};

export const requestWithHandling = async (requestFn, onRetry, isGet = true, isBackground = false) => {
  try {
    return await requestFn();
  } catch (err) {
    if (isBackground || !isGet || err.status === 404 || err.status === 403 || err.status === 401) {
      throw err;
    }
    if (onRetry) {
      qbEvents.emit(err.message || "Server is temporarily unavailable. Please try again.", onRetry);
    }
    throw err;
  }
};

const qbFetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url && url.url) || '';
  if (!urlStr.startsWith(API_BASE_URL)) {
    return window.fetch(url, options);
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  const execute = async () => {
    try {
      const res = await window.fetch(url, options);
      if (!res.ok) {
        const err = await getFriendlyApiError(null, res, urlStr);
        const isAuthEndpoint = urlStr.includes('/users/login') || urlStr.includes('/users/register');
        if (res.status === 401 && !isAuthEndpoint) {
          qbEvents.emit("UNAUTHORIZED", null);
        }
        throw err;
      }
      return res;
    } catch (error) {
      // If the error was already processed and thrown by the if (!res.ok) block,
      // it will have status and message. We should just rethrow it instead of re-wrapping.
      if (error && typeof error.status === 'number' && typeof error.message === 'string') {
        throw error;
      }
      const err = await getFriendlyApiError(error, null, urlStr);
      throw err;
    }
  };

  if (isGet) {
    const isProfileCheck = urlStr.includes('/users/profile') || urlStr.includes('/hotel-admins/my-hotels');
    return requestWithHandling(execute, () => qbFetch(url, options), true, isProfileCheck);
  } else {
    return execute();
  }
};

const fetch = qbFetch;

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
