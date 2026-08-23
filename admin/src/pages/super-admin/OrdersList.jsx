import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  Search, 
  ClipboardList, 
  Eye,
  ArrowRight,
  CheckCircle,
  Clock,
  Check,
  Bike,
  ChevronLeft,
  X
} from 'lucide-react';
import { api } from '../../services/api';

export default function OrdersList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  
  // Assign Delivery Partner State
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState('');
  const [searchPartnerQuery, setSearchPartnerQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [assigningPartner, setAssigningPartner] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifiedOrders, setNotifiedOrders] = useState(new Set());
  
  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const silentFetchOrders = async () => {
    try {
      const data = await api.getAllPlatformOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Silent fetch orders failed:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllPlatformOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load platform orders. Please verify NestJS service is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Polling available partners when assign drawer is open
  useEffect(() => {
    let intervalId = null;
    if (showAssignDrawer) {
      fetchAvailablePartners();
      intervalId = setInterval(async () => {
        try {
          const partners = await api.getAvailableDeliveryPartners();
          const list = partners || [];
          setAvailablePartners(list);
          setSelectedPartnerId(prevId => {
            if (prevId && !list.some(p => p.id === prevId)) {
              return null;
            }
            return prevId;
          });
        } catch (err) {
          console.error('[Polling] Available partners failed:', err);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showAssignDrawer]);

  // Polling order list silently when there is any active order
  useEffect(() => {
    let intervalId = null;
    const hasAnyActive = orders.some(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected');
    
    if (hasAnyActive) {
      intervalId = setInterval(() => {
        silentFetchOrders();
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [orders]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRestaurant, filterStatus, filterPayment]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterRestaurant('All');
    setFilterStatus('All');
    setFilterPayment('All');
    setCurrentPage(1);
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // --- KPI SUMMARY CALCULATIONS ---
  const todayOrders = orders.filter(o => isToday(o.placedAt));
  const totalOrdersToday = todayOrders.length;
  
  const placedCount = orders.filter(o => o.orderStatus === 'placed').length;
  const preparingCount = orders.filter(o => o.orderStatus === 'preparing' || o.orderStatus === 'accepted').length;
  const readyForPickupCount = orders.filter(o => o.orderStatus === 'ready_for_pickup').length;
  const outForDeliveryCount = orders.filter(o => o.orderStatus === 'out_for_delivery' || o.orderStatus === 'picked_up').length;
  
  const deliveredTodayCount = orders.filter(o => o.orderStatus === 'delivered' && o.deliveredAt && isToday(o.deliveredAt)).length;

  // --- FILTER & SEARCH IMPLEMENTATION ---
  const filteredOrders = orders.filter(order => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const orderNum = order.orderNumber?.toLowerCase() || '';
    const customerName = order.user?.name?.toLowerCase() || '';
    const matchesSearch = !query || orderNum.includes(query) || customerName.includes(query);

    // 2. Restaurant Filter
    const matchesRestaurant = filterRestaurant === 'All' || order.hotel?.name === filterRestaurant;

    // 3. Status Filter
    let matchesStatus = true;
    if (filterStatus !== 'All') {
      if (filterStatus === 'Placed') {
        matchesStatus = order.orderStatus === 'placed';
      } else if (filterStatus === 'Preparing') {
        matchesStatus = order.orderStatus === 'preparing' || order.orderStatus === 'accepted';
      } else if (filterStatus === 'Ready for Pickup') {
        matchesStatus = order.orderStatus === 'ready_for_pickup';
      } else if (filterStatus === 'Out for Delivery') {
        matchesStatus = order.orderStatus === 'out_for_delivery' || order.orderStatus === 'picked_up';
      } else if (filterStatus === 'Delivered') {
        matchesStatus = order.orderStatus === 'delivered';
      } else if (filterStatus === 'Cancelled') {
        matchesStatus = order.orderStatus === 'cancelled' || order.orderStatus === 'rejected';
      }
    }

    // 4. Payment Filter
    let matchesPayment = true;
    if (filterPayment !== 'All') {
      if (filterPayment === 'Paid') {
        matchesPayment = order.paymentStatus === 'paid';
      } else if (filterPayment === 'Pending') {
        matchesPayment = order.paymentStatus === 'pending';
      } else if (filterPayment === 'COD') {
        matchesPayment = order.paymentMethod?.toLowerCase() === 'cod';
      } else if (filterPayment === 'Online') {
        matchesPayment = order.paymentMethod?.toLowerCase() === 'online';
      }
    }

    return matchesSearch && matchesRestaurant && matchesStatus && matchesPayment;
  });

  // Extract unique restaurant names for dropdown filter
  const uniqueRestaurants = Array.from(new Set(orders.map(o => o.hotel?.name).filter(Boolean)));

  // --- PAGINATION CALCULATIONS ---
  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAssignPartner = (order) => {
    setSelectedOrderForAssign(order);
    setShowAssignDrawer(true);
    setSearchPartnerQuery('');
    setSelectedPartnerId(null);
    setAssignError('');
    fetchAvailablePartners();
  };

  const fetchAvailablePartners = async () => {
    setLoadingPartners(true);
    setPartnersError('');
    try {
      const data = await api.getAvailableDeliveryPartners();
      setAvailablePartners(data || []);
    } catch (err) {
      console.error(err);
      setPartnersError('Unable to load available partners.');
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleNotifyRestaurant = async () => {
    if (!selectedOrderForAssign) return;
    setIsNotifying(true);
    try {
      await api.notifyRestaurant(selectedOrderForAssign.id);
      setToast({ 
        visible: true, 
        message: 'Restaurant notified successfully.', 
        type: 'success' 
      });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
      setNotifiedOrders(prev => new Set(prev).add(selectedOrderForAssign.id));
    } catch (err) {
      console.error(err);
      const errMsg = err.message || 'Failed to notify restaurant.';
      setToast({ 
        visible: true, 
        message: errMsg, 
        type: 'error' 
      });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    } finally {
      setIsNotifying(false);
    }
  };

  const submitAssignPartner = async () => {
    if (!selectedOrderForAssign || !selectedPartnerId) return;
    setAssigningPartner(true);
    setAssignError('');
    try {
      await api.assignDeliveryPartner(selectedOrderForAssign.id, selectedPartnerId);
      
      const partner = availablePartners.find(p => p.id === selectedPartnerId);
      const partnerName = partner?.user?.name || 'Delivery partner';
      const orderNum = selectedOrderForAssign.orderNumber;
      
      setShowAssignDrawer(false);
      setSelectedOrderForAssign(null);
      // Refresh orders
      fetchOrders();
      
      // Show Success Toast
      setToast({ 
        visible: true, 
        message: `${partnerName} has been successfully assigned to Order #ORD-${orderNum}.`, 
        type: 'success' 
      });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
      
    } catch (err) {
      console.error('Assign error:', err);
      let errorMsg = 'Failed to assign partner. Please try again.';
      if (err.message && err.message.includes('already has an active assignment')) {
        errorMsg = 'This order already has a delivery partner assigned.';
      }
      setAssignError(errorMsg);
      
      // Also show failure toast if we want, but it's handled in the drawer
      setToast({ 
        visible: true, 
        message: errorMsg, 
        type: 'error' 
      });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    } finally {
      setAssigningPartner(false);
    }
  };

  const formatPlacedAt = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      if (isToday(dateStr)) {
        return `${timeStr}, Today`;
      }
      return `${timeStr}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  const renderStatusBadge = (status) => {
    let bg = 'var(--bg-subtle)';
    let text = 'var(--text-muted)';
    let label = status;

    if (status === 'placed') {
      bg = 'var(--bg-subtle)';
      text = 'var(--text-muted)';
      label = 'Placed';
    } else if (status === 'accepted' || status === 'preparing') {
      bg = 'var(--bg-info-subtle)';
      text = 'var(--text-info)';
      label = 'Preparing';
    } else if (status === 'ready_for_pickup') {
      bg = 'var(--bg-warning-subtle)';
      text = 'var(--text-warning)';
      label = 'Ready for Pickup';
    } else if (status === 'picked_up' || status === 'out_for_delivery') {
      bg = 'var(--bg-danger-subtle)';
      text = 'var(--text-danger)';
      label = 'Out for Delivery';
    } else if (status === 'delivered') {
      bg = 'var(--bg-success-subtle)';
      text = 'var(--text-success)';
      label = 'Delivered';
    } else if (status === 'cancelled' || status === 'rejected') {
      bg = 'var(--bg-danger-subtle)';
      text = 'var(--text-danger)';
      label = 'Cancelled';
    }

    return (
      <span style={{
        background: bg,
        color: text,
        padding: '0.25rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        fontWeight: '800',
        display: 'inline-block'
      }}>
        {label}
      </span>
    );
  };

  const getItemsCount = (order) => {
    if (!order.items || order.items.length === 0) return '0 items';
    const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
    return `${totalQty} item${totalQty > 1 ? 's' : ''}`;
  };

  // --- RENDER LOADING SKELETONS ---
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '220px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-lg)' }}></div>
          ))}
        </div>

        <div className="skeleton" style={{ height: '380px', borderRadius: 'var(--radius-xl)' }}></div>
      </div>
    );
  }

  // --- RENDER ERROR STATES ---
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
          Data Fetch Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
          {error}
        </p>
        <button
          onClick={fetchOrders}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem', gap: '0.6rem' }}
        >
          <RefreshCw size={16} />
          <span>Retry Fetching</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast.visible && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: toast.type === 'success' ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
          border: `1px solid ${toast.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'toastSlideDown 0.3s ease-out'
        }}>
          <style>{`
            @keyframes toastSlideDown {
              from { transform: translate(-50%, -100%); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          {toast.type === 'success' ? (
            <CheckCircle size={20} color='var(--text-success)' />
          ) : (
            <AlertTriangle size={20} color='var(--text-danger)' />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '850', color: toast.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)' }}>
              {toast.type === 'success' ? 'Delivery partner assigned successfully' : 'Assignment Failed'}
            </span>
            <span style={{ fontSize: '0.75rem', color: toast.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)', opacity: 0.9 }}>
              {toast.message}
            </span>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem', padding: '0.2rem' }}
          >
            <X size={16} color={toast.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)'} />
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes pulseAlert {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); border-color: rgba(220, 38, 38, 0.8); }
            70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); border-color: rgba(220, 38, 38, 0.3); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); border-color: rgba(220, 38, 38, 0.8); }
          }
          @media (prefers-reduced-motion: reduce) {
            .alert-pulse { animation: none !important; }
          }
          .alert-pulse {
            animation: pulseAlert 2s infinite;
          }
        `}
      </style>
      
      {/* Breadcrumbs Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--text-subtle)',
        fontWeight: '700'
      }}>
        <span>Orders</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>Platform Orders</span>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px'
        }}>Platform Orders</h1>
        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-muted)'
        }}>Monitor orders and manage delivery dispatch across QuickBite.</p>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '1rem'
      }}>
        
        {/* TOTAL ORDERS TODAY */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '105px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
            TOTAL ORDERS<br/>TODAY
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {totalOrdersToday.toLocaleString()}
          </h2>
        </div>

        {/* PLACED */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '105px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', marginTop: '4px' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
              PLACED
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {placedCount.toLocaleString()}
          </h2>
        </div>

        {/* PREPARING */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '105px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-info)', marginTop: '4px' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
              PREPARING
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {preparingCount.toLocaleString()}
          </h2>
        </div>

        {/* READY FOR PICKUP */}
        <div 
          className={readyForPickupCount > 0 ? "alert-pulse" : ""}
          onClick={() => {
            if (readyForPickupCount > 0) {
              setFilterStatus('Ready for Pickup');
              setCurrentPage(1);
            }
          }}
          style={{
            background: readyForPickupCount > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1rem',
            border: readyForPickupCount > 0 ? '1px solid #dc2626' : '1px solid var(--border-color)',
            borderLeft: readyForPickupCount > 0 ? '4px solid #dc2626' : '3px solid var(--primary)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '105px',
            cursor: readyForPickupCount > 0 ? 'pointer' : 'default',
            transition: 'background 0.2s ease'
          }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            {readyForPickupCount > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', marginTop: '4px' }}></span>}
            <span style={{ fontSize: '0.68rem', color: readyForPickupCount > 0 ? '#dc2626' : 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
              READY FOR<br/>PICKUP
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: readyForPickupCount > 0 ? 'var(--text-danger)' : 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {readyForPickupCount.toLocaleString()}
          </h2>
        </div>

        {/* OUT FOR DELIVERY */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '105px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-danger)', marginTop: '4px' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
              OUT FOR<br/>DELIVERY
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {outForDeliveryCount.toLocaleString()}
          </h2>
        </div>

        {/* DELIVERED TODAY */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '105px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-success)', marginTop: '4px' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
              DELIVERED<br/>TODAY
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {deliveredTodayCount.toLocaleString()}
          </h2>
        </div>

      </div>

      {/* Search & Filter Bar Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)'
            }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                outline: 'none',
                fontWeight: '600',
                background: 'var(--bg-main)'
              }}
            />
          </div>

          {/* Restaurant Filter */}
          <select
            value={filterRestaurant}
            onChange={(e) => setFilterRestaurant(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              fontWeight: '700',
              outline: 'none'
            }}
          >
            <option value="All">All Restaurants</option>
            {uniqueRestaurants.map((name, i) => (
              <option key={i} value={name}>{name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              fontWeight: '700',
              outline: 'none'
            }}
          >
            <option value="All">Status: All</option>
            <option value="Placed">Placed</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready for Pickup">Ready for Pickup</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Payment Filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              fontWeight: '700',
              outline: 'none'
            }}
          >
            <option value="All">Payment: All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="COD">COD</option>
            <option value="Online">Online</option>
          </select>

        </div>

        {/* More Filters Placeholder */}
        <button
          onClick={() => handleClearFilters()}
          className="btn-secondary"
          style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: '800', gap: '0.35rem' }}
        >
          <span>More Filters</span>
        </button>

      </div>

      {/* Orders Table Container */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        
        <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg-main)', padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', borderRight: '1px solid var(--border-color)' }}>Order</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Restaurant</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Items</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Payment</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Placed At</th>
                <th style={{ position: 'sticky', right: 0, zIndex: 10, background: 'var(--bg-main)', padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', textAlign: 'right', borderLeft: '1px solid var(--border-color)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const isReadyForPickup = order.orderStatus === 'ready_for_pickup';
                  const hasActiveAssignment = !!(order.activeAssignment && order.activeAssignment.isActive);
                  const partnerName = order.activeAssignment?.deliveryPartner?.user?.name || 'Partner';
                  
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                      {/* Order Number */}
                      <td style={{ position: 'sticky', left: 0, zIndex: 9, background: 'var(--bg-card)', padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary)', borderRight: '1px solid var(--border-color)' }}>
                        #ORD-{order.orderNumber}
                      </td>

                      {/* Restaurant */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.hotel?.name || '—'}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {order.user?.name || '—'}
                      </td>

                      {/* Item quantity */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '650' }}>
                        {getItemsCount(order)}
                      </td>

                      {/* Total Amount formatted in Rupees */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-main)' }}>
                        ₹{parseFloat(order.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Payment Method / Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700' }}>
                            {order.paymentMethod}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            color: order.paymentStatus === 'paid' ? 'var(--text-success)' : 'var(--text-warning)',
                            fontWeight: '800',
                            textTransform: 'uppercase'
                          }}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* Order Status Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {renderStatusBadge(order.orderStatus)}
                      </td>

                      {/* Placed At Timestamp */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {formatPlacedAt(order.placedAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ position: 'sticky', right: 0, zIndex: 9, background: 'var(--bg-card)', padding: '1rem 1.25rem', textAlign: 'right', borderLeft: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                          
                          {isReadyForPickup && !hasActiveAssignment ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAssignPartner(order)}
                                className="btn-primary"
                                style={{
                                  padding: '0.45rem 1rem',
                                  fontSize: '0.78rem',
                                  fontWeight: '850',
                                  borderRadius: 'var(--radius-md)',
                                  gap: '0.35rem',
                                  background: 'var(--primary)',
                                  color: '#ffffff',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <Bike size={13} />
                                <span>Assign Partner</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => onNavigate(`/orders/${order.id}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  marginTop: '0.15rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                View Order
                              </button>
                            </>
                          ) : isReadyForPickup && hasActiveAssignment ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                {order.activeAssignment.status === 'OFFERED' ? `Offered to ${partnerName}` : `Assigned to ${partnerName}`}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                {order.activeAssignment.status === 'OFFERED' ? 'Awaiting Acceptance' : 'Waiting for pickup'}
                              </span>
                              <button
                                type="button"
                                onClick={() => onNavigate(`/orders/${order.id}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                View Order
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigate(`/orders/${order.id}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                fontSize: '0.78rem',
                                fontWeight: '850',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              View Order
                            </button>
                          )}
                          
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <ClipboardList size={32} style={{ color: 'var(--text-subtle)' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {searchQuery || filterRestaurant !== 'All' || filterStatus !== 'All' || filterPayment !== 'All'
                          ? 'No orders match the selected filters.'
                          : 'No orders found.'}
                      </span>
                      {orders.length > 0 && (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontSize: '0.8rem',
                            fontWeight: '800',
                            textDecoration: 'underline'
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {totalFiltered > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-main)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  fontWeight: '800',
                  outline: 'none'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        background: isCurrent ? 'var(--primary)' : 'transparent',
                        color: isCurrent ? '#ffffff' : 'var(--text-main)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>

            </div>

          </div>
        )}

      </div>

      {/* Assign Delivery Partner Drawer Overlay */}
      {showAssignDrawer && selectedOrderForAssign && (
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
          justifyContent: 'flex-end',
          zIndex: 9999
        }}>
          
          {/* Drawer Container */}
          <div style={{
            background: 'var(--bg-card)',
            width: '450px',
            maxWidth: '100%',
            height: '100%',
            boxShadow: 'var(--shadow-xl)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            
            {/* Drawer Header */}
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
                  Assign an available delivery partner to this order
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignDrawer(false)}
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

            {/* Drawer Body */}
            <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
              
              {/* Order Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '850', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Order Summary
                </span>
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary)' }}>
                        #ORD-{selectedOrderForAssign.orderNumber}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '750' }}>
                        {selectedOrderForAssign.hotel?.name || '—'} <span style={{ color: 'var(--text-muted)' }}>• {selectedOrderForAssign.user?.name || '—'}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>
                        ₹{parseFloat(selectedOrderForAssign.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: selectedOrderForAssign.paymentStatus === 'paid' ? 'var(--text-success)' : 'var(--text-warning)' }}>
                        {selectedOrderForAssign.paymentMethod} • {selectedOrderForAssign.paymentStatus?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Status:</span>
                     {renderStatusBadge(selectedOrderForAssign.orderStatus)}
                  </div>

                  {selectedOrderForAssign.deliveryAddress && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '700' }}>Delivery Address</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600' }}>
                           {selectedOrderForAssign.deliveryAddress.addressLine1}
                           {selectedOrderForAssign.deliveryAddress.city ? `, ${selectedOrderForAssign.deliveryAddress.city}` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

              {/* Partners Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                 <span style={{ fontSize: '0.72rem', fontWeight: '850', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Available Delivery Partners
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {!loadingPartners && availablePartners.length > 0 ? `${availablePartners.length} Available` : ''}
                </span>
              </div>

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
                  placeholder="Search delivery partner..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.15rem',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    fontWeight: '600',
                    background: 'var(--bg-card)'
                  }}
                />
              </div>

              {/* Drivers List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {loadingPartners ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', minHeight: '200px' }}>
                    <Loader2 className="spin" size={24} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Fetching available partners...</span>
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
                    const isAlreadyNotified = selectedOrderForAssign && notifiedOrders.has(selectedOrderForAssign.id);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', minHeight: '200px' }}>
                        <Bike size={28} style={{ color: 'var(--text-subtle)' }} />
                        <span style={{ fontWeight: '850', color: 'var(--text-main)' }}>
                          {searchPartnerQuery ? 'No matching partners found.' : 'No delivery partners are currently available.'}
                        </span>
                        {!searchPartnerQuery && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                            <span style={{ fontSize: '0.75rem' }}>All active delivery partners are currently busy or unavailable.</span>
                            <button
                              type="button"
                              onClick={handleNotifyRestaurant}
                              disabled={isNotifying || isAlreadyNotified}
                              style={{
                                padding: '0.6rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: (isNotifying || isAlreadyNotified) ? 'not-allowed' : 'pointer',
                                background: (isNotifying || isAlreadyNotified) ? '#e0e0e0' : 'var(--primary)',
                                color: (isNotifying || isAlreadyNotified) ? 'var(--text-muted)' : '#ffffff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                              }}
                            >
                              {isNotifying ? 'Notifying...' : isAlreadyNotified ? 'Restaurant Notified' : 'Notify Restaurant'}
                            </button>
                          </div>
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
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-lg)',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--bg-warning-subtle)' : 'var(--bg-main)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          userSelect: 'none',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          {/* Driver initials avatar */}
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '0.9rem'
                          }}>
                            {initials}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                {partner.user?.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                                {partner.phoneNumber}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-success)' }}></span>
                              <span style={{ color: 'var(--text-success)', fontSize: '0.7rem', fontWeight: '850' }}>Available</span>
                           </div>
                           <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                              {partner.activeDeliveries || 0} active deliver{partner.activeDeliveries === 1 ? 'y' : 'ies'}
                           </span>
                        </div>
                        
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'var(--primary)',
                            color: '#ffffff',
                            padding: '0.25rem',
                            borderBottomLeftRadius: '4px'
                          }}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                      </label>
                    );
                  });
                })()}
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setShowAssignDrawer(false)}
                disabled={assigningPartner}
                className="btn-secondary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '800', background: 'var(--bg-card)' }}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={submitAssignPartner}
                disabled={!selectedPartnerId || assigningPartner || loadingPartners}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '850',
                  background: (!selectedPartnerId || assigningPartner || loadingPartners) ? 'var(--text-subtle)' : 'var(--primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  cursor: (!selectedPartnerId || assigningPartner || loadingPartners) ? 'not-allowed' : 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
              >
                {assigningPartner ? (
                  <>
                    <Loader2 size={16} className="spin" />
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

    </div>
  );
}

