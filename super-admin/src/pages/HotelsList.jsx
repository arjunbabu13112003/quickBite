import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  UserCheck, 
  ToggleLeft, 
  ToggleRight,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Plus
} from 'lucide-react';
import { api } from '../services/api';

export default function HotelsList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hotels, setHotels] = useState([]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [filterStoreStatus, setFilterStoreStatus] = useState('All'); // 'All' | 'Open' | 'Closed'
  const [filterAcceptingOrders, setFilterAcceptingOrders] = useState('All'); // 'All' | 'Accepting' | 'NotAccepting'
  const [filterCity, setFilterCity] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Active Status Mutation Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    hotel: null,
    action: '' // 'activate' | 'deactivate'
  });
  const [mutating, setMutating] = useState(false);

  // Actions menu state (mapping hotelId -> boolean)
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHotels();
      setHotels(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load hotels list. Please check connection to NestJS server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  // --- STATS CALCULATIONS ---

  const totalHotelsCount = hotels.length;
  const activeHotelsCount = hotels.filter(h => h.isActive).length;
  const inactiveHotelsCount = hotels.filter(h => !h.isActive).length;
  const openHotelsCount = hotels.filter(h => h.isOpen).length;
  const closedHotelsCount = hotels.filter(h => !h.isOpen).length;

  // Extract cities from hotels dataset dynamically
  const uniqueCities = [...new Set(hotels.map(h => h.city).filter(Boolean))];

  // --- FILTER & SEARCH LOGIC ---

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('All');
    setFilterStoreStatus('All');
    setFilterAcceptingOrders('All');
    setFilterCity('All');
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterStoreStatus, filterAcceptingOrders, filterCity, rowsPerPage]);

  const filteredHotels = hotels.filter((hotel) => {
    // 1. Client-side Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const nameMatch = (hotel.name || '').toLowerCase().includes(q);
      const cityMatch = (hotel.city || '').toLowerCase().includes(q);
      const addressMatch = (hotel.address || '').toLowerCase().includes(q);
      if (!nameMatch && !cityMatch && !addressMatch) return false;
    }

    // 2. Status filter
    if (filterStatus === 'Active' && !hotel.isActive) return false;
    if (filterStatus === 'Inactive' && hotel.isActive) return false;

    // 3. Store Status filter
    if (filterStoreStatus === 'Open' && !hotel.isOpen) return false;
    if (filterStoreStatus === 'Closed' && hotel.isOpen) return false;

    // 4. Order Acceptance filter
    if (filterAcceptingOrders === 'Accepting' && !hotel.acceptsOrders) return false;
    if (filterAcceptingOrders === 'NotAccepting' && hotel.acceptsOrders) return false;

    // 5. City filter
    if (filterCity !== 'All' && hotel.city !== filterCity) return false;

    return true;
  });

  // --- PAGINATION CALCULATIONS ---

  const totalItems = filteredHotels.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredHotels.slice(indexOfFirstRow, indexOfLastRow);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }); // e.g. "09 Aug 2026"
    } catch (e) {
      return dateStr;
    }
  };

  // --- STATUS MUTATION CONFIRMATION WORKFLOW ---

  const triggerStatusToggle = (hotel, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setConfirmModal({
      isOpen: true,
      hotel,
      action: hotel.isActive ? 'deactivate' : 'activate'
    });
  };

  const handleStatusToggleConfirm = async () => {
    const { hotel, action } = confirmModal;
    if (!hotel) return;

    setMutating(true);
    try {
      if (action === 'deactivate') {
        await api.deactivateHotel(hotel.id);
      } else {
        await api.activateHotel(hotel.id);
      }
      
      // Update local state dynamically to avoid full reload flickers
      setHotels(prev => prev.map(h => {
        if (h.id === hotel.id) {
          return {
            ...h,
            isActive: action === 'activate'
          };
        }
        return h;
      }));

      setConfirmModal({ isOpen: false, hotel: null, action: '' });
    } catch (err) {
      console.error(err);
      alert(`Status update failed: ${err.message || 'Server error'}`);
    } finally {
      setMutating(false);
    }
  };

  const handleRowActionClick = (actionName) => {
    alert(`"${actionName}" is not available yet. It will be implemented in the next platform releases.`);
    setActiveMenuId(null);
  };

  const renderStatusBadge = (hotel) => {
    if (!hotel.isActive) {
      return (
        <span style={{
          background: '#fce8e6',
          color: '#c5221f',
          padding: '0.25rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.72rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Inactive
        </span>
      );
    }
    return (
      <span style={{
        background: '#e6f4ea',
        color: '#137333',
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Active
      </span>
    );
  };

  const renderStoreStatusBadge = (isOpen) => {
    return (
      <span style={{
        background: isOpen ? '#e6f4ea' : '#f1f5f9',
        color: isOpen ? '#137333' : 'var(--text-muted)',
        padding: '0.25rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        fontWeight: '850',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {isOpen ? 'Open' : 'Closed'}
      </span>
    );
  };

  // Close actions dropdown when clicking elsewhere
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // --- RENDER SKELETON LOADING ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '380px', height: '16px', borderRadius: '4px' }}></div>
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

        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          height: '400px'
        }}>
          <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '2rem', borderRadius: '4px' }}></div>
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} style={{ display: 'flex', gap: '2.5rem', marginBottom: '1.5rem' }}>
              <div className="skeleton" style={{ width: '40px', height: '30px', borderRadius: '50%' }}></div>
              <div className="skeleton" style={{ width: '180px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER ERROR STATE ---

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
          Data Load Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
          {error}
        </p>
        <button
          onClick={fetchHotels}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem', gap: '0.6rem' }}
        >
          <RefreshCw size={16} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Header with Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            letterSpacing: '-0.5px'
          }}>Hotels</h1>
          <p style={{
            fontSize: '0.92rem',
            color: 'var(--text-muted)'
          }}>Manage all restaurants operating on the QuickBite platform.</p>
        </div>

        <button 
          onClick={() => onNavigate('/hotels/new')}
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          <Plus size={18} />
          <span>Add Hotel</span>
        </button>
      </div>

      {/* Summary Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1.25rem'
      }}>
        
        {/* Total Hotels */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Hotels</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '850', color: 'var(--text-main)' }}>{totalHotelsCount}</h2>
        </div>

        {/* Active Hotels */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid #16a34a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '850', color: '#16a34a' }}>{activeHotelsCount}</h2>
        </div>

        {/* Inactive Hotels */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid #dc2626',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '850', color: '#dc2626' }}>{inactiveHotelsCount}</h2>
        </div>

        {/* Open Hotels */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid #2563eb',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currently Open</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '850', color: '#2563eb' }}>{openHotelsCount}</h2>
        </div>

        {/* Closed Hotels */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currently Closed</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '850', color: 'var(--text-main)' }}>{closedHotelsCount}</h2>
        </div>

      </div>

      {/* Interactive Controls & Filters Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center'
      }}>
        
        {/* Search Field */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-subtle)',
            pointerEvents: 'none'
          }} />
          <input 
            type="text"
            placeholder="Search name, city, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.88rem',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Status:</span>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              background: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        {/* Store Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Store:</span>
          <select 
            value={filterStoreStatus}
            onChange={(e) => setFilterStoreStatus(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              background: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="All">All States</option>
            <option value="Open">Open Only</option>
            <option value="Closed">Closed Only</option>
          </select>
        </div>

        {/* Order Acceptance Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Accepting Orders:</span>
          <select 
            value={filterAcceptingOrders}
            onChange={(e) => setFilterAcceptingOrders(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              background: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Modes</option>
            <option value="Accepting">Yes (Accepting)</option>
            <option value="NotAccepting">No (Not Accepting)</option>
          </select>
        </div>

        {/* City Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>City:</span>
          <select 
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              background: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <button 
          onClick={handleClearFilters}
          style={{
            fontSize: '0.85rem',
            fontWeight: '800',
            color: 'var(--primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          Clear Filters
        </button>

      </div>

      {/* Main Hotels Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        
        <div style={{ overflowX: 'auto', minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hotel</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Status</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accepting Orders</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admins</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created Date</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((hotel) => (
                  <tr key={hotel.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Hotel logo and address */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {hotel.imageUrl ? (
                          <img 
                            src={hotel.imageUrl} 
                            alt={hotel.name}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '1rem'
                          }}>
                            {hotel.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {hotel.name}
                          </div>
                          {hotel.address && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {hotel.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* City */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {hotel.city || '—'}
                    </td>

                    {/* Contact details */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {hotel.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                            <Mail size={12} /> {hotel.email}
                          </span>
                        )}
                        {hotel.phoneNumber && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                            <Phone size={12} /> {hotel.phoneNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active Status */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {renderStatusBadge(hotel)}
                    </td>

                    {/* Store status Open/Closed */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {renderStoreStatusBadge(hotel.isOpen)}
                    </td>

                    {/* Accepting Orders */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', fontWeight: '750', color: hotel.acceptsOrders ? '#137333' : 'var(--text-muted)' }}>
                      {hotel.acceptsOrders ? 'Yes' : 'No'}
                    </td>

                    {/* Admins count */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800' }}>
                      —
                    </td>

                    {/* Created date */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} />
                        {formatDate(hotel.createdAt)}
                      </span>
                    </td>

                    {/* Actions Menu Trigger */}
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center', position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === hotel.id ? null : hotel.id);
                        }}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          background: '#ffffff',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        Actions
                      </button>

                      {/* Dropdown Options */}
                      {activeMenuId === hotel.id && (
                        <div style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '2.5rem',
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 15,
                          width: '165px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onNavigate(`/hotels/${hotel.id}`);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.9rem',
                              fontSize: '0.82rem',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              textAlign: 'left',
                              width: '100%',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Eye size={14} /> <span>View Details</span>
                          </button>

                          <button
                            onClick={() => handleRowActionClick('Edit Hotel')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.9rem',
                              fontSize: '0.82rem',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              textAlign: 'left',
                              width: '100%',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit2 size={14} /> <span>Edit Hotel</span>
                          </button>

                          <button
                            onClick={() => handleRowActionClick('Manage Admins')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.9rem',
                              fontSize: '0.82rem',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              textAlign: 'left',
                              width: '100%',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <UserCheck size={14} /> <span>Manage Admins</span>
                          </button>

                          <button
                            onClick={(e) => triggerStatusToggle(hotel, e)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.9rem',
                              fontSize: '0.82rem',
                              color: hotel.isActive ? '#dc2626' : '#16a34a',
                              fontWeight: '800',
                              textAlign: 'left',
                              width: '100%',
                              background: hotel.isActive ? '#fff5f5' : '#f0fdf4'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {hotel.isActive ? (
                              <>
                                <ToggleLeft size={14} />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <ToggleRight size={14} />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', fontWeight: '700', marginBottom: '1rem' }}>
                      {searchQuery || filterStatus !== 'All' || filterStoreStatus !== 'All' || filterAcceptingOrders !== 'All' || filterCity !== 'All'
                        ? 'No hotels match the selected filters.'
                        : 'No hotels available.'}
                    </div>
                    {(searchQuery || filterStatus !== 'All' || filterStoreStatus !== 'All' || filterAcceptingOrders !== 'All' || filterCity !== 'All') && (
                      <button onClick={handleClearFilters} className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {totalItems > 0 && (
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Range indicator and rows per page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, totalItems)} of {totalItems} entries
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '600' }}>Rows per page:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: currentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                const isSelected = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--primary)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: currentPage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Dialog Modal overlay */}
      {confirmModal.isOpen && (
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
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>
              {confirmModal.action === 'deactivate' ? 'Deactivate Hotel?' : 'Activate Hotel?'}
            </h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              {confirmModal.action === 'deactivate' 
                ? `This hotel ("${confirmModal.hotel?.name}") will no longer be active on the QuickBite platform.`
                : `This hotel ("${confirmModal.hotel?.name}") will become active and visible to customers on the QuickBite platform.`}
            </p>

            <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                disabled={mutating}
                onClick={() => setConfirmModal({ isOpen: false, hotel: null, action: '' })}
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
                disabled={mutating}
                onClick={handleStatusToggleConfirm}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  background: confirmModal.action === 'deactivate' ? '#dc2626' : '#16a34a',
                  boxShadow: confirmModal.action === 'deactivate' 
                    ? '0 4px 12px rgba(220,38,38,0.25)' 
                    : '0 4px 12px rgba(22,163,74,0.25)'
                }}
              >
                {mutating ? 'Processing...' : (confirmModal.action === 'deactivate' ? 'Deactivate' : 'Activate')}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
