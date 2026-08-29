import React, { useState, useEffect } from 'react';
import { verifyJwtToken } from './utils/jwt';
import { api, qbEvents } from './services/api';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import Dashboard from './pages/Dashboard';
import HotelsList from './pages/HotelsList';
import AddHotel from './pages/AddHotel';
import HotelDetails from './pages/HotelDetails';
import EditHotel from './pages/EditHotel';
import HotelAdminsList from './pages/HotelAdminsList';
import AddHotelAdmin from './pages/AddHotelAdmin';
import HotelAdminDetails from './pages/HotelAdminDetails';
import EditHotelAdmin from './pages/EditHotelAdmin';
import DeliveryPartnersList from './pages/DeliveryPartnersList';
import AddDeliveryPartner from './pages/AddDeliveryPartner';
import DeliveryPartnerDetails from './pages/DeliveryPartnerDetails';
import ManageDeliveryPartner from './pages/ManageDeliveryPartner';
import OrdersList from './pages/OrdersList';
import BrandingAppIcons from './pages/BrandingAppIcons';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminValidating, setIsAdminValidating] = useState(false);

  const [apiError, setApiError] = useState(null); // { message, onRetry }
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isRedirecting = false;
    const unsubscribe = qbEvents.subscribe((message, onRetry) => {
      if (message === "UNAUTHORIZED") {
        if (!isRedirecting) {
          isRedirecting = true;
          handleClearSession();
          navigateTo('/login?expired=true');
        }
        return;
      }
      setApiError(prev => {
        if (prev && prev.message === message) return prev;
        return { message, onRetry };
      });
    });
    return unsubscribe;
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('qb_super_admin_token') || sessionStorage.getItem('qb_super_admin_token');
      const storedUser = localStorage.getItem('qb_super_admin_user');
      if (token && storedUser) {
        const payload = verifyJwtToken(token);
        if (payload && payload.role === 'super_admin') {
          return JSON.parse(storedUser);
        }
      }
    } catch (e) {}
    return null;
  });

  const navigateTo = (path) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Theme support
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleRetrySessionCheck = () => {
    setRetryCount(prev => prev + 1);
  };

  // Session validation hook
  useEffect(() => {
    if (currentPath !== '/login') {
      const token = localStorage.getItem('qb_super_admin_token') || sessionStorage.getItem('qb_super_admin_token');
      const storedUser = localStorage.getItem('qb_super_admin_user');

      if (!token || !storedUser) {
        navigateTo('/login');
        return;
      }

      setIsAdminValidating(true);

      const payload = verifyJwtToken(token);
      if (!payload || payload.role !== 'super_admin') {
        setIsAdminValidating(false);
        handleClearSession();
        navigateTo('/login');
        return;
      }

      // Re-fetch profile to confirm token is active and valid
      api.getProfile()
      .then(profile => {
        if (profile.role !== 'super_admin') {
          throw new Error('Not authorized');
        }
        const fullUser = {
          ...profile,
          token,
          accessToken: token
        };
        setCurrentUser(fullUser);
        localStorage.setItem('qb_super_admin_user', JSON.stringify(fullUser));
        setIsAdminValidating(false);
      })
      .catch((err) => {
        console.warn('Revalidation check failed:', err);
        setIsAdminValidating(false);
        if (err && err.status === 401) {
          handleClearSession();
          navigateTo('/login?expired=true');
        } else {
          qbEvents.emit(err.message || 'Server is temporarily unavailable. Please try again.', () => handleRetrySessionCheck());
        }
      });
    }
  }, [currentPath, retryCount]);

  const handleClearSession = () => {
    localStorage.removeItem('qb_super_admin_token');
    sessionStorage.removeItem('qb_super_admin_token');
    localStorage.removeItem('qb_super_admin_user');
    setCurrentUser(null);
  };

  const isExpired = new URLSearchParams(window.location.search).get('expired') === 'true';

  // --- ROUTING DISPATCHER ---

  const renderMain = () => {
    if (currentPath === '/login') {
    return (
      <SuperAdminLogin 
        initialSessionExpired={isExpired}
        onLoginSuccess={(userData) => {
          setCurrentUser(userData);
          navigateTo('/');
        }}
      />
    );
  }

  // Protected route validator
  const token = localStorage.getItem('qb_super_admin_token') || sessionStorage.getItem('qb_super_admin_token');
  if (!token || !currentUser) {
    navigateTo('/login');
    return null;
  }

  if (isAdminValidating) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: 'var(--text-main)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            border: '4px solid var(--border-color)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Validating Platform Session...</p>
        </div>
      </div>
    );
  }

  // Main Authenticated Super Admin Dashboard Workspace
  const isHotelRoute = currentPath === '/hotels' || currentPath === '/hotels/new' || (currentPath.startsWith('/hotels/') && (currentPath.split('/').length === 3 || (currentPath.split('/').length === 4 && currentPath.split('/')[3] === 'edit')));
  const isHotelAdminsRoute = currentPath === '/hotel-admins' || currentPath === '/hotel-admins/new' || (currentPath.startsWith('/hotel-admins/') && (currentPath.split('/').length === 3 || (currentPath.split('/').length === 4 && currentPath.split('/')[3] === 'edit')));
  const isDeliveryPartnersRoute = currentPath === '/delivery-partners' || currentPath === '/delivery-partners/new' || (currentPath.startsWith('/delivery-partners/') && (currentPath.split('/').length === 3 || (currentPath.split('/').length === 4 && (currentPath.split('/')[3] === 'edit' || currentPath.split('/')[3] === 'manage'))));
  const isOrdersRoute = currentPath === '/orders' || (currentPath.startsWith('/orders/') && currentPath.split('/').length === 3);
  const isBrandingRoute = currentPath === '/branding' || currentPath === '/branding/app-icons';
  const currentTab = isOrdersRoute ? 'orders' : (isDeliveryPartnersRoute ? 'delivery-partners' : (isHotelAdminsRoute ? 'hotel-admins' : (isHotelRoute ? 'hotels' : (isBrandingRoute ? 'branding' : 'dashboard'))));

  const renderContent = () => {
    if (currentPath === '/branding' || currentPath === '/branding/app-icons') {
      return <BrandingAppIcons onNavigate={navigateTo} />;
    }
    if (currentPath === '/orders') {
      return <OrdersList onNavigate={navigateTo} />;
    }
    if (currentPath.startsWith('/orders/')) {
      const parts = currentPath.split('/');
      const id = parseInt(parts[2], 10);
      if (!isNaN(id)) {
        if (parts.length === 3) {
          return <OrderDetails id={id} onNavigate={navigateTo} />;
        }
      }
    }
    if (currentPath === '/delivery-partners') {
      return <DeliveryPartnersList onNavigate={navigateTo} />;
    }
    if (currentPath === '/delivery-partners/new') {
      return <AddDeliveryPartner onNavigate={navigateTo} />;
    }
    if (currentPath.startsWith('/delivery-partners/')) {
      const parts = currentPath.split('/');
      const id = parseInt(parts[2], 10);
      if (!isNaN(id)) {
        if (parts.length === 3) {
          return <DeliveryPartnerDetails id={id} onNavigate={navigateTo} />;
        }
        if (parts.length === 4 && parts[3] === 'manage') {
          return <ManageDeliveryPartner id={id} onNavigate={navigateTo} />;
        }
      }
    }
    if (currentPath === '/hotel-admins/new') {
      return <AddHotelAdmin onNavigate={navigateTo} />;
    }
    if (currentPath === '/hotel-admins') {
      return <HotelAdminsList onNavigate={navigateTo} />;
    }
    if (currentPath.startsWith('/hotel-admins/')) {
      const parts = currentPath.split('/');
      const id = parseInt(parts[2], 10);
      if (!isNaN(id)) {
        if (parts.length === 3) {
          return <HotelAdminDetails id={id} onNavigate={navigateTo} />;
        }
        if (parts.length === 4 && parts[3] === 'edit') {
          return <EditHotelAdmin id={id} onNavigate={navigateTo} />;
        }
      }
    }
    if (currentPath === '/hotels/new') {
      return <AddHotel onNavigate={navigateTo} />;
    }
    if (currentPath === '/hotels') {
      return <HotelsList onNavigate={navigateTo} />;
    }
    if (currentPath.startsWith('/hotels/')) {
      const parts = currentPath.split('/');
      const id = parseInt(parts[2], 10);
      if (!isNaN(id)) {
        if (parts.length === 3) {
          return <HotelDetails id={id} onNavigate={navigateTo} />;
        }
        if (parts.length === 4 && parts[3] === 'edit') {
          return <EditHotel id={id} onNavigate={navigateTo} />;
        }
      }
    }
    return <Dashboard />;
  };

  return (
    <SuperAdminLayout
      currentUser={currentUser}
      currentTab={currentTab}
      onNavigate={navigateTo}
      onLogout={() => {
        handleClearSession();
        navigateTo('/login');
      }}
    >
      {renderContent()}
    </SuperAdminLayout>
  );
  };

  return (
    <>
      {renderMain()}
      {apiError && (
        <ApiErrorModal
          error={apiError}
          isRetrying={isRetrying}
          onRetry={async () => {
            if (isRetrying) return;
            setIsRetrying(true);
            try {
              await apiError.onRetry();
              setApiError(null);
            } catch (e) {}
            setIsRetrying(false);
          }}
          onCancel={() => setApiError(null)}
        />
      )}
    </>
  );
}

function ApiErrorModal({ error, isRetrying, onRetry, onCancel }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        border: '1px solid var(--border-color, #e5e7eb)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-rose, #EF4444)', fontSize: '20px', fontWeight: '600' }}>Connection Issue</h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-main, #374151)', fontSize: '14px', lineHeight: '1.5' }}>{error.message}</p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e5e7eb)',
              backgroundColor: 'transparent',
              color: 'var(--text-sub, #6b7280)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={onRetry}
            disabled={isRetrying}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary, #FF6B1A)',
              color: '#ffffff',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isRetrying && (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{
                width: '12px',
                height: '12px',
                border: '2px solid currentColor',
                borderRightColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.75s linear infinite'
              }} />
            )}
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
