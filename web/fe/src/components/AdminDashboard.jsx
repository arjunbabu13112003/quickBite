import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Store, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  ShieldCheck,
  Package,
  Activity,
  Clock,
  MapPin,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { RESTAURANTS } from '../data/mockData';

export default function AdminDashboard({
  onBackToStore,
  currentUser,
  restaurants = [],
  onUpdateRestaurants
}) {
  const restaurantsList = restaurants.length > 0 ? restaurants : RESTAURANTS;
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'restaurants', 'users'

  // Admin Live Orders Queue State
  const [adminOrders, setAdminOrders] = useState([
    {
      id: 'QB-984210',
      customerName: 'Arjun Kumar',
      customerPhone: '+91 9447123456',
      address: 'Marine Drive, MG Road, Ernakulam, Kochi',
      itemsCount: 3,
      totalAmount: 1806,
      status: 'Preparing',
      placedTime: '10 mins ago',
      paymentMethod: 'UPI (GPay)'
    },
    {
      id: 'QB-742918',
      customerName: 'Sachu S.',
      customerPhone: '+91 9876543210',
      address: 'Technopark Phase 3, Kazhakkoottam, Trivandrum',
      itemsCount: 2,
      totalAmount: 848,
      status: 'Out for Delivery',
      placedTime: '22 mins ago',
      paymentMethod: 'Cash on Delivery'
    },
    {
      id: 'QB-381045',
      customerName: 'Ananya Sharma',
      customerPhone: '+91 9000112233',
      address: 'Indiranagar 100ft Rd, Bengaluru',
      itemsCount: 4,
      totalAmount: 2350,
      status: 'Delivered',
      placedTime: '45 mins ago',
      paymentMethod: 'Credit Card'
    }
  ]);

  // Registered PostgreSQL Users Table
  const [dbUsers, setDbUsers] = useState([
    { id: 101, name: 'Arjun Kumar', email: 'user@quickbite.com', phone: '+91 9447123456', role: 'user', joined: 'Yesterday', ordersCount: 12 },
    { id: 102, name: 'Sachu S.', email: 'sachu@quickbite.com', phone: '+91 9876543210', role: 'user', joined: '3 days ago', ordersCount: 8 },
    { id: 103, name: 'Ananya Sharma', email: 'ananya@gmail.com', phone: '+91 9000112233', role: 'user', joined: '1 week ago', ordersCount: 5 },
    { id: 1, name: 'QuickBite Administrator', email: 'admin@quickbite.com', phone: '+91 9000000000', role: 'admin', joined: 'System Root', ordersCount: 0 }
  ]);

  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');

  const updateOrderStatus = (orderId, newStatus) => {
    setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleUpdateItemPrice = (restaurantId, itemId, newPrice) => {
    const parsed = parseFloat(newPrice);
    if (isNaN(parsed) || parsed <= 0) return;

    const updated = restaurantsList.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          menu: r.menu.map(item => item.id === itemId ? { ...item, price: parsed } : item)
        };
      }
      return r;
    });

    if (onUpdateRestaurants) {
      onUpdateRestaurants(updated);
    }

    setEditingPriceItem(null);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '4rem' }}>
      
      {/* Top Admin Navigation Header */}
      <div 
        className="admin-header-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          padding: '1.1rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid rgba(16,185,129,0.35)',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(16,185,129,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-lg)',
            background: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="admin-header-title" style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
              QuickBite Admin Control Portal
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', wordBreak: 'break-all' }}>
              Authenticated Administrator: {currentUser ? currentUser.name : 'QuickBite Admin'} ({currentUser ? currentUser.email : 'admin@quickbite.com'})
            </span>
          </div>
        </div>

        <button
          onClick={onBackToStore}
          className="btn-primary"
          style={{ background: 'var(--primary)', padding: '0.5rem 1rem', fontSize: '0.82rem', gap: '0.45rem' }}
        >
          <ArrowLeft size={16} /> Switch to Customer Store View
        </button>
      </div>

      {/* Admin Navigation Pills */}
      <div 
        className="admin-nav-tabs"
        style={{
          display: 'flex',
          gap: '0.6rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          overflowX: 'auto'
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          className="admin-nav-tab-btn"
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '800',
            fontSize: '0.88rem',
            border: 'none',
            background: activeTab === 'overview' ? '#10b981' : 'var(--bg-card)',
            color: activeTab === 'overview' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'overview' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📊 Revenue & Analytics
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className="admin-nav-tab-btn"
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '800',
            fontSize: '0.88rem',
            border: 'none',
            background: activeTab === 'orders' ? '#10b981' : 'var(--bg-card)',
            color: activeTab === 'orders' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'orders' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          🛵 Live Orders Queue ({adminOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('restaurants')}
          className="admin-nav-tab-btn"
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '800',
            fontSize: '0.88rem',
            border: 'none',
            background: activeTab === 'restaurants' ? '#10b981' : 'var(--bg-card)',
            color: activeTab === 'restaurants' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'restaurants' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          🏪 Restaurants & Menu Editor
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="admin-nav-tab-btn"
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '800',
            fontSize: '0.88rem',
            border: 'none',
            background: activeTab === 'users' ? '#10b981' : 'var(--bg-card)',
            color: activeTab === 'users' ? '#ffffff' : 'var(--text-main)',
            boxShadow: activeTab === 'users' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          👥 PostgreSQL Users ({dbUsers.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div>
          {/* Analytics KPI Stat Cards */}
          <div 
            className="admin-stat-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Gross Sales</span>
                <DollarSign size={22} style={{ color: '#10b981' }} />
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-main)' }}>₹1,48,920</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', display: 'block', marginTop: '0.2rem' }}>↑ +18.4% this week</span>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Active Deliveries</span>
                <Package size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-main)' }}>42 Orders</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', display: 'block', marginTop: '0.2rem' }}>Avg delivery time: 22 mins</span>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Partner Stores</span>
                <Store size={22} style={{ color: 'var(--accent-amber)' }} />
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{restaurantsList.length} Stores</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: '700', display: 'block', marginTop: '0.2rem' }}>100% Operational</span>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>PostgreSQL Users</span>
                <Users size={22} style={{ color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-main)' }}>1,240 Users</span>
              <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: '700', display: 'block', marginTop: '0.2rem' }}>DB Table: `users`</span>
            </div>

          </div>

          {/* Performance Overview Banner */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              📈 Platform Performance Metrics
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              QuickBite Express Delivery service is currently processing an average of 140 orders per hour across Kochi, Trivandrum, Kozhikode, and Bengaluru. Database tables and courier dispatch API are operating at 99.98% uptime.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CUSTOMER ORDERS QUEUE */}
      {activeTab === 'orders' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>🛵 Customer Orders Queue</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Real-time admin order dispatch & status management</span>
            </div>

            <button onClick={() => alert('Refreshing live orders...')} className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}>
              <RefreshCw size={14} /> Refresh Queue
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {adminOrders.map((ord) => (
              <div key={ord.id} style={{
                background: 'var(--bg-subtle)',
                padding: '1.1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary)' }}>
                      #{ord.id}
                    </span>
                    <span className={`badge ${ord.status === 'Delivered' ? 'badge-green' : ord.status === 'Out for Delivery' ? 'badge-primary' : 'badge-offer'}`}>
                      {ord.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {ord.placedTime}</span>
                  </div>

                  <span style={{ fontSize: '0.9rem', fontWeight: '800', display: 'block', color: 'var(--text-main)' }}>
                    Customer: {ord.customerName} ({ord.customerPhone})
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    📍 {ord.address} • Payment: {ord.paymentMethod}
                  </span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>
                    ₹{ord.totalAmount}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {ord.status !== 'Delivered' && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, ord.status === 'Preparing' ? 'Out for Delivery' : 'Delivered')}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Advance Status →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANTS & MENU EDITOR */}
      {activeTab === 'restaurants' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>🏪 Manage Stores & Edit Dish Prices</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Admin live price adjustments & dish availability</span>
            </div>

            <button className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
              <Plus size={16} /> Add New Restaurant
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {restaurantsList.map((restaurant) => (
              <div key={restaurant.id} style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={restaurant.image} alt={restaurant.name} style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>{restaurant.name}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{restaurant.category.toUpperCase()} • ★ {restaurant.rating} • {restaurant.address}</span>
                    </div>
                  </div>
                  <span className="badge badge-green">100% OPERATIONAL</span>
                </div>

                {/* Dishes list for this restaurant */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {restaurant.menu.map((item) => (
                    <div key={item.id} style={{
                      background: 'var(--bg-card)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <img src={item.image} alt={item.name} style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', display: 'block', color: 'var(--text-main)' }}>{item.name}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary)' }}>₹{item.price}</span>
                        </div>
                      </div>

                      {editingPriceItem === item.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <input 
                            type="number"
                            value={newPriceValue}
                            onChange={(e) => setNewPriceValue(e.target.value)}
                            style={{ width: '60px', padding: '0.25rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--primary)' }}
                          />
                          <button 
                            onClick={() => handleUpdateItemPrice(restaurant.id, item.id, newPriceValue)}
                            className="btn-primary" 
                            style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingPriceItem(item.id); setNewPriceValue(item.price.toString()); }}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', gap: '0.2rem' }}
                        >
                          <Edit size={12} /> Price
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: POSTGRESQL USERS */}
      {activeTab === 'users' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>👥 Registered PostgreSQL Users Table</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>DB Schema: `users` table records</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>User ID</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Full Name</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Email Address</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Mobile Phone</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Role</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Orders Placed</th>
                </tr>
              </thead>
              <tbody>
                {dbUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '800', color: 'var(--primary)' }}>#{u.id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>{u.name}</td>
                    <td style={{ padding: '0.75rem' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem' }}>{u.phone}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-green' : 'badge-primary'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>{u.ordersCount} Orders</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
