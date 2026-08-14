import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Building2, 
  Search, 
  Plus, 
  MoreVertical, 
  X, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';

export default function HotelAdminsList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raw Database Collections
  const [adminsList, setAdminsList] = useState([]);
  const [hotelsList, setHotelsList] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('All');
  const [filterHotelId, setFilterHotelId] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Active action menu row id
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both admins list and hotels list in parallel
      const [adminsData, hotelsData] = await Promise.all([
        api.getHotelAdminsList(),
        api.getHotels()
      ]);
      
      setAdminsList(adminsData || []);
      setHotelsList(hotelsData || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load hotel administrators. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ACTIONS & PLACEHOLDERS ---

  const handleAddAdminClick = () => {
    onNavigate('/hotel-admins/new');
  };

  const handleActionClick = (actionName, adminName) => {
    setActiveMenuId(null);
    alert(`"${actionName}" action for ${adminName} is future-ready and will be enabled in a future release.`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAssignment('All');
    setFilterHotelId('All');
    setCurrentPage(1);
  };

  // --- FILTERING & COMPUTATIONS ---

  // Basic search and filtering logic
  const filteredAdmins = adminsList.filter((admin) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const nameMatch = admin.name?.toLowerCase().includes(query);
      const emailMatch = admin.email?.toLowerCase().includes(query);
      if (!nameMatch && !emailMatch) return false;
    }

    // 2. Assignment Filter
    const hasAssignment = admin.assignedHotels && admin.assignedHotels.length > 0;
    if (filterAssignment === 'Assigned' && !hasAssignment) return false;
    if (filterAssignment === 'Unassigned' && hasAssignment) return false;

    // 3. Hotel Filter
    if (filterHotelId !== 'All') {
      const hotelIdNum = Number(filterHotelId);
      const assignedToHotel = admin.assignedHotels && admin.assignedHotels.some(h => Number(h.id) === hotelIdNum);
      if (!assignedToHotel) return false;
    }

    return true;
  });

  // Calculate Metrics from raw database list (pre-filtering)
  const totalHotelAdmins = adminsList.length;
  
  // Unassigned Admins: count admins with 0 assignments
  const unassignedAdmins = adminsList.filter(admin => !admin.assignedHotels || admin.assignedHotels.length === 0).length;

  // Assigned Hotels: count unique hotel IDs assigned to any administrator
  const uniqueAssignedHotels = new Set();
  adminsList.forEach(admin => {
    if (admin.assignedHotels) {
      admin.assignedHotels.forEach(h => {
        if (h.id) uniqueAssignedHotels.add(h.id);
      });
    }
  });
  const assignedHotelsCount = uniqueAssignedHotels.size;

  // --- PAGINATION MATHEMATICS ---

  const totalItems = filteredAdmins.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredAdmins.slice(indexOfFirstRow, indexOfLastRow);

  // Safe page adjust if out of range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Auto-close menu overlays on document click
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // --- RENDER LOADING SKELETONS ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '160px', height: '28px', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '380px', height: '16px', borderRadius: '4px' }}></div>
          </div>
          <div className="skeleton" style={{ width: '150px', height: '40px', borderRadius: '8px' }}></div>
        </div>

        {/* 4 Summary Cards skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
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

        {/* Filters & Table skeleton */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          height: '420px'
        }}>
          <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '2rem', borderRadius: '4px' }}></div>
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} style={{ display: 'flex', gap: '2.5rem', marginBottom: '1.5rem' }}>
              <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%' }}></div>
              <div className="skeleton" style={{ width: '150px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '180px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
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
          Query Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {error}
        </p>
        <button
          onClick={fetchData}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem', gap: '0.5rem' }}
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            letterSpacing: '-0.5px'
          }}>Hotel Admins</h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)'
          }}>Manage restaurant administrator accounts and hotel assignments.</p>
        </div>

        <button 
          onClick={handleAddAdminClick}
          className="btn-primary"
          style={{
            padding: '0.7rem 1.4rem',
            fontSize: '0.9rem',
            fontWeight: '800',
            gap: '0.4rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Plus size={18} />
          <span>Add Hotel Admin</span>
        </button>
      </div>

      {/* Summary Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Card 1: Total Admins */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Total Hotel Admins</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {totalHotelAdmins.toLocaleString()}
            </h2>
          </div>
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={20} style={{ color: 'var(--text-subtle)' }} />
          </div>
        </div>

        {/* Card 2: Active Admins (Future-ready display as no isActive field is supported) */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Active Admins</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-muted)' }}>
              —
            </h2>
          </div>
          <div style={{
            background: '#f0fdf4',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={20} style={{ color: '#16a34a' }} />
          </div>
        </div>

        {/* Card 3: Unassigned Admins */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Unassigned Admins</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: unassignedAdmins > 0 ? 'var(--accent-rose)' : 'var(--text-main)' }}>
              {unassignedAdmins}
            </h2>
            {unassignedAdmins > 0 && (
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-rose)', fontWeight: '800', display: 'block', marginTop: '0.2rem' }}>
                Requires action
              </span>
            )}
          </div>
          <div style={{
            background: unassignedAdmins > 0 ? '#fff5f5' : 'var(--bg-subtle)',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserX size={20} style={{ color: unassignedAdmins > 0 ? 'var(--accent-rose)' : 'var(--text-subtle)' }} />
          </div>
        </div>

        {/* Card 4: Assigned Hotels */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Assigned Hotels</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-main)' }}>
              {assignedHotelsCount}
            </h2>
          </div>
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={20} style={{ color: 'var(--text-subtle)' }} />
          </div>
        </div>

      </div>

      {/* Main Workspace Table & Filters Container */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        
        {/* Filters Row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          borderBottom: '1px solid var(--bg-subtle)',
          paddingBottom: '1.25rem'
        }}>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            flex: 1,
            minWidth: '280px'
          }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '340px', minWidth: '200px' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)'
              }} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by admin name or email..."
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.4rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  fontWeight: '600',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            {/* Assignment Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700' }}>Assignment:</span>
              <select
                value={filterAssignment}
                onChange={(e) => {
                  setFilterAssignment(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All</option>
                <option value="Assigned">Assigned</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>

            {/* Status Filter (Disabled/Future-ready) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700', opacity: 0.65 }}>Status:</span>
              <select
                disabled
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                  opacity: 0.65
                }}
              >
                <option value="All">All</option>
              </select>
            </div>

            {/* Hotel Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700' }}>Hotel:</span>
              <select
                value={filterHotelId}
                onChange={(e) => {
                  setFilterHotelId(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  maxWidth: '180px'
                }}
              >
                <option value="All">All</option>
                {hotelsList.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Clear Filters Link */}
          {(searchQuery || filterAssignment !== 'All' || filterHotelId !== 'All') && (
            <button
              onClick={handleClearFilters}
              style={{
                fontSize: '0.82rem',
                color: 'var(--primary)',
                fontWeight: '800',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem 0.25rem'
              }}
            >
              Clear Filters
            </button>
          )}

        </div>

        {/* Table representation */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Hotel</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assignment</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created Date</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((admin) => {
                  const hasAssignment = admin.assignedHotels && admin.assignedHotels.length > 0;
                  
                  return (
                    <tr key={admin.id} style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s'
                    }}>
                      {/* Name / Profile initials */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                            fontSize: '0.82rem',
                            border: '1px solid var(--border-color)'
                          }}>
                            {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {admin.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '650' }}>
                        {admin.email || '—'}
                      </td>

                      {/* Assigned Hotel */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700' }}>
                        {hasAssignment ? (
                          admin.assignedHotels.map(h => h.name).join(', ')
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Status (User has no active status, show fallback symbol) */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '700' }}>
                        —
                      </td>

                      {/* Assignment Badge */}
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: hasAssignment ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                          color: hasAssignment ? 'var(--text-success)' : 'var(--text-danger)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}>
                          {hasAssignment ? 'Assigned' : 'Unassigned'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {formatDate(admin.createdAt)}
                      </td>

                      {/* Action Menu button */}
                      <td style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(prev => prev === admin.id ? null : admin.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-subtle)',
                            padding: '0.25rem'
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === admin.id && (
                          <div style={{
                            position: 'absolute',
                            right: '2rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-md)',
                            zIndex: 100,
                            minWidth: '130px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                          }}>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onNavigate(`/hotel-admins/${admin.id}`);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.55rem 0.8rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                textAlign: 'left',
                                width: '100%',
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} />
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={() => handleActionClick('Edit Admin', admin.name)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.55rem 0.8rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                textAlign: 'left',
                                width: '100%',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit2 size={12} />
                              <span>Edit Admin</span>
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', fontWeight: '700', marginBottom: '1rem' }}>
                      {searchQuery || filterAssignment !== 'All' || filterHotelId !== 'All'
                        ? 'No hotel administrators match the selected filters.'
                        : 'No hotel administrators found.'}
                    </div>
                    {searchQuery || filterAssignment !== 'All' || filterHotelId !== 'All' ? (
                      <button onClick={handleClearFilters} className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
                        Clear Filters
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Create a hotel administrator account to begin managing restaurant assignments.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, totalItems)} of {totalItems} entries
            </span>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: currentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                const isSelected = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      minWidth: '30px',
                      height: '30px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--primary)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      fontWeight: '800',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
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

    </div>
  );
}

