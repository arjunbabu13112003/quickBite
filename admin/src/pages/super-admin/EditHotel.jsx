import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

export default function EditHotel({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalHotel, setOriginalHotel] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phoneNumber: '',
    email: '',
    address: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    isActive: true,
    isOpen: true,
    acceptsOrders: true
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Local Image Upload Previews (visual foundation only)
  const [coverPreview, setCoverPreview] = useState(null);
  const coverInputRef = useRef(null);

  // Modal confirmation for cancelling dirty form
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchHotel = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHotelById(id);
      if (!data) {
        throw new Error('NotFound');
      }
      
      const mappedData = {
        name: data.name || '',
        description: data.description || '',
        phoneNumber: data.phoneNumber || '',
        email: data.email || '',
        address: data.address || '',
        area: data.area || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '',
        longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '',
        isActive: !!data.isActive,
        isOpen: !!data.isOpen,
        acceptsOrders: !!data.acceptsOrders
      };

      setFormData(mappedData);
      setOriginalHotel(mappedData);
      
      if (data.image) {
        setCoverPreview(data.image);
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes('404') || err.message.includes('NotFound')) {
        setError('HotelNotFound');
      } else {
        setError('Unable to load hotel details for editing. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotel();
  }, [id]);

  // Form modified check (dirty check)
  const isDirty = originalHotel ? JSON.stringify(formData) !== JSON.stringify(originalHotel) : false;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleToggle = (name) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Visual cover change handler
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Cover image must be smaller than 5MB.');
        return;
      }
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const removeCover = (e) => {
    e.stopPropagation();
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Cancel trigger
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      onNavigate(`/hotels/${id}`);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Hotel name is required.';
    }
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.';
    } else if (!/^[+]?[0-9\s-]{7,20}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Enter a valid phone number (digits, spaces, dashes or plus only).';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }
    if (!formData.address.trim()) {
      errors.address = 'Street address is required.';
    }
    if (!formData.area.trim()) {
      errors.area = 'Area / Neighborhood is required.';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required.';
    }
    if (!formData.state.trim()) {
      errors.state = 'State / Province is required.';
    }
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode / Zip Code is required.';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be a valid 6-digit Indian pincode.';
    }

    if (formData.latitude) {
      const latVal = parseFloat(formData.latitude);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        errors.latitude = 'Latitude must be a number between -90 and 90.';
      }
    }

    if (formData.longitude) {
      const lngVal = parseFloat(formData.longitude);
      if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
        errors.longitude = 'Longitude must be a number between -180 and 180.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isDirty) return;

    setErrorBanner('');
    if (!validateForm()) {
      setErrorBanner('Please resolve all validation errors highlighted below before saving changes.');
      return;
    }

    setSubmitting(true);

    try {
      // Build PATCH payload including only values that changed
      const payload = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== originalHotel[key]) {
          if (key === 'latitude') {
            payload.latitude = formData.latitude ? parseFloat(formData.latitude) : null;
          } else if (key === 'longitude') {
            payload.longitude = formData.longitude ? parseFloat(formData.longitude) : null;
          } else {
            payload[key] = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
          }
        }
      });

      await api.updateHotel(id, payload);
      
      // Navigate back to hotel details page
      onNavigate(`/hotels/${id}`);
    } catch (err) {
      console.error(err);
      setErrorBanner(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- RENDERING LOADING SKELETONS ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '280px', height: '24px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)' }}></div>
        </div>
      </div>
    );
  }

  // --- RENDERING ERROR STATES ---

  if (error === 'HotelNotFound') {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '560px',
        margin: '3rem auto'
      }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-rose)', marginBottom: '1.25rem' }} />
        <h3 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Hotel Not Found
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The hotel with ID {id} does not exist or has been removed from the platform.
        </p>
        <button
          onClick={() => onNavigate('/hotels')}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Back to Hotels
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '560px',
        margin: '3rem auto'
      }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-rose)', marginBottom: '1.25rem' }} />
        <h3 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Load Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {error}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            onClick={() => onNavigate(`/hotels/${id}`)}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
          </button>
          <button
            onClick={fetchHotel}
            className="btn-primary"
            style={{ padding: '0.75rem 2rem', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--text-subtle)',
            fontWeight: '700'
          }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/hotels')}>Hotels</span>
            <ChevronRight size={12} />
            <span style={{ cursor: 'pointer' }} onClick={() => onNavigate(`/hotels/${id}`)}>{originalHotel.name}</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--primary)' }}>Edit</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <h1 style={{
              fontSize: '1.9rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              letterSpacing: '-0.5px'
            }}>Edit Hotel</h1>
            <span style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: '800'
            }}>
              Fast Food
            </span>
          </div>
          <p style={{
            fontSize: '0.92rem',
            color: 'var(--text-muted)'
          }}>Update information, manage status, and configure operational settings for {originalHotel.name}.</p>
        </div>

        {/* Buttons in Header */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCancelClick}
            className="btn-secondary"
            style={{
              padding: '0.65rem 1.5rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || !isDirty}
            onClick={handleSubmit}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.75rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)',
              gap: '0.5rem',
              minWidth: '135px',
              justifyContent: 'center',
              opacity: !isDirty ? 0.6 : 1,
              cursor: !isDirty ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorBanner && (
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
          <AlertCircle size={18} />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Basic Info + Location/Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Basic Information */}
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
              Basic Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Hotel Name <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Description
              </label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Card 2: Location & Contact */}
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
              Location & Contact
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Phone Number <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.phoneNumber ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.phoneNumber && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.phoneNumber}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Email Address <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Street Address <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: validationErrors.address ? '1px solid #dc2626' : '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
              {validationErrors.address && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                  {validationErrors.address}
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Area / Neighborhood <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.area ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.area && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.area}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  City <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.city ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.city && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.city}
                  </span>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  State / Province <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.state ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.state && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.state}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Pincode / Zip Code <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input 
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.pincode ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.pincode && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.pincode}
                  </span>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Latitude
                </label>
                <input 
                  type="text"
                  name="latitude"
                  placeholder="e.g. 40.7128"
                  value={formData.latitude}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.latitude ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.latitude && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.latitude}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Longitude
                </label>
                <input 
                  type="text"
                  name="longitude"
                  placeholder="e.g. -74.0060"
                  value={formData.longitude}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.longitude ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'var(--bg-main)'
                  }}
                />
                {validationErrors.longitude && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.longitude}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Operational Settings + Media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 3: Operational Status */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0 }}>
              Operational Status
            </h3>

            {/* Status (isActive) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Current Status</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {formData.isActive ? 'Active on platform' : 'Currently inactive'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('isActive')}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.isActive ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.isActive ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.isActive && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Store Operations (isOpen) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Store Operations</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {formData.isOpen ? 'Open for operations' : 'Closed operations'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('isOpen')}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.isOpen ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.isOpen ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.isOpen && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Online Orders (acceptsOrders) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Online Orders</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {formData.acceptsOrders ? 'Accepting online delivery' : 'Delivery paused'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('acceptsOrders')}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.acceptsOrders ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.acceptsOrders ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.acceptsOrders && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

          </div>

          {/* Card 4: Media Upload visual cards */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0 }}>
              Media
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Cover Image</span>
              <input 
                type="file" 
                ref={coverInputRef}
                accept="image/*"
                onChange={handleCoverChange}
                style={{ display: 'none' }}
              />
              <div 
                onClick={() => !coverPreview && coverInputRef.current.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  cursor: coverPreview ? 'default' : 'pointer',
                  position: 'relative',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {coverPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '80px' }}>
                    <img 
                      src={coverPreview} 
                      alt="Cover Preview" 
                      style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <button 
                      type="button"
                      onClick={removeCover}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={20} style={{ color: 'var(--text-subtle)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '850', color: 'var(--text-main)' }}>Change Image</span>
                  </>
                )}
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              * Image updates are visual previews (persistence will be added in a future release).
            </span>
          </div>

        </div>

      </div>

      {/* Discard Confirmation Dialog Modal */}
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
              You have unsaved changes in this form. Navigating away will lose all modified data.
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
                  onNavigate(`/hotels/${id}`);
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

