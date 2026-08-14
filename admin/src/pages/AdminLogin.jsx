import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  UserX,
  Clock,
  Building,
  Shield,
} from 'lucide-react';
import { api, storeToken } from '../services/api';

export default function AdminLogin({ onLoginSuccess, initialSessionExpired = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // View states: 'login' | 'hotel-select' | 'auth-failed' | 'access-denied' | 'session-expired'
  const [viewState, setViewState] = useState(initialSessionExpired ? 'session-expired' : 'login');
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');

  // Hotel selection state (for hotel_admin with multiple hotels)
  const [assignedHotels, setAssignedHotels] = useState([]);
  const [pendingUser, setPendingUser] = useState(null);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setForgotPasswordMsg('Password reset is not available yet. Please contact platform support.');
    setTimeout(() => setForgotPasswordMsg(''), 5000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setForgotPasswordMsg('');

    if (!email.trim()) { setErrorMessage('Email address is required.'); return; }
    if (!validateEmail(email)) { setErrorMessage('Please enter a valid email address.'); return; }
    if (!password) { setErrorMessage('Password is required.'); return; }

    setIsLoading(true);

    try {
      const data = await api.login(email.trim().toLowerCase(), password);
      const token = data.accessToken;
      const user = data.user;

      // Reject any role that is not super_admin or hotel_admin
      if (user.role !== 'super_admin' && user.role !== 'hotel_admin') {
        setViewState('access-denied');
        setIsLoading(false);
        return;
      }

      // Store token using unified key
      storeToken(token, rememberMe);

      const sessionUser = { ...user, token, accessToken: token };
      localStorage.setItem('qb_admin_user', JSON.stringify(sessionUser));

      if (user.role === 'super_admin') {
        // Super admin: proceed directly
        onLoginSuccess(sessionUser, null);
        return;
      }

      // Hotel admin: fetch assigned hotels
      const hotels = await api.getMyHotels();
      const activeHotels = (hotels || []).filter((h) => h.isActive);

      if (activeHotels.length === 0) {
        // Clear token — unassigned account cannot access portal
        localStorage.removeItem('qb_admin_token');
        sessionStorage.removeItem('qb_admin_token');
        setViewState('unassigned');
        setIsLoading(false);
        return;
      }

      if (activeHotels.length === 1) {
        const hotel = activeHotels[0];
        localStorage.setItem('qb_admin_hotel', JSON.stringify(hotel));
        onLoginSuccess(sessionUser, hotel);
        return;
      }

      // Multiple hotels — show selection step
      setPendingUser(sessionUser);
      setAssignedHotels(activeHotels);
      setViewState('hotel-select');

    } catch (err) {
      console.error('[Admin Login]', err);
      localStorage.removeItem('qb_admin_token');
      sessionStorage.removeItem('qb_admin_token');
      setViewState('auth-failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHotelSelect = (hotel) => {
    localStorage.setItem('qb_admin_hotel', JSON.stringify(hotel));
    onLoginSuccess(pendingUser, hotel);
  };

  // ─── Session Expired Screen ──────────────────────────────────────────────

  if (viewState === 'session-expired') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '1.5rem',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2.5rem',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--bg-warning-subtle)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-warning)',
          }}>
            <Clock size={36} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
            Session Expired
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Your administrative session has expired. Please sign in again to continue.
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

  // ─── Main Login Layout ───────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-main)',
      color: 'var(--text-main)',
    }}>

      {/* ── Left Branding Panel ── */}
      <div
        className="login-left-panel"
        style={{
          flex: 1.1,
          background: 'linear-gradient(145deg, #0f172a 0%, #1e2d4a 50%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,38,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,38,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '4rem' }}>
            <div style={{
              background: 'var(--primary)',
              color: '#ffffff',
              width: '40px', height: '40px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '1.4rem',
              boxShadow: '0 4px 14px rgba(255,107,38,0.4)',
            }}>Q</div>
            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
              QuickBite
            </span>
          </div>

          <h1 style={{
            fontSize: '2.6rem', fontWeight: '900', lineHeight: '1.15',
            color: '#ffffff', marginBottom: '1.25rem', maxWidth: '440px',
          }}>
            QuickBite<br />
            <span style={{ color: 'var(--primary)' }}>Admin Portal</span>
          </h1>
          <p style={{
            fontSize: '1.05rem', lineHeight: '1.7',
            color: 'rgba(255,255,255,0.6)', maxWidth: '380px',
          }}>
            Manage your entire QuickBite workspace — restaurants, orders, delivery partners and platform analytics — from one centralized dashboard.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {[
            { icon: '🏨', text: 'Hotel & Restaurant Management' },
            { icon: '🛒', text: 'Platform Order Oversight' },
            { icon: '🚴', text: 'Delivery Partner Control' },
          ].map((f) => (
            <div key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 1rem', marginBottom: '0.6rem',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
              <span style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Login Card Panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem',
        background: 'var(--bg-main)',
      }}>

        {/* Hotel Select Step */}
        {viewState === 'hotel-select' ? (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            padding: '2.5rem', width: '100%', maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'var(--primary-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem', color: 'var(--primary)',
              }}>
                <Building size={24} />
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                Select Restaurant
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Your account manages multiple branches. Choose one to continue:
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {assignedHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  onClick={() => handleHotelSelect(hotel)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleHotelSelect(hotel)}
                  style={{
                    padding: '1.25rem', borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--border-color)', cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    background: 'var(--bg-card)',
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
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    width: '42px', height: '42px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Building size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                      {hotel.name}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {hotel.city || 'Kozhikode, Kerala'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setViewState('login')}
              className="btn-secondary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem' }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (

          /* ── Login Form Card ── */
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem', width: '100%', maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
            position: 'relative',
          }}>

            {/* Security badge */}
            <div style={{
              position: 'absolute', top: '-1px', right: '2rem',
              background: 'var(--primary)', color: '#fff',
              padding: '0.3rem 0.85rem', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
              fontSize: '0.68rem', fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <Shield size={11} /> Secured Portal
            </div>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.9rem', fontWeight: '900', lineHeight: '1.2',
                marginBottom: '0.4rem', color: 'var(--text-main)',
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                Sign in to manage your QuickBite workspace
              </p>
            </div>

            {/* ── Error States ── */}
            {viewState === 'auth-failed' && (
              <div style={{
                background: 'var(--bg-danger-subtle)', border: '1.5px solid #fee2e2',
                borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
                marginBottom: '1.5rem', display: 'flex', gap: '0.85rem',
              }}>
                <ShieldAlert size={22} style={{ color: 'var(--text-danger)', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-danger)', marginBottom: '0.2rem' }}>
                    Authentication Failed
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-danger)', lineHeight: '1.4' }}>
                    The email or password you entered is incorrect. Please try again.
                  </p>
                </div>
              </div>
            )}

            {viewState === 'access-denied' && (
              <div style={{
                background: 'var(--bg-main)', border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
                marginBottom: '1.5rem', display: 'flex', gap: '0.85rem',
              }}>
                <UserX size={22} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    Access Denied
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Access denied. This portal is for authorized staff only.
                  </p>
                </div>
              </div>
            )}

            {viewState === 'unassigned' && (
              <div style={{
                background: 'var(--bg-warning-subtle)', border: '1.5px solid #fef3c7',
                borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
                marginBottom: '1.5rem', display: 'flex', gap: '0.85rem',
              }}>
                <Clock size={22} style={{ color: 'var(--text-warning)', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#92400e', marginBottom: '0.2rem' }}>
                    Unassigned Account
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-warning)', lineHeight: '1.4' }}>
                    Your account is active but no restaurant is currently assigned. Contact your administrator.
                  </p>
                </div>
              </div>
            )}

            {/* Inline validation warning */}
            {errorMessage && (
              <div style={{
                background: 'rgba(244,63,94,0.06)',
                border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)',
                padding: '0.75rem 1rem', fontSize: '0.85rem',
                marginBottom: '1.5rem', fontWeight: '700',
              }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Forgot password info */}
            {forgotPasswordMsg && (
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)', color: '#1e40af',
                padding: '0.75rem 1rem', fontSize: '0.85rem',
                marginBottom: '1.5rem', fontWeight: '700',
              }}>
                ℹ️ {forgotPasswordMsg}
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: '0.82rem', fontWeight: '800',
                  color: 'var(--text-main)', marginBottom: '0.5rem',
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-subtle)',
                  }} />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@quickbite.com"
                    autoComplete="email"
                    style={{
                      width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                      fontSize: '0.92rem', transition: 'border-color var(--transition-fast)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '0.5rem',
                }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    Password
                  </label>
                  <a
                    href="#"
                    onClick={handleForgotPasswordClick}
                    style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-subtle)',
                  }} />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%', padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                      fontSize: '0.92rem', transition: 'border-color var(--transition-fast)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', color: 'var(--text-subtle)', cursor: 'pointer',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="admin-remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="admin-remember-me" style={{
                  fontSize: '0.82rem', fontWeight: '700',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="admin-sign-in-btn"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: '100%', padding: '0.9rem',
                  justifyContent: 'center', gap: '0.5rem',
                  fontSize: '0.97rem', fontWeight: '700',
                  opacity: isLoading ? 0.75 : 1,
                }}
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: '2.5rem', paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-color)', textAlign: 'center',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Need access help?
              </span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Contact support: admin-support@quickbite.com');
                }}
                style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none' }}
              >
                Contact Technical Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
