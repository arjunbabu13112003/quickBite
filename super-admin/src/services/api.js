const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
  }
};
