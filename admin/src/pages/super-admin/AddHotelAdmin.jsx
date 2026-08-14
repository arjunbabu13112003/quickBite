import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  Info, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  Loader2 
} from 'lucide-react';
import { api } from '../../services/api';

export default function AddHotelAdmin({ onNavigate }) {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelsError, setHotelsError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    hotelId: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Unsaved changes modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchHotels = async () => {
    setLoadingHotels(true);
    setHotelsError(null);
    try {
      const data = await api.getHotels();
      setHotels(data || []);
    } catch (err) {
      console.error(err);
      setHotelsError('Failed to load hotels list. You can still create an unassigned administrator.');
    } finally {
      setLoadingHotels(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Check if form is modified
  const isDirty = formData.name || formData.email || formData.password || formData.confirmPassword || formData.hotelId;

  // Selected hotel preview information
  const selectedHotel = formData.hotelId 
    ? hotels.find(h => Number(h.id) === Number(formData.hotelId)) 
    : null;

  // Validate form entries
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setApiError('');
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        hotelId: formData.hotelId ? Number(formData.hotelId) : null
      };

      await api.createHotelAdmin(payload);
      
      alert('Hotel administrator created successfully.');
      onNavigate('/hotel-admins');
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Failed to create hotel administrator account. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      onNavigate('/hotel-admins');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px' }}>
      
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)',
          fontWeight: '700'
        }}>
          <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/hotel-admins')}>Hotel Admins</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--primary)' }}>Add Hotel Admin</span>
        </div>

        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px',
          marginTop: '0.25rem'
        }}>Add Hotel Admin</h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
          Create a restaurant administrator account and optionally assign it to a hotel.
        </p>
      </div>

      {/* Top Level Error Banner */}
      {apiError && (
        <div style={{
          background: 'var(--bg-danger-subtle)',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          color: 'var(--text-danger)',
          fontSize: '0.88rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Two Column Grid layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Account details + Hotel selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Account Information */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              Account Information
            </h3>

            {/* Row 1: Name and Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Full Name <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Jane Doe"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.name ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.name && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.name}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Email Address <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@hotel.com"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.email ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.email && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.email}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Passwords */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Password <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: validationErrors.password ? '1px solid #dc2626' : '1px solid var(--border-color)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: 'var(--bg-main)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-subtle)'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {validationErrors.password ? (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.password}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    At least 8 characters
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Confirm Password <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: validationErrors.confirmPassword ? '1px solid #dc2626' : '1px solid var(--border-color)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: 'var(--bg-main)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-subtle)'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Card 2: Restaurant Assignment */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              Restaurant Assignment
            </h3>

            {/* Hotel dropdown selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                Select Hotel (Optional)
              </label>
              
              {loadingHotels ? (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}>
                  <Loader2 size={14} className="spinner" />
                  <span>Loading hotels...</span>
                </div>
              ) : hotelsError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: '700' }}>{hotelsError}</div>
                  <button 
                    type="button" 
                    onClick={fetchHotels} 
                    className="btn-secondary" 
                    style={{ alignSelf: 'flex-start', padding: '0.4rem 1rem', fontSize: '0.78rem' }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <select
                  name="hotelId"
                  value={formData.hotelId}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-card)',
                    cursor: 'pointer',
                    fontWeight: '700',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="">Choose a hotel to assign...</option>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name} ({hotel.city || 'No Location'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Information Alert Box */}
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              lineHeight: '1.4'
            }}>
              <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <span>
                This account will have access only to assigned restaurant branches. Role is fixed to <code style={{
                  background: 'var(--bg-subtle)',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontWeight: '700'
                }}>hotel_admin</code>.
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Hotel Preview card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 3: Hotel Preview */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              Hotel Preview
            </h3>

            {selectedHotel ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedHotel.logo ? (
                  <img 
                    src={selectedHotel.logo} 
                    alt={selectedHotel.name}
                    style={{ width: '100%', height: '140px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                    gap: '0.5rem'
                  }}>
                    <Building2 size={36} />
                    <span style={{ fontSize: '0.78rem', fontWeight: '800' }}>No Cover Image</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)' }}>
                    {selectedHotel.name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {selectedHotel.address}, {selectedHotel.city}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--bg-subtle)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Account Status</span>
                    <span style={{
                      background: selectedHotel.isActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                      color: selectedHotel.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: '800'
                    }}>
                      {selectedHotel.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Store Status</span>
                    <span style={{
                      background: selectedHotel.isOpen ? 'var(--bg-success-subtle)' : 'var(--bg-subtle)',
                      color: selectedHotel.isOpen ? 'var(--text-success)' : 'var(--text-muted)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: '800'
                    }}>
                      ● {selectedHotel.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                </div>

              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}>
                <Building2 size={28} style={{ color: 'var(--text-subtle)' }} />
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.2rem' }}>No hotel selected</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', margin: '0 auto', lineHeight: '1.4' }}>
                    You can assign this administrator to a hotel now or later.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Buttons at Bottom Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        marginTop: '1rem'
      }}>
        <button
          type="button"
          disabled={submitting}
          onClick={handleCancelClick}
          className="btn-secondary"
          style={{
            padding: '0.7rem 1.75rem',
            fontSize: '0.88rem',
            fontWeight: '800',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="btn-primary"
          style={{
            padding: '0.7rem 2.25rem',
            fontSize: '0.88rem',
            fontWeight: '800',
            borderRadius: 'var(--radius-md)',
            gap: '0.5rem',
            minWidth: '160px',
            justifyContent: 'center'
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="spinner" />
              <span>Creating...</span>
            </>
          ) : (
            <span>Create Hotel Admin</span>
          )}
        </button>
      </div>

      {/* Discard Confirmation Dialog Modal Overlay */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15,23,42,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>Discard unsaved changes?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              You have entered information in this form. Navigating away will lose all entered data.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onNavigate('/hotel-admins');
                }}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  background: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

