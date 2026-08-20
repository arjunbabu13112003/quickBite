import React, { useState, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function AddHotel({ onNavigate }) {
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
    acceptsOrders: true,
    cuisines: '',
    restaurantType: '',
    averagePreparationTime: '',
    ownerName: '',
    alternatePhoneNumber: '',
    landmark: '',
    district: '',
    legalName: '',
    fssaiNumber: '',
    gstNumber: '',
    isDeliveryAvailable: true,
    deliveryRadiusKm: '',
    minimumOrderAmount: '',
    deliveryFee: '',
    estimatedDeliveryTime: '',
    openingTime: '08:00',
    closingTime: '22:00'
  });

  // Track modification for dirty-check on cancel
  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Local Image Upload Previews
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Modal confirmation for cancelling dirty form
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
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
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Image handlers
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo image must be smaller than 2MB.');
        return;
      }
      setIsDirty(true);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Cover image must be smaller than 5MB.');
        return;
      }
      setIsDirty(true);
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const removeLogo = (e) => {
    e.stopPropagation();
    setIsDirty(true);
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const removeCover = (e) => {
    e.stopPropagation();
    setIsDirty(true);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Cancel validation flow
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      onNavigate('/hotels');
    }
  };

  // Submission validation
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

    if (formData.deliveryFee) {
      const val = parseFloat(formData.deliveryFee);
      if (isNaN(val) || val < 0) {
        errors.deliveryFee = 'Delivery Fee must be a non-negative number.';
      }
    }
    if (formData.minimumOrderAmount) {
      const val = parseFloat(formData.minimumOrderAmount);
      if (isNaN(val) || val < 0) {
        errors.minimumOrderAmount = 'Minimum Order Amount must be a non-negative number.';
      }
    }
    if (formData.deliveryRadiusKm) {
      const val = parseFloat(formData.deliveryRadiusKm);
      if (isNaN(val) || val < 0) {
        errors.deliveryRadiusKm = 'Delivery Radius must be a non-negative number.';
      }
    }
    if (formData.averagePreparationTime) {
      const val = parseFloat(formData.averagePreparationTime);
      if (isNaN(val) || val < 0) {
        errors.averagePreparationTime = 'Average Preparation Time must be a non-negative number.';
      }
    }
    if (formData.estimatedDeliveryTime) {
      const val = parseFloat(formData.estimatedDeliveryTime);
      if (isNaN(val) || val < 0) {
        errors.estimatedDeliveryTime = 'Estimated Delivery Time must be a non-negative number.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission execution
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorBanner('');
    if (!validateForm()) {
      setErrorBanner('Please resolve all validation errors highlighted below before saving.');
      return;
    }

    setSubmitting(true);

    try {
      // Build DTO matching backend specifications
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        isActive: formData.isActive,
        isOpen: formData.isOpen,
        acceptsOrders: formData.acceptsOrders,
        
        // New fields
        cuisines: formData.cuisines.trim() || undefined,
        restaurantType: formData.restaurantType.trim() || undefined,
        averagePreparationTime: formData.averagePreparationTime ? parseInt(formData.averagePreparationTime, 10) : undefined,
        ownerName: formData.ownerName.trim() || undefined,
        alternatePhoneNumber: formData.alternatePhoneNumber.trim() || undefined,
        landmark: formData.landmark.trim() || undefined,
        district: formData.district.trim() || undefined,
        legalName: formData.legalName.trim() || undefined,
        fssaiNumber: formData.fssaiNumber.trim() || undefined,
        gstNumber: formData.gstNumber.trim() || undefined,
        isDeliveryAvailable: formData.isDeliveryAvailable,
        deliveryRadiusKm: formData.deliveryRadiusKm ? parseFloat(formData.deliveryRadiusKm) : undefined,
        minimumOrderAmount: formData.minimumOrderAmount ? parseFloat(formData.minimumOrderAmount) : undefined,
        deliveryFee: formData.deliveryFee ? parseFloat(formData.deliveryFee) : 0,
        estimatedDeliveryTime: formData.estimatedDeliveryTime ? parseInt(formData.estimatedDeliveryTime, 10) : undefined,
        openingTime: formData.openingTime || undefined,
        closingTime: formData.closingTime || undefined
      };

      const newHotel = await api.createHotel(payload);
      
      if (logoFile) {
        try {
          await api.uploadHotelLogo(newHotel.id, logoFile);
        } catch (e) {
          console.warn('Failed to upload logo:', e);
        }
      }
      if (coverFile) {
        try {
          await api.uploadHotelCover(newHotel.id, coverFile);
        } catch (e) {
          console.warn('Failed to upload cover:', e);
        }
      }
      
      onNavigate('/super-admin/hotels');
    } catch (err) {
      console.error(err);
      setErrorBanner(err.message || 'Failed to create new hotel record. Server returned validation error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
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
          <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/super-admin/hotels')}>Hotels</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--primary)' }}>Add Hotel</span>
        </div>

        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px',
          marginTop: '0.25rem'
        }}>Add New Hotel</h1>
        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-muted)'
        }}>Create a new restaurant on the QuickBite platform.</p>
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

      {/* Form Workspace Container */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* SECTION 1: Basic Information */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            1. Basic Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
              Hotel Name <span style={{ color: 'var(--primary)' }}>*</span>
            </label>
            <input 
              type="text"
              name="name"
              placeholder="e.g. The Midnight Burger"
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
              placeholder="Brief description of the restaurant..."
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Cuisine Types
              </label>
              <input
                type="text"
                name="cuisines"
                placeholder="North Indian, Chinese, Italian"
                value={formData.cuisines}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Category
              </label>
              <input
                type="text"
                name="restaurantType"
                placeholder="Fine Dining, Cafe, Quick Service"
                value={formData.restaurantType}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>
          </div>

          {/* Logo & Cover Selection Containers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginTop: '0.5rem'
          }}>
            {/* Logo box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Logo Upload</span>
              <input 
                type="file" 
                ref={logoInputRef}
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <div 
                onClick={() => !logoPreview && logoInputRef.current.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  cursor: logoPreview ? 'default' : 'pointer',
                  position: 'relative',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {logoPreview ? (
                  <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <button 
                      type="button"
                      onClick={removeLogo}
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
                    <Upload size={24} style={{ color: 'var(--text-subtle)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '850', color: 'var(--text-main)' }}>Click to upload logo</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SVG, PNG, JPG or GIF (max. 2MB)</span>
                  </>
                )}
              </div>
            </div>

            {/* Cover box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Cover Image Upload</span>
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
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  cursor: coverPreview ? 'default' : 'pointer',
                  position: 'relative',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {coverPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '90px' }}>
                    <img 
                      src={coverPreview} 
                      alt="Cover Preview" 
                      style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
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
                    <Upload size={24} style={{ color: 'var(--text-subtle)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '850', color: 'var(--text-main)' }}>Click to upload cover</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1920x1080px recommended (max. 5MB)</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '-0.5rem' }}>
            * Image selection is local-only (uploads will persist in future platform updates).
          </span>
        </div>

        {/* SECTION 2: Contact Information */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            2. Contact Information
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Phone Number <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                type="text"
                name="phoneNumber"
                placeholder="+1 (555) 000-0000"
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
                placeholder="contact@restaurant.com"
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Owner Name
              </label>
              <input 
                type="text"
                name="ownerName"
                placeholder="Enter owner's name"
                value={formData.ownerName}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Alternate Phone Number
              </label>
              <input 
                type="text"
                name="alternatePhoneNumber"
                placeholder="Alternate phone number"
                value={formData.alternatePhoneNumber}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Location */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            3. Location
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
              Street Address <span style={{ color: 'var(--primary)' }}>*</span>
            </label>
            <input 
              type="text"
              name="address"
              placeholder="123 Main Street"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Area / Neighborhood <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                type="text"
                name="area"
                placeholder="Downtown"
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
                placeholder="New York"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                State / Province <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                type="text"
                name="state"
                placeholder="NY"
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
                placeholder="10001"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Landmark
              </label>
              <input 
                type="text"
                name="landmark"
                placeholder="Near central park"
                value={formData.landmark}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                District
              </label>
              <input 
                type="text"
                name="district"
                placeholder="District name"
                value={formData.district}
                onChange={handleChange}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: 'var(--bg-main)'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Latitude
              </label>
              <input 
                type="text"
                name="latitude"
                placeholder="40.7128"
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
                placeholder="-74.0060"
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

        {/* SECTION 7: Restaurant Settings */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            7. Restaurant Settings
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem'
          }}>
            
            {/* Toggle 1: Status */}
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>Status</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Active / Inactive</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('isActive')}
                style={{
                  width: '54px',
                  height: '28px',
                  borderRadius: '14px',
                  background: formData.isActive ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.isActive ? '30px' : '4px',
                  transition: 'left 0.25s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.isActive && <Check size={10} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Toggle 2: Store Operations */}
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>Store Operations</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Open / Closed</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('isOpen')}
                style={{
                  width: '54px',
                  height: '28px',
                  borderRadius: '14px',
                  background: formData.isOpen ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.isOpen ? '30px' : '4px',
                  transition: 'left 0.25s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.isOpen && <Check size={10} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Toggle 3: Order Acceptance */}
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>Order Acceptance</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Accept / Pause</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('acceptsOrders')}
                style={{
                  width: '54px',
                  height: '28px',
                  borderRadius: '14px',
                  background: formData.acceptsOrders ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  position: 'absolute',
                  left: formData.acceptsOrders ? '30px' : '4px',
                  transition: 'left 0.25s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {formData.acceptsOrders && <Check size={10} strokeWidth={4} />}
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Action Triggers Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCancelClick}
            className="btn-secondary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.9rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-full)'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{
              padding: '0.75rem 2.25rem',
              fontSize: '0.9rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-full)',
              gap: '0.5rem',
              minWidth: '150px',
              justifyContent: 'center'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Hotel</span>
            )}
          </button>
        </div>

      </form>

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
              You have unsaved changes in this hotel creation form. Navigating away will lose all entered data.
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
                  onNavigate('/super-admin/hotels');
                }}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  background: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

