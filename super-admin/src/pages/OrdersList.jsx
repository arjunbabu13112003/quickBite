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
  ChevronLeft
} from 'lucide-react';
import { api } from '../services/api';

export default function OrdersList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    // Keep assigning flow future-ready
    alert(`Assign Delivery Partner workflow for Order #${order.orderNumber} will be implemented in Step 6B.`);
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
    let bg = '#f1f5f9';
    let text = 'var(--text-muted)';
    let label = status;

    if (status === 'placed') {
      bg = '#e2e8f0';
      text = 'var(--text-muted)';
      label = 'Placed';
    } else if (status === 'accepted' || status === 'preparing') {
      bg = '#e8f0fe';
      text = '#1a73e8';
      label = 'Preparing';
    } else if (status === 'ready_for_pickup') {
      bg = '#fff2e8';
      text = '#d4380d';
      label = 'Ready for Pickup';
    } else if (status === 'picked_up' || status === 'out_for_delivery') {
      bg = '#fdf2f2';
      text = '#c5221f';
      label = 'Out for Delivery';
    } else if (status === 'delivered') {
      bg = '#e6f4ea';
      text = '#137333';
      label = 'Delivered';
    } else if (status === 'cancelled' || status === 'rejected') {
      bg = '#fce8e6';
      text = '#c5221f';
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
        background: '#ffffff',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
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
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Total Orders Today
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {totalOrdersToday.toLocaleString()}
          </h2>
        </div>

        {/* PLACED */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Placed
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {placedCount.toLocaleString()}
          </h2>
        </div>

        {/* PREPARING */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a73e8' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Preparing
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {preparingCount.toLocaleString()}
          </h2>
        </div>

        {/* READY FOR PICKUP */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          borderLeft: '3px solid var(--primary)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Ready for Pickup
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {readyForPickupCount.toLocaleString()}
          </h2>
        </div>

        {/* OUT FOR DELIVERY */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c5221f' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Out for Delivery
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {outForDeliveryCount.toLocaleString()}
          </h2>
        </div>

        {/* DELIVERED TODAY */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '95px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#137333' }}></span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Delivered Today
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: '0.2rem 0 0' }}>
            {deliveredTodayCount.toLocaleString()}
          </h2>
        </div>

      </div>

      {/* Search & Filter Bar Card */}
      <div style={{
        background: '#ffffff',
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
                background: '#f8fafc'
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
              background: '#ffffff',
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
              background: '#ffffff',
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
              background: '#ffffff',
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
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Order</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Restaurant</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Items</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Payment</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Placed At</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const isReadyForPickup = order.orderStatus === 'ready_for_pickup';
                  
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                      {/* Order Number */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary)' }}>
                        #ORD-{order.orderNumber}
                      </td>

                      {/* Restaurant */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {order.hotel?.name || '—'}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)' }}>
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
                            color: order.paymentStatus === 'paid' ? '#137333' : '#b06000',
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
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                          
                          {isReadyForPickup ? (
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
                                  color: '#ffffff'
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
                                  marginTop: '0.15rem'
                                }}
                              >
                                View Order
                              </button>
                            </>
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
                                fontWeight: '850'
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
            background: '#f8fafc',
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
                  background: '#ffffff',
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

    </div>
  );
}
