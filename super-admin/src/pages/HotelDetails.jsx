import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  Edit2, 
  UserCheck, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Clock,
  IndianRupee,
  Utensils,
  Star,
  Check,
  ToggleLeft,
  ToggleRight,
  Plus,
  Users,
  Eye,
  Info,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function HotelDetails({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItemsCount, setMenuItemsCount] = useState(0);
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: 0,
    ratingCount: 0,
    distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  });
  const [admins, setAdmins] = useState([]);
  const [updatingSetting, setUpdatingSetting] = useState(false);

  // Status mutation confirmation states
  const [confirmToggle, setConfirmToggle] = useState({
    isOpen: false,
    field: '', // 'isOpen' | 'acceptsOrders' | 'isActive'
    value: null
  });

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Hotel Metadata
      let hotelData;
      try {
        hotelData = await api.getHotelById(id);
        if (!hotelData) {
          throw new Error('NotFound');
        }
        setHotel(hotelData);
      } catch (err) {
        if (err.message.includes('404') || err.message.includes('NotFound')) {
          setError('HotelNotFound');
          setLoading(false);
          return;
        }
        throw err;
      }

      // 2. Fetch Hotel Menu Items Count
      try {
        const foods = await api.getHotelFoods(id);
        setMenuItemsCount(foods ? foods.length : 0);
      } catch (err) {
        console.warn('Failed to fetch food items count:', err);
      }

      // 3. Fetch Assigned Admins
      try {
        const assignedAdmins = await api.getHotelAdmins(id);
        setAdmins(assignedAdmins || []);
      } catch (err) {
        console.warn('Failed to fetch hotel admins:', err);
      }

      // 4. Fetch Rating Summary (fail-safe for inactive hotels)
      try {
        const ratingData = await api.getHotelReviewsSummary(id);
        setRatingSummary(ratingData || {
          averageRating: 0,
          ratingCount: 0,
          distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
        });
      } catch (err) {
        console.warn('Rating summary not available:', err);
      }

      // 5. Fetch Platform Orders and filter for this hotel
      try {
        const allOrders = await api.getOrders();
        const hotelOrders = allOrders ? allOrders.filter(o => Number(o.hotelId) === Number(id)) : [];
        setOrders(hotelOrders);
      } catch (err) {
        console.warn('Failed to fetch hotel orders:', err);
      }

    } catch (err) {
      console.error(err);
      setError('Unable to load hotel details. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // --- STATS CALCULATIONS ---

  const totalOrdersCount = orders.length;
  
  // Today's Date representation
  const todayStr = new Date().toDateString();
  const ordersToday = orders.filter(o => new Date(o.placedAt).toDateString() === todayStr);
  const ordersTodayCount = ordersToday.length;

  // Revenue Today (delivered & paid today)
  const isDeliveredToday = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === todayStr;
  };
  const paidDeliveredToday = orders.filter(o => 
    o.orderStatus === 'delivered' && 
    o.paymentStatus === 'paid' && 
    o.deliveredAt && 
    isDeliveredToday(o.deliveredAt)
  );
  const revenueTodayVal = paidDeliveredToday.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

  // Sorting recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
    .slice(0, 5);

  // --- TOGGLE HANDLERS WITH CONFIRMATION ---

  const triggerToggleConfirm = (field, currentValue) => {
    setConfirmToggle({
      isOpen: true,
      field,
      value: !currentValue
    });
  };

  const handleToggleConfirm = async () => {
    const { field, value } = confirmToggle;
    if (!field) return;

    setUpdatingSetting(true);
    try {
      const updatePayload = { [field]: value };
      await api.updateHotelSettings(id, updatePayload);
      
      // Update local state dynamically
      setHotel(prev => ({
        ...prev,
        [field]: value
      }));

      setConfirmToggle({ isOpen: false, field: '', value: null });
    } catch (err) {
      console.error(err);
      alert(`Setting update failed: ${err.message || 'Server error'}`);
    } finally {
      setUpdatingSetting(false);
    }
  };

  // Helper placeholder action triggers
  const handleFeaturePlaceholder = (featureName) => {
    alert(`"${featureName}" functionality is not available yet. It will be implemented in the next step.`);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Humanized duration ago helper for recent orders
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      return formatDate(dateStr);
    } catch (e) {
      return '';
    }
  };

  // --- RENDER LOAD SKELETONS ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '240px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          height: '140px'
        }}>
          <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '12px', float: 'left', marginRight: '2rem' }}></div>
          <div className="skeleton" style={{ width: '220px', height: '24px', marginBottom: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '380px', height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              height: '110px'
            }}>
              <div className="skeleton" style={{ width: '70px', height: '14px', marginBottom: '1rem', borderRadius: '2px' }}></div>
              <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER ERROR STATE ---

  if (error === 'HotelNotFound') {
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
          Hotel Not Found
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The hotel with ID {id} does not exist or has been removed from the platform.
        </p>
        <button
          onClick={() => onNavigate('/hotels')}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Back to Hotels
        </button>
      </div>
    );
  }

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
          Connection Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {error}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            onClick={() => onNavigate('/hotels')}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Back to Hotels
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--text-subtle)',
        fontWeight: '700'
      }}>
        <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/hotels')}>Hotels</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>{hotel.name}</span>
      </div>

      {/* Main Profile Header Card */}
      <div style={{
        background: '#ffffff',
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
          {hotel.logo ? (
            <img 
              src={hotel.logo} 
              alt={hotel.name}
              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
            />
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '2.25rem',
              border: '1px solid var(--border-color)'
            }}>
              {hotel.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {hotel.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <MapPin size={14} />
              <span>{hotel.address}, {hotel.city}</span>
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {/* Active status */}
              <span style={{
                background: hotel.isActive ? '#e6f4ea' : '#fce8e6',
                color: hotel.isActive ? '#137333' : '#c5221f',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ● {hotel.isActive ? 'Active' : 'Inactive'}
              </span>

              {/* Open status */}
              <span style={{
                background: hotel.isOpen ? '#e6f4ea' : '#f1f5f9',
                color: hotel.isOpen ? '#137333' : 'var(--text-muted)',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ● {hotel.isOpen ? 'Open' : 'Closed'}
              </span>

              {/* Accepts orders */}
              <span style={{
                background: hotel.acceptsOrders ? '#e8f0fe' : '#f1f5f9',
                color: hotel.acceptsOrders ? '#1a73e8' : 'var(--text-muted)',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {hotel.acceptsOrders ? 'Accepting Orders' : 'Not Accepting Orders'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate(`/hotels/${id}/edit`)}
            className="btn-secondary"
            style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.88rem' }}
          >
            <Edit2 size={16} />
            <span>Edit Hotel</span>
          </button>
          
          <button
            onClick={() => handleFeaturePlaceholder('Manage Admins')}
            className="btn-primary"
            style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.88rem' }}
          >
            <UserCheck size={16} />
            <span>Manage Admins</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem'
      }}>
        
        {/* Total Orders */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Total Orders</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {totalOrdersCount.toLocaleString()}
            </h2>
          </div>
          <ShoppingBag size={24} style={{ color: 'var(--text-subtle)' }} />
        </div>

        {/* Orders Today */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Orders Today</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {ordersTodayCount}
            </h2>
          </div>
          <Clock size={24} style={{ color: 'var(--text-subtle)' }} />
        </div>

        {/* Revenue Today */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Revenue Today</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', color: '#16a34a' }}>
              ₹{revenueTodayVal.toFixed(2)}
            </h2>
          </div>
          <IndianRupee size={24} style={{ color: '#16a34a' }} />
        </div>

        {/* Menu Items Count */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Menu Items</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {menuItemsCount > 0 ? menuItemsCount : '—'}
            </h2>
          </div>
          <Utensils size={24} style={{ color: 'var(--text-subtle)' }} />
        </div>

        {/* Average Rating */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Avg Rating</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {ratingSummary.ratingCount > 0 ? `${ratingSummary.averageRating}` : '—'}
            </h2>
          </div>
          <Star size={24} style={{ color: ratingSummary.ratingCount > 0 ? '#d97706' : 'var(--text-subtle)', fill: ratingSummary.ratingCount > 0 ? '#d97706' : 'none' }} />
        </div>

      </div>

      {/* Two Column details layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Hotel Info + Recent Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Hotel Information Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} style={{ color: 'var(--primary)' }} />
              <span>Hotel Information</span>
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem 2rem'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Hotel Name</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{hotel.name}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Email Address</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>
                  {hotel.email ? (
                    <a href={`mailto:${hotel.email}`} style={{ color: 'var(--primary)' }}>{hotel.email}</a>
                  ) : '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Contact Number</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{hotel.phoneNumber || '—'}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Cuisine Types</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-subtle)', fontWeight: '600', marginTop: '0.25rem' }}>Not configured</p>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Full Address</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  {hotel.address}, {hotel.area && `${hotel.area}, `}{hotel.city}, {hotel.state && `${hotel.state} - `}{hotel.pincode}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Tax ID / FSSAI License</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>
                  {hotel.gstNumber || hotel.fssaiNumber ? (
                    `${hotel.gstNumber || '—'} / ${hotel.fssaiNumber || '—'}`
                  ) : '—'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '750' }}>Coordinates (Lat, Lng)</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>
                  {hotel.latitude && hotel.longitude ? (
                    `${parseFloat(hotel.latitude).toFixed(6)}, ${parseFloat(hotel.longitude).toFixed(6)}`
                  ) : '—'}
                </p>
              </div>

            </div>
          </div>

          {/* Recent Orders Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
                <span>Recent Orders</span>
              </h3>
              
              <button 
                onClick={() => handleFeaturePlaceholder('View All Orders')}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  fontWeight: '800',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                View All Orders
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order #</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800' }}>
                          #{order.orderNumber ? order.orderNumber.substring(0, 11) : order.id}
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700' }}>
                          {order.user?.name || 'Customer'}
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: '800' }}>
                          ₹{parseFloat(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem' }}>
                          <span style={{
                            background: order.orderStatus === 'delivered' ? '#e6f4ea' : order.orderStatus === 'cancelled' || order.orderStatus === 'rejected' ? '#fce8e6' : '#e8f0fe',
                            color: order.orderStatus === 'delivered' ? '#137333' : order.orderStatus === 'cancelled' || order.orderStatus === 'rejected' ? '#c5221f' : '#1a73e8',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            textTransform: 'uppercase'
                          }}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {timeAgo(order.placedAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '3rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Settings + Rating Summary + Admins */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Operation Status Switches */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0 }}>
              Operation Status
            </h3>

            {/* Switch 1: isOpen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Store Operations</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {hotel.isOpen ? 'Currently accepting walk-ins' : 'Currently closed'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingSetting}
                onClick={() => triggerToggleConfirm('isOpen', hotel.isOpen)}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: hotel.isOpen ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: updatingSetting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: hotel.isOpen ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {hotel.isOpen && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Switch 2: acceptsOrders */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Online Ordering</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {hotel.acceptsOrders ? 'Accepting app orders' : 'Orders paused'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingSetting}
                onClick={() => triggerToggleConfirm('acceptsOrders', hotel.acceptsOrders)}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: hotel.acceptsOrders ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: updatingSetting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: hotel.acceptsOrders ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {hotel.acceptsOrders && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

            {/* Switch 3: isActive */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Status</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                  {hotel.isActive ? 'Active on platform' : 'Inactive / Blocked'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingSetting}
                onClick={() => triggerToggleConfirm('isActive', hotel.isActive)}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: hotel.isActive ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative',
                  border: 'none',
                  cursor: updatingSetting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 3px'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: hotel.isActive ? '25px' : '3px',
                  transition: 'left 0.25s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'var(--primary)',
                  fontWeight: '900'
                }}>
                  {hotel.isActive && <Check size={8} strokeWidth={4} />}
                </div>
              </button>
            </div>

          </div>

          {/* Rating Summary Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={16} style={{ color: 'var(--primary)', fill: 'var(--primary)' }} />
              <span>Rating Summary</span>
            </h3>

            {ratingSummary.ratingCount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)' }}>{ratingSummary.averageRating}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', color: '#d97706', gap: '0.1rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < Math.round(ratingSummary.averageRating) ? '#d97706' : 'none'} strokeWidth={1.5} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: '600' }}>
                      Based on {ratingSummary.ratingCount.toLocaleString()} reviews
                    </span>
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {['5', '4', '3', '2', '1'].map((star) => {
                    const count = ratingSummary.distribution[star] || 0;
                    const pct = ratingSummary.ratingCount > 0 ? (count / ratingSummary.ratingCount) * 100 : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem' }}>
                        <span style={{ width: '8px', fontWeight: '800', color: 'var(--text-muted)' }}>{star}</span>
                        <Star size={10} style={{ color: 'var(--text-subtle)' }} />
                        <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#d97706', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ width: '22px', textAlign: 'right', fontWeight: '750', color: 'var(--text-muted)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                No ratings yet
              </div>
            )}

          </div>

          {/* Hotel Administrators Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                Hotel Administrators
              </h3>
              
              <button 
                onClick={() => handleFeaturePlaceholder('Assign Hotel Admin')}
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--primary)',
                  fontWeight: '800',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                + Assign
              </button>
            </div>

            {admins.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {admins.map((admin) => (
                  <div key={admin.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--bg-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '850',
                        fontSize: '0.85rem'
                      }}>
                        {admin.user?.name ? admin.user.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {admin.user?.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {admin.user?.email}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      background: admin.isActive ? '#e6f4ea' : '#f1f5f9',
                      color: admin.isActive ? '#137333' : 'var(--text-muted)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                No administrators assigned yet.
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Operation Switch Confirmation Overlay */}
      {confirmToggle.isOpen && (
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
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>Change settings?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Are you sure you want to update the {confirmToggle.field === 'isOpen' ? 'Store Operations' : confirmToggle.field === 'acceptsOrders' ? 'Online Ordering' : 'Status'} of "{hotel.name}"?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={updatingSetting}
                onClick={() => setConfirmToggle({ isOpen: false, field: '', value: null })}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
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
                disabled={updatingSetting}
                onClick={handleToggleConfirm}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem'
                }}
              >
                {updatingSetting ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
