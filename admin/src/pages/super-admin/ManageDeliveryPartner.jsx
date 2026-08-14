import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  ChevronRight, 
  MapPin, 
  Mail, 
  Phone,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Loader2,
  X,
  Search,
  Check,
  Building2,
  ClipboardList,
  Compass,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  User,
  History,
  CheckSquare
} from 'lucide-react';
import { api } from '../../services/api';

export default function ManageDeliveryPartner({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Modal confirm state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDeliveryPartnerById(id);
      if (!result) {
        throw new Error('NotFound');
      }
      setData(result);
    } catch (err) {
      console.error(err);
      if (err.message.includes('404') || err.message.includes('NotFound')) {
        setError('PartnerNotFound');
      } else {
        setError('Unable to load delivery partner details. Check NestJS connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handlePlaceholderAction = (actionName) => {
    alert(`"${actionName}" action is not available yet. It will be implemented in a future update.`);
  };

  const handleVerifyConfirm = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const updatedPartner = await api.verifyDeliveryPartner(id, true);
      
      // Update local state without reloading browser
      setData(prev => ({
        ...prev,
        partner: {
          ...prev.partner,
          isVerified: true
        }
      }));
      
      setShowVerifyModal(false);
      alert(`${data.partner.user?.name || 'Partner'} has been verified successfully.`);
    } catch (err) {
      console.error(err);
      setVerifyError(err.message || 'Failed to verify delivery partner.');
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Availability display helper
  const getAvailabilityText = (partner) => {
    if (!partner.isActive) return 'Inactive';
    if (!partner.isVerified) return 'Unverified';
    if (!partner.isOnline) return 'Offline';
    return partner.isAvailable ? 'Available' : 'Busy';
  };

  // --- RENDER LOADING SKELETONS ---
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '150px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '280px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          height: '140px'
        }}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', float: 'left', marginRight: '2rem' }}></div>
          <div className="skeleton" style={{ width: '220px', height: '24px', marginBottom: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '300px', height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '360px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '360px', borderRadius: 'var(--radius-xl)' }}></div>
        </div>
      </div>
    );
  }

  // --- RENDER ERROR STATES ---
  if (error === 'PartnerNotFound') {
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
          Delivery Partner Not Found
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The requested delivery partner account does not exist or has been removed.
        </p>
        <button
          onClick={() => onNavigate('/delivery-partners')}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Back to Delivery Partners
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
            onClick={() => onNavigate('/delivery-partners')}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
          </button>
          <button
            onClick={fetchDetails}
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

  const { partner, currentAssignment, history } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumb Navigation */}
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
        <span style={{ cursor: 'pointer' }} onClick={() => onNavigate(`/delivery-partners/${partner.id}`)}>{partner.user?.name}</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>Manage</span>
      </div>

      {/* Main Profile Header Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        {/* Initials Fallback */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          fontSize: '2rem',
          border: '1px solid var(--border-color)'
        }}>
          {partner.user?.name?.charAt(0).toUpperCase()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Manage Delivery Partner
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px', margin: 0 }}>
            {partner.user?.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
            <span>{partner.user?.email}</span>
            <span>•</span>
            <span>{partner.phoneNumber}</span>
            <span>•</span>
            <span>{partner.vehicleType} {partner.vehicleNumber ? `(${partner.vehicleNumber})` : ''}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Verification & Status + Partner Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Verification & Status */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
              <span>Verification & Status</span>
            </h3>

            {/* Verification Status Banner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>
                Verification Status
              </span>
              
              <div style={{
                background: partner.isVerified ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                border: partner.isVerified ? '1px solid #c2e7c9' : '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <span style={{
                  color: partner.isVerified ? 'var(--text-success)' : 'var(--text-danger)',
                  fontSize: '1.1rem',
                  fontWeight: '900'
                }}>
                  {partner.isVerified ? 'Verified' : 'Unverified / Pending'}
                </span>
                
                {!partner.isVerified ? (
                  <>
                    <p style={{ fontSize: '0.78rem', color: '#7f1d1d', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                      Partner must be verified before becoming eligible for delivery assignments.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowVerifyModal(true)}
                      className="btn-primary"
                      style={{
                        padding: '0.6rem 1rem',
                        fontSize: '0.82rem',
                        fontWeight: '800',
                        borderRadius: 'var(--radius-md)',
                        justifyContent: 'center',
                        width: '100%',
                        background: 'var(--primary)',
                        color: '#ffffff'
                      }}
                    >
                      Verify Partner
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-success)', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                    Partner is verified and ready for delivery assignments once active, online, and available.
                  </p>
                )}
              </div>
            </div>

            {/* Account Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '800' }}>Account Status</span>
              <span style={{
                background: partner.isActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                color: partner.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: '850'
              }}>
                {partner.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Online Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '800' }}>Online Status</span>
              <span style={{
                background: partner.isOnline ? 'var(--bg-info-subtle)' : 'var(--bg-subtle)',
                color: partner.isOnline ? 'var(--text-info)' : 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: '850',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: partner.isOnline ? 'var(--text-info)' : 'var(--text-muted)' }}></span>
                <span>{partner.isOnline ? 'Online' : 'Offline'}</span>
              </span>
            </div>

            {/* Availability Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '800' }}>Availability</span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: '850',
                color: 'var(--text-main)'
              }}>
                {getAvailabilityText(partner)}
              </span>
            </div>

          </div>

          {/* Card 2: Partner Information */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
              <span>Partner Information</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Full Name</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.user?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Phone Number</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.phoneNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Vehicle Type</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.vehicleType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Vehicle Number</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.vehicleNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>DL Number</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.licenseNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Joined Date</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{formatDate(partner.createdAt)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Active Assignment & Recent Deliveries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card A: Active Assignment */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              height: '3px',
              background: currentAssignment ? 'var(--primary)' : 'transparent'
            }}></div>

            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} style={{ color: 'var(--primary)' }} />
                  <span>Active Assignment</span>
                </h3>

                {currentAssignment && (
                  <span style={{
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {currentAssignment.orderStatus?.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {currentAssignment ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Order ID</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '900', marginTop: '0.15rem' }}>
                        #ORD-{currentAssignment.orderNumber || currentAssignment.orderId}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Restaurant</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Building2 size={12} />
                        <span>{currentAssignment.hotelName}</span>
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Delivery Area</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>
                        {currentAssignment.deliveryArea || '—'}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Assigned At</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>
                        {formatTime(currentAssignment.assignedAt)}
                      </p>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handlePlaceholderAction('View Order Details')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>View Order Details</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '850' }}>No active delivery assignment.</span>
                  {!partner.isOnline && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '650' }}>Partner is currently offline.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card B: Recent Deliveries */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem 2rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} style={{ color: 'var(--primary)' }} />
                <span>Recent Deliveries</span>
              </h3>

              <button
                onClick={() => handlePlaceholderAction('View All History')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>View All</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Order ID</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Restaurant</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total (₹)</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Payment Method</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Payment Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history && history.length > 0 ? (
                    history.map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)' }}>
                          #ORD-{h.orderNumber}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '650' }}>
                          {formatDateTime(h.deliveredAt)}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)' }}>
                          {h.hotelName}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '850', color: 'var(--text-main)' }}>
                          ₹{h.totalAmount.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '650' }}>
                          {h.paymentMethod}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', color: h.paymentStatus === 'paid' ? 'var(--text-success)' : 'var(--text-warning)', fontWeight: '800', background: h.paymentStatus === 'paid' ? 'var(--bg-success-subtle)' : 'var(--bg-warning-subtle)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
                            {h.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span style={{
                            background: 'var(--bg-success-subtle)',
                            color: 'var(--text-success)',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.65rem',
                            fontWeight: '800'
                          }}>
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '2.5rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: '700' }}>
                        No completed deliveries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Verify confirmation modal */}
      {showVerifyModal && (
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
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>Verify Delivery Partner?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              You are about to verify <strong>{partner.user?.name}</strong>.
            </p>

            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-subtle)',
              marginBottom: '2rem',
              lineHeight: '1.5',
              background: 'var(--bg-main)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--primary)'
            }}>
              Verification allows this partner to become eligible for delivery assignments once they are also active, online and available.
            </p>

            {verifyError && (
              <div style={{ color: 'var(--text-danger)', fontSize: '0.82rem', fontWeight: '700', marginBottom: '1.25rem' }}>
                {verifyError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={verifying}
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyError(null);
                }}
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
                Cancel
              </button>

              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyConfirm}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  gap: '0.5rem'
                }}
              >
                {verifying ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Partner</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

