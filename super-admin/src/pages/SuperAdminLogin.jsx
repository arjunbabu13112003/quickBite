import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, UserX, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function SuperAdminLogin({
  onLoginSuccess,
  initialSessionExpired = false
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // States: 'login', 'auth-failed', 'access-denied', 'session-expired'
  const [viewState, setViewState] = useState(initialSessionExpired ? 'session-expired' : 'login');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Custom toast/message for Forgot Password
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val.trim());
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setForgotPasswordMsg('Forgot password is not available yet. Please contact platform support.');
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
      if (user.role !== 'super_admin') {
        setViewState('access-denied');
        setIsLoading(false);
        return;
      }

      // Store JWT token
      if (rememberMe) {
        localStorage.setItem('qb_super_admin_token', token);
      } else {
        sessionStorage.setItem('qb_super_admin_token', token);
      }

      const sessionUser = {
        ...user,
        token,
        accessToken: token
      };
      
      localStorage.setItem('qb_super_admin_user', JSON.stringify(sessionUser));
      onLoginSuccess(sessionUser);

    } catch (err) {
      console.error(err);
      setViewState('auth-failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f1f5f9',
      color: 'var(--text-main)',
      padding: '2rem',
      position: 'relative'
    }}>
      
      {/* Platform Administration Logo Branding */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
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
            fontWeight: '900',
            fontSize: '1.35rem'
          }}>Q</div>
          <span style={{
            fontSize: '1.8rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            letterSpacing: '-0.5px'
          }}>QuickBite</span>
        </div>
        <span style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontWeight: '850',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>Platform Administration</span>
      </div>

      {/* Main Login Card */}
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
        }}>Sign in to manage the QuickBite platform.</p>

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
                The email or password entered is incorrect.
              </p>
            </div>
          </div>
        )}

        {viewState === 'access-denied' && (
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.85rem'
          }}>
            <UserX size={22} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Authorization Required
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                This account is not authorized to access QuickBite Platform Administration.
              </p>
            </div>
          </div>
        )}

        {viewState === 'session-expired' && (
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #fef3c7',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.85rem'
          }}>
            <Clock size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#92400e', marginBottom: '0.2rem' }}>
                Session Expired
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#b45309', lineHeight: '1.4' }}>
                Your administrative session has expired. Please sign in again to continue.
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
            ℹ5️ {forgotPasswordMsg}
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
                placeholder="admin@quickbite.com"
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
              Remember me
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
            Need help accessing the admin console?
          </span>
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert('Technical Support: email admin-support@quickbite.com or contact platform sysadmins');
            }}
            style={{
              fontSize: '0.82rem',
              fontWeight: '800',
              color: 'var(--primary)',
              textDecoration: 'none'
            }}
          >
            Contact Technical Support
          </a>
        </div>
      </div>
    </div>
  );
}
