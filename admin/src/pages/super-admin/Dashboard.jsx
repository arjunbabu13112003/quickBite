import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Bike, 
  ClipboardList, 
  IndianRupee, 
  AlertTriangle,
  Plus, 
  UserPlus, 
  CheckSquare, 
  ArrowUpRight, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [hotels, setHotels] = useState([]);
  const [partners, setPartners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);

  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    try {
      const [hotelsData, partnersData, ordersData, statsData] = await Promise.all([
        api.getHotels().catch(e => { console.warn(e); return []; }),
        api.getDeliveryPartners().catch(e => { console.warn(e); return []; }),
        api.getOrders().catch(e => { console.warn(e); return []; }),
        api.getAdminStats().catch(e => { console.warn(e); return { totalCustomers: 0 }; })
      ]);

      setHotels(hotelsData || []);
      setPartners(partnersData || []);
      setOrders(ordersData || []);
      setCustomerCount(statsData?.totalCustomers || 0);
    } catch (err) {
      console.error(err);
      if (!isBackground) {
        setError('Unable to load platform dashboard metrics. Please check connection to NestJS server.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- STATS CALCULATIONS ---

  const totalHotels = hotels.length;
  const activeHotels = hotels.filter(h => h.isActive).length;
  const inactiveHotels = hotels.filter(h => !h.isActive).length;

  const totalPartners = partners.length;
  const verifiedPartners = partners.filter(p => p.isVerified).length;
  const unverifiedPartners = partners.filter(p => !p.isVerified).length;

  // Delivery Fleet
  const onlinePartners = partners.filter(p => p.isOnline).length;
  const busyPartners = partners.filter(p => p.isActive && p.isVerified && p.isOnline && !p.isAvailable).length;
  const availablePartners = partners.filter(p => p.isActive && p.isVerified && p.isOnline && p.isAvailable).length;
  const offlinePartners = partners.filter(p => !p.isOnline).length;

  const onlinePercentage = totalPartners > 0 ? Math.round((onlinePartners / totalPartners) * 100) : 0;
  const eligibleOnlinePartners = partners.filter(p => p.isActive && p.isVerified && p.isOnline).length;
  const busyPercentage = eligibleOnlinePartners > 0 ? Math.round((busyPartners / eligibleOnlinePartners) * 100) : 0;
  const availablePercentage = eligibleOnlinePartners > 0 ? Math.round((availablePartners / eligibleOnlinePartners) * 100) : 0;

  // Orders Today
  const todayStr = new Date().toDateString();
  const ordersToday = orders.filter(o => new Date(o.placedAt).toDateString() === todayStr);
  const ordersTodayCount = ordersToday.length;

  // Revenue Today (Delivered and Paid today)
  const isDeliveredToday = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === todayStr;
  };
  const validOrdersToday = orders.filter(o => 
    o.orderStatus === 'delivered' && 
    o.paymentStatus === 'paid' && 
    o.deliveredAt && 
    isDeliveredToday(o.deliveredAt)
  );
  const revenueToday = validOrdersToday.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

  // Attention Required items
  const attentionItems = [];
  if (unverifiedPartners > 0) {
    attentionItems.push({
      id: 'unverified-drivers',
      type: 'delivery',
      count: unverifiedPartners,
      label: `${unverifiedPartners} Delivery Partner${unverifiedPartners > 1 ? 's' : ''} Awaiting Verification`,
      detail: 'Awaiting profile documents check.'
    });
  }
  if (inactiveHotels > 0) {
    attentionItems.push({
      id: 'inactive-hotels',
      type: 'hotel',
      count: inactiveHotels,
      label: `${inactiveHotels} Restaurant${inactiveHotels > 1 ? 's' : ''} Currently Inactive`,
      detail: 'Disabled in directory.'
    });
  }
  const closedHotels = hotels.filter(h => h.isActive && !h.isOpen).length;
  if (closedHotels > 0) {
    attentionItems.push({
      id: 'closed-hotels',
      type: 'hotel-status',
      count: closedHotels,
      label: `${closedHotels} Restaurant${closedHotels > 1 ? 's' : ''} Offline/Closed`,
      detail: 'Not receiving customer orders.'
    });
  }
  const readyOrders = orders.filter(o => o.orderStatus === 'ready_for_pickup').length;
  if (readyOrders > 0) {
    attentionItems.push({
      id: 'pickup-orders',
      type: 'order',
      count: readyOrders,
      label: `${readyOrders} Order${readyOrders > 1 ? 's' : ''} Ready for Pickup`,
      detail: 'Waiting for driver assignment.'
    });
  }

  // --- ACTIONS ---

  const handleQuickAction = (actionName) => {
    alert(`"${actionName}" action is not available yet. It will be implemented in the next step.`);
  };

  // Status badges helpers
  const renderStatusBadge = (status) => {
    const s = status.toLowerCase();
    let bg = 'rgba(100,116,139,0.1)';
    let text = 'var(--text-muted)';
    
    if (s === 'active' || s === 'open' || s === 'verified' || s === 'online' || s === 'delivered' || s === 'available') {
      bg = 'var(--bg-success-subtle)';
      text = 'var(--text-success)';
    } else if (s === 'inactive' || s === 'closed' || s === 'offline' || s === 'rejected' || s === 'cancelled') {
      bg = 'var(--bg-danger-subtle)';
      text = 'var(--text-danger)';
    } else if (s === 'pending' || s === 'busy' || s === 'placed' || s === 'preparing' || s === 'ready_for_pickup' || s === 'out_for_delivery') {
      bg = 'var(--bg-warning-subtle)';
      text = 'var(--text-warning)';
    }

    return (
      <span style={{
        background: bg,
        color: text,
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-block'
      }}>
        {status}
      </span>
    );
  };

  // --- RENDER SKELETON LOADING ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Title skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '220px', height: '28px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '450px', height: '16px', borderRadius: '4px' }}></div>
        </div>

        {/* Stat Cards Grid skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              height: '130px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton" style={{ width: '60px', height: '14px', borderRadius: '2px' }}></div>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
              </div>
              <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '100px', height: '12px', borderRadius: '2px' }}></div>
            </div>
          ))}
        </div>

        {/* Dashboard split body skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '2rem'
        }}>
          {/* Left panel skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              height: '240px'
            }}>
              <div className="skeleton" style={{ width: '140px', height: '20px', marginBottom: '1.5rem', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '100%', height: '50px', marginBottom: '1rem', borderRadius: '8px' }}></div>
              <div className="skeleton" style={{ width: '100%', height: '50px', borderRadius: '8px' }}></div>
            </div>
          </div>

          {/* Right panel skeleton */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            height: '480px'
          }}>
            <div className="skeleton" style={{ width: '180px', height: '22px', marginBottom: '2rem', borderRadius: '4px' }}></div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '150px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // --- RENDER ERROR STATE ---

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
          onClick={fetchDashboardData}
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
      
      {/* Title Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <h1 style={{
          fontSize: '1.9rem',
          fontWeight: '900',
          color: 'var(--text-main)',
          letterSpacing: '-0.5px'
        }}>Platform Overview</h1>
        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-muted)'
        }}>Monitor restaurants, orders, delivery operations and platform performance.</p>
      </div>

      {/* Metrics Summary Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem'
      }}>
        
        {/* Total Hotels */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Hotels</span>
            <div style={{ background: '#e0f2fe', color: '#0369a1', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>{totalHotels}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' }}>
              <ArrowUpRight size={12} />
              <span>+3 this week</span>
            </div>
          </div>
        </div>

        {/* Active Hotels */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Hotels</span>
            <div style={{ background: '#dcfce7', color: '#15803d', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>{activeHotels}</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{inactiveHotels} currently inactive</span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Customers</span>
            <div style={{ background: '#e0f2fe', color: '#2563eb', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>{customerCount}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' }}>
              <ArrowUpRight size={12} />
              <span>+1.2k this month</span>
            </div>
          </div>
        </div>

        {/* Delivery Partners */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Ptnrs</span>
            <div style={{ background: '#ffe4e6', color: '#e11d48', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <Bike size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>{totalPartners}</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontWeight: '750' }}>{unverifiedPartners} pending verify</span>
          </div>
        </div>

        {/* Orders Today */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders Today</span>
            <div style={{ background: '#e0f2fe', color: '#0891b2', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>{ordersTodayCount}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' }}>
              <ArrowUpRight size={12} />
              <span>+15% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Revenue Today */}
        <div className="glass-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue Today</span>
            <div style={{ background: '#f3e8ff', color: '#7c3aed', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: '850', color: 'var(--text-main)', margin: '0.3rem 0' }}>
              ₹{revenueToday.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' }}>
              <ArrowUpRight size={12} />
              <span>+8% vs yesterday</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px minmax(0, 1fr)',
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* Left Hand: Attention, Quick Actions, Delivery Fleet */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          
          {/* Attention Required */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px solid #fee2e2',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <AlertTriangle size={20} style={{ color: 'var(--text-danger)' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-danger)' }}>Attention Required</h4>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-danger-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #fee2e2'
                  }}>
                    <div style={{
                      background: 'var(--border-danger-subtle)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-danger)',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>{item.count}</div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-danger)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-danger)', marginTop: '0.1rem' }}>{item.detail}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  No items require attention.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              <button 
                onClick={() => handleQuickAction('Add Hotel')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              >
                <span>+ Add Hotel</span>
                <Building2 size={16} />
              </button>

              <button 
                onClick={() => handleQuickAction('Assign Hotel Admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              >
                <span>Assign Hotel Admin</span>
                <UserPlus size={16} />
              </button>

              <button 
                onClick={() => handleQuickAction('Verify Delivery Partner')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              >
                <span>Verify Delivery Partner</span>
                <CheckSquare size={16} />
              </button>

            </div>
          </div>

          {/* Delivery Fleet */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '1rem' }}>Delivery Fleet</h4>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#16a34a' }}>
                ● Online ({onlinePartners})
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                {onlinePercentage}%
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ width: `${onlinePercentage}%`, height: '100%', background: '#16a34a', borderRadius: '4px' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Available (Free)</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{availablePartners} ({availablePercentage}%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Busy (On Order)</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{busyPartners} ({busyPercentage}%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Offline</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{offlinePartners}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Hand: Hotels Table, Recent Orders Table */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          minWidth: 0
        }}>
          
          {/* Hotels Overview */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)' }}>Hotels Overview</h4>
              <button 
                onClick={() => handleQuickAction('Add Hotel')}
                style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none' }}
              >
                + Add Hotel
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hotel</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admins</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders Today</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.length > 0 ? (
                    hotels.map((hotel) => {
                      // Calculate orders today for this specific hotel
                      const hotelOrdersToday = ordersToday.filter(o => o.hotelId === hotel.id).length;
                      
                      return (
                        <tr key={hotel.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {hotel.imageUrl ? (
                              <img 
                                src={hotel.imageUrl} 
                                alt={hotel.name}
                                style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--text-subtle)' }}>
                                {hotel.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>{hotel.name}</span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>{hotel.city}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            {renderStatusBadge(hotel.isActive ? (hotel.isOpen ? 'Open' : 'Closed') : 'Inactive')}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800' }}>
                            —
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800' }}>
                            {hotelOrdersToday}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)', fontWeight: '700', fontSize: '0.9rem' }}>
                        No hotels registered on the platform.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Platform Orders */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)' }}>Recent Platform Orders</h4>
              <button 
                onClick={() => alert('Order filters are not available in Step 2.')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)'
                }}
              >
                <Filter size={12} />
                <span>Filter</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order #</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hotel</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.slice(0, 10).map((order) => {
                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem', fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            #{order.orderNumber}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.88rem', fontWeight: '750', color: 'var(--text-main)' }}>
                            {order.hotel?.name || 'Unknown Restaurant'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {order.user?.name || 'Guest User'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            ₹{parseFloat(order.totalAmount).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                            {order.paymentMethod}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {renderStatusBadge(order.orderStatus)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)', fontWeight: '700', fontSize: '0.9rem' }}>
                        No recent platform orders registered.
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

