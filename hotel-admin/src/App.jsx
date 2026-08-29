import React, { useState, useEffect } from 'react';
import { verifyJwtToken } from './utils/jwt';
import RestaurantPartnerLogin from './components/RestaurantPartnerLogin';
import HotelAdminDashboard from './components/HotelAdminDashboard';
import { AlertTriangle } from 'lucide-react';
import { api, qbEvents } from './services/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminValidating, setIsAdminValidating] = useState(false);
  const [adminAssignedHotels, setAdminAssignedHotels] = useState([]);
  
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

  const handleRetrySessionCheck = () => {
    setRetryCount(prev => prev + 1);
  };

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

  const renderMain = () => {
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
