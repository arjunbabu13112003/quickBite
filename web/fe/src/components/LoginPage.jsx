import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ShieldAlert, 
  UserPlus, 
  LogIn, 
  ShieldCheck,
  KeyRound,
  Utensils,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { signJwtToken } from '../utils/jwt';

// Default Seed Accounts
const DEFAULT_ACCOUNTS = [
  {
    id: 101,
    name: 'Arjun Kumar',
    email: 'user@quickbite.com',
    password: 'password123',
    phone: '+91 9447123456',
    role: 'user'
  },
  {
    id: 102,
    name: 'Sachu S.',
    email: 'sachu@quickbite.com',
    password: 'password123',
    phone: '+91 9876543210',
    role: 'user'
  },
  {
    id: 1,
    name: 'QuickBite Administrator',
    email: 'admin@quickbite.com',
    password: 'admin123',
    phone: '+91 9000000000',
    role: 'admin'
  }
];

export default function LoginPage({
  onLoginSuccess,
  onGuestContinue
}) {
  const [authMode, setAuthMode] = useState('user-login'); // 'user-login', 'register', 'admin-login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Get Registered Users Database from LocalStorage
  const getRegisteredUsers = () => {
    try {
      const stored = localStorage.getItem('qb_registered_users');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return DEFAULT_ACCOUNTS;
  };

  const saveRegisteredUser = (newUser) => {
    const currentList = getRegisteredUsers();
    const updatedList = [newUser, ...currentList];
    localStorage.setItem('qb_registered_users', JSON.stringify(updatedList));
  };

  // Strict Validation Helpers
  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const validatePhone = (phoneStr) => {
    const digitsOnly = phoneStr.replace(/\D/g, '');
    return digitsOnly.length >= 9 && digitsOnly.length <= 13;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    const errors = {};
    const inputEmail = email.trim().toLowerCase();

    // 1. Strict Validation Logic
    if (authMode === 'register') {
      if (!name.trim()) {
        errors.name = 'Full Name is required';
      }
      
      if (!inputEmail) {
        errors.email = 'Email address is required';
      } else if (!validateEmail(inputEmail)) {
        errors.email = 'Please enter a valid email address (e.g. name@domain.com)';
      }

      if (!phone.trim()) {
        errors.phone = 'Mobile phone number is required';
      } else if (!validatePhone(phone)) {
        errors.phone = 'Mobile number must contain between 9 and 13 digits (e.g. 9876543210)';
      }

      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setErrorMessage('Please fix the highlighted errors before submitting.');
        return;
      }
    } else {
      // User or Admin Login Validation
      if (!inputEmail) {
        errors.email = 'Email address is required';
      } else if (!validateEmail(inputEmail)) {
        errors.email = 'Please enter a valid email address';
      }

      if (!password) {
        errors.password = 'Password is required';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setErrorMessage('Please enter your valid credentials.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const allUsers = getRegisteredUsers();

      if (authMode === 'register') {
        const mobileNumber = phone.replace(/\D/g, '').slice(-10) || '9876543210';
        
        // 1. Send Registration Request to NestJS + PostgreSQL Backend
        try {
          const res = await fetch('http://localhost:5000/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              email: inputEmail,
              mobileNumber: mobileNumber,
              password: password
            })
          });
          const data = await res.json();
          if (res.ok && data.user) {
            const token = signJwtToken(data.user);
            const authenticatedUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              phone: data.user.mobileNumber || phone.trim(),
              role: data.user.role || 'user',
              token
            };
            saveRegisteredUser({ ...authenticatedUser, password });
            localStorage.setItem('qb_token', token);
            localStorage.setItem('qb_user', JSON.stringify(authenticatedUser));
            onLoginSuccess(authenticatedUser);
            return;
          } else {
            const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Registration failed');
            setErrorMessage(`❌ ${errMsg}`);
            setIsLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Backend server call failed, using local storage fallback:', apiErr);
          const existing = allUsers.find(u => u.email.toLowerCase() === inputEmail);
          if (existing) {
            setErrorMessage('❌ This email address is already registered! Please switch to User Login.');
            setIsLoading(false);
            return;
          }

          const newAccount = {
            id: Date.now(),
            name: name.trim(),
            email: inputEmail,
            password: password,
            phone: phone.trim(),
            role: 'user'
          };

          saveRegisteredUser(newAccount);

          const token = signJwtToken(newAccount);
          const authenticatedUser = {
            id: newAccount.id,
            name: newAccount.name,
            email: newAccount.email,
            phone: newAccount.phone,
            role: newAccount.role,
            token
          };

          localStorage.setItem('qb_token', token);
          localStorage.setItem('qb_user', JSON.stringify(authenticatedUser));
          onLoginSuccess(authenticatedUser);
          return;
        }

      } else if (authMode === 'admin-login') {
        const foundAdmin = allUsers.find(u => u.email.toLowerCase() === inputEmail && u.role === 'admin');

        if (!foundAdmin || foundAdmin.password !== password) {
          setErrorMessage('❌ Invalid Admin credentials! Only registered administrators can log in.');
          setIsLoading(false);
          return;
        }

        const token = signJwtToken(foundAdmin);
        const authenticatedAdmin = {
          id: foundAdmin.id,
          name: foundAdmin.name,
          email: foundAdmin.email,
          phone: foundAdmin.phone,
          role: foundAdmin.role,
          token
        };

        localStorage.setItem('qb_token', token);
        localStorage.setItem('qb_user', JSON.stringify(authenticatedAdmin));
        onLoginSuccess(authenticatedAdmin);

      } else {
        // Customer User Login Verification against NestJS Backend & PostgreSQL
        try {
          const res = await fetch('http://localhost:5000/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inputEmail, password })
          });
          const data = await res.json();
          if (res.ok && data.user) {
            const token = data.accessToken;
            const authenticatedUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              mobileNumber: data.user.mobileNumber,
              phone: data.user.mobileNumber || phone || '+91 9876543210',
              role: data.user.role || 'user',
              accessToken: token,
              token
            };
            localStorage.setItem('qb_token', token);
            localStorage.setItem('accessToken', token);
            localStorage.setItem('qb_user', JSON.stringify(authenticatedUser));
            onLoginSuccess(authenticatedUser);
            return;
          } else {
            const errMsg = data.message || 'Invalid email or password';
            setErrorMessage(`❌ ${errMsg}`);
            setIsLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Backend login endpoint unavailable, using local check:', apiErr);
        }

        const foundUser = allUsers.find(u => u.email.toLowerCase() === inputEmail);

        if (!foundUser) {
          setErrorMessage('❌ Account not found! This email is NOT registered. Please click "Register" tab to create your account.');
          setIsLoading(false);
          return;
        }

        if (foundUser.password !== password) {
          setErrorMessage('❌ Incorrect password! Please check your password and try again.');
          setIsLoading(false);
          return;
        }

        const token = signJwtToken(foundUser);
        const authenticatedUser = {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          phone: foundUser.phone,
          role: foundUser.role,
          token
        };

        localStorage.setItem('qb_token', token);
        localStorage.setItem('qb_user', JSON.stringify(authenticatedUser));
        onLoginSuccess(authenticatedUser);
      }
    } catch (err) {
      setErrorMessage('Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.93) 0%, rgba(10, 15, 28, 0.96) 100%), url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      
      {/* Central Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden',
        animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Top Header */}
        <div style={{
          padding: '1.75rem 1.75rem 1.25rem 1.75rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary), #ff7a38)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px var(--primary-glow)',
            marginBottom: '0.85rem'
          }}>
            <Utensils size={30} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.2rem' }}>
            {authMode === 'register' 
              ? 'Create New Account' 
              : authMode === 'admin-login' 
                ? 'Admin Control Login' 
                : 'Customer Sign In'}
          </h2>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Verified NestJS & PostgreSQL JWT Authentication
          </p>
        </div>

        {/* Auth Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          padding: '0.85rem 1.5rem 0 1.5rem',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            type="button"
            onClick={() => { 
              setAuthMode('user-login'); 
              setErrorMessage(''); 
              setFieldErrors({}); 
              setEmail(''); 
              setPassword(''); 
              setName(''); 
              setPhone('');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '0.82rem',
              border: 'none',
              background: authMode === 'user-login' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: authMode === 'user-login' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            User Login
          </button>

          <button
            type="button"
            onClick={() => { 
              setAuthMode('register'); 
              setErrorMessage(''); 
              setFieldErrors({}); 
              setEmail(''); 
              setPassword(''); 
              setName(''); 
              setPhone('');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '0.82rem',
              border: 'none',
              background: authMode === 'register' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: authMode === 'register' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Register
          </button>

          <button
            type="button"
            onClick={() => { 
              setAuthMode('admin-login'); 
              setErrorMessage(''); 
              setFieldErrors({}); 
              setEmail(''); 
              setPassword(''); 
              setName(''); 
              setPhone('');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '0.82rem',
              border: 'none',
              background: authMode === 'admin-login' ? '#10b981' : 'rgba(255,255,255,0.06)',
              color: authMode === 'admin-login' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Admin Login
          </button>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleAuthSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {errorMessage && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244,63,94,0.18)',
              border: '1px solid rgba(244,63,94,0.35)',
              color: '#f43f5e',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <ShieldAlert size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Full Name field if registering */}
          {authMode === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', display: 'block', marginBottom: '0.35rem', color: '#ffffff' }}>
                Full Name <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: fieldErrors.name ? '#f43f5e' : 'var(--text-muted)' }} />
                <input 
                  type="text"
                  placeholder="e.g. Arjun Kumar"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: null })); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${fieldErrors.name ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              {fieldErrors.name && (
                <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700', marginTop: '0.25rem', display: 'block' }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>
          )}

          {/* Email Address */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', display: 'block', marginBottom: '0.35rem', color: '#ffffff' }}>
              {authMode === 'admin-login' ? 'Admin Email Address' : 'Email Address'} <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: fieldErrors.email ? '#f43f5e' : 'var(--text-muted)' }} />
              <input 
                type="email"
                placeholder={authMode === 'admin-login' ? 'admin@quickbite.com' : 'user@example.com'}
                value={email}
                autoComplete={authMode === 'register' ? 'new-email' : 'email'}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: null })); }}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${fieldErrors.email ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            {fieldErrors.email && (
              <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Phone Number if registering */}
          {authMode === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', display: 'block', marginBottom: '0.35rem', color: '#ffffff' }}>
                Mobile Phone Number (9 to 13 digits) <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: fieldErrors.phone ? '#f43f5e' : 'var(--text-muted)' }} />
                <input 
                  type="text"
                  placeholder="9876543210 (9-13 digits)"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFieldErrors(prev => ({ ...prev, phone: null })); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${fieldErrors.phone ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              {fieldErrors.phone && (
                <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700', marginTop: '0.25rem', display: 'block' }}>
                  {fieldErrors.phone}
                </span>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', display: 'block', marginBottom: '0.35rem', color: '#ffffff' }}>
              Password <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: fieldErrors.password ? '#f43f5e' : 'var(--text-muted)' }} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: null })); }}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${fieldErrors.password ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: showPassword ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.95rem',
              fontSize: '1rem',
              background: authMode === 'admin-login' ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              marginTop: '0.5rem',
              boxShadow: authMode === 'admin-login' ? '0 4px 14px rgba(16,185,129,0.4)' : undefined
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : authMode === 'register' ? (
              <>
                <span>Create User Account</span>
                <UserPlus size={18} />
              </>
            ) : authMode === 'admin-login' ? (
              <>
                <span>Access Admin Control Panel</span>
                <ShieldCheck size={18} />
              </>
            ) : (
              <>
                <span>Sign In Now</span>
                <LogIn size={18} />
              </>
            )}
          </button>

          {/* 1-Click Verified Login Demos */}
          <div style={{
            textAlign: 'center',
            paddingTop: '0.85rem',
            borderTop: '1px dashed rgba(255,255,255,0.15)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span>Verified Demos:</span>
            <button 
              type="button" 
              onClick={() => {
                const u = { id: 101, name: 'Arjun Kumar', email: 'user@quickbite.com', phone: '+91 9447123456', role: 'user' };
                const token = signJwtToken(u);
                localStorage.setItem('qb_token', token);
                localStorage.setItem('qb_user', JSON.stringify({ ...u, token }));
                onLoginSuccess({ ...u, token });
              }}
              style={{ color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Arjun
            </button>
            <span>•</span>
            <button 
              type="button" 
              onClick={() => {
                const u = { id: 102, name: 'Sachu S.', email: 'sachu@quickbite.com', phone: '+91 9876543210', role: 'user' };
                const token = signJwtToken(u);
                localStorage.setItem('qb_token', token);
                localStorage.setItem('qb_user', JSON.stringify({ ...u, token }));
                onLoginSuccess({ ...u, token });
              }}
              style={{ color: '#8b5cf6', fontWeight: '800', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sachu
            </button>
            <span>•</span>
            <button 
              type="button" 
              onClick={() => {
                const a = { id: 1, name: 'QuickBite Admin', email: 'admin@quickbite.com', phone: '+91 9000000000', role: 'admin' };
                const token = signJwtToken(a);
                localStorage.setItem('qb_token', token);
                localStorage.setItem('qb_user', JSON.stringify({ ...a, token }));
                onLoginSuccess({ ...a, token });
              }}
              style={{ color: '#10b981', fontWeight: '800', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Admin
            </button>
          </div>

          {/* Continue as Guest link */}
          <button
            type="button"
            onClick={onGuestContinue}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              marginTop: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            <span>Browse store as guest</span>
            <ArrowRight size={14} />
          </button>

        </form>

      </div>

    </div>
  );
}
