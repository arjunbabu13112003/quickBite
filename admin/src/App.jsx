import React, { useState, useEffect } from 'react';
import { verifyJwtToken } from './utils/jwt';
import { api, clearSession, getStoredToken } from './services/api';
import AdminLogin from './pages/AdminLogin';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import HotelAdminLayout from './layouts/HotelAdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Super Admin Pages
import Dashboard from './pages/super-admin/Dashboard';
import HotelsList from './pages/super-admin/HotelsList';
import AddHotel from './pages/super-admin/AddHotel';
import HotelDetails from './pages/super-admin/HotelDetails';
import EditHotel from './pages/super-admin/EditHotel';
import HotelAdminsList from './pages/super-admin/HotelAdminsList';
import AddHotelAdmin from './pages/super-admin/AddHotelAdmin';
import HotelAdminDetails from './pages/super-admin/HotelAdminDetails';
import EditHotelAdmin from './pages/super-admin/EditHotelAdmin';
import DeliveryPartnersList from './pages/super-admin/DeliveryPartnersList';
import AddDeliveryPartner from './pages/super-admin/AddDeliveryPartner';
import DeliveryPartnerDetails from './pages/super-admin/DeliveryPartnerDetails';
import ManageDeliveryPartner from './pages/super-admin/ManageDeliveryPartner';
import OrdersList from './pages/super-admin/OrdersList';
import OrderDetails from './pages/super-admin/OrderDetails';
import HomeFoodCategoriesList from './pages/super-admin/HomeFoodCategoriesList';
import { SuperAdminOffersList, SuperAdminCampaignsList, SuperAdminCreateCampaign, SuperAdminChooseOfferType } from './pages/super-admin/OffersManagement';

