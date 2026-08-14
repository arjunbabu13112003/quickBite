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
          {/* Avatar or initials fallback */}
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

              {/* Verification status badge */}
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

              {/* Active status badge */}
              <span style={{
                background: partner.isActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                color: partner.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {partner.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>

              {/* Online status badge */}
              <span style={{
                background: partner.isOnline ? 'var(--bg-success-subtle)' : 'var(--bg-subtle)',
                color: partner.isOnline ? 'var(--text-success)' : 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {partner.isOnline ? '● ONLINE' : '● OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onNavigate(`/delivery-partners/${partner.id}/manage`)}
          className="btn-primary"
          style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.88rem', fontWeight: '800' }}
        >
          <User size={16} />
          <span>Manage Partner</span>
        </button>
      </div>

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Partner Information Card */}
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
                    {partner.vehicleType || '—'}
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
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined Date</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{formatDate(partner.createdAt)}</p>
            </div>
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
            {/* Outline highlight if active */}
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

    </div>
  );
}

