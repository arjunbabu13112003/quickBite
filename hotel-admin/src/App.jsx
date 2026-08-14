import React, { useState, useEffect } from 'react';
import { verifyJwtToken } from './utils/jwt';
import RestaurantPartnerLogin from './components/RestaurantPartnerLogin';
import HotelAdminDashboard from './components/HotelAdminDashboard';
import { AlertTriangle } from 'lucide-react';
import { api } from './services/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminValidating, setIsAdminValidating] = useState(false);
  const [adminAssignedHotels, setAdminAssignedHotels] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('qb_token') || sessionStorage.getItem('qb_token');
      const storedUser = localStorage.getItem('qb_user');
      if (token && storedUser) {
        const payload = verifyJwtToken(token);
        if (payload && payload.role === 'hotel_admin') {
          return JSON.parse(storedUser);
        }
      }
    } catch (e) {}
    return null;
  });

  const [currentHotel, setCurrentHotel] = useState(() => {
    try {
      const stored = localStorage.getItem('qb_current_hotel');
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
  }, [theme]);

  // Session validation and active branch checking
  useEffect(() => {
    if (currentPath !== '/login') {
      const token = localStorage.getItem('qb_token') || sessionStorage.getItem('qb_token');
      const storedUser = localStorage.getItem('qb_user');

      if (!token || !storedUser) {
        navigateTo('/login');
        return;
      }

      setIsAdminValidating(true);

      // Validate token structure & role
      const payload = verifyJwtToken(token);
      if (!payload || payload.role !== 'hotel_admin') {
        setIsAdminValidating(false);
        handleClearSession();
        navigateTo('/login');
        return;
      }

      // Re-fetch assigned hotels on refresh/path transition using central api layer
      api.getMyHotels()
      .then(hotels => {
        const activeHotels = (hotels || []).filter(h => h.isActive);
        setAdminAssignedHotels(activeHotels);
        
        if (activeHotels.length === 0) {
          setCurrentHotel(null);
          localStorage.removeItem('qb_current_hotel');
        } else {
          // Check if current stored hotel is still in active assignment list
          const stillAssigned = activeHotels.find(h => h.id === currentHotel?.id);
          if (stillAssigned) {
            setCurrentHotel(stillAssigned);
            localStorage.setItem('qb_current_hotel', JSON.stringify(stillAssigned));
          } else {
            const defaultHotel = activeHotels[0];
            setCurrentHotel(defaultHotel);
            localStorage.setItem('qb_current_hotel', JSON.stringify(defaultHotel));
          }
        }
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
    localStorage.removeItem('qb_token');
    sessionStorage.removeItem('qb_token');
    localStorage.removeItem('qb_user');
    localStorage.removeItem('qb_current_hotel');
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    setCurrentHotel(null);
  };

  const isExpired = new URLSearchParams(window.location.search).get('expired') === 'true';

  // --- ROUTING VIEWS DISPATCHER ---

  if (currentPath === '/login') {
    return (
      <RestaurantPartnerLogin 
        initialSessionExpired={isExpired}
        onLoginSuccess={(userData, hotelData) => {
          setCurrentUser(userData);
          setCurrentHotel(hotelData);
          navigateTo('/');
        }}
      />
    );
  }

  // Protected route validator
  const token = localStorage.getItem('qb_token') || sessionStorage.getItem('qb_token');
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
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Validating Restaurant Partner Session...</p>
        </div>
      </div>
    );
  }

  // Unassigned account state
  if (adminAssignedHotels.length === 0 && !currentHotel) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '1.5rem'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2.5rem',
          maxWidth: '460px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fffbeb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#d97706'
          }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>Unassigned Account</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
            Your account is active, but no branch is currently assigned to it. Please verify with HR.
          </p>
          <button
            onClick={() => {
              handleClearSession();
              navigateTo('/login');
            }}
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Page
  return (
    <HotelAdminDashboard 
      currentUser={currentUser}
      currentHotel={currentHotel}
      hasMultipleHotels={adminAssignedHotels.length > 1}
      onChangeHotel={() => {
        navigateTo('/login');
      }}
      onLogout={() => {
        handleClearSession();
        navigateTo('/login');
      }}
    />
  );
}
