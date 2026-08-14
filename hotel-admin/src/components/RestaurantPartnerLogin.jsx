import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  UserX,
  AlertTriangle,
  Clock,
  Building
} from 'lucide-react';
import { verifyJwtToken } from '../utils/jwt';
import { api } from '../services/api';

export default function RestaurantPartnerLogin({
  onLoginSuccess,
  initialSessionExpired = false
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // States: 'login', 'hotel-select', 'session-expired', 'unassigned', 'access-denied', 'auth-failed'
  const [viewState, setViewState] = useState(initialSessionExpired ? 'session-expired' : 'login');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Assigned Hotels state for selection view
  const [assignedHotels, setAssignedHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  
  // Custom toast/message for Forgot Password
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val.trim());
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setForgotPasswordMsg('Forgot password is not available yet. Please contact partner support.');
    setTimeout(() => setForgotPasswordMsg(''), 4000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setForgotPasswordMsg('');

    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.login(email.trim().toLowerCase(), password);

      const token = data.accessToken;
      const user = data.user;

      // Validate role
      if (user.role !== 'hotel_admin') {
        setViewState('access-denied');
        setIsLoading(false);
        return;
      }

      // Temporarily store token so api.getMyHotels picks it up from headers
      if (rememberMe) {
        localStorage.setItem('qb_token', token);
        localStorage.setItem('accessToken', token);
      } else {
        sessionStorage.setItem('qb_token', token);
        sessionStorage.setItem('accessToken', token);
      }

      // Fetch assigned hotels using central api layer
      const hotels = await api.getMyHotels();
      const activeHotels = (hotels || []).filter(h => h.isActive);

      if (activeHotels.length === 0) {
        // Clear token since user is unassigned
        localStorage.removeItem('qb_token');
        sessionStorage.removeItem('qb_token');
        localStorage.removeItem('accessToken');
        setViewState('unassigned');
        setIsLoading(false);
        return;
      }

      const sessionUser = {
        ...user,
        token,
        accessToken: token
      };
      
      localStorage.setItem('qb_user', JSON.stringify(sessionUser));

      if (activeHotels.length === 1) {
        const singleHotel = activeHotels[0];
        localStorage.setItem('qb_current_hotel', JSON.stringify(singleHotel));
        onLoginSuccess(sessionUser, singleHotel);
      } else {
        setAssignedHotels(activeHotels);
        setViewState('hotel-select');
      }

    } catch (err) {
      console.error(err);
      localStorage.removeItem('qb_token');
      sessionStorage.removeItem('qb_token');
      localStorage.removeItem('accessToken');
      setViewState('auth-failed');
      setIsLoading(false);
    }
  };

  const handleHotelSelect = (hotel) => {
    localStorage.setItem('qb_current_hotel', JSON.stringify(hotel));
    const storedUser = localStorage.getItem('qb_user');
    if (storedUser) {
      onLoginSuccess(JSON.parse(storedUser), hotel);
    }
  };

  if (viewState === 'session-expired') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#71717a',
        padding: '1.5rem'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2rem',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(244,63,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'var(--accent-rose)'
          }}>
            <Clock size={36} />
          </div>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            marginBottom: '0.75rem',
            color: 'var(--text-main)'
          }}>Session Expired</h2>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            lineHeight: '1.5'
          }}>
            For your security, you have been signed out due to inactivity. Please sign in again.
          </p>
          <button
            onClick={() => setViewState('login')}
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            Re-authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-main)',
      color: 'var(--text-main)'
    }}>
      {/* Left Branding Panel */}
      <div style={{
        flex: 1.1,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3.5rem',
        borderRight: '1px solid var(--border-color)',
        position: 'relative'
      }} className="login-left-panel">
        <div>
          {/* QuickBite logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '4rem'
          }}>
            <div style={{
              background: 'var(--primary)',
              color: '#ffffff',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.25rem'
            }}>Q</div>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '900',
              color: 'var(--primary)',
              letterSpacing: '-0.5px'
            }}>QuickBite</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '850',
            lineHeight: '1.15',
            color: 'var(--text-main)',
            marginBottom: '1rem',
            maxWidth: '480px'
          }}>Restaurant Partner Login</h1>
          <p style={{
            fontSize: '1.05rem',
            lineHeight: '1.6',
            color: 'var(--text-muted)',
            maxWidth: '420px'
          }}>
            Manage your restaurant, menu and orders from one centralized, highly-efficient platform.
          </p>
        </div>

        {/* Dynamic chef illustration */}
        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
          <img 
            src="/restaurant_login_chef_1786277019230.png"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80';
            }}
            alt="QuickBite Chef Kitchen Dashboard illustration"
            style={{
              maxWidth: '90%',
              maxHeight: '380px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              objectFit: 'cover'
            }}
          />
        </div>
      </div>

      {/* Right Login Card Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem',
        background: '#f8fafc'
      }}>
        {viewState === 'hotel-select' ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>Select Restaurant</h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              Your account has access to multiple restaurant branches. Please choose one to manage:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assignedHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  onClick={() => handleHotelSelect(hotel)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--bg-card)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--primary-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-card)';
                  }}
                >
                  <div style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '800' }}>{hotel.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {hotel.city || 'Kozhikode, Kerala'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewState('login')}
              className="btn-muted"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem' }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            {/* Header */}
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '850',
              lineHeight: '1.2',
              marginBottom: '0.35rem',
              color: 'var(--text-main)'
            }}>Welcome back</h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem'
            }}>Sign in to your restaurant dashboard.</p>

            {/* Error States */}
            {viewState === 'auth-failed' && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fee2e2',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.85rem'
              }}>
                <ShieldAlert size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#991b1b', marginBottom: '0.2rem' }}>
                    Authentication Failed
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#b91c1c', lineHeight: '1.4' }}>
                    The email or password you entered is incorrect. Please try again.
                  </p>
                </div>
              </div>
            )}

            {viewState === 'access-denied' && (
              <div style={{
                background: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.85rem'
              }}>
                <UserX size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#991b1b', marginBottom: '0.2rem' }}>
                    Access Denied
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#b91c1c', lineHeight: '1.4' }}>
                    This account is not authorized for restaurant administrative access. Contact your regional manager.
                  </p>
                </div>
              </div>
            )}

            {viewState === 'unassigned' && (
              <div style={{
                background: '#fffbeb',
                borderLeft: '4px solid #d97706',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.85rem'
              }}>
                <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#92400e', marginBottom: '0.2rem' }}>
                    Unassigned Account
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#b45309', lineHeight: '1.4' }}>
                    Your account is active, but no branch is currently assigned to it. Please verify with HR.
                  </p>
                </div>
              </div>
            )}

            {/* Validation warning banner */}
            {errorMessage && (
              <div style={{
                background: 'rgba(244,63,94,0.06)',
                border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent-rose)',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                fontWeight: '700'
              }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Forgot Password Feedback message */}
            {forgotPasswordMsg && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                color: '#1e40af',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                fontWeight: '700'
              }}>
                ℹ️ {forgotPasswordMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: 'var(--text-main)',
                  marginBottom: '0.5rem'
                }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)'
                  }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@restaurant.com"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <label style={{
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: 'var(--text-main)'
                  }}>Password</label>
                  <a 
                    href="#" 
                    onClick={handleForgotPasswordClick}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      color: 'var(--primary)',
                      textDecoration: 'none'
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)'
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--primary)'
                  }}
                />
                <label htmlFor="rememberMe" style={{
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}>
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem'
                }}
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{
              marginTop: '2.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Need help accessing your restaurant account?
              </span>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Partner Support info: email support@quickbite.com or call 1800-REST-HELP');
                }}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: 'var(--primary)',
                  textDecoration: 'none'
                }}
              >
                Contact Partner Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
