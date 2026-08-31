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
  const token = localStorage.getItem('qb_super_admin_token') || sessionStorage.getItem('qb_super_admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    // Clear super admin session and redirect on unauthorized
    localStorage.removeItem('qb_super_admin_token');
    sessionStorage.removeItem('qb_super_admin_token');
    localStorage.removeItem('qb_super_admin_user');
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

  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotels/admin/all`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotelById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getDeliveryPartners: async () => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/all`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getAdminStats: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/stats`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  deactivateHotel: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}/deactivate`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  activateHotel: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: true })
    });
    return handleResponse(res);
  },

  createHotel: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
  },

  getHotelAdmins: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getHotelReviewsSummary: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/rating-summary`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  updateHotelSettings: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  updateHotel: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getHotelAdminsList: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  createHotelAdmin: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getHotelAdminById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins/${id}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  deactivateHotelAdminAssignment: async (hotelId, assignmentId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins/${assignmentId}/deactivate`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  updateHotelAdmin: async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins/${id}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  assignHotelToAdmin: async (adminId, hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: adminId })
    });
    return handleResponse(res);
  },

  getDeliveryPartnerCandidates: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/delivery-partner-candidates`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  createDeliveryPartner: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getDeliveryPartnerById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${id}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  verifyDeliveryPartner: async (id, isVerified) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${id}/verify`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isVerified })
    });
    return handleResponse(res);
  },

  getAllPlatformOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/all`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getOrderDetailsById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/${id}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  getAvailableDeliveryPartners: async () => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners?online=true&available=true&verified=true&active=true`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  assignDeliveryPartner: async (orderId, deliveryPartnerId) => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/delivery-assignment`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deliveryPartnerId })
    });
    return handleResponse(res);
  },

  getAppIcons: async () => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  uploadAppIcon: async (appType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      },
      body: formData
    });
    return handleResponse(res);
  },

  activateAppIconForNextUpdate: async (appType) => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/activate-for-next-update`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  deletePendingAppIcon: async (appType) => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/pending`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  },

  markAppIconAsCurrent: async (appType) => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/mark-current`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders()
      }
    });
    return handleResponse(res);
  }
};
