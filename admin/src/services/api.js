/**
 * QuickBite Admin Portal — Unified API Service
 * Handles authentication for both super_admin and hotel_admin roles.
 * Token key: qb_admin_token (localStorage or sessionStorage)
 */

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

const getFriendlyApiError = async (error, response) => {
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

  if (status === 401) {
    message = "Session expired. Please log in again.";
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
        const err = await getFriendlyApiError(null, res);
        const isAuthEndpoint = urlStr.includes('/users/login') || urlStr.includes('/users/register');
        if (res.status === 401 && !isAuthEndpoint) {
          qbEvents.emit("UNAUTHORIZED", null);
        }
        throw err;
      }
      return res;
    } catch (error) {
      const err = await getFriendlyApiError(error, null);
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

// ─── Token Helpers ──────────────────────────────────────────────────────────

export const getStoredToken = () =>
  localStorage.getItem('qb_admin_token') || sessionStorage.getItem('qb_admin_token');

export const storeToken = (token, remember = false) => {
  if (remember) {
    localStorage.setItem('qb_admin_token', token);
  } else {
    sessionStorage.setItem('qb_admin_token', token);
  }
};

export const clearSession = () => {
  localStorage.removeItem('qb_admin_token');
  sessionStorage.removeItem('qb_admin_token');
  localStorage.removeItem('qb_admin_user');
  localStorage.removeItem('qb_admin_hotel');
};

const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Response Handler ────────────────────────────────────────────────────────

const handleResponse = async (res, isLoginRequest = false) => {
  if (res.status === 401) {
    if (!isLoginRequest) {
      clearSession();
      window.location.href = '/login?expired=true';
      throw new Error('Session Expired');
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Invalid email or password');
    }
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `API Error: ${res.status}`);
  }
  return res.json();
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },
  post: async (endpoint, data) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  patch: async (endpoint, data) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Shared login endpoint — used by both super_admin and hotel_admin
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res, true);
  },

  // Get current logged-in user profile — used for session restoration
  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  // ─── Hotel Admin: My Hotels ─────────────────────────────────────────────

  // Get hotels assigned to the currently logged-in hotel_admin
  getMyHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotel-admins/my-hotels`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelDetails: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelOrders: async (hotelId, status = '') => {
    const url = status
      ? `${API_BASE_URL}/hotels/${hotelId}/orders?status=${status}`
      : `${API_BASE_URL}/hotels/${hotelId}/orders`;
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  updateOrderStatus: async (hotelId, orderId, status) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  updateHotelOpenStatus: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/open-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getHotelRatingSummary: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/rating-summary`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelFoods: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelFoodsWithActiveOnly: async (hotelId, activeOnly = false) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods?activeOnly=${activeOnly}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  // Upload up to 3 food images as multipart/form-data.
  // imageFiles: array of File objects (from <input type="file">).
  // Returns { urls: string[] } — absolute URLs pointing to backend static files.
  uploadFoodImages: async (hotelId, imageFiles) => {
    const form = new FormData();
    imageFiles.forEach((file) => form.append('images', file));
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods/upload-images`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }, // no Content-Type — browser sets multipart boundary
      body: form,
    });
    return handleResponse(res);
  },

  createFood: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateFood: async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/foods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateFoodAvailability: async (id, isAvailable) => {
    const res = await fetch(`${API_BASE_URL}/foods/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ isAvailable }),
    });
    return handleResponse(res);
  },

  deactivateFood: async (id) => {
    const res = await fetch(`${API_BASE_URL}/foods/${id}/deactivate`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  // ─── Hotel Admin: Categories ────────────────────────────────────────────
  getCategories: async (hotelId, activeOnly = false) => {
    // The backend signature: findAllForHotel(@Param('hotelId', ParseIntPipe) hotelId: number)
    // and returns findAllForHotel(hotelId, true) if activeOnly.
    // Let's call the standard route:
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/categories`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createCategory: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateCategory: async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  deactivateCategory: async (id) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}/deactivate`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  // ─── Super Admin: Platform Management ──────────────────────────────────

  // ────────────────────────────────────────────────────────────────────────
  // Super Admin: Platform Management ────────────────────────────────────────

  getHomeFoodCategories: async () => {
    const url = `${API_BASE_URL}/home-food-categories`;
    try {
      console.log(`[HomeFoodCategories] Request URL: ${url}`);
      const res = await fetch(url, {
        headers: { ...getAuthHeaders() },
      });
      console.log(`[HomeFoodCategories] HTTP status: ${res.status}`);
      const cloned = res.clone();
      const rawText = await cloned.text();
      console.log(`[HomeFoodCategories] Raw response: ${rawText}`);
      return await handleResponse(res);
    } catch (err) {
      console.error(`[HomeFoodCategories] Error response: ${err.message}`);
      throw err;
    }
  },

  getActiveHomeFoodCategories: async () => {
    const res = await fetch(`${API_BASE_URL}/home-food-categories/active`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createHomeFoodCategory: async (payload) => {
    const url = `${API_BASE_URL}/home-food-categories`;
    try {
      console.log(`[HomeFoodCategories] Request URL: ${url}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(`[HomeFoodCategories] HTTP status: ${res.status}`);
      const cloned = res.clone();
      const rawText = await cloned.text();
      console.log(`[HomeFoodCategories] Raw response: ${rawText}`);
      return await handleResponse(res);
    } catch (err) {
      console.error(`[HomeFoodCategories] Error response: ${err.message}`);
      throw err;
    }
  },

  updateHomeFoodCategory: async (id, payload) => {
    const url = `${API_BASE_URL}/home-food-categories/${id}`;
    try {
      console.log(`[HomeFoodCategories] Request URL: ${url}`);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(`[HomeFoodCategories] HTTP status: ${res.status}`);
      const cloned = res.clone();
      const rawText = await cloned.text();
      console.log(`[HomeFoodCategories] Raw response: ${rawText}`);
      return await handleResponse(res);
    } catch (err) {
      console.error(`[HomeFoodCategories] Error response: ${err.message}`);
      throw err;
    }
  },

  uploadHomeFoodCategoryImage: async (imageFile) => {
    const form = new FormData();
    form.append('image', imageFile);
    const url = `${API_BASE_URL}/home-food-categories/upload-image`;
    try {
      console.log(`[HomeFoodCategories] Request URL: ${url}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: form,
      });
      console.log(`[HomeFoodCategories] HTTP status: ${res.status}`);
      const cloned = res.clone();
      const rawText = await cloned.text();
      console.log(`[HomeFoodCategories] Raw response: ${rawText}`);
      return await handleResponse(res);
    } catch (err) {
      console.error(`[HomeFoodCategories] Error response: ${err.message}`);
      throw err;
    }
  },

  getHomeFoodCategoryFoods: async (id) => {
    const res = await fetch(`${API_BASE_URL}/home-food-categories/${id}/foods`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getUnassignedFoods: async () => {
    const res = await fetch(`${API_BASE_URL}/home-food-categories/unassigned/foods`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  updateFoodHomeFoodCategory: async (foodId, homeFoodCategoryId) => {
    const res = await fetch(`${API_BASE_URL}/foods/${foodId}/home-food-category`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeFoodCategoryId }),
    });
    return handleResponse(res);
  },

  getAdminStats: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/stats`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotels/admin/all`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createHotel: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateHotel: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateHotelSettings: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  deactivateHotel: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}/deactivate`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  activateHotel: async (id) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    });
    return handleResponse(res);
  },

  getHotelAdmins: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelReviewsSummary: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/rating-summary`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelAdminsList: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createHotelAdmin: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getHotelAdminById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  updateHotelAdmin: async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/users/admin/hotel-admins/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  deactivateHotelAdminAssignment: async (hotelId, assignmentId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins/${assignmentId}/deactivate`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  assignHotelToAdmin: async (adminId, hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/admins`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: adminId }),
    });
    return handleResponse(res);
  },

  getDeliveryPartners: async () => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getDeliveryPartnerById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getDeliveryPartnerCandidates: async () => {
    const res = await fetch(`${API_BASE_URL}/users/admin/delivery-partner-candidates`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createDeliveryPartner: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  createDeliveryPartnerAccount: async (formData) => {
    const headers = { ...getAuthHeaders() };
    delete headers['Content-Type'];
    const res = await fetch(`${API_BASE_URL}/delivery-partners/admin-create`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  registerUser: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  verifyDeliveryPartner: async (id, isVerified) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${id}/verify`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVerified }),
    });
    return handleResponse(res);
  },

  verifyDeliveryPartnerDocument: async (partnerId, documentId, status, reason) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${partnerId}/documents/${documentId}/verification`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  updateDeliveryPartnerAccountStatus: async (partnerId, status, reason) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${partnerId}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  getDeliveryPartnerDocument: async (partnerId, documentId) => {
    const res = await fetch(`${API_BASE_URL}/delivery-partners/${partnerId}/documents/${documentId}`, {
      headers: { ...getAuthHeaders() },
    });
    if (res.status === 401) {
      clearSession();
      window.location.href = '/login?expired=true';
      throw new Error('Session Expired');
    }
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('You do not have permission to view this document.');
      }
      if (res.status === 404) {
        throw new Error('Document not found.');
      }
      throw new Error(`Failed to fetch document: ${res.status}`);
    }
    return res.blob();
  },

  getAvailableDeliveryPartners: async () => {
    const res = await fetch(
      `${API_BASE_URL}/delivery-partners?online=true&available=true&verified=true&active=true&status=APPROVED`,
      { headers: { ...getAuthHeaders() } }
    );
    return handleResponse(res);
  },

  getOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/all`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getAllPlatformOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/all`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getOrderDetailsById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/orders/admin/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  assignDeliveryPartner: async (orderId, deliveryPartnerId) => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/delivery-assignment`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryPartnerId }),
    });
    return handleResponse(res);
  },

  notifyRestaurant: async (orderId) => {
    const res = await fetch(`${API_BASE_URL}/notifications/admin/notify-restaurant/${orderId}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  getHotelNotifications: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/hotel/me`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/hotel/me/${id}/read`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  deleteHotelNotification: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/hotel/me/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  clearAllHotelNotifications: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/hotel/me`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  getHotelCategories: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/categories`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getHotelOffers: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/hotel/me`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  createHotelOffer: async (data) => {
    const res = await fetch(`${API_BASE_URL}/offers`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateHotelOffer: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteHotelOffer: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  duplicateHotelOffer: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/hotel/me/${id}/duplicate`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  updateHotelProfile: async (hotelId, payload) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/profile`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  uploadHotelLogo: async (hotelId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = { ...getAuthHeaders() };
    delete headers['Content-Type'];

    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/upload-logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  uploadHotelCover: async (hotelId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = { ...getAuthHeaders() };
    delete headers['Content-Type'];

    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/upload-cover`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  uploadHotelGallery: async (hotelId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = { ...getAuthHeaders() };
    delete headers['Content-Type'];

    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/upload-gallery`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  getActive99Campaign: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/active-campaign`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getActiveCampaigns: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/active-campaigns`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  join99Campaign: async (campaignId) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  get99CampaignItems: async (campaignId) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${campaignId}/items`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  submit99CampaignItems: async (campaignId, foodIds) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodIds }),
    });
    return handleResponse(res);
  },

  getHotelCampaigns: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/hotel-campaigns`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  participateInCampaign: async (campaignId, foodIds) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${campaignId}/participate`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodIds }),
    });
    return handleResponse(res);
  },

  declineCampaign: async (campaignId) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${campaignId}/decline`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getAll99Campaigns: async () => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  get99CampaignDetails: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  create99Campaign: async (data) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update99Campaign: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete99Campaign: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  toggle99CampaignActive: async (id) => {
    const res = await fetch(`${API_BASE_URL}/offers/store99/campaigns/${id}/toggle-active`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getSuperAdminHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  getSuperAdminFoods: async (hotelId) => {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/foods`, {
      headers: { ...getAuthHeaders() },
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

  uploadNotificationIcon: async (appType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/notification-icon/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      },
      body: formData
    });
    return handleResponse(res);
  },

  updateTransform: async (appType, scale, offsetX, offsetY, padding) => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/transform`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ scale, offsetX, offsetY, padding })
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

  updateAppName: async (appType, appName) => {
    const res = await fetch(`${API_BASE_URL}/branding/app-icons/${appType}/app-name`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ appName })
    });
    return handleResponse(res);
  },

  getPlatformAnalytics: async (restaurantId, startDate, endDate) => {
    let url = `/orders/admin/analytics?`;
    if (restaurantId) url += `restaurantId=${restaurantId}&`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },
};