// Hotel Admin Pages
import HotelAdminDashboard from './pages/hotel-admin/HotelAdminDashboard';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('qb_admin_theme') || 'light';
  });
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminValidating, setIsAdminValidating] = useState(false);
  const [adminAssignedHotels, setAdminAssignedHotels] = useState([]);

  // Session User state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = getStoredToken();
      const storedUser = localStorage.getItem('qb_admin_user');
      if (token && storedUser) {
        const payload = verifyJwtToken(token);
        if (payload && (payload.role === 'super_admin' || payload.role === 'hotel_admin')) {
          return JSON.parse(storedUser);
        }
      }
    } catch (e) {}
    return null;
  });

  // Current Hotel state (for hotel_admin)
  const [currentHotel, setCurrentHotel] = useState(() => {
    try {
      const stored = localStorage.getItem('qb_admin_hotel');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
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
    localStorage.setItem('qb_admin_theme', theme);
  }, [theme]);

  // Session validation and active branch checking
  useEffect(() => {
    if (currentPath !== '/login') {
      const token = getStoredToken();
      const storedUser = localStorage.getItem('qb_admin_user');

      if (!token || !storedUser) {
        navigateTo('/login');
        return;
      }

      setIsAdminValidating(true);

      const payload = verifyJwtToken(token);
      if (!payload || (payload.role !== 'super_admin' && payload.role !== 'hotel_admin')) {
        setIsAdminValidating(false);
        clearSession();
        navigateTo('/login');
        return;
      }

      // Restore session details
      if (payload.role === 'super_admin') {
        api.getProfile()
          .then(profile => {
            if (profile.role !== 'super_admin') throw new Error('Not authorized');
            const fullUser = { ...profile, token, accessToken: token };
            setCurrentUser(fullUser);
            localStorage.setItem('qb_admin_user', JSON.stringify(fullUser));
            setIsAdminValidating(false);
          })
          .catch((err) => {
            console.warn('Revalidation check failed:', err);
            clearSession();
            setIsAdminValidating(false);
            navigateTo('/login?expired=true');
          });
      } else if (payload.role === 'hotel_admin') {
        api.getMyHotels()
          .then(hotels => {
            const activeHotels = (hotels || []).filter(h => h.isActive);
            setAdminAssignedHotels(activeHotels);

            if (activeHotels.length === 0) {
              setCurrentHotel(null);
              localStorage.removeItem('qb_admin_hotel');
            } else {
              const stillAssigned = activeHotels.find(h => h.id === currentHotel?.id);
              if (stillAssigned) {
                setCurrentHotel(stillAssigned);
                localStorage.setItem('qb_admin_hotel', JSON.stringify(stillAssigned));
              } else {
                const defaultHotel = activeHotels[0];
                setCurrentHotel(defaultHotel);
                localStorage.setItem('qb_admin_hotel', JSON.stringify(defaultHotel));
              }
            }
            setIsAdminValidating(false);
          })
          .catch((err) => {
            console.warn('Revalidation check failed:', err);
            clearSession();
            setIsAdminValidating(false);
            navigateTo('/login?expired=true');
          });
      }
    }
  }, [currentPath]);

  const handleLogout = () => {
    clearSession();
    navigateTo('/login');
  };

  const isExpired = new URLSearchParams(window.location.search).get('expired') === 'true';

  // ─── Routing Dispatcher ──────────────────────────────────────────────────

  if (currentPath === '/login') {
    return (
      <AdminLogin
        initialSessionExpired={isExpired}
        onLoginSuccess={(userData, hotelData) => {
          setCurrentUser(userData);
          if (hotelData) {
            setCurrentHotel(hotelData);
            navigateTo('/hotel-admin/dashboard');
          } else {
            navigateTo('/super-admin/dashboard');
          }
        }}
      />
    );
  }

  // Route protection gate
  const token = getStoredToken();
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
        background: 'var(--bg-main)',
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
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Validating Admin Session...</p>
        </div>
      </div>
    );
  }

  // ─── Super Admin Routing & Layout Dispatch ───────────────────────────────
  if (currentUser.role === 'super_admin') {
    const isHotelRoute = currentPath === '/super-admin/hotels' || currentPath === '/super-admin/hotels/new' || (currentPath.startsWith('/super-admin/hotels/') && (currentPath.split('/').length === 4 || (currentPath.split('/').length === 5 && currentPath.split('/')[4] === 'edit')));
    const isHotelAdminsRoute = currentPath === '/super-admin/hotel-admins' || currentPath === '/super-admin/hotel-admins/new' || (currentPath.startsWith('/super-admin/hotel-admins/') && (currentPath.split('/').length === 4 || (currentPath.split('/').length === 5 && currentPath.split('/')[4] === 'edit')));
    const isDeliveryPartnersRoute = currentPath === '/super-admin/delivery-partners' || currentPath === '/super-admin/delivery-partners/new' || (currentPath.startsWith('/super-admin/delivery-partners/') && (currentPath.split('/').length === 4 || (currentPath.split('/').length === 5 && (currentPath.split('/')[4] === 'edit' || currentPath.split('/')[4] === 'manage'))));
    const isOrdersRoute = currentPath === '/super-admin/orders' || (currentPath.startsWith('/super-admin/orders/') && currentPath.split('/').length === 4);
    const isFoodCategoriesRoute = currentPath === '/super-admin/food-categories';
    const isOffersRoute = currentPath === '/super-admin/offers' || currentPath.startsWith('/super-admin/offers');

    const currentTab = isOffersRoute ? 'offers' : (isFoodCategoriesRoute ? 'food-categories' : (isOrdersRoute ? 'orders' : (isDeliveryPartnersRoute ? 'delivery-partners' : (isHotelAdminsRoute ? 'hotel-admins' : (isHotelRoute ? 'hotels' : 'dashboard')))));

    const renderSuperAdminContent = () => {
      if (currentPath === '/super-admin/offers') {
        return <SuperAdminOffersList onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/offers/choose') {
        return <SuperAdminChooseOfferType onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/offers/99store') {
        return <SuperAdminCampaignsList onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/offers/99store/new') {
        return <SuperAdminCreateCampaign onNavigate={navigateTo} />;
      }
      if (currentPath.startsWith('/super-admin/offers/99store/') && currentPath.endsWith('/edit')) {
        const parts = currentPath.split('/');
        const id = parseInt(parts[4], 10);
        if (!isNaN(id)) {
          return <SuperAdminCreateCampaign id={id} onNavigate={navigateTo} />;
        }
      }
      if (currentPath === '/super-admin/food-categories') {
        return <HomeFoodCategoriesList onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/orders') {
        return <OrdersList onNavigate={navigateTo} />;
      }
      if (currentPath.startsWith('/super-admin/orders/')) {
        const parts = currentPath.split('/');
        const id = parseInt(parts[3], 10);
        if (!isNaN(id)) {
          return <OrderDetails id={id} onNavigate={navigateTo} />;
        }
      }
      if (currentPath === '/super-admin/delivery-partners') {
        return <DeliveryPartnersList onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/delivery-partners/new') {
        return <AddDeliveryPartner onNavigate={navigateTo} />;
      }
      if (currentPath.startsWith('/super-admin/delivery-partners/')) {
        const parts = currentPath.split('/');
        const id = parseInt(parts[3], 10);
        if (!isNaN(id)) {
          if (parts.length === 4) {
            return <DeliveryPartnerDetails id={id} onNavigate={navigateTo} />;
          }
          if (parts.length === 5 && parts[4] === 'manage') {
            return <ManageDeliveryPartner id={id} onNavigate={navigateTo} />;
          }
        }
      }
      if (currentPath === '/super-admin/hotel-admins/new') {
        return <AddHotelAdmin onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/hotel-admins') {
        return <HotelAdminsList onNavigate={navigateTo} />;
      }
      if (currentPath.startsWith('/super-admin/hotel-admins/')) {
        const parts = currentPath.split('/');
        const id = parseInt(parts[3], 10);
        if (!isNaN(id)) {
          if (parts.length === 4) {
            return <HotelAdminDetails id={id} onNavigate={navigateTo} />;
          }
          if (parts.length === 5 && parts[4] === 'edit') {
            return <EditHotelAdmin id={id} onNavigate={navigateTo} />;
          }
        }
      }
      if (currentPath === '/super-admin/hotels/new') {
        return <AddHotel onNavigate={navigateTo} />;
      }
      if (currentPath === '/super-admin/hotels') {
        return <HotelsList onNavigate={navigateTo} />;
      }
      if (currentPath.startsWith('/super-admin/hotels/')) {
        const parts = currentPath.split('/');
        const id = parseInt(parts[3], 10);
        if (!isNaN(id)) {
          if (parts.length === 4) {
            return <HotelDetails id={id} onNavigate={navigateTo} />;
          }
          if (parts.length === 5 && parts[4] === 'edit') {
            return <EditHotel id={id} onNavigate={navigateTo} />;
          }
        }
      }
      return <Dashboard />;
    };

    return (
      <ProtectedRoute allowedRole="super_admin" currentUser={currentUser}>
        <SuperAdminLayout
          currentUser={currentUser}
          currentTab={currentTab}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
        >
          {renderSuperAdminContent()}
        </SuperAdminLayout>
      </ProtectedRoute>
    );
  }

  // ─── Hotel Admin Routing & Layout Dispatch ───────────────────────────────
  if (currentUser.role === 'hotel_admin') {
    // Unassigned hotel admin state
    if (adminAssignedHotels.length === 0 && !currentHotel) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>Unassigned Account</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Your account is active, but no branch is currently assigned to it.
            </p>
            <button onClick={handleLogout} className="btn-primary" style={{ width: '100%' }}>
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    return (
      <ProtectedRoute allowedRole="hotel_admin" currentUser={currentUser}>
        <HotelAdminLayout>
          <HotelAdminDashboard
            currentUser={currentUser}
            currentHotel={currentHotel}
            hasMultipleHotels={adminAssignedHotels.length > 1}
            onChangeHotel={() => navigateTo('/login')}
            onLogout={handleLogout}
            theme={theme}
            setTheme={setTheme}
          />
        </HotelAdminLayout>
      </ProtectedRoute>
    );
  }

  // Default fallback (Access Denied)
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Access Denied</div>;
}
