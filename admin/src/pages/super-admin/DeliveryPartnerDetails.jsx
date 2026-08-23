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
  History
} from 'lucide-react';
import { api } from '../../services/api';

export default function DeliveryPartnerDetails({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  
  // Modals state
  const [showRejectDocModal, setShowRejectDocModal] = useState(null); // Doc object
  const [rejectReason, setRejectReason] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);

  const [showActionRequiredModal, setShowActionRequiredModal] = useState(false);
  const [actionRequiredReason, setActionRequiredReason] = useState('');

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // Document preview state
  const [previewImage, setPreviewImage] = useState(null); // Object URL
  const [previewTitle, setPreviewTitle] = useState('');

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

  // Action methods
  const handleVerifyDoc = async (docId) => {
    setActionError('');
    setActionLoading(true);
    try {
      await api.verifyDeliveryPartnerDocument(id, docId, 'VERIFIED');
      await fetchDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to verify document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDocSubmit = async () => {
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await api.verifyDeliveryPartnerDocument(id, showRejectDocModal.id, 'REJECTED', rejectReason.trim());
      setShowRejectDocModal(null);
      setRejectReason('');
      await fetchDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to reject document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePartnerSubmit = async () => {
    setActionError('');
    setActionLoading(true);
    try {
      await api.updateDeliveryPartnerAccountStatus(id, 'APPROVED');
      setShowApproveModal(false);
      await fetchDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to approve partner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionRequiredSubmit = async () => {
    if (!actionRequiredReason.trim()) {
      setActionError('A reason is required.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await api.updateDeliveryPartnerAccountStatus(id, 'ACTION_REQUIRED', actionRequiredReason.trim());
      setShowActionRequiredModal(false);
      setActionRequiredReason('');
      await fetchDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to update partner status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendPartnerSubmit = async () => {
    if (!suspendReason.trim()) {
      setActionError('A reason is required.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await api.updateDeliveryPartnerAccountStatus(id, 'SUSPENDED', suspendReason.trim());
      setShowSuspendModal(false);
      setSuspendReason('');
      await fetchDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to suspend partner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDoc = async (doc) => {
    setActionError('');
    setActionLoading(true);
    try {
      const blob = await api.getDeliveryPartnerDocument(id, doc.id);
      const blobUrl = URL.createObjectURL(blob);

      const friendlyName = {
        PROFILE_PHOTO: 'Profile Photo',
        DRIVERS_LICENSE: "Driver's License",
        VEHICLE_RC: 'Vehicle RC',
        VEHICLE_INSURANCE: 'Vehicle Insurance'
      }[doc.documentType] || doc.documentType;

      if (doc.mimeType?.startsWith('image/')) {
        setPreviewImage(blobUrl);
        setPreviewTitle(friendlyName);
      } else {
        window.open(blobUrl, '_blank');
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to fetch document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setPreviewTitle('');
  };

  // --- RENDER LOADING SKELETONS ---
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '240px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          height: '140px'
        }}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', float: 'left', marginRight: '2rem' }}></div>
          <div className="skeleton" style={{ width: '180px', height: '24px', marginBottom: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '240px', height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '260px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '260px', borderRadius: 'var(--radius-xl)' }}></div>
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
          onClick={() => onNavigate('/super-admin/delivery-partners')}
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
            onClick={() => onNavigate('/super-admin/delivery-partners')}
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

  const { partner, currentAssignment, history, payout, documents } = data;

  const isMotorVehicle = partner.vehicleType !== 'BICYCLE';
  const docs = documents || [];

  // Calculate document validation progress
  const profilePhoto = docs.find(d => d.documentType === 'PROFILE_PHOTO');
  const dl = docs.find(d => d.documentType === 'DRIVERS_LICENSE');
  const rc = docs.find(d => d.documentType === 'VEHICLE_RC');
  const insurance = docs.find(d => d.documentType === 'VEHICLE_INSURANCE');

  let requiredDocs = [profilePhoto];
  if (isMotorVehicle) {
    requiredDocs = [profilePhoto, dl, rc, insurance];
  }

  const totalRequiredCount = requiredDocs.length;
  const verifiedRequiredCount = requiredDocs.filter(d => d && d.verificationStatus === 'VERIFIED').length;
  const allRequiredVerified = verifiedRequiredCount === totalRequiredCount;
  const hasBankConfig = !!payout;

  const isEligibleForApproval = allRequiredVerified && hasBankConfig;

  let disabledReason = '';
  if (!isEligibleForApproval) {
    const missingDocsCount = totalRequiredCount - verifiedRequiredCount;
    const reasons = [];
    if (missingDocsCount > 0) {
      reasons.push(`${missingDocsCount} required document(s) are not verified`);
    }
    if (!hasBankConfig) {
      reasons.push('Bank details are missing');
    }
    disabledReason = reasons.join(' and ');
  }

  // Account status label helper
  const renderAccountStatusBadge = (status) => {
    let bg = 'var(--bg-subtle)';
    let color = 'var(--text-muted)';
    let text = 'PENDING';
    if (status === 'APPROVED') {
      bg = 'var(--bg-success-subtle)';
      color = 'var(--text-success)';
      text = 'APPROVED';
    } else if (status === 'ACTION_REQUIRED') {
      bg = 'var(--bg-warning-subtle)';
      color = 'var(--text-warning)';
      text = 'ACTION REQUIRED';
    } else if (status === 'SUSPENDED') {
      bg = 'var(--bg-danger-subtle)';
      color = 'var(--text-danger)';
      text = 'SUSPENDED';
    }
    return (
      <span style={{
        background: bg,
        color: color,
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.7rem',
        fontWeight: '800'
      }}>
        STATUS: {text}
      </span>
    );
  };

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
        <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/super-admin/delivery-partners')}>Delivery Partners</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>{partner.user?.name}</span>
      </div>

      {/* Main Partner Profile Header Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar fallback */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {partner.user?.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} style={{ color: 'var(--text-subtle)' }} />
                <span>{partner.user?.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={14} style={{ color: 'var(--text-subtle)' }} />
                <span>{partner.phoneNumber || '—'}</span>
              </div>
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--bg-main)',
                color: 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                DELIVERY PARTNER
              </span>

              {renderAccountStatusBadge(partner.accountStatus)}

              <span style={{
                background: partner.isVerified ? 'var(--bg-success-subtle)' : 'var(--bg-warning-subtle)',
                color: partner.isVerified ? 'var(--text-success)' : 'var(--text-warning)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {partner.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>

              <span style={{
                background: partner.isOnline ? 'var(--bg-success-subtle)' : 'var(--bg-subtle)',
                color: partner.isOnline ? 'var(--text-success)' : 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {partner.isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>

              <span style={{
                background: partner.isAvailable ? 'var(--bg-success-subtle)' : 'var(--bg-subtle)',
                color: partner.isAvailable ? 'var(--text-success)' : 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {partner.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button Panel */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {partner.accountStatus !== 'SUSPENDED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <button
                disabled={partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading}
                onClick={() => partner.accountStatus !== 'APPROVED' && isEligibleForApproval && !actionLoading && setShowApproveModal(true)}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  background: (partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading) ? 'var(--bg-subtle)' : 'var(--primary)',
                  borderColor: (partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading) ? 'var(--border-color)' : 'var(--primary)',
                  color: (partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading) ? 'var(--text-muted)' : 'white',
                  cursor: (partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading) ? 'not-allowed' : 'pointer',
                  opacity: (partner.accountStatus === 'APPROVED' || !isEligibleForApproval || actionLoading) ? 0.5 : 1,
                }}
              >
                Approve Partner
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <button
                disabled={!isEligibleForApproval || actionLoading}
                onClick={() => isEligibleForApproval && !actionLoading && setShowApproveModal(true)}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  background: (!isEligibleForApproval || actionLoading) ? 'var(--bg-subtle)' : 'var(--primary)',
                  borderColor: (!isEligibleForApproval || actionLoading) ? 'var(--border-color)' : 'var(--primary)',
                  color: (!isEligibleForApproval || actionLoading) ? 'var(--text-muted)' : 'white',
                  cursor: (!isEligibleForApproval || actionLoading) ? 'not-allowed' : 'pointer',
                  opacity: (!isEligibleForApproval || actionLoading) ? 0.5 : 1,
                }}
              >
                Reactivate Partner
              </button>
            </div>
          )}

          <button
            disabled={partner.accountStatus === 'ACTION_REQUIRED' || actionLoading}
            onClick={() => partner.accountStatus !== 'ACTION_REQUIRED' && !actionLoading && setShowActionRequiredModal(true)}
            className="btn-secondary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              color: (partner.accountStatus === 'ACTION_REQUIRED' || actionLoading) ? 'var(--text-muted)' : 'var(--text-warning)',
              borderColor: (partner.accountStatus === 'ACTION_REQUIRED' || actionLoading) ? 'var(--border-color)' : 'var(--text-warning)',
              background: (partner.accountStatus === 'ACTION_REQUIRED' || actionLoading) ? 'var(--bg-subtle)' : 'transparent',
              cursor: (partner.accountStatus === 'ACTION_REQUIRED' || actionLoading) ? 'not-allowed' : 'pointer',
              opacity: (partner.accountStatus === 'ACTION_REQUIRED' || actionLoading) ? 0.5 : 1,
            }}
          >
            Action Required
          </button>

          <button
            disabled={partner.accountStatus === 'SUSPENDED' || actionLoading}
            onClick={() => partner.accountStatus !== 'SUSPENDED' && !actionLoading && setShowSuspendModal(true)}
            className="btn-secondary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              color: (partner.accountStatus === 'SUSPENDED' || actionLoading) ? 'var(--text-muted)' : 'var(--text-danger)',
              borderColor: (partner.accountStatus === 'SUSPENDED' || actionLoading) ? 'var(--border-color)' : 'var(--text-danger)',
              background: (partner.accountStatus === 'SUSPENDED' || actionLoading) ? 'var(--bg-subtle)' : 'transparent',
              cursor: (partner.accountStatus === 'SUSPENDED' || actionLoading) ? 'not-allowed' : 'pointer',
              opacity: (partner.accountStatus === 'SUSPENDED' || actionLoading) ? 0.5 : 1,
            }}
          >
            Suspend Partner
          </button>

          <button
            onClick={() => onNavigate(`/super-admin/delivery-partners/${partner.id}/manage`)}
            className="btn-secondary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: '800' }}
          >
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-danger-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-danger)', fontSize: '0.85rem', fontWeight: '700' }}>
          {actionError}
        </div>
      )}

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Partner Information & Document/Payout Cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Card 1: Partner Information */}
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
              <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
              <span>Partner Information</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{partner.user?.name}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bike size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '850', margin: 0 }}>
                      {['BIKE', 'SCOOTER', 'BICYCLE', 'CAR'].includes(partner.vehicleType?.toUpperCase()) ? { 'BIKE': 'Bike', 'SCOOTER': 'Scooter', 'BICYCLE': 'Bicycle', 'CAR': 'Car' }[partner.vehicleType.toUpperCase()] : (partner.vehicleType || '—')}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', margin: 0 }}>
                      License Plate: {partner.vehicleNumber || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver's License</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800' }}>
                    {partner.licenseNumber || '—'}
                  </span>
                  {partner.licenseNumber && <ShieldCheck size={14} style={{ color: 'var(--text-success)' }} />}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zones</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>
                  Preferred: {partner.preferredZone || '—'}<br />
                  Secondary: {partner.secondaryZone || '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined Date</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{formatDate(partner.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Verification Progress */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
              <span>Verification Progress</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700', margin: 0 }}>
                {verifiedRequiredCount} of {totalRequiredCount} required documents verified
              </p>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(verifiedRequiredCount / totalRequiredCount) * 100}%`, height: '100%', background: 'var(--text-success)', transition: 'width 0.3s' }}></div>
              </div>
              
              {!isEligibleForApproval && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-danger)', fontWeight: '700', marginTop: '0.25rem' }}>
                  <AlertTriangle size={12} />
                  <span>Cannot Approve: {disabledReason}</span>
                </div>
              )}

              {partner.statusReason && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'var(--bg-danger-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-danger)', fontWeight: '600' }}>
                  <strong>Status Reason:</strong> {partner.statusReason}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Uploaded Documents */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
              <span>Uploaded Documents</span>
            </h3>

            {docs.length === 0 ? (
              <div style={{ padding: '1rem 0', color: 'var(--text-danger)', fontSize: '0.88rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>Onboarding Incomplete: Missing required documents.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {docs.map((doc) => {
                  const isDocRequired = isMotorVehicle || doc.documentType === 'PROFILE_PHOTO';
                  const friendlyDocName = {
                    PROFILE_PHOTO: 'Profile Photo',
                    DRIVERS_LICENSE: "Driver's License",
                    VEHICLE_RC: 'Vehicle RC',
                    VEHICLE_INSURANCE: 'Vehicle Insurance'
                  }[doc.documentType] || doc.documentType;

                  let badgeColor = 'var(--text-muted)';
                  let badgeBg = 'var(--bg-subtle)';
                  if (doc.verificationStatus === 'VERIFIED') {
                    badgeColor = 'var(--text-success)';
                    badgeBg = 'var(--bg-success-subtle)';
                  } else if (doc.verificationStatus === 'REJECTED') {
                    badgeColor = 'var(--text-danger)';
                    badgeBg = 'var(--bg-danger-subtle)';
                  }

                  return (
                    <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                            {friendlyDocName} {!isDocRequired && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '500' }}>(Optional)</span>}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            File: {doc.originalFileName}
                          </span>
                        </div>
                        <span style={{
                          background: badgeBg,
                          color: badgeColor,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          {doc.verificationStatus}
                        </span>
                      </div>

                      {doc.verificationNote && (
                        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-danger-subtle)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-danger)', fontWeight: '600' }}>
                          Rejection Reason: {doc.verificationNote}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleViewDoc(doc)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800' }}
                        >
                          View Document
                        </button>

                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleVerifyDoc(doc.id)}
                            className="btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', background: 'var(--text-success)', borderColor: 'var(--text-success)', color: 'white' }}
                          >
                            Verify
                          </button>
                        )}

                        {doc.verificationStatus !== 'REJECTED' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => setShowRejectDocModal(doc)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 4: Payout Configuration */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
              <span>Payout Configuration</span>
            </h3>

            {!payout ? (
              <div style={{ padding: '1rem 0', color: 'var(--text-danger)', fontSize: '0.88rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>Onboarding Incomplete: Missing bank configuration.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Account Holder</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>{payout.accountHolderName}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Bank Account</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>{payout.maskedAccountNumber}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>IFSC Code</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>{payout.ifscCode}</p>
                </div>
                {payout.upiId && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>UPI ID</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.15rem' }}>{payout.upiId}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Assignment & Recent Delivery History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card A: Current Assignment */}
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
                  <span>Current Assignment</span>
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
                <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-subtle)', fontSize: '0.88rem', fontWeight: '700' }}>
                  {partner.isOnline ? 'No active delivery assignment.' : 'Partner is currently offline.'}
                </div>
              )}
            </div>
          </div>

          {/* Card B: Recent Delivery History */}
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
                <span>Recent Delivery History</span>
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
                <span>VIEW ALL</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Order</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Restaurant</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Area</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Payment</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Delivered At</th>
                  </tr>
                </thead>
                <tbody>
                  {history && history.length > 0 ? (
                    history.map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)' }}>
                          #ORD-{h.orderNumber}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)' }}>
                          {h.hotelName}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {h.deliveryArea || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '850', color: 'var(--text-main)' }}>
                          ₹{h.totalAmount.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '650' }}>{h.paymentMethod}</span>
                            <span style={{ fontSize: '0.65rem', color: h.paymentStatus === 'paid' ? 'var(--text-success)' : 'var(--text-warning)', fontWeight: '800' }}>
                              {h.paymentStatus.toUpperCase()}
                            </span>
                          </div>
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
                            DELIVERED
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {formatTime(h.deliveredAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '2.5rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: '700' }}>
                        No completed delivery assignments in recent history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- OVERLAY MODALS --- */}
      
      {/* 1. Reject Document Modal */}
      {showRejectDocModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Reject Document</h3>
              <button onClick={() => { setShowRejectDocModal(null); setRejectReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                Please provide a rejection reason for <strong>{
                  {
                    PROFILE_PHOTO: 'Profile Photo',
                    DRIVERS_LICENSE: "Driver's License",
                    VEHICLE_RC: 'Vehicle RC',
                    VEHICLE_INSURANCE: 'Vehicle Insurance'
                  }[showRejectDocModal.documentType] || showRejectDocModal.documentType
                }</strong>.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason (e.g. Image is blurry, driver license is expired)..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button disabled={actionLoading} onClick={() => { setShowRejectDocModal(null); setRejectReason(''); }} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
              <button disabled={actionLoading || !rejectReason.trim()} onClick={handleRejectDocSubmit} className="btn-primary" style={{ padding: '0.6rem 1.5rem', background: 'var(--text-danger)', borderColor: 'var(--text-danger)', color: 'white' }}>
                {actionLoading ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Approve Partner Confirmation Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Approve Delivery Partner?</h3>
              <button onClick={() => setShowApproveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                This will approve the delivery partner <strong>{partner.user?.name}</strong>. Their account status will transition to <strong>APPROVED</strong> and they will be verified to perform deliveries.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button disabled={actionLoading} onClick={() => setShowApproveModal(false)} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
              <button disabled={actionLoading} onClick={handleApprovePartnerSubmit} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                {actionLoading ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Action Required Modal */}
      {showActionRequiredModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Mark Action Required</h3>
              <button onClick={() => { setShowActionRequiredModal(false); setActionRequiredReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                Please specify the reason / action needed from <strong>{partner.user?.name}</strong>.
              </p>
              <textarea
                value={actionRequiredReason}
                onChange={(e) => setActionRequiredReason(e.target.value)}
                placeholder="Enter description (e.g. Profile photo must be a clear portrait)..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button disabled={actionLoading} onClick={() => { setShowActionRequiredModal(false); setActionRequiredReason(''); }} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
              <button disabled={actionLoading || !actionRequiredReason.trim()} onClick={handleActionRequiredSubmit} className="btn-primary" style={{ padding: '0.6rem 1.5rem', background: 'var(--text-warning)', borderColor: 'var(--text-warning)', color: 'white' }}>
                {actionLoading ? 'Saving...' : 'Submit Action Required'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Suspend Partner Modal */}
      {showSuspendModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Suspend Delivery Partner?</h3>
              <button onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                Are you sure you want to suspend <strong>{partner.user?.name}</strong>? They will be blocked from going online or receiving delivery assignments.
              </p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter suspension reason..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button disabled={actionLoading} onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
              <button disabled={actionLoading || !suspendReason.trim()} onClick={handleSuspendPartnerSubmit} className="btn-primary" style={{ padding: '0.6rem 1.5rem', background: 'var(--text-danger)', borderColor: 'var(--text-danger)', color: 'white' }}>
                {actionLoading ? 'Suspending...' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Image Preview Modal */}
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '640px', padding: '2rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>{previewTitle}</h3>
              <button onClick={handleClosePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-lg)', maxHeight: '70vh', overflow: 'auto' }}>
              <img src={previewImage} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleClosePreview} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
