import React, { useState, useEffect } from 'react';
import { verifyJwtToken } from './utils/jwt';
import { api } from './services/api';
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
        handleClearSession();
        setIsAdminValidating(false);
        navigateTo('/login?expired=true');
      });
    }
  }, [currentPath]);

  const handleClearSession = () => {
    localStorage.removeItem('qb_super_admin_token');
    sessionStorage.removeItem('qb_super_admin_token');
    localStorage.removeItem('qb_super_admin_user');
    setCurrentUser(null);
  };

  const isExpired = new URLSearchParams(window.location.search).get('expired') === 'true';

  // --- ROUTING DISPATCHER ---

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
}
