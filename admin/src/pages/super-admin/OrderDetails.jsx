import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  ClipboardList, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock, 
  Printer, 
  Bike,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText,
  X,
  Search
} from 'lucide-react';
import { api } from '../../services/api';

export default function OrderDetails({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Assignment Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState(null);
  const [searchPartnerQuery, setSearchPartnerQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [assigningPartner, setAssigningPartner] = useState(false);
  const [assignError, setAssignError] = useState(null);

  const fetchAvailablePartners = async () => {
    setLoadingPartners(true);
    setPartnersError(null);
    setSelectedPartnerId(null);
    setSearchPartnerQuery('');
    try {
      const partners = await api.getAvailableDeliveryPartners();
      setAvailablePartners(partners || []);
    } catch (err) {
      console.error(err);
      setPartnersError('Failed to load available delivery partners.');
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleAssignPartner = async () => {
    if (!selectedPartnerId) return;
    setAssigningPartner(true);
    setAssignError(null);
    try {
      await api.assignDeliveryPartner(id, selectedPartnerId);
      setShowAssignModal(false);
      await fetchOrderDetails();
    } catch (err) {
      console.error(err);
      setAssignError(err.message || 'Failed to assign partner. Please try again.');
      // Refresh available partners list in case driver status changed
      await fetchAvailablePartners();
    } finally {
      setAssigningPartner(false);
    }
  };

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getOrderDetailsById(id);
      if (!result) {
        throw new Error('NotFound');
      }
      setData(result);
    } catch (err) {
      console.error(err);
      if (err.message.includes('404') || err.message.includes('NotFound')) {
        setError('OrderNotFound');
      } else {
        setError('Unable to load order details. Please verify NestJS service is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const handleAssignPartnerClick = () => {
    setShowAssignModal(true);
    fetchAvailablePartners();
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const formatPlacedAt = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      if (isToday(dateStr)) {
        return `at ${timeStr}, Today`;
      }
      return `at ${timeStr}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

  const getOrderStatusLabel = (status) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const renderStatusBadge = (status) => {
    let bg = 'var(--bg-subtle)';
    let text = 'var(--text-muted)';
    let label = getOrderStatusLabel(status);

    if (status === 'placed') {
      bg = 'var(--bg-subtle)';
      text = 'var(--text-muted)';
    } else if (status === 'accepted' || status === 'preparing') {
      bg = 'var(--bg-info-subtle)';
      text = 'var(--text-info)';
    } else if (status === 'ready_for_pickup') {
      bg = 'var(--bg-warning-subtle)';
      text = 'var(--text-warning)';
    } else if (status === 'picked_up' || status === 'out_for_delivery') {
      bg = 'var(--bg-danger-subtle)';
      text = 'var(--text-danger)';
    } else if (status === 'delivered') {
      bg = 'var(--bg-success-subtle)';
      text = 'var(--text-success)';
    } else if (status === 'cancelled' || status === 'rejected') {
      bg = 'var(--bg-danger-subtle)';
      text = 'var(--text-danger)';
    }

    return (
      <span style={{
        background: bg,
        color: text,
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        fontWeight: '800',
        display: 'inline-block',
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
    );
  };

  // --- RENDER LOADING SKELETONS ---
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '220px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          height: '100px'
        }}>
          <div className="skeleton" style={{ width: '250px', height: '24px', marginBottom: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '380px', height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '420px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '320px', borderRadius: 'var(--radius-xl)' }}></div>
        </div>
      </div>
    );
  }

  // --- RENDER ERROR STATES ---
  if (error === 'OrderNotFound') {
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
          Order Not Found
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The requested platform order does not exist or has been cancelled.
        </p>
        <button
          onClick={() => onNavigate('/orders')}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Back to Orders
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
            onClick={() => onNavigate('/orders')}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
          </button>
          <button
            onClick={fetchOrderDetails}
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

  const { order, activeAssignment } = data;

  // Helper for delivery assignment status CARD render
  const renderDeliveryAssignmentCardContent = () => {
    const status = order.orderStatus;
    
    // CASE D: Delivered / Cancelled / Rejected
    if (status === 'delivered') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0' }}>
          <CheckCircle size={32} style={{ color: 'var(--text-success)' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>Delivery Completed</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Order has been successfully delivered to the customer.
            </p>
          </div>
        </div>
      );
    }
    
    if (status === 'cancelled' || status === 'rejected') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0' }}>
          <XCircle size={32} style={{ color: 'var(--text-danger)' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>Order Terminated</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Order is cancelled or rejected and no delivery is required.
            </p>
          </div>
        </div>
      );
    }

    // CASE B: Partner Assigned
    if (activeAssignment && activeAssignment.deliveryPartner) {
      const partner = activeAssignment.deliveryPartner;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1rem',
              border: '1px solid var(--border-color)'
            }}>
              {partner.user?.name?.charAt(0).toUpperCase()}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--text-main)' }}>
                {partner.user?.name}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {['BIKE', 'SCOOTER', 'BICYCLE', 'CAR'].includes(partner.vehicleType?.toUpperCase()) ? { 'BIKE': 'Bike', 'SCOOTER': 'Scooter', 'BICYCLE': 'Bicycle', 'CAR': 'Car' }[partner.vehicleType.toUpperCase()] : partner.vehicleType} • {partner.vehicleNumber || 'No Plate'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Phone Number</span>
              <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{partner.phoneNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Assigned At</span>
              <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{formatTime(activeAssignment.assignedAt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Delivery Status</span>
              <span style={{ fontWeight: '850', color: 'var(--primary)', textTransform: 'uppercase' }}>
                {getOrderStatusLabel(status)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(`/super-admin/delivery-partners/${partner.id}`)}
            className="btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.8rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)',
              justifyContent: 'center',
              width: '100%',
              marginTop: '0.25rem'
            }}
          >
            <span>View Partner Profile</span>
            <ArrowRight size={13} />
          </button>
        </div>
      );
    }

    // CASE A: Ready for Pickup + No Active Partner
    if (status === 'ready_for_pickup') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>Awaiting Partner</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              Order is ready for pickup but no driver is currently assigned.
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleAssignPartnerClick}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: '850',
              borderRadius: 'var(--radius-md)',
              justifyContent: 'center',
              background: 'var(--primary)',
              color: '#ffffff',
              gap: '0.35rem',
              marginTop: '0.25rem'
            }}
          >
            <Bike size={15} />
            <span>Assign Delivery Partner</span>
          </button>
        </div>
      );
    }

    // CASE C: Order in-progress but not ready for pickup
    return (
      <div style={{ padding: '1rem 0', color: 'var(--text-subtle)', fontSize: '0.82rem', fontWeight: '700', lineHeight: '1.4' }}>
        <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontWeight: '850' }}>Waiting for Restaurant</p>
        <span>Delivery assignment becomes available when the order is ready for pickup.</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        #printable-invoice {
          display: none;
        }
        @media print {
          aside, header, button, .no-print, .no-print-layout {
            display: none !important;
          }
          body, html, #root {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            height: auto !important;
          }
          #printable-invoice {
            display: block !important;
            width: 100% !important;
            padding: 0.5in !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Main Screen Layout (hidden during print) */}
      <div className="no-print-layout" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--text-subtle)',
        fontWeight: '700'
      }}>
        <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/orders')}>Orders</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>Order #ORD-{order.orderNumber}</span>
      </div>

      {/* Profile/Order Header Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem 2rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px', margin: 0 }}>
            Order #ORD-{order.orderNumber}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {renderStatusBadge(order.orderStatus)}
            
            <span style={{
              background: 'var(--bg-info-subtle)',
              color: 'var(--text-info)',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              fontWeight: '800'
            }}>
              {order.paymentStatus?.toUpperCase()} ({order.paymentMethod})
            </span>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Placed {formatPlacedAt(order.placedAt)}
            </span>
          </div>
        </div>

        {/* Print Invoice visual mockup button */}
        <button
          onClick={handlePrintInvoice}
          className="btn-secondary"
          style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.82rem', fontWeight: '800' }}
        >
          <Printer size={15} />
          <span>Print Invoice</span>
        </button>

      </div>

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Order Items + Restaurant + Customer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Order Items */}
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
              <span>Order Items</span>
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Item</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {item.foodName}
                          </span>
                        </td>
                        
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)', textAlign: 'center' }}>
                          {item.quantity}
                        </td>
                        
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)', textAlign: 'right' }}>
                          ₹{parseFloat(item.finalUnitPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '850', color: 'var(--text-main)', textAlign: 'right' }}>
                          ₹{parseFloat(item.lineTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: '700' }}>
                        No items in this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Card 2: Restaurant Details */}
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
              <Building2 size={18} style={{ color: 'var(--primary)' }} />
              <span>Restaurant Details</span>
            </h3>

            {order.hotel ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                    {order.hotel.name}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '0.35rem', lineHeight: '1.4' }}>
                    <MapPin size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{order.hotel.address}{order.hotel.area ? `, ${order.hotel.area}` : ''}{order.hotel.city ? `, ${order.hotel.city}` : ''}</span>
                  </p>
                  {order.hotel.phoneNumber && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={13} style={{ flexShrink: 0 }} />
                      <span>{order.hotel.phoneNumber}</span>
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => onNavigate(`/hotels/${order.hotel.id}`)}
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
                    <span>View Hotel Dashboard</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '650' }}>
                Restaurant information is unavailable.
              </div>
            )}
          </div>

          {/* Card 3: Customer & Delivery */}
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
              <User size={18} style={{ color: 'var(--primary)' }} />
              <span>Customer & Delivery</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Customer Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Customer</span>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: '850', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                    {order.user?.name || '—'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Mail size={12} />
                    <span>{order.user?.email || '—'}</span>
                  </p>
                </div>
              </div>

              {/* Delivery Address Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Delivery Address</span>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: '850', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                    {order.deliveryRecipientName}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={12} />
                    <span>{order.deliveryPhoneNumber}</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    {order.deliveryAddressLine1}{order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ''}
                    {order.deliveryLandmark ? ` (Landmark: ${order.deliveryLandmark})` : ''}
                    {order.deliveryArea ? `, ${order.deliveryArea}` : ''}
                    {order.deliveryCity ? `, ${order.deliveryCity}` : ''} - {order.deliveryPincode}
                  </p>
                </div>
              </div>

            </div>

            {/* Customer note if present */}
            {order.customerNote && (
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginTop: '0.5rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                  Delivery Instructions / Notes
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  "{order.customerNote}"
                </p>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Delivery Assignment + Payment Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card A: Delivery Assignment */}
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
              <Compass size={18} style={{ color: 'var(--primary)' }} />
              <span>Delivery Assignment</span>
            </h3>

            {renderDeliveryAssignmentCardContent()}
          </div>

          {/* Card B: Payment Summary */}
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
              <FileText size={18} style={{ color: 'var(--primary)' }} />
              <span>Payment Summary</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span>Subtotal</span>
                <span>₹{parseFloat(order.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span>Delivery Fee</span>
                <span>₹{parseFloat(order.deliveryFee || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span>Taxes & Fees</span>
                <span>₹{parseFloat(order.taxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(order.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-success)', fontWeight: '700' }}>
                  <span>Discount / Promo</span>
                  <span>-₹{parseFloat(order.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: '900',
                color: 'var(--text-main)',
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '0.75rem',
                marginTop: '0.25rem'
              }}>
                <span>Total</span>
                <span>₹{parseFloat(order.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Assign Delivery Partner Modal Overlay */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          
          {/* Modal Container */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            width: '520px',
            maxWidth: '90%',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '85vh'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                  Assign Delivery Partner
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select an available delivery partner for Order #ORD-{order.orderNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={assigningPartner}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-subtle)',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
              
              {/* Error messages */}
              {assignError && (
                <div style={{
                  background: 'var(--bg-danger-subtle)',
                  color: 'var(--text-danger)',
                  border: '1px solid #f8d7da',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Search Bar Input */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)'
                }} />
                <input 
                  type="text"
                  value={searchPartnerQuery}
                  onChange={(e) => setSearchPartnerQuery(e.target.value)}
                  placeholder="Search delivery partners..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.15rem',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    fontWeight: '600',
                    background: 'var(--bg-main)'
                  }}
                />
              </div>

              {/* Drivers List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', minHeight: '200px', maxHeight: '280px', paddingRight: '0.25rem' }}>
                {loadingPartners ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', minHeight: '200px' }}>
                    <Loader2 className="spin" size={24} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Fetching available drivers...</span>
                  </div>
                ) : partnersError ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', color: 'var(--text-danger)', fontSize: '0.82rem', fontWeight: '700', minHeight: '200px' }}>
                    <AlertTriangle size={24} />
                    <span>{partnersError}</span>
                  </div>
                ) : (() => {
                  const query = searchPartnerQuery.toLowerCase().trim();
                  const filtered = availablePartners.filter(p => {
                    const name = p.user?.name?.toLowerCase() || '';
                    const phone = p.phoneNumber?.toLowerCase() || '';
                    const vType = p.vehicleType?.toLowerCase() || '';
                    const vNum = p.vehicleNumber?.toLowerCase() || '';
                    return name.includes(query) || phone.includes(query) || vType.includes(query) || vNum.includes(query);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', minHeight: '200px' }}>
                        <Bike size={28} style={{ color: 'var(--text-subtle)' }} />
                        <span style={{ fontWeight: '850', color: 'var(--text-main)' }}>
                          {searchPartnerQuery ? 'No matching partners found.' : 'No delivery partners are currently available.'}
                        </span>
                        {!searchPartnerQuery && (
                          <span style={{ fontSize: '0.72rem', maxWidth: '320px', lineHeight: '1.4' }}>
                            Partners must be active, verified, online and available to receive an assignment.
                          </span>
                        )}
                      </div>
                    );
                  }

                  return filtered.map((partner) => {
                    const isSelected = selectedPartnerId === partner.id;
                    const initials = partner.user?.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2) || 'DP';
                    
                    return (
                      <label
                        key={partner.id}
                        onClick={() => setSelectedPartnerId(partner.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-lg)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--bg-warning-subtle)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {/* Driver initials avatar */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '0.85rem'
                          }}>
                            {initials}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                {partner.user?.name}
                              </span>
                              <span style={{ background: 'var(--bg-success-subtle)', color: 'var(--text-success)', fontSize: '0.55rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>
                                VERIFIED
                              </span>
                              <span style={{ background: 'var(--bg-info-subtle)', color: 'var(--text-info)', fontSize: '0.55rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>
                                ONLINE
                              </span>
                              <span style={{ background: 'var(--bg-success-subtle)', color: 'var(--text-success)', fontSize: '0.55rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>
                                AVAILABLE
                              </span>
                            </div>
                            
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {partner.phoneNumber} • {partner.vehicleType} ({partner.vehicleNumber || 'No Plate'})
                            </span>
                          </div>
                        </div>

                        {/* Radio Selector */}
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--primary)' : '2px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          transition: 'all var(--transition-fast)'
                        }}></div>
                      </label>
                    );
                  });
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={assigningPartner}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.82rem', fontWeight: '800' }}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleAssignPartner}
                disabled={!selectedPartnerId || assigningPartner || loadingPartners}
                className="btn-primary"
                style={{
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '850',
                  background: (!selectedPartnerId || assigningPartner || loadingPartners) ? 'var(--text-subtle)' : 'var(--primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: (!selectedPartnerId || assigningPartner || loadingPartners) ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {assigningPartner ? (
                  <>
                    <Loader2 className="spin" size={14} />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <span>Assign Partner</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      </div> {/* close no-print-layout */}

      {/* Printable Invoice Container (visible ONLY during print) */}
      {order && (
        <div id="printable-invoice" style={{ fontFamily: 'sans-serif', color: '#000000', background: 'var(--bg-card)', lineHeight: 1.5 }}>
          
          {/* Logo & Document Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000000', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ea580c', margin: 0, letterSpacing: '-0.5px' }}>QuickBite</h1>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '0.2rem 0 0' }}>Platform Order Receipt & Invoice</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Invoice</h2>
              <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>Reference: <strong>#ORD-{order.orderNumber}</strong></span>
            </div>
          </div>

          {/* Terminal warnings if status is cancelled/rejected */}
          {(order.orderStatus === 'cancelled' || order.orderStatus === 'rejected') && (
            <div style={{ border: '2px solid #ef4444', background: 'var(--bg-danger-subtle)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-danger)', fontSize: '1rem', fontWeight: '950', textTransform: 'uppercase' }}>
                Order Status: {order.orderStatus.toUpperCase()}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#7f1d1d' }}>
                This document registers a terminated transaction.
              </p>
            </div>
          )}

          {/* Metadata Block (Order #, Timestamps, Payment) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', background: '#f9fafb', padding: '1.25rem', borderRadius: '6px', marginBottom: '2rem', border: '1px solid #e5e7eb', fontSize: '0.82rem' }}>
            <div>
              <span style={{ display: 'block', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: '0.25rem' }}>Order Number</span>
              <strong style={{ fontSize: '0.9rem', color: '#111827' }}>#ORD-{order.orderNumber}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: '0.25rem' }}>Placed Date</span>
              <span style={{ color: '#374151' }}>{formatPlacedAt(order.placedAt)}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: '0.25rem' }}>Delivered Date</span>
              <span style={{ color: '#374151' }}>{order.deliveredAt ? formatPlacedAt(order.deliveredAt) : '—'}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: '0.25rem' }}>Payment Status</span>
              <strong style={{ color: order.paymentStatus === 'paid' ? '#15803d' : 'var(--text-warning)', textTransform: 'uppercase' }}>
                {order.paymentStatus} ({order.paymentMethod})
              </strong>
            </div>
          </div>

          {/* Restaurant & Customer Blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
            
            {/* Restaurant Box */}
            <div style={{ border: '1px solid #e5e7eb', padding: '1.25rem', borderRadius: '6px' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: '900', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                From Restaurant
              </h3>
              {order.hotel ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{order.hotel.name}</strong>
                  <span style={{ color: '#4b5563', lineHeight: 1.4 }}>
                    {order.hotel.address}{order.hotel.area ? `, ${order.hotel.area}` : ''}{order.hotel.city ? `, ${order.hotel.city}` : ''}
                  </span>
                  {order.hotel.phoneNumber && (
                    <span style={{ color: '#4b5563', marginTop: '0.2rem' }}>Phone: {order.hotel.phoneNumber}</span>
                  )}
                </div>
              ) : (
                <span style={{ color: '#6b7280' }}>—</span>
              )}
            </div>

            {/* Customer & Delivery Box */}
            <div style={{ border: '1px solid #e5e7eb', padding: '1.25rem', borderRadius: '6px' }}>
              <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: '900', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Deliver To
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{order.deliveryRecipientName}</strong>
                <span style={{ color: '#4b5563' }}>Phone: {order.deliveryPhoneNumber}</span>
                <span style={{ color: '#4b5563', lineHeight: 1.4 }}>
                  {order.deliveryAddressLine1}{order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ''}
                  {order.deliveryLandmark ? ` (Landmark: ${order.deliveryLandmark})` : ''}
                  {order.deliveryArea ? `, ${order.deliveryArea}` : ''}
                  {order.deliveryCity ? `, ${order.deliveryCity}` : ''} - {order.deliveryPincode}
                </span>
                {order.customerNote && (
                  <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                    Note: "{order.customerNote}"
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: '#4b5563' }}>Item Details</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#4b5563', width: '80px' }}>Quantity</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#4b5563', width: '120px' }}>Unit Price</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#4b5563', width: '120px' }}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#111827', fontWeight: 'bold' }}>
                        {item.foodName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#374151' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#374151' }}>
                        ₹{parseFloat(item.finalUnitPrice).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#111827', fontWeight: 'bold' }}>
                        ₹{parseFloat(item.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                      No items present.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Box & Delivery Partner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'flex-start' }}>
            
            {/* Delivery Driver Info if exists */}
            <div>
              {activeAssignment && activeAssignment.deliveryPartner ? (
                <div style={{ border: '1px solid #e5e7eb', padding: '1rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: '850', color: '#111827', textTransform: 'uppercase' }}>
                    Assigned Courier
                  </h4>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#374151' }}>
                    {activeAssignment.deliveryPartner.user?.name}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: '#4b5563' }}>
                    {activeAssignment.deliveryPartner.phoneNumber}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: '#4b5563', fontSize: '0.75rem' }}>
                    Vehicle: {activeAssignment.deliveryPartner.vehicleType} ({activeAssignment.deliveryPartner.vehicleNumber || 'No Plate'})
                  </p>
                </div>
              ) : (
                <div style={{ padding: '1rem', border: '1px dashed #d1d5db', borderRadius: '6px', textAlign: 'center', fontSize: '0.78rem', color: '#6b7280' }}>
                  No courier partner was assigned to this dispatch.
                </div>
              )}
            </div>

            {/* Financial Summary Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', width: '280px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                <span>Subtotal</span>
                <span>₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                <span>Delivery Fee</span>
                <span>₹{parseFloat(order.deliveryFee || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                <span>Taxes & Fees</span>
                <span>₹{parseFloat(order.taxAmount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(order.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 'bold' }}>
                  <span>Discount / Promo</span>
                  <span>-₹{parseFloat(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.1rem',
                fontWeight: '900',
                color: '#000000',
                borderTop: '2px solid #000000',
                paddingTop: '0.75rem',
                marginTop: '0.25rem'
              }}>
                <span>Total Amount</span>
                <span>₹{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

          </div>

          {/* Footer Receipt Note */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '3.5rem', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
            <span>Thank you for ordering with QuickBite! For support, contact support@quickbite.com.</span>
          </div>

        </div>
      )}
    </>
  );
}

