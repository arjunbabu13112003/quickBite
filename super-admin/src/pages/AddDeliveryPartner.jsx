import React, { useState, useEffect } from 'react';
import { 
  Bike,
  ChevronRight, 
  AlertTriangle,
  Loader2,
  X,
  Search,
  UserPlus
} from 'lucide-react';
import { api } from '../services/api';

export default function AddDeliveryPartner({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Platform candidates
  const [candidates, setCandidates] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected User
  const [selectedUser, setSelectedUser] = useState(null);

  // Form details
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Cancel discard changes modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeliveryPartnerCandidates();
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load eligible candidates. Check NestJS connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Form dirty state check
  const isDirty = selectedUser !== null || phoneNumber !== '' || vehicleType !== 'Bike' || vehicleNumber !== '' || licenseNumber !== '';

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    // Prefill phone from user mobile number if present
    setPhoneNumber(user.mobileNumber || '');
    setSearchUserQuery('');
    setShowDropdown(false);
    
    // Clear validations
    setValidationErrors(prev => ({ ...prev, user: '' }));
  };

  const handleRemoveSelectedUser = () => {
    setSelectedUser(null);
    setPhoneNumber('');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setShowDropdown(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Validations
  const validateForm = () => {
    const errors = {};

    if (!selectedUser) {
      errors.user = 'An existing user must be selected.';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number must contain exactly 10 digits.';
    }

    if (!vehicleType) {
      errors.vehicleType = 'Vehicle type is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Onboard Action
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
        userId: selectedUser.id,
        phoneNumber: phoneNumber.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined
      };

      await api.createDeliveryPartner(payload);
      alert('Delivery partner onboarded successfully.');
      onNavigate('/delivery-partners');
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Failed to onboard delivery partner. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      onNavigate('/delivery-partners');
    }
  };

  // Filter candidates client-side
  const filteredCandidates = candidates.filter(user => {
    const query = searchUserQuery.toLowerCase().trim();
    if (!query) return true;
    return user.name?.toLowerCase().includes(query) || 
           user.email?.toLowerCase().includes(query) || 
           user.mobileNumber?.includes(query);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumb & Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)',
          fontWeight: '700'
        }}>
          <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/delivery-partners')}>Delivery Partners</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--primary)' }}>Add Delivery Partner</span>
        </div>

        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px',
          marginTop: '0.25rem'
        }}>Add Delivery Partner</h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
          Onboard an existing QuickBite user as a delivery partner.
        </p>
      </div>

      {/* Error banner */}
      {apiError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          color: '#b91c1c',
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

      {/* Two Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: User Selection & Partner Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: User Account */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} style={{ color: 'var(--primary)' }} />
              <span>User Account</span>
            </h3>

            {/* Selector */}
            {!selectedUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Select Existing User *
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{
                    position: 'absolute',
                    left: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)'
                  }} />
                  <input 
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => {
                      setSearchUserQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(true);
                    }}
                    placeholder="Search by name, email, or phone..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.2rem',
                      fontSize: '0.88rem',
                      borderRadius: 'var(--radius-md)',
                      border: validationErrors.user ? '1px solid #dc2626' : '1px solid var(--border-color)',
                      outline: 'none',
                      background: '#f8fafc',
                      fontWeight: '600'
                    }}
                  />
                </div>
                
                {validationErrors.user && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.user}
                  </span>
                )}

                {/* Dropdown candidates list */}
                {showDropdown && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginTop: '0.25rem',
                      padding: '0.35rem'
                    }}
                  >
                    {loading ? (
                      <div style={{ padding: '1rem', textAlgn: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader2 size={16} className="spinner" />
                        <span>Searching users...</span>
                      </div>
                    ) : filteredCandidates.length > 0 ? (
                      filteredCandidates.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          style={{
                            padding: '0.65rem 0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s'
                          }}
                          className="table-row-hover"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{user.name}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.email}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontWeight: '800' }}>
                            {user.role}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                        No eligible QuickBite users found.
                      </div>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Only customer accounts who are not already configured as delivery partners are listed.
                </p>
              </div>
            ) : (
              // Selected candidate User card representation
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '1.15rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-main)' }}>
                      {selectedUser.name}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      The selected account will be configured as a QuickBite Delivery Partner.
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }}>
                      <span style={{ fontSize: '0.68rem', background: '#e2e8f0', color: 'var(--text-muted)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', fontWeight: '800' }}>
                        Role: {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveSelectedUser}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-subtle)',
                    padding: '0.35rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="table-row-hover"
                >
                  <X size={16} />
                </button>
              </div>
            )}

          </div>

          {/* Card 2: Partner Information */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bike size={18} style={{ color: 'var(--primary)' }} />
              <span>Partner Information</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              
              {/* Phone number */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Phone Number *
                </label>
                <input 
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (validationErrors.phoneNumber) setValidationErrors(prev => ({ ...prev, phoneNumber: '' }));
                  }}
                  placeholder="e.g. +91 98765 43210"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: validationErrors.phoneNumber ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#f8fafc',
                    fontWeight: '600'
                  }}
                />
                {validationErrors.phoneNumber && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                    {validationErrors.phoneNumber}
                  </span>
                )}
              </div>

              {/* Vehicle Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#f8fafc',
                    fontWeight: '700',
                    height: '45px'
                  }}
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </div>

              {/* Vehicle Plate */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Vehicle Number / Plate
                </label>
                <input 
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. ABC-1234"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#f8fafc',
                    fontWeight: '600'
                  }}
                />
              </div>

              {/* License number */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
                  Driver's License Number
                </label>
                <input 
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Optional"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#f8fafc',
                    fontWeight: '600'
                  }}
                />
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Initial Status & Submit Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Status Badge Previews */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', margin: 0 }}>
              Initial Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Verification</span>
                <span style={{
                  background: '#f1f5f9',
                  color: 'var(--text-muted)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>
                  ● Unverified
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Online Status</span>
                <span style={{
                  background: '#f1f5f9',
                  color: 'var(--text-muted)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>
                  ● Offline
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)' }}>Availability</span>
                <span style={{
                  background: '#f1f5f9',
                  color: 'var(--text-muted)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: '800'
                }}>
                  ● Unavailable
                </span>
              </div>
            </div>

            <div style={{
              background: '#fef7e0',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              color: '#b06000',
              fontSize: '0.8rem',
              fontWeight: '700',
              lineHeight: '1.4',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>
                After creation, this delivery partner must be verified by a Super Admin before becoming available for deliveries.
              </span>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '800',
                borderRadius: 'var(--radius-md)',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                opacity: (!selectedUser || !phoneNumber) ? 0.65 : 1
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Delivery Partner</span>
              )}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCancelClick}
              className="btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '800',
                borderRadius: 'var(--radius-md)',
                justifyContent: 'center',
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>

        </div>

      </div>

      {/* Discard Changes confirmation modal */}
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
            background: '#ffffff',
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
            }}>Discard Changes?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              You have unsaved onboarding details.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Continue Onboarding
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onNavigate('/delivery-partners');
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
