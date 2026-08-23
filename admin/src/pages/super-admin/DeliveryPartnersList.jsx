import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Search, 
  Filter, 
  RefreshCw, 
  MoreVertical, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  Mail,
  Phone,
  Compass,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function DeliveryPartnersList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partners, setPartners] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerification, setFilterVerification] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAvailability, setFilterAvailability] = useState('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Active dropdown action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeliveryPartners();
      setPartners(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load delivery partners. Please check NestJS connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Close actions dropdown menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterVerification('All');
    setFilterStatus('All');
    setFilterAvailability('All');
    setCurrentPage(1);
  };

  const handleAddPartnerClick = () => {
    onNavigate('/super-admin/delivery-partners/new');
  };

  const handleActionClick = (actionName, partnerName) => {
    alert(`"${actionName}" action for ${partnerName} is not available yet. It will be implemented in a future update.`);
  };

  // --- STATS CALCULATIONS ---
  const totalCount = partners.length;
  const verifiedCount = partners.filter(p => p.isVerified).length;
  const onlineCount = partners.filter(p => p.isOnline).length;
  const availableCount = partners.filter(p => p.isActive && p.isVerified && p.isOnline && p.isAvailable).length;
  const busyCount = partners.filter(p => p.isActive && p.isVerified && p.isOnline && !p.isAvailable).length;

  // --- FILTER & SEARCH IMPLEMENTATION ---
  const filteredPartners = partners.filter(partner => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const name = partner.user?.name?.toLowerCase() || '';
    const email = partner.user?.email?.toLowerCase() || '';
    const phone = partner.phoneNumber?.toLowerCase() || '';
    const vehicleNum = partner.vehicleNumber?.toLowerCase() || '';

    const matchesSearch = !query || 
      name.includes(query) || 
      email.includes(query) || 
      phone.includes(query) || 
      vehicleNum.includes(query);

    // 2. Verification Filter (Account Status)
    let matchesVerification = true;
    const status = partner.accountStatus || (partner.isVerified ? 'APPROVED' : 'PENDING');
    if (filterVerification === 'APPROVED' || filterVerification === 'Verified') {
      matchesVerification = status === 'APPROVED';
    } else if (filterVerification === 'PENDING' || filterVerification === 'Pending') {
      matchesVerification = status === 'PENDING';
    } else if (filterVerification === 'ACTION_REQUIRED') {
      matchesVerification = status === 'ACTION_REQUIRED';
    } else if (filterVerification === 'SUSPENDED') {
      matchesVerification = status === 'SUSPENDED';
    }

    // 3. Status Filter
    let matchesStatus = true;
    if (filterStatus === 'Online') {
      matchesStatus = partner.isOnline === true;
    } else if (filterStatus === 'Offline') {
      matchesStatus = partner.isOnline === false;
    }

    // 4. Availability Filter
    let matchesAvailability = true;
    if (filterAvailability === 'Available') {
      matchesAvailability = partner.isActive && partner.isVerified && partner.isOnline && partner.isAvailable === true;
    } else if (filterAvailability === 'Busy') {
      matchesAvailability = partner.isActive && partner.isVerified && partner.isOnline && partner.isAvailable === false;
    }

    return matchesSearch && matchesVerification && matchesStatus && matchesAvailability;
  });

  // --- PAGINATION CALCULATIONS ---
  const totalFiltered = filteredPartners.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedPartners = filteredPartners.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterVerification, filterStatus, filterAvailability]);

  // --- RENDER BADGES ---
  const renderVerificationBadge = (partner) => {
    const status = partner.accountStatus || (partner.isVerified ? 'APPROVED' : 'PENDING');
    let bg = 'var(--bg-subtle)';
    let color = 'var(--text-muted)';
    let text = 'Unverified / Pending';
    let dotColor = null;

    if (status === 'APPROVED') {
      bg = 'var(--bg-success-subtle)';
      color = 'var(--text-success)';
      text = 'Approved / Verified';
      dotColor = 'var(--text-success)';
    } else if (status === 'ACTION_REQUIRED') {
      bg = 'var(--bg-warning-subtle)';
      color = 'var(--text-warning)';
      text = 'Action Required';
      dotColor = 'var(--text-warning)';
    } else if (status === 'SUSPENDED') {
      bg = 'var(--bg-danger-subtle)';
      color = 'var(--text-danger)';
      text = 'Suspended';
      dotColor = 'var(--text-danger)';
    }

    return (
      <span style={{
        background: bg,
        color: color,
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        fontWeight: '800',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {dotColor && (
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dotColor }}></span>
        )}
        <span>{text}</span>
      </span>
    );
  };

  const renderOnlineBadge = (isOnline) => {
    return (
      <span style={{
        background: isOnline ? 'var(--bg-info-subtle)' : 'var(--bg-subtle)',
        color: isOnline ? 'var(--text-info)' : 'var(--text-muted)',
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        fontWeight: '800',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    );
  };

  const renderAvailabilityBadge = (partner) => {
    if (!partner.isActive || !partner.isVerified || !partner.isOnline) return null;
    const isAvail = partner.isAvailable;
    return (
      <span style={{
        background: isAvail ? 'var(--bg-success-subtle)' : 'var(--bg-warning-subtle)',
        color: isAvail ? 'var(--text-success)' : 'var(--text-warning)',
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        fontWeight: '800',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {isAvail ? 'Available' : 'Busy'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Delivery Partners
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
            Manage delivery partners across the QuickBite platform.
          </p>
        </div>

        <button
          onClick={handleAddPartnerClick}
          className="btn-primary"
          style={{ padding: '0.7rem 1.5rem', gap: '0.5rem', fontWeight: '800' }}
        >
          <span>+ Add Delivery Partner</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        
        {/* Card 1: Verified */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderBottom: '3px solid #137333',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Verified Partners
          </span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>
            {loading ? '—' : verifiedCount.toLocaleString()}
          </span>
        </div>

        {/* Card 2: Online */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderBottom: '3px solid #1a73e8',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Online Partners
          </span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>
            {loading ? '—' : onlineCount.toLocaleString()}
          </span>
        </div>

        {/* Card 3: Available */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderBottom: '3px solid #0f9d58',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Available
          </span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>
            {loading ? '—' : availableCount.toLocaleString()}
          </span>
        </div>

        {/* Card 4: Busy */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderBottom: '3px solid #f4b400',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Busy
          </span>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>
            {loading ? '—' : busyCount.toLocaleString()}
          </span>
        </div>

      </div>

      {/* Filter Row */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)'
            }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner name, phone, vehicle plate..."
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.2rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                outline: 'none',
                fontWeight: '600'
              }}
            />
          </div>

          {/* Verification Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>Status</span>
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                fontWeight: '700',
                outline: 'none'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Unverified / Pending</option>
              <option value="APPROVED">Approved / Verified</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                fontWeight: '700',
                outline: 'none'
              }}
            >
              <option value="All">All Status</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          {/* Availability Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>Availability</span>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                fontWeight: '700',
                outline: 'none'
              }}
            >
              <option value="All">All Availability</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
            </select>
          </div>

        </div>

        {/* Clear Filters Button */}
        {(searchQuery || filterVerification !== 'All' || filterStatus !== 'All' || filterAvailability !== 'All') && (
          <button
            onClick={handleClearFilters}
            className="btn-secondary"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary)',
              borderColor: 'var(--primary-light)'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Grid View / Table */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="skeleton" style={{ height: '70px', width: '100%' }}></div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <AlertTriangle size={42} style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Error Retrieving Partners List
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
            <button
              onClick={fetchPartners}
              className="btn-primary"
              style={{ display: 'inline-flex', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : paginatedPartners.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'var(--bg-main)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Partner</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Vehicle</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPartners.map((partner) => (
                  <tr 
                    key={partner.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s'
                    }}
                    className="table-row-hover"
                  >
                    
                    {/* Partner column */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '850',
                          fontSize: '1rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          {partner.user?.name ? partner.user.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: '850', color: 'var(--text-main)' }}>
                            {partner.user?.name || 'Unassigned User'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            ID: {partner.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact info column */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: '650' }}>
                          <Phone size={12} style={{ color: 'var(--text-subtle)' }} />
                          <span>{partner.phoneNumber || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} style={{ color: 'var(--text-subtle)' }} />
                          <span>{partner.user?.email || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle Type and plate number */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bike size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700' }}>
                          {['BIKE', 'SCOOTER', 'BICYCLE', 'CAR'].includes(partner.vehicleType?.toUpperCase()) ? { 'BIKE': 'Bike', 'SCOOTER': 'Scooter', 'BICYCLE': 'Bicycle', 'CAR': 'Car' }[partner.vehicleType.toUpperCase()] : (partner.vehicleType || '—')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>·</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '800' }}>
                          {partner.vehicleNumber || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Badges Column */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {renderVerificationBadge(partner)}
                        {renderOnlineBadge(partner.isOnline)}
                        {renderAvailabilityBadge(partner)}
                      </div>
                    </td>

                    {/* Actions Menu */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center', position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === partner.id ? null : partner.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '0.25rem'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown menu */}
                      {activeMenuId === partner.id && (
                        <div style={{
                          position: 'absolute',
                          right: '2.5rem',
                          top: '50%',
                          transform: 'translateY(-55%)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 100,
                          minWidth: '120px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onNavigate(`/super-admin/delivery-partners/${partner.id}`);
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
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={12} />
                            <span>View Details</span>
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', alignItems: 'center', justifyCenter: 'center', marginBottom: '1.25rem', justifyContent: 'center' }}>
              <Bike size={28} />
            </div>
            
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {searchQuery || filterVerification !== 'All' || filterStatus !== 'All' || filterAvailability !== 'All'
                ? 'No Delivery Partners Match the Filters'
                : 'No Delivery Partners Registered'}
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
              {searchQuery || filterVerification !== 'All' || filterStatus !== 'All' || filterAvailability !== 'All'
                ? 'Try modifying your search text or resetting status selections to find delivery fleets.'
                : 'Registered delivery fleet accounts will appear here once profiles are created on the platform.'}
            </p>

            {searchQuery || filterVerification !== 'All' || filterStatus !== 'All' || filterAvailability !== 'All' ? (
              <button
                onClick={handleClearFilters}
                className="btn-secondary"
                style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', fontWeight: '800' }}
              >
                Clear Selected Filters
              </button>
            ) : (
              <button
                onClick={handleAddPartnerClick}
                className="btn-primary"
                style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', fontWeight: '800' }}
              >
                + Add Delivery Partner
              </button>
            )}
          </div>
        )}

        {/* Pagination Panel */}
        {!loading && !error && totalFiltered > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--bg-card)'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalFiltered)} of {totalFiltered} delivery partners
            </span>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: currentPage === 1 ? 'var(--text-subtle)' : 'var(--text-main)',
                  fontWeight: '700',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isCurrent ? 'var(--primary)' : '#ffffff',
                      color: isCurrent ? '#ffffff' : 'var(--text-main)',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: currentPage === totalPages ? 'var(--text-subtle)' : 'var(--text-main)',
                  fontWeight: '700',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

