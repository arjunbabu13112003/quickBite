import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, Store, Utensils, TrendingUp, Activity, ClipboardList,
  Building, RefreshCw, Plus, AlertTriangle, Bell, User,
  Settings, MapPin, Clock, Search, Loader2, Eye, Edit, Trash2, X, Check, EyeOff, Upload,
  MoreVertical, Calendar, Tag, ChevronDown, Copy, ArrowLeft
} from 'lucide-react';
import { api } from '../../services/api';
import CustomizationsSection from './CustomizationsSection';
import RestaurantProfilePage from './RestaurantProfilePage';

// ─── Order Status Config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  placed: { label: 'New / Placed', color: '#ff5520', bg: 'rgba(255,85,32,0.1)', badge: '#ff5520' },
  accepted: { label: 'Accepted', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', badge: '#3b82f6' },
  preparing: { label: 'Preparing', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', badge: 'var(--text-warning)' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', badge: '#7c3aed' },
  picked_up: { label: 'Picked Up', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', badge: '#0891b2' },
  out_for_delivery: { label: 'Out for Delivery', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', badge: '#0284c7' },
  delivered: { label: 'Delivered', color: 'var(--text-success)', bg: 'rgba(16,185,129,0.1)', badge: '#059669' },
  cancelled: { label: 'Cancelled', color: 'var(--text-danger)', bg: 'rgba(239,68,68,0.1)', badge: '#dc2626' },
  rejected: { label: 'Rejected', color: 'var(--text-danger)', bg: 'rgba(239,68,68,0.1)', badge: '#dc2626' },
};

// Valid hotel-admin status transitions
const NEXT_TRANSITIONS = {
  placed: [{ status: 'accepted', label: 'Accept Order', primary: true }, { status: 'rejected', label: 'Reject', primary: false }],
  accepted: [{ status: 'preparing', label: 'Start Preparing', primary: true }],
  preparing: [{ status: 'ready_for_pickup', label: 'Mark Ready', primary: true }],
};

const PAYMENT_LABELS = {
  cod: 'Cash on Delivery',
  online: 'Online Payment',
  razorpay: 'Online (Razorpay)',
};

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const formatUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

const getOrderSummary = (order) => {
  if (!order.items || order.items.length === 0) {
    return `${order.itemCount || 0} items`;
  }
  if (order.items.length === 1) {
    return `${order.items[0].quantity}× ${order.items[0].foodName}`;
  }
  return `${order.items[0].quantity}× ${order.items[0].foodName} + ${order.items.length - 1} more`;
};

// ─── Orders Page ──────────────────────────────────────────────────────────────
function OrdersPage({ hotel }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: 'All Orders' },
    { value: 'placed', label: 'New / Placed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const fetchOrders = useCallback(async (showRefreshing = false) => {
    if (!hotel?.id) return;
    if (showRefreshing !== 'silent') {
      showRefreshing ? setRefreshing(true) : setLoading(true);
    }
    setErrorMsg('');
    try {
      const data = await api.getHotelOrders(hotel.id, activeFilter);
      setOrders(data || []);
    } catch (err) {
      if (showRefreshing !== 'silent') {
        setErrorMsg(err.message || 'Failed to load orders.');
      }
    } finally {
      if (showRefreshing !== 'silent') {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [hotel?.id, activeFilter]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders('silent');
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await api.updateOrderStatus(hotel.id, orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (o.orderNumber || '').toLowerCase().includes(q) || (o.user?.name || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)' }}>Orders</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {hotel?.name} &bull; {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            {activeFilter ? ` (${STATUS_CONFIG[activeFilter]?.label})` : ''}
          </span>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by order # or customer name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem 0.55rem 2.25rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', fontWeight: '600', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-full)', border: `1.5px solid ${activeFilter === f.value ? 'var(--primary)' : 'var(--border-color)'}`, background: activeFilter === f.value ? 'var(--primary)' : '#ffffff', color: activeFilter === f.value ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div style={{ background: 'var(--bg-danger-subtle)', border: '1px solid #fee2e2', color: 'var(--text-danger)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '0.88rem' }}>
          &#9888;&#65039; {errorMsg}
          <button onClick={() => fetchOrders()} style={{ background: 'var(--text-danger)', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}>Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center' }}>
          <ClipboardList size={44} style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>No orders found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeFilter ? `No orders with status "${STATUS_CONFIG[activeFilter]?.label}".` : 'No orders have been placed yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredOrders.map(order => {
            const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed;
            const transitions = NEXT_TRANSITIONS[order.orderStatus] || [];
            const isExpanded = expandedOrder === order.id;
            const isUpdating = updatingOrderId === order.id;

            return (
              <div
                key={order.id}
                style={{ background: 'var(--bg-card)', border: `1.5px solid ${isExpanded ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: isExpanded ? '0 4px 20px rgba(255,85,32,0.08)' : 'var(--shadow-sm)' }}
              >
                {/* Main row */}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Left */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '850', fontSize: '0.95rem', color: 'var(--text-main)' }}>#{order.orderNumber}</span>
                        <span style={{ background: cfg.bg, color: cfg.badge, padding: '0.18rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>{cfg.label}</span>
                        <span style={{ background: order.paymentMethod === 'cod' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: order.paymentMethod === 'cod' ? 'var(--text-warning)' : '#047857', padding: '0.18rem 0.55rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: '800' }}>
                          {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {order.user?.name || 'Unknown Customer'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        {order.items && order.items.length > 0
                          ? order.items.map(item => `${item.quantity}× ${item.foodName}`).join(', ')
                          : `${order.itemCount || 0} item(s)`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        <Clock size={12} />
                        {formatTime(order.placedAt)} &bull; {timeAgo(order.placedAt)}
                      </div>

                      {order.orderStatus === 'ready_for_pickup' && (
                        <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', background: order.activeAssignment ? 'var(--bg-success-subtle)' : 'var(--bg-warning-subtle)', border: `1px solid ${order.activeAssignment ? 'var(--border-success-subtle)' : 'var(--border-warning-subtle)'}`, fontSize: '0.75rem', fontWeight: '700', color: order.activeAssignment ? 'var(--text-success)' : 'var(--text-warning)' }}>
                          <span>🛵</span>
                          {order.activeAssignment ? `Delivery partner assigned (${order.activeAssignment.deliveryPartner?.user?.name || 'Rider'})` : 'Waiting for delivery partner'}
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '850', color: 'var(--text-main)' }}>
                        &#8377;{Number(order.totalAmount).toLocaleString('en-IN')}
                      </span>
                      {/* Payment status chip */}
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: order.paymentStatus === 'paid' ? '#059669' : order.paymentStatus === 'failed' ? '#dc2626' : '#92400e', background: order.paymentStatus === 'paid' ? 'rgba(5,150,105,0.1)' : order.paymentStatus === 'failed' ? 'rgba(220,38,38,0.1)' : 'rgba(146,64,14,0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        {(order.paymentStatus || 'pending').toUpperCase()}
                      </span>

                      {/* Status action buttons */}
                      {transitions.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {transitions.map(t => (
                            <button
                              key={t.status}
                              onClick={() => handleUpdateStatus(order.id, t.status)}
                              disabled={isUpdating}
                              style={{ padding: '0.35rem 0.75rem', background: t.primary ? 'var(--primary)' : '#ffffff', color: t.primary ? '#ffffff' : 'var(--text-muted)', border: t.primary ? 'none' : '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '800', cursor: isUpdating ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              {isUpdating && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Eye size={13} />
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Delivery address */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={12} /> Delivery Address
                      </div>
                      {order.deliveryAddressLine1 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600', lineHeight: '1.5' }}>
                          {[order.deliveryAddressLine1, order.deliveryAddressLine2, order.deliveryLandmark, order.deliveryArea,
                          `${order.deliveryCity}, ${order.deliveryState} - ${order.deliveryPincode}`].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Address not recorded</span>
                      )}
                    </div>

                    {/* Items breakdown */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Order Items</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.quantity}× {item.foodName}</span>
                            <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>&#8377;{Number(item.lineTotal).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: '850', fontSize: '0.9rem' }}>
                          <span>Total</span>
                          <span style={{ color: 'var(--primary)' }}>&#8377;{Number(order.totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Categories Management Section ──────────────────────────────────────────
// ─── Menu Management Section ────────────────────────────────────────────────
function MenuManagementPage({ hotel, openAddFoodOnMount, setOpenAddFoodOnMount }) {
  const [subtab, setSubtab] = useState(openAddFoodOnMount ? 'foods' : 'categories');

  useEffect(() => {
    if (openAddFoodOnMount) {
      setSubtab('foods');
    }
  }, [openAddFoodOnMount]);
  return (
    <div>
      {/* Tab/Toolbar header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)' }}>Menu Management</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organize your restaurant menu and categories</span>
        </div>
      </div>

      {/* Categories / Food Items Subtabs */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setSubtab('categories')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subtab === 'categories' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: subtab === 'categories' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.3rem 0.5rem',
            fontWeight: subtab === 'categories' ? '800' : '700',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Categories
        </button>
        <button
          onClick={() => setSubtab('foods')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subtab === 'foods' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: subtab === 'foods' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.3rem 0.5rem',
            fontWeight: subtab === 'foods' ? '800' : '700',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Food Items
        </button>
        <button
          onClick={() => setSubtab('customizations')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subtab === 'customizations' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: subtab === 'customizations' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.3rem 0.5rem',
            fontWeight: subtab === 'customizations' ? '800' : '700',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Customizations
        </button>
      </div>

      {subtab === 'categories' ? (
        <CategoriesSection hotel={hotel} />
      ) : subtab === 'foods' ? (
        <FoodItemsSection
          hotel={hotel}
          openAddFoodOnMount={openAddFoodOnMount}
          setOpenAddFoodOnMount={setOpenAddFoodOnMount}
        />
      ) : (
        <CustomizationsSection hotel={hotel} />
      )}
    </div>
  );
}

// ─── Categories Subtab Component ─────────────────────────────────────────────
function CategoriesSection({ hotel }) {
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = add, object = edit
  const [modalName, setModalName] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalActive, setModalActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Deactivate confirmation modal
  const [deactivatingCat, setDeactivatingCat] = useState(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!hotel?.id) return;
    showRefreshing ? setRefreshing(true) : setLoading(true);
    setErrorMsg('');
    try {
      const [catsData, foodsData] = await Promise.all([
        api.getCategories(hotel.id),
        api.getHotelFoods(hotel.id)
      ]);
      setCategories(catsData || []);
      setFoods(foodsData || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load categories data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotel?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Summary calculations
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.isActive).length;
  const disabledCategories = categories.filter(c => !c.isActive).length;

  // Real "this week" count calculation: categories created in the last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const createdThisWeek = categories.filter(c => c.isActive && new Date(c.createdAt).getTime() >= oneWeekAgo).length;

  // Filter categories by search query
  const filteredCats = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open Add/Edit Modal
  const openModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setModalName(cat.name);
      setModalDesc(cat.description || '');
      setModalActive(cat.isActive);
    } else {
      setEditingCategory(null);
      setModalName('');
      setModalDesc('');
      setModalActive(true);
    }
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const nameTrimmed = modalName.trim();
    if (!nameTrimmed) return;

    // Frontend validation: Prevent duplicate names in state
    const duplicate = categories.find(c =>
      c.name.toLowerCase() === nameTrimmed.toLowerCase() &&
      (!editingCategory || c.id !== editingCategory.id)
    );
    if (duplicate) {
      alert(`Category with name "${nameTrimmed}" already exists in this hotel.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: nameTrimmed,
        description: modalDesc.trim() || null,
        isActive: modalActive
      };

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
      } else {
        await api.createCategory(hotel.id, payload);
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    if (cat.isActive) {
      // Disabling category - check if it has items
      const itemsInCat = foods.filter(f => f.categoryId === cat.id && f.isActive);
      if (itemsInCat.length > 0) {
        setDeactivatingCat(cat);
      } else {
        deactivateCatDirect(cat.id);
      }
    } else {
      // Enable category
      try {
        await api.updateCategory(cat.id, { isActive: true });
        fetchData(true);
      } catch (err) {
        alert(err.message || 'Failed to enable category.');
      }
    }
  };

  const deactivateCatDirect = async (id) => {
    try {
      await api.deactivateCategory(id);
      setDeactivatingCat(null);
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to disable category.');
    }
  };

  return (
    <div>
      {/* Summary KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Total categories */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Total Categories</span>
            <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{totalCategories}</span>
          </div>
          <Activity size={20} style={{ color: 'var(--text-subtle)' }} />
        </div>
        {/* Active categories */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Active Categories</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{activeCategories}</span>
              {createdThisWeek > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: '800', background: 'rgba(16,185,129,0.12)', color: 'var(--text-success)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)' }}>
                  +{createdThisWeek} this week
                </span>
              )}
            </div>
          </div>
          <Check size={20} style={{ color: 'var(--text-success)' }} />
        </div>
        {/* Disabled categories */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Disabled Categories</span>
            <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{disabledCategories}</span>
          </div>
          <EyeOff size={20} style={{ color: 'var(--text-subtle)' }} />
        </div>
      </div>

      {/* Toolbar Search & Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.75rem 0.5rem 2.25rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}
          />
        </div>
        <button
          onClick={() => openModal()}
          style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-glow)' }}
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div style={{ background: 'var(--bg-danger-subtle)', border: '1px solid #fee2e2', color: 'var(--text-danger)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '0.88rem' }}>
          &#9888;&#65039; {errorMsg}
          <button onClick={() => fetchData()} style={{ background: 'var(--text-danger)', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}>Retry</button>
        </div>
      )}

      {/* Table / Empty State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '50px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
        </div>
      ) : filteredCats.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center' }}>
          <Building size={44} style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>
            {searchQuery ? 'No categories match search' : 'No categories yet'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {searchQuery ? 'Try adjusting your search keywords.' : 'Create categories to organize your menu items.'}
          </p>
          {!searchQuery && (
            <button onClick={() => openModal()} className="btn-primary" style={{ padding: '0.55rem 1.15rem' }}>
              <Plus size={16} /> Add First Category
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>CATEGORY</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>MENU ITEMS</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCats.map(cat => {
                const count = cat.foodCount ?? foods.filter(f => f.categoryId === cat.id).length;
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.1s' }}>
                    {/* Category name & description */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{cat.name}</div>
                      {cat.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{cat.description}</div>}
                    </td>
                    {/* Items count */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                      {count} items
                    </td>
                    {/* Status badge */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        background: cat.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: cat.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                        padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem', fontWeight: '800', textTransform: 'capitalize'
                      }}>
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {/* Action buttons */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          title="Edit Category"
                          onClick={() => openModal(cat)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          title={cat.isActive ? 'Disable Category' : 'Enable Category'}
                          onClick={() => handleToggleActive(cat)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: cat.isActive ? 'var(--text-danger)' : 'var(--text-success)' }}
                        >
                          {cat.isActive ? <EyeOff size={16} /> : <Check size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '440px', padding: '1.75rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', animation: 'scaleUp 0.15s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '850', color: 'var(--text-main)' }}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Biryani"
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Description (Optional)</label>
                <textarea
                  placeholder="Describe this category's dishes..."
                  value={modalDesc}
                  onChange={e => setModalDesc(e.target.value)}
                  rows="3"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', fontWeight: '600', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Status</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', marginTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={modalActive}
                      onChange={e => setModalActive(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Active Category
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {submitting && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deactivation Warning Modal */}
      {deactivatingCat && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px', padding: '1.75rem', boxShadow: 'var(--shadow-lg)', border: '1.5px solid #fee2e2', textAlign: 'center', animation: 'scaleUp 0.15s ease-out' }}>
            <AlertTriangle size={40} style={{ color: 'var(--text-danger)', marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Disable Category?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Disabling category <strong>"{deactivatingCat.name}"</strong> will affect menu items currently linked to it. The category and its menu items will no longer be visible to customers on the store front.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
              <button onClick={() => setDeactivatingCat(null)} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={() => deactivateCatDirect(deactivatingCat.id)} style={{ background: 'var(--text-danger)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: '#ffffff' }}>
                Disable Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Food Items Subtab Component ─────────────────────────────────────────────
function FoodItemsSection({ hotel, openAddFoodOnMount, setOpenAddFoodOnMount }) {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [homeCategories, setHomeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(''); // '' | 'active' | 'disabled'
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(''); // '' | 'veg' | 'non-veg'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'price-asc' | 'price-desc' | 'name-asc'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null); // null = add, object = edit

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1);
  const [skipCustomization, setSkipCustomization] = useState(false);

  // Customization States
  const [customizationHeading, setCustomizationHeading] = useState('');
  const [headingChoices, setHeadingChoices] = useState([]);
  const [newHeadingChoice, setNewHeadingChoice] = useState('');
  const [addons, setAddons] = useState([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');
  const [singleGroupId, setSingleGroupId] = useState(null);
  const [addonsGroupId, setAddonsGroupId] = useState(null);

  const [modalName, setModalName] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalHomeCategory, setModalHomeCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modalIsVeg, setModalIsVeg] = useState(true);
  const [modalRegularPrice, setModalRegularPrice] = useState('');
  const [modalOfferPrice, setModalOfferPrice] = useState('');
  // modalImages[i]: string (existing URL or legacy base64) | File (new local pick) | null (empty)
  const [modalImages, setModalImages] = useState([null, null, null]);
  // modalPreviews[i]: display URL for <img src>. Derived from modalImages.
  const [modalPreviews, setModalPreviews] = useState([null, null, null]);
  const [modalIngredients, setModalIngredients] = useState([]); // Array of strings (chips)
  const [ingredientInput, setIngredientInput] = useState('');
  const [modalAvailable, setModalAvailable] = useState(true);
  const [modalActive, setModalActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(''); // 'Uploading images...' etc.

  const fileInputRefs = [React.useRef(null), React.useRef(null), React.useRef(null)];

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!hotel?.id) return;
    showRefreshing ? setRefreshing(true) : setLoading(true);
    setErrorMsg('');
    try {
      const [foodsData, catsData, homeCatsRes] = await Promise.all([
        api.getHotelFoodsWithActiveOnly(hotel.id, false),
        api.getCategories(hotel.id),
        api.getActiveHomeFoodCategories()
      ]);
      setFoods(foodsData || []);
      setCategories(catsData || []);
      setHomeCategories(Array.isArray(homeCatsRes) ? homeCatsRes : (homeCatsRes?.data || []));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load foods data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotel?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary Metrics calculations
  const totalFoods = foods.length;
  const availableCount = foods.filter(f => f.isAvailable).length;
  const soldOutCount = foods.filter(f => !f.isAvailable).length;
  const vegCount = foods.filter(f => f.isVeg).length;

  // Filter logic
  const filteredFoods = foods.filter(f => {
    // Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = (f.name || '').toLowerCase().includes(q);
      const matchDesc = (f.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    // Category filter
    if (selectedCategoryFilter !== '' && String(f.categoryId) !== String(selectedCategoryFilter)) {
      return false;
    }
    // Status filter (Active / Disabled)
    if (selectedStatusFilter !== '') {
      const activeMatch = selectedStatusFilter === 'active' ? f.isActive : !f.isActive;
      if (!activeMatch) return false;
    }
    // Type filter (Veg / Non-Veg)
    if (selectedTypeFilter !== '') {
      const vegMatch = selectedTypeFilter === 'veg' ? f.isVeg : !f.isVeg;
      if (!vegMatch) return false;
    }
    return true;
  });

  // Sorting logic
  const sortedFoods = [...filteredFoods].sort((a, b) => {
    if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
    if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
    if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    return b.id - a.id;
  });

  // Paginated foods list
  const totalItems = sortedFoods.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFoods = sortedFoods.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // Add / Edit Modal — open
  const openModal = async (food = null) => {
    setWizardStep(1);
    setSkipCustomization(false);
    setCustomizationHeading('');
    setHeadingChoices([]);
    setAddons([]);
    setSingleGroupId(null);
    setAddonsGroupId(null);
    setIsAddingNewCategory(false);
    setNewCategoryName('');

    if (food) {
      setEditingFood(food);
      setSkipCustomization(food.customizable === false);
      setModalName(food.name || '');
      setModalDesc(food.description || '');
      setModalCategory(String(food.categoryId || ''));
      setModalHomeCategory(String(food.homeFoodCategoryId || ''));
      setModalIsVeg(food.isVeg);
      setModalRegularPrice(String(food.price || ''));
      setModalOfferPrice(food.offerPrice ? String(food.offerPrice) : '');

      // Load existing images: always URL strings (or legacy base64). Put them into slots.
      const existingUrls = food.images && food.images.length > 0
        ? [...food.images]
        : (food.image ? [food.image] : []);
      const imgs = [existingUrls[0] || null, existingUrls[1] || null, existingUrls[2] || null];
      setModalImages(imgs);
      setModalPreviews(imgs.map(v => (typeof v === 'string' ? v : null)));

      const loadedIngredients = food.ingredientsList && food.ingredientsList.length > 0
        ? [...food.ingredientsList]
        : (food.ingredients ? food.ingredients.split(',').map(s => s.trim()).filter(Boolean) : []);
      setModalIngredients(loadedIngredients);

      setIngredientInput('');
      setModalAvailable(food.isAvailable);
      setModalActive(food.isActive);

      try {
        const res = await api.get(`/foods/${food.id}/customizations`);
        const fetchedGroups = Array.isArray(res) ? res : (res.data || []);

        const singleGrp = fetchedGroups.find(g => g.selectionType === 'single');
        const multiGrp = fetchedGroups.find(g => g.selectionType === 'multiple');

        if (singleGrp) {
          setSingleGroupId(singleGrp.id);
          setCustomizationHeading(singleGrp.name);
          setHeadingChoices(singleGrp.choices || []);
        }
        if (multiGrp) {
          setAddonsGroupId(multiGrp.id);
          setAddons(multiGrp.choices || []);
        }
      } catch (err) {
        console.error('Failed to load customizations:', err);
      }
    } else {
      setEditingFood(null);
      setModalName('');
      setModalDesc('');
      const activeCats = categories.filter(c => c.isActive);
      setModalCategory(activeCats.length > 0 ? String(activeCats[0].id) : '');
      setModalHomeCategory('');
      setModalIsVeg(true);
      setModalRegularPrice('');
      setModalOfferPrice('');
      setModalImages([null, null, null]);
      setModalPreviews([null, null, null]);
      setModalIngredients([]);
      setIngredientInput('');
      setModalAvailable(true);
      setModalActive(true);
    }
    setUploadProgress('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openAddFoodOnMount) {
      openModal(null);
      setOpenAddFoodOnMount(false);
    }
  }, [openAddFoodOnMount, setOpenAddFoodOnMount]);

  const addIngredient = (e) => {
    if (e) e.preventDefault();
    const val = ingredientInput.trim();
    if (!val) return;

    // Case insensitive check
    const isDup = modalIngredients.some(ing => ing.toLowerCase() === val.toLowerCase());
    if (isDup) {
      alert(`"${val}" is already added to the ingredients.`);
      return;
    }

    setModalIngredients(prev => [...prev, val]);
    setIngredientInput('');
  };

  const removeIngredient = (index) => {
    setModalIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageFileChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    // Validate size: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5 MB.');
      return;
    }

    // Store the File object in the slot
    setModalImages(prev => {
      const next = [...prev];
      next[index] = file;
      return next;
    });

    // Create an object URL for the preview
    const previewUrl = URL.createObjectURL(file);
    setModalPreviews(prev => {
      const next = [...prev];
      next[index] = previewUrl;
      return next;
    });

    // Clear the input so the same file can be re-selected later
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setModalImages(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setModalPreviews(prev => {
      const next = [...prev];
      if (next[index] && next[index].startsWith('blob:')) {
        URL.revokeObjectURL(next[index]);
      }
      next[index] = null;
      return next;
    });
  };

  // ─── Customization Handlers ───
  const handleAddHeadingChoice = (e) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = newHeadingChoice.trim();
    if (!val) return;
    if (headingChoices.some(c => c.name.toLowerCase() === val.toLowerCase())) {
      alert(`Option "${val}" is already added.`);
      return;
    }
    setHeadingChoices([...headingChoices, { name: val, isAvailable: true }]);
    setNewHeadingChoice('');
  };

  const handleRemoveHeadingChoice = (index) => {
    const newChoices = [...headingChoices];
    newChoices.splice(index, 1);
    setHeadingChoices(newChoices);
  };

  const handleAddAddon = (e) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const nameVal = newAddonName.trim();
    const priceVal = parseFloat(newAddonPrice);
    if (!nameVal) return;
    if (isNaN(priceVal) || priceVal < 0) {
      alert('Please enter a valid extra price (0 or greater).');
      return;
    }
    if (addons.some(a => a.name.toLowerCase() === nameVal.toLowerCase())) {
      alert(`Add-on "${nameVal}" already exists.`);
      return;
    }
    setAddons([...addons, { name: nameVal, additionalPrice: priceVal, isAvailable: true }]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (index) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    setAddons(newAddons);
  };

  const handleToggleAddonActive = (index) => {
    const newAddons = [...addons];
    newAddons[index].isAvailable = !newAddons[index].isAvailable;
    setAddons(newAddons);
  };
  // ──────────────────────────────

  const handleAddCategoryInline = async (e) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const catName = newCategoryName.trim();
    if (!catName) return;
    setSubmitting(true);
    try {
      const res = await api.createCategory(hotel.id, { name: catName, isActive: true });
      const newCatId = res.id || res.data?.id;
      if (newCatId) {
        setCategories([...categories, { id: newCatId, name: catName, isActive: true }]);
        setModalCategory(String(newCatId));
      }
      setIsAddingNewCategory(false);
      setNewCategoryName('');
    } catch (err) {
      alert('Failed to add category. ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextStep1 = () => {
    const nameTrimmed = modalName.trim();
    const regularPriceNum = Number(modalRegularPrice);
    const offerPriceNum = modalOfferPrice.trim() !== '' ? Number(modalOfferPrice) : null;

    if (!nameTrimmed) { alert('Food Name is required.'); return; }
    if (!modalCategory) { alert('Category selection is required.'); return; }

    if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
      alert('Regular Price must be a valid positive number.');
      return;
    }
    if (offerPriceNum !== null) {
      if (isNaN(offerPriceNum) || offerPriceNum <= 0) {
        alert('Offer Price must be a valid positive number.');
        return;
      }
      if (offerPriceNum >= regularPriceNum) {
        alert('Offer Price must be less than Regular Price.');
        return;
      }
    }

    // Check at least one image slot is filled
    const hasImage = modalImages.some(v => v !== null);
    if (!hasImage) {
      alert('At least one food image is required.');
      return;
    }

    setWizardStep(2);
  };

  const handleNextStep2 = () => {
    if (headingChoices.length > 0 && !customizationHeading.trim()) {
      alert('Customization Heading is required if you add options.');
      return;
    }
    setSkipCustomization(false);
    setWizardStep(3);
  };

  const handleModalSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitting(true);
    try {

      const nameTrimmed = modalName.trim();
      const regularPriceNum = Number(modalRegularPrice);
      const offerPriceNum = modalOfferPrice.trim() !== '' ? Number(modalOfferPrice) : null;
      // ── Step 1: Upload any NEW File objects via multipart ────────────────
      // Build ordered slot array: each slot is either a File (new), string (existing URL), or null
      const slots = [modalImages[0] ?? null, modalImages[1] ?? null, modalImages[2] ?? null];

      const fileSlotIndices = slots.reduce((acc, v, i) => {
        if (v instanceof File) acc.push(i);
        return acc;
      }, []);

      let finalImageUrls = slots.map(v => (typeof v === 'string' ? v : null));

      if (fileSlotIndices.length > 0) {
        setUploadProgress('Uploading images...');
        const filesToUpload = fileSlotIndices.map(i => slots[i]);
        const { urls } = await api.uploadFoodImages(hotel.id, filesToUpload);
        // Map returned URLs back into their original slot positions
        fileSlotIndices.forEach((slotIdx, fileOrder) => {
          finalImageUrls[slotIdx] = urls[fileOrder];
        });
        setUploadProgress('');
      }

      // Remove nulls from the end but keep the order
      const cleanedImages = finalImageUrls.filter(Boolean);
      if (cleanedImages.length === 0) {
        alert('At least one food image is required.');
        return;
      }

      // ── Step 2: Save the food record with URL-only images ────────────────
      const payload = {
        name: nameTrimmed,
        description: modalDesc.trim() || null,
        categoryId: parseInt(modalCategory, 10),
        homeFoodCategoryId: parseInt(modalHomeCategory, 10) || null,
        isVeg: modalIsVeg,
        price: regularPriceNum,
        offerPrice: offerPriceNum,
        images: cleanedImages,
        image: cleanedImages[0],
        ingredientsList: modalIngredients,
        ingredients: modalIngredients.join(', '),
        isAvailable: modalAvailable,
        isActive: modalActive,
        customizable: !skipCustomization
      };

      let savedFood;
      if (editingFood) {
        savedFood = await api.updateFood(editingFood.id, payload);
      } else {
        savedFood = await api.createFood(hotel.id, payload);
      }

      const targetFoodId = savedFood.id;

      if (skipCustomization) {
        if (singleGroupId) {
          try {
            await api.patch(`/customization-groups/${singleGroupId}`, { isActive: false });
          } catch (e) {
            console.warn('Failed to deactivate single customization group:', e);
          }
        }
        if (addonsGroupId) {
          try {
            await api.patch(`/customization-groups/${addonsGroupId}`, { isActive: false });
          } catch (e) {
            console.warn('Failed to deactivate addons customization group:', e);
          }
        }
      } else {
        let existingDbGroups = [];
        try {
          const existingRes = await api.get(`/foods/${targetFoodId}/customizations`);
          existingDbGroups = Array.isArray(existingRes) ? existingRes : (existingRes.data || []);
        } catch (err) {
          console.warn('Could not fetch existing customizations, might be a new food.');
        }
        const existingSingle = existingDbGroups.find(g => g.selectionType === 'single')?.choices || [];
        const existingMulti = existingDbGroups.find(g => g.selectionType === 'multiple')?.choices || [];

        // 1. Process Heading Group
        if (headingChoices.length > 0) {
          if (singleGroupId) {
            await api.patch(`/customization-groups/${singleGroupId}`, {
              name: customizationHeading.trim(),
              selectionType: 'single',
              isRequired: false,
              isActive: true
            });
            for (const choice of headingChoices) {
              if (choice.id) {
                await api.patch(`/customization-choices/${choice.id}`, { name: choice.name, additionalPrice: 0 });
                await api.patch(`/customization-choices/${choice.id}/availability`, { isAvailable: choice.isAvailable !== false });
              } else {
                await api.post(`/customization-groups/${singleGroupId}/choices`, { name: choice.name, additionalPrice: 0 });
              }
            }

            const currentSingleIds = headingChoices.map(c => c.id).filter(id => id);
            for (const old of existingSingle) {
              if (!currentSingleIds.includes(old.id)) {
                await api.patch(`/customization-choices/${old.id}/deactivate`, {});
              }
            }
          } else {
            await api.post(`/foods/${targetFoodId}/customization-groups`, {
              name: customizationHeading.trim(),
              selectionType: 'single',
              isRequired: false,
              choices: headingChoices.map(c => ({ name: c.name, additionalPrice: 0, isAvailable: c.isAvailable !== false }))
            });
          }
        } else if (singleGroupId) {
          await api.patch(`/customization-groups/${singleGroupId}`, { isActive: false });
        }

        // 2. Process Addons Group
        if (addons.length > 0) {
          if (addonsGroupId) {
            await api.patch(`/customization-groups/${addonsGroupId}`, {
              name: 'Popular Add-ons',
              selectionType: 'multiple',
              isRequired: false,
              isActive: true
            });
            for (const addon of addons) {
              if (addon.id) {
                await api.patch(`/customization-choices/${addon.id}`, { name: addon.name, additionalPrice: addon.additionalPrice });
                await api.patch(`/customization-choices/${addon.id}/availability`, { isAvailable: addon.isAvailable !== false });
              } else {
                await api.post(`/customization-groups/${addonsGroupId}/choices`, { name: addon.name, additionalPrice: addon.additionalPrice });
              }
            }

            const currentMultiIds = addons.map(a => a.id).filter(id => id);
            for (const old of existingMulti) {
              if (!currentMultiIds.includes(old.id)) {
                await api.patch(`/customization-choices/${old.id}/deactivate`, {});
              }
            }
          } else {
            await api.post(`/foods/${targetFoodId}/customization-groups`, {
              name: 'Popular Add-ons',
              selectionType: 'multiple',
              isRequired: false,
              choices: addons.map(a => ({ name: a.name, additionalPrice: a.additionalPrice, isAvailable: a.isAvailable !== false }))
            });
          }
        } else if (addonsGroupId) {
          await api.patch(`/customization-groups/${addonsGroupId}`, { isActive: false });
        }
      }

      setIsModalOpen(false);
      fetchData(true);
    } catch (err) {
      setUploadProgress('');
      alert(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailable = async (food) => {
    try {
      const newAvail = !food.isAvailable;
      await api.updateFoodAvailability(food.id, newAvail);
      setFoods(prev => prev.map(f => f.id === food.id ? { ...f, isAvailable: newAvail } : f));
    } catch (err) {
      alert(err.message || 'Failed to toggle availability.');
    }
  };

  const handleToggleActive = async (food) => {
    try {
      if (food.isActive) {
        await api.deactivateFood(food.id);
        setFoods(prev => prev.map(f => f.id === food.id ? { ...f, isActive: false } : f));
      } else {
        await api.updateFood(food.id, { isActive: true });
        setFoods(prev => prev.map(f => f.id === food.id ? { ...f, isActive: true } : f));
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div>
      {!isModalOpen ? (
        <>
          {/* Summary KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Total Food Items */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Total Food Items</span>
                <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{totalFoods}</span>
              </div>
              <Utensils size={20} style={{ color: 'var(--text-subtle)' }} />
            </div>
            {/* Available */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Available</span>
                <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{availableCount}</span>
              </div>
              <Check size={20} style={{ color: 'var(--text-success)' }} />
            </div>
            {/* Sold Out */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Sold Out</span>
                <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{soldOutCount}</span>
              </div>
              <X size={20} style={{ color: 'var(--text-danger)' }} />
            </div>
            {/* Veg Items */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Veg Items</span>
                <span style={{ fontSize: '1.85rem', fontWeight: '850', color: 'var(--text-main)' }}>{vegCount}</span>
              </div>
              <div style={{ width: 14, height: 14, borderRadius: 2, borderWidth: 1.5, borderColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
              </div>
            </div>
          </div>

          {/* Toolbar Search / Filter bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
              {/* Search bar */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search food items..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.75rem 0.5rem 2.25rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={e => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '700', outline: 'none', background: 'var(--bg-card)', cursor: 'pointer' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '700', outline: 'none', background: 'var(--bg-card)', cursor: 'pointer' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>

              {/* Veg / Non-Veg Filter */}
              <select
                value={selectedTypeFilter}
                onChange={e => { setSelectedTypeFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '700', outline: 'none', background: 'var(--bg-card)', cursor: 'pointer' }}
              >
                <option value="">All Types</option>
                <option value="veg">Veg Only</option>
                <option value="non-veg">Non-Veg Only</option>
              </select>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '700', outline: 'none', background: 'var(--bg-card)', cursor: 'pointer' }}
              >
                <option value="recent">Recently Added</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>

            <button
              onClick={() => openModal()}
              style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-glow)' }}
            >
              <Plus size={16} /> Add Food Item
            </button>
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{ background: 'var(--bg-danger-subtle)', border: '1px solid #fee2e2', color: 'var(--text-danger)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '0.88rem' }}>
              &#9888;&#65039; {errorMsg}
              <button onClick={() => fetchData()} style={{ background: 'var(--text-danger)', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}>Retry</button>
            </div>
          )}

          {/* Table / List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: '50px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
            </div>
          ) : currentFoods.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center' }}>
              <Store size={44} style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>No food items found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Try adjusting your search query, sorting, or filters.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>FOOD ITEM</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>CATEGORY</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>PRICE</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>TYPE</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>AVAILABILITY</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800' }}>STATUS</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-subtle)', fontWeight: '800', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFoods.map(food => {
                      const catName = food.category?.name || 'Uncategorized';
                      return (
                        <tr key={food.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.1s' }}>
                          {/* Food Item Image & Details */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <img
                                src={food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=50&q=80'}
                                alt={food.name}
                                style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', background: 'var(--bg-hover)' }}
                              />
                              <div>
                                <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{food.name}</div>
                                {food.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }} numberOfLines={1}>{food.description}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {catName}
                          </td>

                          {/* Price */}
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '850', color: 'var(--text-main)' }}>
                            {food.offerPrice ? (
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                                  &#8377;{Number(food.price).toLocaleString('en-IN')}
                                </span>
                                <span style={{ color: 'var(--primary)', fontWeight: '900' }}>
                                  &#8377;{Number(food.offerPrice).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ) : (
                              <span>&#8377;{Number(food.price).toLocaleString('en-IN')}</span>
                            )}
                          </td>

                          {/* Veg / Non-Veg Type */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              background: food.isVeg ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                              color: food.isVeg ? 'var(--text-success)' : 'var(--text-danger)',
                              border: `1px solid ${food.isVeg ? 'var(--border-success-subtle)' : '#fca5a5'}`,
                              padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)',
                              fontSize: '0.72rem', fontWeight: '800', textTransform: 'capitalize',
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: food.isVeg ? 'var(--text-success)' : 'var(--text-danger)' }} />
                              {food.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          </td>

                          {/* Availability Switch */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                              <input
                                type="checkbox"
                                checked={food.isAvailable}
                                onChange={() => handleToggleAvailable(food)}
                                style={{ display: 'none' }}
                              />
                              <div style={{
                                width: '38px',
                                height: '20px',
                                borderRadius: '10px',
                                backgroundColor: food.isAvailable ? 'var(--text-success)' : '#d1d5db',
                                position: 'relative',
                                transition: 'background-color 0.2s'
                              }}>
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--bg-card)',
                                  position: 'absolute',
                                  top: '3px',
                                  left: food.isAvailable ? '21px' : '3px',
                                  transition: 'left 0.2s'
                                }} />
                              </div>
                            </label>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              background: food.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: food.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                              padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem', fontWeight: '800', textTransform: 'capitalize'
                            }}>
                              {food.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          {/* Action buttons */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                title="Edit Food Item"
                                onClick={() => openModal(food)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)' }}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                title={food.isActive ? 'Disable Food' : 'Enable Food'}
                                onClick={() => handleToggleActive(food)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: food.isActive ? 'var(--text-danger)' : 'var(--text-success)' }}
                              >
                                {food.isActive ? <EyeOff size={16} /> : <Check size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} items</span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          background: currentPage === pageNum ? 'var(--primary)' : '#ffffff',
                          color: currentPage === pageNum ? '#ffffff' : 'var(--text-muted)',
                          border: `1px solid ${currentPage === pageNum ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>

          {/* ── Sticky Header ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            background: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                {editingFood ? 'Edit Food Item' : 'Add Food Item'}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: '700' }}>
                <span style={{ color: wizardStep === 1 ? 'var(--primary)' : 'var(--text-muted)' }}>1 Details</span>
                <span style={{ color: 'var(--border-color)' }}>&bull;</span>
                <span style={{ color: wizardStep === 2 ? 'var(--primary)' : 'var(--text-muted)' }}>2 Customization</span>
                <span style={{ color: 'var(--border-color)' }}>&bull;</span>
                <span style={{ color: wizardStep === 3 ? 'var(--primary)' : 'var(--text-muted)' }}>3 Review</span>
              </div>
            </div>
            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', alignSelf: 'flex-start' }}><X size={20} /></button>
          </div>

          {/* ── Scrollable Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }}>

            {wizardStep === 1 && (
              <>

                {/* ─── Basic Information ─── */}
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.7rem 0' }}>Basic Information</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Food Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Classic Cheese Burger"
                        value={modalName}
                        onChange={e => setModalName(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600' }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Category *</label>
                        {!isAddingNewCategory ? (
                          <button type="button" onClick={() => setIsAddingNewCategory(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}>+ Add New</button>
                        ) : (
                          <button type="button" onClick={() => setIsAddingNewCategory(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}>Cancel</button>
                        )}
                      </div>
                      {isAddingNewCategory ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input
                            type="text"
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            onKeyDown={handleAddCategoryInline}
                            style={{ flex: 1, padding: '0.45rem 0.55rem', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCategoryInline()}
                            disabled={!newCategoryName.trim() || submitting}
                            style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0 0.8rem', fontSize: '0.75rem', fontWeight: '800', cursor: (!newCategoryName.trim() || submitting) ? 'not-allowed' : 'pointer', opacity: (!newCategoryName.trim() || submitting) ? 0.5 : 1 }}
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <select
                          required
                          value={modalCategory}
                          onChange={e => setModalCategory(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600', background: 'var(--bg-card)' }}
                        >
                          <option value="" disabled>Select Category</option>
                          {categories.filter(c => c.isActive || (editingFood && editingFood.categoryId === c.id)).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Platform Home Category</label>
                      <select
                        value={modalHomeCategory}
                        onChange={e => setModalHomeCategory(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600', background: 'var(--bg-card)' }}
                      >
                        <option value="">None — Don't show in Home Categories</option>
                        {homeCategories.filter(c => c.isActive || (editingFood && editingFood.homeFoodCategoryId === c.id)).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                    <textarea
                      placeholder="Describe this dish (ingredients, spice level...)"
                      value={modalDesc}
                      onChange={e => setModalDesc(e.target.value)}
                      rows="2"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Food Type</label>
                    <select
                      value={modalIsVeg ? 'veg' : 'non-veg'}
                      onChange={e => setModalIsVeg(e.target.value === 'veg')}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600', background: 'var(--bg-card)' }}
                    >
                      <option value="veg">🌱 Pure Veg</option>
                      <option value="non-veg">🍗 Non-Veg</option>
                    </select>
                  </div>
                </div>

                {/* ─── Pricing ─── */}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0 1rem 0' }} />
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.7rem 0' }}>Pricing</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Regular Price (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 349"
                        value={modalRegularPrice}
                        onChange={e => setModalRegularPrice(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Offer Price (₹) — <span style={{ color: 'var(--text-danger)', fontStyle: 'italic', fontWeight: '600' }}>optional</span></label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 299"
                        value={modalOfferPrice}
                        onChange={e => setModalOfferPrice(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600' }}
                      />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-danger)', margin: '0.2rem 0 0 0' }}>Must be lower than regular price</p>
                    </div>
                  </div>
                </div>

                {/* ─── Ingredients — exactly ONCE ─── */}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0 1rem 0' }} />
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.7rem 0' }}>Ingredients</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Add ingredient (e.g. Basmati Rice)"
                      value={ingredientInput}
                      onChange={e => setIngredientInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addIngredient();
                        }
                      }}
                      style={{ flex: 1, padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', fontWeight: '600' }}
                    />
                    <button
                      type="button"
                      onClick={addIngredient}
                      style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      + Add
                    </button>
                  </div>
                  {modalIngredients.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.45rem 0.55rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)' }}>
                      {modalIngredients.map((ing, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: 'rgba(255,85,32,0.08)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(255,85,32,0.2)',
                            padding: '0.17rem 0.42rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.28rem'
                          }}
                        >
                          {ing}
                          <span onClick={() => removeIngredient(idx)} style={{ cursor: 'pointer', fontWeight: '900', color: 'var(--text-danger)', fontSize: '0.82rem', lineHeight: 1 }}>&times;</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Food Images ─── */}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0 1rem 0' }} />
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.2rem 0' }}>Food Images</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 0.65rem 0' }}>Upload up to 3 images (JPEG/PNG/WebP, max 5 MB each). Image 1 is the Primary/Cover image.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                    {[0, 1, 2].map(index => {
                      const previewSrc = modalPreviews[index];     // display URL
                      const slotValue = modalImages[index];       // File | string | null
                      const hasContent = slotValue !== null && slotValue !== undefined;
                      const isNewFile = slotValue instanceof File;
                      return (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: index === 0 ? 'var(--primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                            {index === 0 ? 'Image 1 [Primary]' : `Image ${index + 1}`}
                          </span>
                          <input type="file" ref={fileInputRefs[index]} accept="image/jpeg,image/png,image/webp" onChange={e => handleImageFileChange(index, e)} style={{ display: 'none' }} />
                          {hasContent && previewSrc ? (
                            <div style={{ position: 'relative', border: `1.5px solid ${isNewFile ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-main)', aspectRatio: '1' }}>
                              <img src={previewSrc} alt={`Slot ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {isNewFile && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(255,85,32,0.85)', padding: '0.1rem 0.3rem', fontSize: '0.58rem', fontWeight: '800', color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  New
                                </div>
                              )}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-around', padding: '0.18rem 0' }}>
                                <button type="button" onClick={() => fileInputRefs[index].current?.click()} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '0.64rem', fontWeight: '750', cursor: 'pointer', padding: 0 }}>Replace</button>
                                <button type="button" onClick={() => handleRemoveImage(index)} style={{ background: 'none', border: 'none', color: 'var(--text-danger)', fontSize: '0.64rem', fontWeight: '750', cursor: 'pointer', padding: 0 }}>Remove</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRefs[index].current?.click()}
                              style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', cursor: 'pointer', background: 'var(--bg-main)', color: 'var(--text-subtle)', gap: '0.2rem', transition: 'border-color 0.15s' }}
                            >
                              <Plus size={16} />
                              <span style={{ fontSize: '0.66rem', fontWeight: '800' }}>Add Image</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── Availability ─── */}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0 1rem 0' }} />
                <div style={{ paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.6rem 0' }}>Availability</p>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-main)' }}>
                      <input type="checkbox" checked={modalAvailable} onChange={e => setModalAvailable(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }} />
                      Mark Available
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-main)' }}>
                      <input type="checkbox" checked={modalActive} onChange={e => setModalActive(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }} />
                      Mark Active
                    </label>
                  </div>
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* SECTION 1: HEADING & CHOICES */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>Customization Heading & Options</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>These options will appear as single-choice pills in the customer app.</p>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Customization Heading *</label>
                    <input
                      type="text"
                      value={customizationHeading}
                      onChange={(e) => setCustomizationHeading(e.target.value)}
                      placeholder="e.g. Choose Spice Level"
                      style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', outline: 'none', marginBottom: '1.5rem' }}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Options (No Extra Price)</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        value={newHeadingChoice}
                        onChange={(e) => setNewHeadingChoice(e.target.value)}
                        onKeyDown={handleAddHeadingChoice}
                        placeholder="e.g. Mild"
                        style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
                      />
                      <button type="button" onClick={() => handleAddHeadingChoice()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Plus size={16} /> Add
                      </button>
                    </div>

                    {headingChoices.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                        {headingChoices.map((choice, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{choice.name}</span>
                            <button type="button" onClick={() => handleRemoveHeadingChoice(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: ADD-ONS */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>Add-ons</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Customers can select multiple add-ons. These will add to the final price.</p>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Add-on Name *</label>
                        <input type="text" value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} onKeyDown={handleAddAddon} placeholder="e.g. Extra Cheese" style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Extra Price (₹) *</label>
                        <input type="number" min="0" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} onKeyDown={handleAddAddon} placeholder="0" style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                      </div>
                      <button type="button" onClick={() => handleAddAddon()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Plus size={16} /> Add
                      </button>
                    </div>

                    {addons.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Add-on</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Extra Price</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addons.map((opt, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{opt.name}</td>
                              <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center', color: parseFloat(opt.additionalPrice) > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {parseFloat(opt.additionalPrice) > 0 ? `+₹${parseFloat(opt.additionalPrice)}` : '₹0'}
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                                <div
                                  onClick={() => handleToggleAddonActive(idx)}
                                  style={{ width: '36px', height: '20px', backgroundColor: opt.isAvailable !== false ? 'var(--primary)' : '#cbd5e1', borderRadius: '10px', position: 'relative', cursor: 'pointer', margin: '0 auto' }}
                                >
                                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', position: 'absolute', top: '2px', left: opt.isAvailable !== false ? '18px' : '2px', transition: 'left 0.2s' }} />
                                </div>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                                <button type="button" onClick={() => handleRemoveAddon(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '0.2rem' }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Summary Block */}
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>Review & Confirm</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Food Name</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>{modalName}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Category</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>{categories.find(c => String(c.id) === modalCategory)?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Regular Price</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>₹{modalRegularPrice}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Offer Price</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '700', color: modalOfferPrice ? 'var(--primary)' : 'var(--text-muted)' }}>{modalOfferPrice ? `₹${modalOfferPrice}` : 'None'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Type</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '700', color: modalIsVeg ? '#059669' : '#dc2626' }}>{modalIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Status</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '0.15rem 0.5rem', borderRadius: '4px', background: modalAvailable ? '#dcfce7' : 'var(--border-danger-subtle)', color: modalAvailable ? '#166534' : 'var(--text-danger)' }}>
                          {modalAvailable ? 'Available' : 'Sold Out'}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '0.15rem 0.5rem', borderRadius: '4px', background: modalActive ? '#e0e7ff' : '#f3f4f6', color: modalActive ? '#3730a3' : '#4b5563' }}>
                          {modalActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Images ({modalImages.filter(i => i !== null).length})</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {modalPreviews.filter(p => p).map((preview, i) => (
                      <img key={i} src={preview} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                    ))}
                  </div>

                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingredients ({modalIngredients.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                    {modalIngredients.length > 0 ? modalIngredients.map((ing, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>{ing}</span>
                    )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No ingredients added.</span>}
                  </div>

                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>Customizations</p>
                  {skipCustomization ? (
                    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Customization Skipped.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.8rem' }}>
                      {headingChoices.length > 0 ? (
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.3rem' }}>{customizationHeading}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {headingChoices.map((c, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'rgba(255,85,32,0.1)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No options added.</p>
                      )}

                      {addons.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.3rem' }}>Add-ons ({addons.length})</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {addons.map((a, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                {a.name} (+₹{a.additionalPrice})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>{/* end scrollable body */}

          {/* ── Sticky Footer ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            flexShrink: 0,
            background: 'var(--bg-card)'
          }}>
            {/* Upload progress message */}
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', minHeight: '1.2rem' }}>
              {uploadProgress && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  {uploadProgress}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {wizardStep === 1 && (
                <>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleNextStep1} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.25rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: '#ffffff' }}>
                    Next
                  </button>
                </>
              )}
              {wizardStep === 2 && (
                <>
                  <button type="button" onClick={() => setWizardStep(1)} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    Back
                  </button>
                  <button type="button" onClick={() => { setSkipCustomization(true); setWizardStep(3); }} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-main)' }}>
                    Skip Customization
                  </button>
                  <button type="button" onClick={handleNextStep2} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.25rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: '#ffffff' }}>
                    Next
                  </button>
                </>
              )}
              {wizardStep === 3 && (
                <>
                  <button type="button" onClick={() => setWizardStep(2)} disabled={submitting} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.1rem', fontSize: '0.82rem', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}>
                    Back
                  </button>
                  <button type="button" onClick={handleModalSubmit} disabled={submitting} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.42rem 1.25rem', fontSize: '0.82rem', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {submitting && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                    {editingFood ? 'Save Changes' : 'Create Food Item'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ currentUser, hotel }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Settings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
        {/* Account card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Account Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Name', value: currentUser?.name },
              { label: 'Email', value: currentUser?.email },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{row.value || '—'}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Role</span>
              <span style={{ background: 'rgba(255,85,32,0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Hotel Admin</span>
            </div>
          </div>
        </div>

        {/* Branch card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Assigned Branch</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Branch Name', value: hotel?.name },
              { label: 'City', value: hotel?.city },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{row.value || '—'}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Status</span>
              <span style={{ background: hotel?.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: hotel?.isActive ? '#059669' : '#dc2626', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '800' }}>
                {hotel?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div style={{ background: 'rgba(255,85,32,0.06)', border: '1px solid rgba(255,85,32,0.2)', borderRadius: 'var(--radius-lg)', padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--primary)' }}>Note:</strong> To change your email, password, or branch assignment, please contact your QuickBite Super Administrator.
        </div>
      </div>
    </div>
  );
}

// ─── Main HotelAdminDashboard ─────────────────────────────────────────────────
// ─── Offers Management Page ───────────────────────────────────────────────────
function OffersManagementPage({ hotel }) {
  const [offers, setOffers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'scheduled', 'expired'
  const [search, setSearch] = useState('');

  // Drawer & Action states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null); // null for create, object for edit
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minimumOrderValue, setMinimumOrderValue] = useState(0);
  const [applicabilityType, setApplicabilityType] = useState('all');
  const [applicableCategoryIds, setApplicableCategoryIds] = useState([]);
  const [applicableFoodIds, setApplicableFoodIds] = useState([]);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [totalUsageLimit, setTotalUsageLimit] = useState('');
  const [usagePerCustomer, setUsagePerCustomer] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Search/Filter states inside dropdown checklists
  const [catSearch, setCatSearch] = useState('');
  const [foodSearch, setFoodSearch] = useState('');

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getHotelOffers();
      setOffers(data || []);
    } catch (err) {
      console.error('Failed to fetch offers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [cats, items] = await Promise.all([
        api.getHotelCategories(hotel.id).catch(() => []),
        api.getHotelFoods(hotel.id).catch(() => []),
      ]);
      setCategories(cats || []);
      setFoods(items || []);
    } catch (err) {
      console.error('Failed to fetch categories/foods', err);
    }
  }, [hotel.id]);


  useEffect(() => {
    fetchOffers();
    fetchMeta();
  }, [fetchOffers, fetchMeta]);

  const getOfferStatus = (offer) => {
    if (!offer.isActive) return 'INACTIVE';
    const now = new Date();
    const start = new Date(offer.startAt);
    const end = new Date(offer.endAt);
    if (now < start) return 'SCHEDULED';
    if (now > end) return 'EXPIRED';
    return 'ACTIVE';
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
      case 'SCHEDULED':
        return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
      case 'EXPIRED':
        return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
      case 'INACTIVE':
      default:
        return { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PROMO';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const openDrawerForCreate = () => {
    setErrors({});
    setSelectedOffer(null);
    setName('');
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setMaxDiscount('');
    setMinimumOrderValue(0);
    setApplicabilityType('all');
    setApplicableCategoryIds([]);
    setApplicableFoodIds([]);

    // Default start at current local time, end in 7 days
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localStart = new Date(now - tzoffset).toISOString().slice(0, 16);
    setStartAt(localStart);

    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const localEnd = new Date(end - tzoffset).toISOString().slice(0, 16);
    setEndAt(localEnd);

    setTotalUsageLimit('');
    setUsagePerCustomer(1);
    setIsActive(true);
    setIsDrawerOpen(true);
  };

  const openDrawerForEdit = (offer) => {
    setErrors({});
    setSelectedOffer(offer);
    setName(offer.name);
    setCode(offer.code);
    setDescription(offer.description || '');
    setDiscountType(offer.discountType);
    setDiscountValue(Number(offer.discountValue));
    setMaxDiscount(offer.maxDiscount ? Number(offer.maxDiscount) : '');
    setMinimumOrderValue(Number(offer.minimumOrderValue));
    setApplicabilityType(offer.applicabilityType);
    setApplicableCategoryIds((offer.applicableCategories || []).map(c => c.id));
    setApplicableFoodIds((offer.applicableFoods || []).map(f => f.id));

    // Format dates to local datetime input
    const startTz = new Date(new Date(offer.startAt).getTime() - new Date(offer.startAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endTz = new Date(new Date(offer.endAt).getTime() - new Date(offer.endAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartAt(startTz);
    setEndAt(endTz);

    setTotalUsageLimit(offer.totalUsageLimit !== null && offer.totalUsageLimit !== undefined ? offer.totalUsageLimit : '');
    setUsagePerCustomer(offer.usagePerCustomer || 1);
    setIsActive(offer.isActive);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Offer name is required.';
    if (!code.trim()) newErrors.code = 'Offer code is required.';
    if (new Date(endAt) <= new Date(startAt)) newErrors.endAt = 'End date must be after start date.';
    if (applicabilityType === 'categories' && applicableCategoryIds.length === 0) {
      newErrors.applicability = 'Please select at least one category.';
    }
    if (applicabilityType === 'foods' && applicableFoodIds.length === 0) {
      newErrors.applicability = 'Please select at least one menu item.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    const payload = {
      name,
      code: code.trim().toUpperCase(),
      description,
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minimumOrderValue: Number(minimumOrderValue),
      applicabilityType,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      usagePerCustomer: Number(usagePerCustomer),
      isActive,
      applicableCategoryIds: applicabilityType === 'categories' ? applicableCategoryIds : [],
      applicableFoodIds: applicabilityType === 'foods' ? applicableFoodIds : [],
    };

    try {
      if (selectedOffer) {
        await api.updateHotelOffer(selectedOffer.id, payload);
      } else {
        await api.createHotelOffer(payload);
      }
      setIsDrawerOpen(false);
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this offer? This will delete all its configuration history.')) {
      try {
        await api.deleteHotelOffer(id);
        fetchOffers();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to delete offer.');
      }
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.duplicateHotelOffer(id);
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to duplicate offer.');
    }
  };

  const handleToggleActive = async (offer) => {
    try {
      await api.updateHotelOffer(offer.id, { isActive: !offer.isActive });
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to toggle offer status.');
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActionMenuOpenId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Summary Metrics calculations
  const now = new Date();
  const activeOffersList = offers.filter(o => o.isActive && now >= new Date(o.startAt) && now <= new Date(o.endAt));
  const scheduledOffersList = offers.filter(o => o.isActive && now < new Date(o.startAt));
  const expiredOffersList = offers.filter(o => now > new Date(o.endAt));
  const redemptionsCount = offers.reduce((sum, o) => sum + (o.redemptionCount || 0), 0);

  // Filters & Search
  const filteredOffers = offers.filter(o => {
    const status = getOfferStatus(o);
    if (filter === 'active' && status !== 'ACTIVE') return false;
    if (filter === 'scheduled' && status !== 'SCHEDULED') return false;
    if (filter === 'expired' && status !== 'EXPIRED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Offers & Promotions</h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--primary)' }}>{hotel.name}</strong> &bull; Manage your active campaigns and discounts.
          </p>
        </div>
        <button onClick={openDrawerForCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: '800' }}>
          <Plus size={18} /> Create Offer
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* METRICS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Active Offers</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.4rem' }}>{activeOffersList.length}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Check size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Scheduled</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.4rem' }}>{scheduledOffersList.length}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Calendar size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Expired</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.4rem' }}>{expiredOffersList.length}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <Clock size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Total Redemptions</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.4rem' }}>{redemptionsCount}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Tag size={20} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { id: 'all', label: 'All Offers' },
            { id: 'active', label: 'Active' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'expired', label: 'Expired' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                border: 'none',
                background: filter === tab.id ? 'var(--primary-light)' : 'transparent',
                color: filter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: '800',
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px', flexGrow: 1, maxWidth: '320px', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by offer name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', width: '100%', height: '40px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-main)', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading offers from backend...</span>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Tag size={42} style={{ color: 'var(--text-subtle)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '850', color: 'var(--text-main)' }}>No offers yet</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: '1.5' }}>
              Create your first promotion and give customers another reason to order.
            </p>
            <button onClick={openDrawerForCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
              <Plus size={16} /> Create Offer
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', minHeight: '300px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Offer</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applies To</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validity</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Usage</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((o, idx) => {
                  const status = getOfferStatus(o);
                  const stStyle = getStatusStyle(status);
                  const opensUpward = filteredOffers.length >= 3 && idx === filteredOffers.length - 1;

                  let discountLabel = '';
                  if (o.discountType === 'percentage') discountLabel = `${o.discountValue}% OFF`;
                  else if (o.discountType === 'flat') discountLabel = `Rs. ${o.discountValue} OFF`;
                  else discountLabel = 'Free Delivery';

                  let appliesLabel = 'All Menu Items';
                  if (o.applicabilityType === 'categories') {
                    appliesLabel = o.applicableCategories?.length > 0
                      ? `${o.applicableCategories.map(c => c.name).join(', ')}`
                      : 'Specific Categories';
                  } else if (o.applicabilityType === 'foods') {
                    appliesLabel = o.applicableFoods?.length > 0
                      ? `${o.applicableFoods.map(f => f.name).join(', ')}`
                      : 'Specific Foods';
                  }

                  const startD = new Date(o.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  const endD = new Date(o.endAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'transparent', transition: 'background var(--transition-fast)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.85rem' }}>{o.name}</div>
                        {o.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.1rem' }}>{o.description}</div>}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: '800', color: 'var(--primary)', fontSize: '0.85rem' }}>{o.code}</td>
                      <td style={{ padding: '1rem', fontWeight: '800', color: '#10b981', fontSize: '0.85rem' }}>{discountLabel}</td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={appliesLabel}>{appliesLabel}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{startD} - {endD}</td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '90px' }}>
                          <span style={{ fontWeight: '700' }}>{o.redemptionCount} / {o.totalUsageLimit || '∞'}</span>
                          {o.totalUsageLimit && (
                            <div style={{ height: '4px', background: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.min(100, (o.redemptionCount / o.totalUsageLimit) * 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: '800', color: stStyle.color, background: stStyle.bg }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpenId(actionMenuOpenId === o.id ? null : o.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {actionMenuOpenId === o.id && (
                          <div style={{
                            position: 'absolute',
                            right: '1rem',
                            top: opensUpward ? 'auto' : '2.5rem',
                            bottom: opensUpward ? '2.5rem' : 'auto',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 150,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: '150px',
                            overflow: 'hidden',
                          }}>
                            <button
                              onClick={() => openDrawerForEdit(o)}
                              style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              <Edit size={12} /> Edit Offer
                            </button>
                            <button
                              onClick={() => handleDuplicate(o.id)}
                              style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              <Copy size={12} /> Duplicate Offer
                            </button>
                            <button
                              onClick={() => handleToggleActive(o)}
                              style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              <Check size={12} /> {o.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <div style={{ borderTop: '1px solid var(--border-color)' }} />
                            <button
                              onClick={() => handleDelete(o.id)}
                              style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-danger)', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              <Trash2 size={12} /> Delete Offer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE/EDIT OFFER DRAWER */}
      {isDrawerOpen && (
        <>
          <div
            onClick={() => setIsDrawerOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          />
          <div className="drawer-content" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '460px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)', zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>
                  {selectedOffer ? 'Edit Offer' : 'Create New Offer'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Create a promotion for your customers</span>
              </div>
              <button type="button" onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>

                {/* Section: Details */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Offer Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Offer Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Weekend Special"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={`premium-form-control ${errors.name ? 'premium-form-error' : ''}`}
                        style={{ width: '100%' }}
                      />
                      {errors.name && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>{errors.name}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Offer Code</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          required
                          placeholder="e.g. WEEKEND20"
                          value={code}
                          onChange={e => setCode(e.target.value.toUpperCase())}
                          className={`premium-form-control ${errors.code ? 'premium-form-error' : ''}`}
                          style={{ flex: 1 }}
                        />
                        <button type="button" onClick={generateCode} className="btn-secondary" style={{ height: '40px', padding: '0 1rem', fontSize: '0.78rem', whiteSpace: 'nowrap', fontWeight: '800', borderRadius: '8px' }}>
                          Generate Code
                        </button>
                      </div>
                      {errors.code && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>{errors.code}</span>}
                    </div>
                  </div>
                </div>

                {/* Section: Discount Type */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Discount Type</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.4rem', marginBottom: '0.85rem', width: '100%' }}>
                    {[
                      { id: 'percentage', label: '% Percentage' },
                      { id: 'flat', label: 'Flat Discount' },
                      { id: 'free_delivery', label: 'Free Delivery' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setDiscountType(t.id);
                          setDiscountValue(0);
                        }}
                        style={{
                          width: '100%',
                          padding: '0 4px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: discountType === t.id ? 'var(--primary)' : '#1e293b',
                          background: discountType === t.id ? 'rgba(255,85,32,0.06)' : 'transparent',
                          color: discountType === t.id ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          height: '38px',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {discountType === 'percentage' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', width: '100%' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Discount %</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          placeholder="20"
                          value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)}
                          className="premium-form-control"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Max Discount</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '1rem', color: '#5c6b84', fontSize: '0.88rem', fontWeight: '600', pointerEvents: 'none' }}>Rs.</span>
                          <input
                            type="number"
                            placeholder="Optional"
                            value={maxDiscount}
                            onChange={e => setMaxDiscount(e.target.value)}
                            className="premium-form-control"
                            style={{ width: '100%', paddingLeft: '2.5rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {discountType === 'flat' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Discount Amount</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '1rem', color: '#5c6b84', fontSize: '0.88rem', fontWeight: '600', pointerEvents: 'none' }}>Rs.</span>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="50"
                          value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)}
                          className="premium-form-control"
                          style={{ width: '100%', paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Applicability */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Applicability</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Minimum Order Value</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '1rem', color: '#5c6b84', fontSize: '0.88rem', fontWeight: '600', pointerEvents: 'none' }}>Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={minimumOrderValue}
                          onChange={e => setMinimumOrderValue(e.target.value)}
                          className="premium-form-control"
                          style={{ width: '100%', paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Applicable To</label>
                      <select
                        value={applicabilityType}
                        onChange={e => setApplicabilityType(e.target.value)}
                        className="premium-form-control"
                        style={{ width: '100%', cursor: 'pointer' }}
                      >
                        <option value="all">Entire Menu</option>
                        <option value="categories">Specific Categories</option>
                        <option value="foods">Specific Food Items</option>
                      </select>
                    </div>

                    {/* Specific Categories search checklist */}
                    {applicabilityType === 'categories' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={catSearch}
                          onChange={e => setCatSearch(e.target.value)}
                          className="premium-form-control"
                          style={{ height: '38px', fontSize: '0.82rem', padding: '0 0.75rem' }}
                        />
                        <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#0c101b' }}>
                          {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textAlign: 'center' }}>No categories found</span>
                          ) : (
                            categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => {
                              const checked = applicableCategoryIds.includes(c.id);
                              return (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    style={{ accentColor: 'var(--primary)' }}
                                    onChange={() => {
                                      if (checked) {
                                        setApplicableCategoryIds(prev => prev.filter(id => id !== c.id));
                                      } else {
                                        setApplicableCategoryIds(prev => [...prev, c.id]);
                                      }
                                    }}
                                  />
                                  {c.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                        {errors.applicability && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.1rem', display: 'block', fontWeight: '600' }}>{errors.applicability}</span>}
                      </div>
                    )}

                    {/* Specific Foods search checklist */}
                    {applicabilityType === 'foods' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Search food items..."
                          value={foodSearch}
                          onChange={e => setFoodSearch(e.target.value)}
                          className="premium-form-control"
                          style={{ height: '38px', fontSize: '0.82rem', padding: '0 0.75rem' }}
                        />
                        <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#0c101b' }}>
                          {foods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textAlign: 'center' }}>No food items found</span>
                          ) : (
                            foods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).map(f => {
                              const checked = applicableFoodIds.includes(f.id);
                              return (
                                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    style={{ accentColor: 'var(--primary)' }}
                                    onChange={() => {
                                      if (checked) {
                                        setApplicableFoodIds(prev => prev.filter(id => id !== f.id));
                                      } else {
                                        setApplicableFoodIds(prev => [...prev, f.id]);
                                      }
                                    }}
                                  />
                                  {f.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                        {errors.applicability && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.1rem', display: 'block', fontWeight: '600' }}>{errors.applicability}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Validity Dates */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Validity Range</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', width: '100%' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Start Date & Time</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="datetime-local"
                          required
                          value={startAt}
                          onChange={e => setStartAt(e.target.value)}
                          className="premium-form-control"
                          style={{ width: '100%', fontSize: '0.82rem' }}
                        />
                        <Calendar
                          size={16}
                          style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>End Date & Time</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="datetime-local"
                          required
                          value={endAt}
                          onChange={e => setEndAt(e.target.value)}
                          className={`premium-form-control ${errors.endAt ? 'premium-form-error' : ''}`}
                          style={{ width: '100%', fontSize: '0.82rem' }}
                        />
                        <Calendar
                          size={16}
                          style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }}
                        />
                      </div>
                      {errors.endAt && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>{errors.endAt}</span>}
                    </div>
                  </div>
                </div>

                {/* Section: Usage Limits */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Usage Limits</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', width: '100%' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Total Usage Limit</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={totalUsageLimit}
                        onChange={e => setTotalUsageLimit(e.target.value)}
                        className="premium-form-control"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Usage Per Customer</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={usagePerCustomer}
                        onChange={e => setUsagePerCustomer(e.target.value)}
                        className="premium-form-control"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Description */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Campaign Description</h4>
                  <textarea
                    placeholder="Add a short description for this promotion..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="premium-form-control"
                    style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Section: Preview */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', tracking: '0.5px', marginBottom: '0.75rem' }}>Preview</h4>
                  <div style={{ background: 'rgba(255,85,32,0.06)', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: '850', color: 'var(--text-main)' }}>
                        {discountType === 'percentage' ? `${discountValue || 0}% OFF` : (discountType === 'flat' ? `Rs. ${discountValue || 0} OFF` : 'FREE DELIVERY')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Use code: <strong style={{ color: 'var(--primary)' }}>{code.trim().toUpperCase() || 'E.G. WEEKEND20'}</strong>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                        {minimumOrderValue > 0 && `Min. order Rs. ${minimumOrderValue}`}
                        {discountType === 'percentage' && maxDiscount && ` • Max discount Rs. ${maxDiscount}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Switch Active Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="isActiveToggle" style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Activate Offer (Make campaign redeemable immediately)
                  </label>
                </div>
              </div>

              {/* Drawer Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-sidebar)' }}>
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary" style={{ padding: '0.65rem 1.25rem', fontWeight: '800' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {selectedOffer ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
        </div>
    </div>
  );
}


export default function HotelAdminDashboard({
  currentUser,
  currentHotel: initialHotel,
  onLogout,
  onChangeHotel,
  hasMultipleHotels = false,
  theme,
  setTheme
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openAddFoodOnMount, setOpenAddFoodOnMount] = useState(false);
  const [hotel, setHotel] = useState(initialHotel);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0 });
  const [foods, setFoods] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevNotificationsCountRef = useRef(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.getHotelNotifications();
      const newNotifications = data || [];
      if (newNotifications.length > prevNotificationsCountRef.current) {
        const unreadNew = newNotifications.filter(n => !n.isRead);
        if (unreadNew.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          const latest = unreadNew[0];
          new Notification(latest.title, {
            body: latest.message,
          });
        }
      }
      prevNotificationsCountRef.current = newNotifications.length;
      setNotifications(newNotifications);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const [clearingIds, setClearingIds] = useState([]);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const clearSingleNotification = async (id) => {
    setClearingIds(prev => [...prev, id]);
    try {
      await api.deleteHotelNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to clear notification', err);
      alert(err.message || 'Failed to clear notification.');
    } finally {
      setClearingIds(prev => prev.filter(cid => cid !== id));
    }
  };

  const clearAllNotifications = async () => {
    setIsClearingAll(true);
    try {
      await api.clearAllHotelNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear all notifications', err);
      alert(err.message || 'Failed to clear all notifications.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const fetchDashboardData = async (isBackground = false) => {
    if (!hotel?.id) return;
    if (!isBackground) {
      setLoading(true);
    }
    setErrorMsg('');
    try {
      const [detailsData, ordersData, ratingData, foodsData] = await Promise.all([
        api.getHotelDetails(hotel.id).catch(() => hotel),
        api.getHotelOrders(hotel.id).catch(() => []),
        api.getHotelRatingSummary(hotel.id).catch(() => ({ averageRating: 0, ratingCount: 0 })),
        api.getHotelFoods(hotel.id).catch(() => []),
      ]);
      setHotel(detailsData);
      setOrders(ordersData);
      setRatingSummary(ratingData);
      setFoods(foodsData);
    } catch (err) {
      console.error(err);
      if (!isBackground) {
        setErrorMsg('Failed to load dashboard data. Please try again.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchDashboardData(true);
      fetchNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [hotel?.id]);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(err => {
          console.warn('Failed to request notification permission:', err);
        });
      }
    } else {
      console.warn('[PUSH] Native browser notifications are unavailable because this page is not served in a Secure Context (localhost/HTTPS) or is unsupported by your browser.');
    }
  }, []);

  const handleToggleOpenStatus = async () => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    try {
      const nextOpenState = !hotel.isOpen;
      const updated = await api.updateHotelOpenStatus(hotel.id, { isOpen: nextOpenState, acceptsOrders: nextOpenState });
      setHotel(updated);
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setErrorMsg('');
      await api.updateOrderStatus(hotel.id, orderId, newStatus);
      const ordersData = await api.getHotelOrders(hotel.id);
      setOrders(ordersData);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update order status');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  // Stats derivation
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.placedAt).toDateString() === todayStr);
  const todayOrdersCount = todayOrders.length;
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const outOfStockItems = foods.filter(f => !f.isAvailable);
  const alertsCount = outOfStockItems.length;
  const itemCounts = {};
  todayOrders.forEach(order => { (order.items || []).forEach(item => { itemCounts[item.foodName] = (itemCounts[item.foodName] || 0) + item.quantity; }); });
  const topItems = Object.entries(itemCounts).map(([name, qty]) => ({ name, count: qty })).sort((a, b) => b.count - a.count).slice(0, 3);
  const liveOrders = orders.filter(o => ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)).slice(0, 5);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList size={18} /> },
    { id: 'menu', label: 'Menu Management', icon: <Utensils size={18} /> },
    { id: 'offers', label: 'Offers & Promotions', icon: <TrendingUp size={18} /> },
    { id: 'platform-campaigns', label: 'Platform Campaigns', icon: <Tag size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <Store size={18} /> },
    { id: 'profile', label: 'Restaurant Profile', icon: <Building size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main)', color: 'var(--text-main)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '260px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '1.5rem', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary)', color: '#ffffff', width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.15rem' }}>Q</div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px', display: 'block' }}>QuickBite</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Dashboard</span>
          </div>
        </div>



        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: isActive ? 'var(--primary-light)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isActive ? '800' : '600', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition-fast)' }}
              >
                <span style={{ color: isActive ? 'var(--primary)' : 'var(--text-subtle)' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Log Out */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>

        {/* Top Header */}
        <header style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {activeTab === 'dashboard' ? 'Overview' : navItems.find(n => n.id === activeTab)?.label || activeTab}
            </h1>
            {hotel?.name && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>{hotel.name}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {hasMultipleHotels && (
              <button onClick={onChangeHotel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer' }}>
                <Building size={14} /> {hotel?.name || 'Switch Branch'}
              </button>
            )}

            <button
              onClick={handleToggleOpenStatus}
              disabled={statusUpdating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', background: hotel?.isOpen ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)', border: `1px solid ${hotel?.isOpen ? 'var(--text-success)' : 'var(--text-danger)'}`, borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: hotel?.isOpen ? 'var(--text-success)' : 'var(--text-danger)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: hotel?.isOpen ? 'var(--text-success)' : 'var(--text-danger)' }}>
                Restaurant: {hotel?.isOpen ? 'Open' : 'Closed'}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                transition: 'transform var(--transition-fast)',
                outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? '☀️' : '🌙'}
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', border: '2px solid #ffffff' }} />
                )}
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', top: '120%', right: 0, width: '300px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '800', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all notifications?')) {
                            clearAllNotifications();
                          }
                        }}
                        disabled={isClearingAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff5520',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {isClearingAll ? 'Clearing...' : 'Clear all'}
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markNotificationRead(n.id);
                          }}
                          style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: n.isRead ? 'var(--bg-card)' : 'rgba(255,85,32,0.06)', transition: 'all var(--transition-fast)', position: 'relative' }}
                        >
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await clearSingleNotification(n.id);
                            }}
                            disabled={clearingIds.includes(n.id)}
                            style={{
                              position: 'absolute',
                              top: '0.75rem',
                              right: '1rem',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-subtle)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                            }}
                            title="Clear notification"
                          >
                            {clearingIds.includes(n.id) ? (
                              <Loader2 size={12} className="animate-spin" style={{ color: '#ff5520' }} />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                          <div style={{ fontSize: '0.82rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.2rem', paddingRight: '20px' }}>{n.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3', marginBottom: '0.4rem', paddingRight: '20px' }}>{n.message}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', fontWeight: '700' }}>{timeAgo(n.createdAt)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><User size={18} /></div>
          </div>
        </header>

        {/* Page body */}
        <div style={{ padding: '2rem', flex: 1 }}>

          {errorMsg && (
            <div style={{ background: 'var(--bg-danger-subtle)', border: '1px solid #fee2e2', color: 'var(--text-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700' }}>&#9888;&#65039; {errorMsg}</span>
              <button onClick={fetchDashboardData} style={{ background: 'var(--text-danger)', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '800', fontSize: '0.78rem' }}>Retry Loading</button>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            loading ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '140px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
                </div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1.5, minWidth: '320px', height: '300px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-xl)' }} />
                  <div style={{ flex: 1, minWidth: '240px', height: '300px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-xl)' }} />
                </div>
              </div>
            ) : (
              <div>
                {/* Quick Actions */}
                <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: '+ Add Food', action: () => { setOpenAddFoodOnMount(true); setActiveTab('menu'); }, color: 'var(--primary)' },
                    { label: '+ Add Category', action: () => setActiveTab('menu'), color: 'var(--accent-blue)' },
                    { label: '+ Create Offer', action: () => setActiveTab('offers'), color: 'var(--accent-amber)' },
                    { label: 'Manage Status', action: handleToggleOpenStatus, color: 'var(--secondary)' },
                  ].map((act, idx) => (
                    <div key={idx} onClick={act.action}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all var(--transition-fast)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = act.color; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <span style={{ background: `${act.color}15`, color: act.color, width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>&#9889;</span>
                      {act.label}
                    </div>
                  ))}
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Today's Orders</span>
                    <span style={{ fontSize: '2rem', fontWeight: '850', color: 'var(--text-main)', display: 'block', lineHeight: 1.1 }}>{todayOrdersCount}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-success)', fontWeight: '700', marginTop: '0.5rem', display: 'block' }}>&#8599;&#65039; +12% vs yesterday</span>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Today's Revenue</span>
                    <span style={{ fontSize: '2rem', fontWeight: '850', color: 'var(--text-main)', display: 'block', lineHeight: 1.1 }}>&#8377;{todayRevenue.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-success)', fontWeight: '700', marginTop: '0.5rem', display: 'block' }}>&#8599;&#65039; +8% vs yesterday</span>
                  </div>
                  <div style={{ background: 'var(--bg-promo)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Active Promotion</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', display: 'block', marginBottom: '0.5rem' }}>33% OFF</span>
                    <p style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: '700', marginBottom: '0.75rem' }}>Midnight Craving Special</p>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: '800' }}>Ends in 3h 45m</span>
                  </div>
                  <div style={{
                    background: theme === 'dark' ? '#b31507' : (alertsCount > 0 ? 'var(--bg-danger-subtle)' : '#ffffff'),
                    border: `1px solid ${theme === 'dark' ? '#b31507' : (alertsCount > 0 ? 'var(--border-danger-subtle)' : 'var(--border-color)')}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: theme === 'dark' ? '#ffd7c2' : (alertsCount > 0 ? 'var(--text-danger)' : 'var(--text-muted)'), textTransform: 'uppercase', flex: 1 }}>Attention Needed</span>
                      {alertsCount > 0 && <AlertTriangle size={16} style={{ color: theme === 'dark' ? '#ffd7c2' : 'var(--text-danger)' }} />}
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: '850', color: theme === 'dark' ? '#ffffff' : (alertsCount > 0 ? 'var(--text-danger)' : 'var(--text-main)'), display: 'block', marginBottom: '0.25rem' }}>
                      {alertsCount > 0 ? `${alertsCount} Alert${alertsCount > 1 ? 's' : ''}` : '0 Alerts'}
                    </span>
                    {alertsCount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                        {outOfStockItems.slice(0, 2).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: theme === 'dark' ? '#f5c1a8' : 'var(--text-danger)', fontWeight: '700' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: theme === 'dark' ? '#f5c1a8' : 'var(--text-danger)' }} />{item.name} (Out of Stock)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: theme === 'dark' ? '#f5c1a8' : 'var(--text-muted)', fontWeight: '600' }}>All menu items available.</span>
                    )}
                  </div>
                </div>

                {/* Live orders + stats split */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Live orders panel */}
                  <div style={{
                    flex: 1.5,
                    minWidth: '320px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                  }}>
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h2 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Live Orders</h2>
                          <span style={{
                            background: 'var(--bg-hover)',
                            color: 'var(--primary)',
                            borderRadius: '100px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid var(--border-color)'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              display: 'inline-block'
                            }} />
                            Live
                          </span>
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          Orders requiring your attention
                        </p>
                      </div>

                      {/* Summary pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(255,107,26,0.1)', color: '#FF6B1A', padding: '0.3rem 0.65rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(255,107,26,0.2)' }}>
                          {orders.filter(o => ['placed', 'accepted', 'preparing'].includes(o.orderStatus)).length} Active
                        </span>
                        <span style={{ background: 'rgba(124,58,237,0.1)', color: '#8B5CF6', padding: '0.3rem 0.65rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(124,58,237,0.2)' }}>
                          {orders.filter(o => o.orderStatus === 'ready_for_pickup').length} Ready
                        </span>
                        <span style={{ background: 'rgba(2,132,199,0.1)', color: '#0284C7', padding: '0.3rem 0.65rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(2,132,199,0.2)' }}>
                          {orders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.orderStatus)).length} Out for Delivery
                        </span>
                        <button 
                          onClick={() => setActiveTab('orders')} 
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', marginLeft: '0.25rem' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>

                    {/* Orders List */}
                    {liveOrders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                        <ClipboardList size={32} style={{ color: 'var(--text-subtle)', marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>No active orders right now.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {liveOrders.map(order => {
                          const firstItem = order.items && order.items[0];
                          
                          let statusColor = '#ff5520';
                          let statusLabel = order.orderStatus;
                          let statusBg = 'rgba(255,85,32,0.1)';
                          let statusText = '#ff5520';

                          if (order.orderStatus === 'placed') {
                            statusColor = '#ff5520';
                            statusLabel = 'PLACED';
                            statusBg = 'rgba(255,85,32,0.08)';
                            statusText = '#ff5520';
                          } else if (order.orderStatus === 'accepted') {
                            statusColor = '#3b82f6';
                            statusLabel = 'ACCEPTED';
                            statusBg = 'rgba(59,130,246,0.08)';
                            statusText = '#3b82f6';
                          } else if (order.orderStatus === 'preparing') {
                            statusColor = '#f59e0b';
                            statusLabel = 'PREPARING';
                            statusBg = 'rgba(245,158,11,0.08)';
                            statusText = '#f59e0b';
                          } else if (order.orderStatus === 'ready_for_pickup') {
                            statusColor = '#8b5cf6';
                            statusLabel = 'READY FOR PICKUP';
                            statusBg = 'rgba(139,92,246,0.08)';
                            statusText = '#8b5cf6';
                          } else if (order.orderStatus === 'picked_up' || order.orderStatus === 'out_for_delivery') {
                            statusColor = '#0ea5e9';
                            statusLabel = 'OUT FOR DELIVERY';
                            statusBg = 'rgba(14,165,233,0.08)';
                            statusText = '#0ea5e9';
                          } else if (order.orderStatus === 'delivered') {
                            statusColor = '#10b981';
                            statusLabel = 'DELIVERED';
                            statusBg = 'rgba(16,185,129,0.08)';
                            statusText = '#10b981';
                          }

                          return (
                            <div 
                              key={order.id} 
                              style={{ 
                                display: 'flex',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                transition: 'all var(--transition-fast)',
                                position: 'relative'
                              }}
                              className="hover-card"
                            >
                              {/* Left status vertical line */}
                              <div style={{
                                width: '4px',
                                backgroundColor: statusColor,
                                flexShrink: 0
                              }} />

                              {/* Card Content Grid */}
                              <div style={{
                                flex: 1,
                                padding: '1rem 1.25rem',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                alignItems: 'center',
                                gap: '1rem'
                              }}>
                                {/* Food Image Thumbnail */}
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  flexShrink: 0
                                }}>
                                  {firstItem?.foodImage ? (
                                    <img 
                                      src={formatUrl(firstItem.foodImage)} 
                                      alt={firstItem.foodName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <Utensils size={18} style={{ color: 'var(--text-subtle)' }} />
                                  )}
                                </div>

                                {/* Order details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                                    #{order.orderNumber}
                                  </span>
                                  <span style={{ fontSize: '0.92rem', fontWeight: '850', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {getOrderSummary(order)}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    {order.paymentMethod === 'cod' ? 'COD' : 'Paid online'} &bull; &#8377;{Number(order.totalAmount).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {/* Status badge and relative time */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{ 
                                    background: statusBg, 
                                    color: statusText, 
                                    padding: '0.2rem 0.5rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.65rem', 
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2px'
                                  }}>
                                    {statusLabel}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Clock size={10} /> {timeAgo(order.placedAt)}
                                  </span>
                                </div>

                                {/* Actions & Details link */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  {order.orderStatus === 'placed' && (
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                      <button 
                                        onClick={() => handleUpdateOrderStatus(order.id, 'rejected')} 
                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}
                                      >
                                        Reject
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateOrderStatus(order.id, 'accepted')} 
                                        style={{ background: 'var(--primary)', color: '#FFFFFF', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                                      >
                                        Accept
                                      </button>
                                    </div>
                                  )}
                                  {order.orderStatus === 'accepted' && (
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} 
                                      style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                      Prepare
                                    </button>
                                  )}
                                  {order.orderStatus === 'preparing' && (
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')} 
                                      style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                      Mark Ready
                                    </button>
                                  )}
                                  {order.orderStatus === 'ready_for_pickup' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                      {order.activeAssignment ? (
                                        <span style={{ 
                                          background: 'rgba(16,185,129,0.1)', 
                                          color: '#059669', 
                                          padding: '0.35rem 0.75rem', 
                                          borderRadius: 'var(--radius-sm)', 
                                          fontSize: '0.72rem', 
                                          fontWeight: '800',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          border: '1px solid rgba(16,185,129,0.2)'
                                        }}>
                                          🛵 Rider Assigned
                                          {order.activeAssignment.deliveryPartner?.user?.name && ` (${order.activeAssignment.deliveryPartner.user.name})`}
                                        </span>
                                      ) : (
                                        <span style={{ 
                                          background: 'rgba(245,158,11,0.1)', 
                                          color: 'var(--text-warning)', 
                                          padding: '0.35rem 0.75rem', 
                                          borderRadius: 'var(--radius-sm)', 
                                          fontSize: '0.72rem', 
                                          fontWeight: '800',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          border: '1px solid rgba(245,158,11,0.2)'
                                        }}>
                                          ⏳ Finding Rider...
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {(order.orderStatus === 'picked_up' || order.orderStatus === 'out_for_delivery') && (
                                    <button 
                                      onClick={() => {
                                        setSelectedDetailsOrder(order);
                                      }}
                                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-btn-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', cursor: 'pointer' }}
                                    >
                                      Track
                                    </button>
                                  )}
                                  {order.orderStatus === 'delivered' && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                      Archive
                                    </span>
                                  )}

                                  {/* Detail/Overflow dots menu */}
                                  <button
                                    onClick={() => setSelectedDetailsOrder(order)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Hourly Volume chart */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.5rem' }}>Hourly Volume</h3>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', padding: '0 0.5rem', gap: '0.5rem' }}>
                        {[{ val: 40, label: '12pm' }, { val: 55, label: '' }, { val: 80, label: 'Now', active: true }, { val: 48, label: '' }, { val: 30, label: '10pm' }].map((bar, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ width: '100%', height: `${bar.val}%`, background: bar.active ? 'var(--primary)' : 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }} />
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '0.5rem', fontWeight: '700' }}>{bar.label || '•'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Items */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }}>Top Items Today</h3>
                      {topItems.length === 0 ? (
                        <div style={{ color: 'var(--text-subtle)', fontSize: '0.82rem', padding: '1rem 0' }}>No orders processed today.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {topItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>{item.name}</span>
                              <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: '800' }}>{item.count} orders</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rating widget */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Customer Rating</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>
                          {ratingSummary.averageRating ? `${ratingSummary.averageRating} ⭐` : '0.0 ⭐'}
                        </h4>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: '700' }}>{ratingSummary.ratingCount || 0} reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── ORDERS TAB ── */}
          {activeTab === 'orders' && <OrdersPage hotel={hotel} />}

          {/* ── MENU TAB ── */}
          {activeTab === 'menu' && (
            <MenuManagementPage
              hotel={hotel}
              openAddFoodOnMount={openAddFoodOnMount}
              setOpenAddFoodOnMount={setOpenAddFoodOnMount}
            />
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && <SettingsPage currentUser={currentUser} hotel={hotel} />}

          {/* ── OFFERS TAB ── */}
          {activeTab === 'offers' && <OffersManagementPage hotel={hotel} />}

          {/* ── PLATFORM CAMPAIGNS TAB ── */}
          {activeTab === 'platform-campaigns' && <PlatformCampaignsPage hotel={hotel} />}

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && <RestaurantProfilePage hotel={hotel} setHotel={setHotel} />}

          {/* ── PLACEHOLDER TABS ── */}
          {!['dashboard', 'orders', 'menu', 'settings', 'offers', 'profile', 'platform-campaigns'].includes(activeTab) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '5rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Store size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '850', marginBottom: '0.5rem' }}>
                {navItems.find(n => n.id === activeTab)?.label || activeTab} &mdash; Coming Soon
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
                This panel is structured and ready for future integrations.
              </p>
              <button onClick={() => setActiveTab('dashboard')} className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Order Details Modal ── */}
      {selectedDetailsOrder && (
        <div className="modal-overlay" onClick={() => setSelectedDetailsOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>
                Order Details: #{selectedDetailsOrder.orderNumber}
              </h3>
              <button onClick={() => setSelectedDetailsOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Status & Timing */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Status</span>
                  <span style={{
                    background: STATUS_CONFIG[selectedDetailsOrder.orderStatus]?.bg || 'rgba(255,85,32,0.1)',
                    color: STATUS_CONFIG[selectedDetailsOrder.orderStatus]?.badge || '#ff5520',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                  }}>
                    {STATUS_CONFIG[selectedDetailsOrder.orderStatus]?.label || selectedDetailsOrder.orderStatus}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Placed</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {formatTime(selectedDetailsOrder.placedAt)} ({timeAgo(selectedDetailsOrder.placedAt)})
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(selectedDetailsOrder.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem', paddingBottom: '0.4rem', borderBottom: '1px dashed var(--border-color)' }}>
                      <div>
                        <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{item.quantity}×</span> {item.foodName}
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                        &#8377;{Number(item.lineTotal || (item.unitPrice * item.quantity)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Customer</h4>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {selectedDetailsOrder.user?.name || 'Guest Customer'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {selectedDetailsOrder.user?.email || 'No email recorded'}
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Delivery Address</h4>
                {selectedDetailsOrder.deliveryAddressLine1 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: '600', lineHeight: '1.4' }}>
                    {[selectedDetailsOrder.deliveryAddressLine1, selectedDetailsOrder.deliveryAddressLine2, selectedDetailsOrder.deliveryLandmark, selectedDetailsOrder.deliveryArea,
                    `${selectedDetailsOrder.deliveryCity}, ${selectedDetailsOrder.deliveryState} - ${selectedDetailsOrder.deliveryPincode}`].filter(Boolean).join(', ')}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Address not recorded</span>
                )}
              </div>

              {/* Summary pricing */}
              <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Payment Method</span>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
                    {selectedDetailsOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Paid Online'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Payment Status</span>
                  <span style={{ background: selectedDetailsOrder.paymentStatus === 'paid' ? 'rgba(5,150,105,0.1)' : 'rgba(146,64,14,0.1)', color: selectedDetailsOrder.paymentStatus === 'paid' ? '#059669' : '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    {selectedDetailsOrder.paymentStatus || 'pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '900', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--text-main)' }}>Total Paid</span>
                  <span style={{ color: 'var(--primary)' }}>
                    &#8377;{Number(selectedDetailsOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: 'var(--bg-subtle)' }}>
              <button onClick={() => setSelectedDetailsOrder(null)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformCampaignsPage({ hotel }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [foods, setFoods] = useState([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [searchFood, setSearchFood] = useState('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [joining, setJoining] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getHotelCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load platform campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleOpenJoin = async (campaign) => {
    setSelectedCampaign(campaign);
    setIsJoinModalOpen(true);
    setSearchFood('');
    setFoodCategoryFilter('all');
    
    // Fetch hotel foods and campaign selected items
    try {
      const [allFoods, campaignItems] = await Promise.all([
        api.getHotelFoods(hotel.id),
        api.get99CampaignItems(campaign.id)
      ]);
      setFoods(allFoods || []);
      setSelectedFoodIds((campaignItems || []).map(item => item.foodId));
      
      // Extract categories dynamically
      const catMap = {};
      (allFoods || []).forEach(f => {
        if (f.category) {
          catMap[f.category.id] = f.category.name;
        }
      });
      setCategories(Object.entries(catMap).map(([id, name]) => ({ id: Number(id), name })));
    } catch (err) {
      alert('Failed to load menu items.');
    }
  };

  const handleDecline = async (campaignId) => {
    if (!window.confirm('Are you sure you want to decline participation in this campaign?')) return;
    try {
      await api.declineCampaign(campaignId);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to decline campaign.');
    }
  };

  const handleConfirmParticipation = async () => {
    setJoining(true);
    try {
      await api.participateInCampaign(selectedCampaign.id, selectedFoodIds);
      setIsJoinModalOpen(false);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to confirm campaign participation.');
    } finally {
      setJoining(false);
    }
  };

  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const start = new Date(campaign.startAt);
    const end = new Date(campaign.endAt);
    if (now > end) return 'ended';
    return campaign.participationStatus || 'invited';
  };

  const calculateOfferPrice = (originalPrice, campaign) => {
    const orig = Number(originalPrice) || 0;
    const type = campaign.offerType || 'FIXED_PRICE';
    if (type === 'FIXED_PRICE') {
      return Number(campaign.price) || 0;
    }
    if (type === 'FLAT_DISCOUNT') {
      return Math.max(0, orig - (Number(campaign.flatDiscountAmount) || 0));
    }
    if (type === 'PERCENTAGE_DISCOUNT') {
      let disc = orig * (Number(campaign.percentageDiscount) || 0) / 100;
      if (campaign.maxDiscount) {
        disc = Math.min(disc, Number(campaign.maxDiscount));
      }
      return Math.max(0, orig - disc);
    }
    return orig;
  };

  const getFilteredFoods = () => {
    return foods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(searchFood.toLowerCase());
      const matchesCat = foodCategoryFilter === 'all' || Number(food.categoryId) === Number(foodCategoryFilter);
      return matchesSearch && matchesCat;
    });
  };

  const filteredFoods = getFilteredFoods();

  const getOfferValueLabel = (c) => {
    const type = c.offerType || 'FIXED_PRICE';
    switch (type) {
      case 'FIXED_PRICE':
        return `₹${parseFloat(c.price || 0).toFixed(0)} Fixed Price`;
      case 'FLAT_DISCOUNT':
        return `Flat ₹${parseFloat(c.flatDiscountAmount || 0).toFixed(0)} OFF`;
      case 'PERCENTAGE_DISCOUNT':
        return `${parseFloat(c.percentageDiscount || 0).toFixed(0)}% OFF`;
      case 'FREE_DELIVERY':
        return c.minimumOrder ? `Free Delivery above ₹${parseFloat(c.minimumOrder).toFixed(0)}` : 'Free Delivery';
      default:
        return `₹${parseFloat(c.price || 0).toFixed(0)}`;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)' }}>Platform Campaigns</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Participate in exclusive campaigns initiated by QuickBite</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2].map(i => <div key={i} style={{ height: '140px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-danger-subtle)', color: 'var(--text-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', fontWeight: '750' }}>{error}</div>
      ) : campaigns.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center' }}>
          <Tag size={44} style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.4rem' }}>No invitations yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You will see campaigns here once the platform invites your restaurant.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {campaigns.map(c => {
            const status = getCampaignStatus(c);
            return (
              <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
                {c.bannerUrl && (
                  <img src={c.bannerUrl} alt={c.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                )}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '850' }}>{c.name}</strong>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                      background: status === 'participating' ? 'rgba(16,185,129,0.1)' :
                                  status === 'declined' ? 'rgba(239,68,68,0.1)' :
                                  status === 'ended' ? 'rgba(100,116,139,0.1)' : 'rgba(59,130,246,0.1)',
                      color: status === 'participating' ? '#10b981' :
                             status === 'declined' ? '#ef4444' :
                             status === 'ended' ? 'var(--text-muted)' : '#3b82f6'
                    }}>
                      {status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{c.description}</p>
                  
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div><strong>Value:</strong> <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{getOfferValueLabel(c)}</span></div>
                    <div><strong>Start Date:</strong> {new Date(c.startAt).toLocaleDateString()}</div>
                    <div><strong>End Date:</strong> {new Date(c.endAt).toLocaleDateString()}</div>
                  </div>

                  {status !== 'ended' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => handleOpenJoin(c)}
                        className="btn-primary"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: '800' }}
                      >
                        {status === 'participating' ? 'Edit Items' : 'Join Campaign'}
                      </button>
                      {status !== 'declined' && (
                        <button
                          onClick={() => handleDecline(c.id)}
                          className="btn-secondary"
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', fontWeight: '800', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Campaign Modal */}
      {isJoinModalOpen && selectedCampaign && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', width: '90%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.75rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', animation: 'scaleUp 0.15s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>Select Participating Items</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedCampaign.name} &bull; {getOfferValueLabel(selectedCampaign)}</span>
              </div>
              <button onClick={() => setIsJoinModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="Search food items..."
                  value={searchFood}
                  onChange={e => setSearchFood(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem 0.45rem 2.25rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', fontWeight: '600', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
              <select
                value={foodCategoryFilter}
                onChange={e => setFoodCategoryFilter(e.target.value)}
                style={{ padding: '0.45rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', fontWeight: '600', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* List Row */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
              <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800' }}>
                <input
                  type="checkbox"
                  checked={filteredFoods.length > 0 && filteredFoods.every(f => selectedFoodIds.includes(f.id))}
                  onChange={() => {
                    const allSelected = filteredFoods.every(f => selectedFoodIds.includes(f.id));
                    if (allSelected) {
                      setSelectedFoodIds(prev => prev.filter(id => !filteredFoods.map(ff => ff.id).includes(id)));
                    } else {
                      setSelectedFoodIds(prev => [...new Set([...prev, ...filteredFoods.map(ff => ff.id)])]);
                    }
                  }}
                  style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>Food Item</div>
                <div style={{ width: '90px' }}>Orig. Price</div>
                <div style={{ width: '90px' }}>Offer Price</div>
                <div style={{ width: '80px' }}>Status</div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '300px' }}>
                {filteredFoods.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No food items found.</div>
                ) : (
                  filteredFoods.map(f => {
                    const isChecked = selectedFoodIds.includes(f.id);
                    return (
                      <div key={f.id} style={{ display: 'flex', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.8rem', background: isChecked ? 'rgba(255,85,32,0.02)' : 'transparent', color: 'var(--text-main)' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedFoodIds(prev => prev.filter(id => id !== f.id));
                            } else {
                              setSelectedFoodIds(prev => [...prev, f.id]);
                            }
                          }}
                          style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <div style={{ flex: 1, fontWeight: '750', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {f.image && (
                            <img src={f.image} alt="" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                          )}
                          {f.name}
                        </div>
                        <div style={{ width: '90px', fontWeight: '700', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{parseFloat(f.price).toFixed(0)}</div>
                        <div style={{ width: '90px', fontWeight: '900', color: 'var(--primary)' }}>
                          ₹{calculateOfferPrice(f.price, selectedCampaign).toFixed(0)}
                        </div>
                        <div style={{ width: '80px' }}>
                          <span style={{ fontSize: '0.72rem', color: f.isAvailable ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                            {f.isAvailable ? 'Available' : 'Out'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button onClick={() => setIsJoinModalOpen(false)} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={handleConfirmParticipation} disabled={joining} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '800', cursor: joining ? 'not-allowed' : 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {joining && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                Confirm Participation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
