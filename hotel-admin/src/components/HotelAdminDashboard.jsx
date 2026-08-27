import React, { useState, useEffect, useCallback } from 'react';
import { 
  LogOut, Store, Utensils, TrendingUp, Activity, ClipboardList,
  Building, RefreshCw, Plus, AlertTriangle, Bell, User,
  Settings, MapPin, Clock, Search, Loader2, Eye
} from 'lucide-react';
import { api } from '../services/api';

// ─── Order Status Config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  placed:           { label: 'New / Placed',    color: '#ff5520', bg: 'rgba(255,85,32,0.1)',   badge: '#ff5520' },
  accepted:         { label: 'Accepted',         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  badge: '#3b82f6' },
  preparing:        { label: 'Preparing',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  badge: '#d97706' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', badge: '#7c3aed' },
  picked_up:        { label: 'Picked Up',        color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  badge: '#0891b2' },
  out_for_delivery: { label: 'Out for Delivery', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', badge: '#0284c7' },
  delivered:        { label: 'Delivered',        color: '#10b981', bg: 'rgba(16,185,129,0.1)', badge: '#059669' },
  cancelled:        { label: 'Cancelled',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  badge: '#dc2626' },
  rejected:         { label: 'Rejected',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  badge: '#dc2626' },
};

// Valid hotel-admin status transitions (backend also enforces these)
const NEXT_TRANSITIONS = {
  placed:    [{ status: 'accepted', label: 'Accept Order', primary: true }, { status: 'rejected', label: 'Reject', primary: false }],
  accepted:  [{ status: 'preparing', label: 'Start Preparing', primary: true }],
  preparing: [{ status: 'ready_for_pickup', label: 'Mark Ready', primary: true }],
};

const PAYMENT_LABELS = {
  cod:      'Cash on Delivery',
  online:   'Online Payment',
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
    { value: '',               label: 'All Orders' },
    { value: 'placed',         label: 'New / Placed' },
    { value: 'accepted',       label: 'Accepted' },
    { value: 'preparing',      label: 'Preparing' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'delivered',      label: 'Completed' },
    { value: 'cancelled',      label: 'Cancelled' },
    { value: 'rejected',       label: 'Rejected' },
  ];

  const fetchOrders = useCallback(async (showRefreshing = false) => {
    if (!hotel?.id) return;
    showRefreshing ? setRefreshing(true) : setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getHotelOrders(hotel.id, activeFilter);
      setOrders(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotel?.id, activeFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)' }}
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
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem 0.55rem 2.25rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', fontWeight: '600', background: '#ffffff', color: 'var(--text-main)', outline: 'none' }}
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
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '0.88rem' }}>
          &#9888;&#65039; {errorMsg}
          <button onClick={() => fetchOrders()} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}>Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center' }}>
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
                style={{ background: '#ffffff', border: `1.5px solid ${isExpanded ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: isExpanded ? '0 4px 20px rgba(255,85,32,0.08)' : 'var(--shadow-sm)' }}
              >
                {/* Main row */}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Left */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '850', fontSize: '0.95rem', color: 'var(--text-main)' }}>#{order.orderNumber}</span>
                        <span style={{ background: cfg.bg, color: cfg.badge, padding: '0.18rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>{cfg.label}</span>
                        <span style={{ background: order.paymentMethod === 'cod' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: order.paymentMethod === 'cod' ? '#b45309' : '#047857', padding: '0.18rem 0.55rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: '800' }}>
                          {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {order.user?.name || 'Unknown Customer'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        {order.items && order.items.length > 0
                          ? order.items.map(item => `${item.quantity}\u00d7 ${item.foodName}`).join(', ')
                          : `${order.itemCount || 0} item(s)`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        <Clock size={12} />
                        {formatTime(order.placedAt)} &bull; {timeAgo(order.placedAt)}
                      </div>
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
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.quantity}\u00d7 {item.foodName}</span>
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

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ currentUser, hotel }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Settings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
        {/* Account card */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Account Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Name',  value: currentUser?.name },
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
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Assigned Branch</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Branch Name', value: hotel?.name },
              { label: 'City',        value: hotel?.city },
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
export default function HotelAdminDashboard({
  currentUser,
  currentHotel: initialHotel,
  onLogout,
  onChangeHotel,
  hasMultipleHotels = false
}) {
  // ── TASK 1 — SETTINGS BUG FIX ──────────────────────────────────────────────
  // ROOT CAUSE: The original sidebar had an onClick that explicitly called
  // `onLogout()` when `item.id === 'settings'`, AND the Settings nav item
  // used the `LogOut` icon. Both issues together caused logout on Settings click.
  //
  // FIX APPLIED:
  //   1. Every nav item now simply calls `setActiveTab(item.id)` — no exceptions.
  //   2. Settings nav item uses the correct `Settings` icon (not `LogOut`).
  //   3. `onLogout` is called ONLY from the dedicated "Log Out" footer button.
  // ────────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('dashboard');
  const [hotel, setHotel] = useState(initialHotel);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0 });
  const [foods, setFoods] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchDashboardData = async () => {
    if (!hotel?.id) return;
    setLoading(true);
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
      setErrorMsg('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [hotel?.id]);

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
      await api.updateOrderStatus(hotel.id, orderId, newStatus);
      const ordersData = await api.getHotelOrders(hotel.id);
      setOrders(ordersData);
    } catch (err) {
      alert(err.message || 'Failed to update order status');
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

  // FIXED nav items: Settings uses Settings icon, NOT LogOut
  const navItems = [
    { id: 'dashboard', label: 'Dashboard',           icon: <Activity size={18} /> },
    { id: 'orders',    label: 'Orders',              icon: <ClipboardList size={18} /> },
    { id: 'menu',      label: 'Menu Management',     icon: <Utensils size={18} /> },
    { id: 'offers',    label: 'Offers & Promotions', icon: <TrendingUp size={18} /> },
    { id: 'analytics', label: 'Analytics',           icon: <Store size={18} /> },
    { id: 'profile',   label: 'Restaurant Profile',  icon: <Building size={18} /> },
    { id: 'settings',  label: 'Settings',            icon: <Settings size={18} /> },   // FIX: was LogOut icon
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main)', color: 'var(--text-main)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '260px', background: '#ffffff', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '1.5rem', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary)', color: '#ffffff', width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.15rem' }}>Q</div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px', display: 'block' }}>QuickBite</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Dashboard</span>
          </div>
        </div>

        {/* New Order button */}
        <button
          onClick={() => alert('New Order action is prepared for future manual billing integration.')}
          style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.8rem 1rem', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}
        >
          <Plus size={18} /> New Order
        </button>

        {/* Navigation — FIX: every item calls setActiveTab(item.id) only, no logout exception */}
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

        {/* Log Out — the ONLY trigger for onLogout */}
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
        <header style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', background: hotel?.isOpen ? '#ecfdf5' : '#fef2f2', border: `1px solid ${hotel?.isOpen ? '#10b981' : '#f43f5e'}`, borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: hotel?.isOpen ? '#10b981' : '#f43f5e', display: 'inline-block' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: hotel?.isOpen ? '#065f46' : '#991b1b' }}>
                Restaurant: {hotel?.isOpen ? 'Open' : 'Closed'}
              </span>
            </button>

            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Bell size={20} /></button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><User size={18} /></div>
          </div>
        </header>

        {/* Page body */}
        <div style={{ padding: '2rem', flex: 1 }}>

          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700' }}>&#9888;&#65039; {errorMsg}</span>
              <button onClick={fetchDashboardData} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '800', fontSize: '0.78rem' }}>Retry Loading</button>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            loading ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ height: '140px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
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
                    { label: '+ Add Food',     action: () => setActiveTab('menu'),   color: 'var(--primary)' },
                    { label: '+ Add Category', action: () => setActiveTab('menu'),   color: 'var(--accent-blue)' },
                    { label: '+ Create Offer', action: () => setActiveTab('offers'), color: 'var(--accent-amber)' },
                    { label: 'Manage Status',  action: handleToggleOpenStatus,        color: 'var(--secondary)' },
                  ].map((act, idx) => (
                    <div key={idx} onClick={act.action}
                      style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all var(--transition-fast)' }}
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
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Today's Orders</span>
                    <span style={{ fontSize: '2rem', fontWeight: '850', color: 'var(--text-main)', display: 'block', lineHeight: 1.1 }}>{todayOrdersCount}</span>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', marginTop: '0.5rem', display: 'block' }}>&#8599;&#65039; +12% vs yesterday</span>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Today's Revenue</span>
                    <span style={{ fontSize: '2rem', fontWeight: '850', color: 'var(--text-main)', display: 'block', lineHeight: 1.1 }}>&#8377;{todayRevenue.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', marginTop: '0.5rem', display: 'block' }}>&#8599;&#65039; +8% vs yesterday</span>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #ff5520, #ff7b38)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Active Promotion</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', display: 'block', marginBottom: '0.5rem' }}>33% OFF</span>
                    <p style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: '700', marginBottom: '0.75rem' }}>Midnight Craving Special</p>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: '800' }}>Ends in 3h 45m</span>
                  </div>
                  <div style={{ background: alertsCount > 0 ? '#fef2f2' : '#ffffff', border: `1px solid ${alertsCount > 0 ? '#fec2c2' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: alertsCount > 0 ? '#991b1b' : 'var(--text-muted)', textTransform: 'uppercase', flex: 1 }}>Attention Needed</span>
                      {alertsCount > 0 && <AlertTriangle size={16} style={{ color: '#ef4444' }} />}
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: '850', color: alertsCount > 0 ? '#991b1b' : 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
                      {alertsCount > 0 ? `${alertsCount} Alert${alertsCount > 1 ? 's' : ''}` : '0 Alerts'}
                    </span>
                    {alertsCount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                        {outOfStockItems.slice(0, 2).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#b91c1c', fontWeight: '700' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />{item.name} (Out of Stock)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>All menu items available.</span>
                    )}
                  </div>
                </div>

                {/* Live orders + stats split */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Live orders panel */}
                  <div style={{ flex: 1.5, minWidth: '320px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>Live Orders</h2>
                      <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>View All</button>
                    </div>
                    {liveOrders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                        <ClipboardList size={32} style={{ color: 'var(--text-subtle)', marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>No active orders right now.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {liveOrders.map(order => (
                          <div key={order.id} style={{ borderLeft: `4px solid ${STATUS_CONFIG[order.orderStatus]?.color || '#ff5520'}`, background: 'var(--bg-main)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>#{order.orderNumber}</span>
                              <span style={{ background: STATUS_CONFIG[order.orderStatus]?.bg || 'rgba(255,85,32,0.1)', color: STATUS_CONFIG[order.orderStatus]?.badge || '#ff5520', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>
                                {STATUS_CONFIG[order.orderStatus]?.label || order.orderStatus}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '850', color: 'var(--text-main)' }}>
                              {order.items && order.items.length > 0 ? order.items.map(i => `${i.quantity}x ${i.foodName}`).join(', ') : `${order.itemCount} items`}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                {order.paymentMethod === 'cod' ? 'COD' : 'Online'} &bull; &#8377;{Number(order.totalAmount).toLocaleString('en-IN')}
                              </span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {order.orderStatus === 'placed' && (
                                  <>
                                    <button onClick={() => handleUpdateOrderStatus(order.id, 'rejected')} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Reject</button>
                                    <button onClick={() => handleUpdateOrderStatus(order.id, 'accepted')} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Accept</button>
                                  </>
                                )}
                                {order.orderStatus === 'accepted' && <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Prepare</button>}
                                {order.orderStatus === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Ready for Pickup</button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Hourly Volume chart */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
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
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
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
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
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

          {/* ── ORDERS TAB — real backend Orders page ── */}
          {activeTab === 'orders' && <OrdersPage hotel={hotel} />}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && <SettingsPage currentUser={currentUser} hotel={hotel} />}

          {/* ── PLACEHOLDER TABS ── */}
          {!['dashboard', 'orders', 'settings'].includes(activeTab) && (
            <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '5rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
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
    </div>
  );
}
