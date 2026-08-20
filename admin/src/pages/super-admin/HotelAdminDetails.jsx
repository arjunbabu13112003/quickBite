import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  Edit2, 
  UserCheck, 
  MapPin, 
  Mail, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
  Plus,
  Eye,
  Trash2,
  Lock,
  Info
} from 'lucide-react';
import { api } from '../../services/api';

export default function HotelAdminDetails({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admin, setAdmin] = useState(null);

  // Assignment removal confirmation states
  const [confirmRemove, setConfirmRemove] = useState({
    isOpen: false,
    hotelId: null,
    hotelName: '',
    assignmentId: null
  });
  const [removing, setRemoving] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHotelAdminById(id);
      if (!data) {
        throw new Error('NotFound');
      }
      setAdmin(data);
    } catch (err) {
      console.error(err);
      if (err.message.includes('404') || err.message.includes('NotFound')) {
        setError('AdminNotFound');
      } else {
        setError('Unable to load hotel administrator details. Please verify your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Helpers for placeholder buttons
  const handlePlaceholderAction = (actionName) => {
    alert(`"${actionName}" functionality will be implemented in a future update.`);
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

  // Trigger Remove Assignment Modal
  const triggerRemoveConfirm = (hotelId, hotelName, assignmentId) => {
    setConfirmRemove({
      isOpen: true,
      hotelId,
      hotelName,
      assignmentId
    });
  };

  // Execute Deactivation/Removal
  const handleRemoveAssignment = async () => {
    const { hotelId, assignmentId } = confirmRemove;
    if (!hotelId || !assignmentId) return;

    setRemoving(true);
    try {
      await api.deactivateHotelAdminAssignment(hotelId, assignmentId);
      
      // Close modal and refresh details
      setConfirmRemove({ isOpen: false, hotelId: null, hotelName: '', assignmentId: null });
      alert('Hotel assignment removed successfully.');
      await fetchDetails();
    } catch (err) {
      console.error(err);
      alert(`Removal failed: ${err.message || 'Server error'}`);
    } finally {
      setRemoving(false);
    }
  };

  // --- RENDER LOADING SKELETONS ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '220px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          height: '140px'
        }}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', float: 'left', marginRight: '2rem' }}></div>
          <div className="skeleton" style={{ width: '180px', height: '24px', marginBottom: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '240px', height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-xl)' }}></div>
        </div>
      </div>
    );
  }

  // --- RENDER ERROR STATES ---

  if (error === 'AdminNotFound') {
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
          Hotel Administrator Not Found
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The requested administrator account does not exist or does not hold the hotel admin role.
        </p>
        <button
          onClick={() => onNavigate('/super-admin/hotel-admins')}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Back to Hotel Admins
        </button>
      </div>
    );
  }

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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            onClick={() => onNavigate('/super-admin/hotel-admins')}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Back to List
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
      
      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--text-subtle)',
        fontWeight: '700'
      }}>
        <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/super-admin/hotel-admins')}>Hotel Admins</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>{admin.name}</span>
      </div>

      {/* Main Admin Profile Header Card */}
      <div style={{
        background: 'var(--bg-card)',
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
          {admin.profileImage ? (
            <img 
              src={admin.profileImage} 
              alt={admin.name}
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
            />
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '2rem',
              border: '1px solid var(--border-color)'
            }}>
              {admin.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {admin.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Mail size={14} />
              <span>{admin.email}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: '800'
              }}>
                Hotel Admin
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate(`/super-admin/hotel-admins/${id}/edit`)}
            className="btn-secondary"
            style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.88rem' }}
          >
            <Edit2 size={16} />
            <span>Edit Admin</span>
          </button>
          
          <button
            onClick={() => handlePlaceholderAction('Manage Assignment')}
            className="btn-primary"
            style={{ padding: '0.65rem 1.25rem', gap: '0.5rem', fontSize: '0.88rem' }}
          >
            <UserCheck size={16} />
            <span>Manage Assignment</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Account Information Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} style={{ color: 'var(--primary)' }} />
            <span>Account Information</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{admin.name}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{admin.email}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>Hotel Admin</p>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '800', marginTop: '0.25rem' }}>{formatDate(admin.createdAt)}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Updated</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-subtle)', fontWeight: '600', marginTop: '0.25rem' }}>—</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Assigned Restaurants Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: 'var(--primary)' }} />
              <span>Assigned Restaurants</span>
            </h3>
            
            <button 
              onClick={() => handlePlaceholderAction('Assign Hotel')}
              className="btn-primary"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.78rem',
                fontWeight: '800',
                borderRadius: 'var(--radius-sm)',
                gap: '0.3rem'
              }}
            >
              <Plus size={14} />
              <span>Assign Hotel</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {admin.assignedHotels && admin.assignedHotels.length > 0 ? (
              admin.assignedHotels.map((assignment) => (
                <div 
                  key={assignment.id} 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-main)',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '850',
                      border: '1px solid var(--border-color)'
                    }}>
                      <Building2 size={18} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {assignment.name}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        <MapPin size={12} />
                        <span>{assignment.area ? `${assignment.area}, ` : ''}{assignment.city}</span>
                      </div>

                      {/* Status Badges */}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{
                          background: assignment.hotelIsActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                          color: assignment.hotelIsActive ? 'var(--text-success)' : 'var(--text-danger)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          {assignment.hotelIsActive ? 'Hotel Active' : 'Hotel Inactive'}
                        </span>
                        
                        <span style={{
                          background: assignment.hotelIsOpen ? 'var(--bg-success-subtle)' : 'var(--bg-subtle)',
                          color: assignment.hotelIsOpen ? 'var(--text-success)' : 'var(--text-muted)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          ● {assignment.hotelIsOpen ? 'Store Open' : 'Store Closed'}
                        </span>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0.15rem 0', fontWeight: '600' }}>
                          Assigned: {formatDate(assignment.assignedAt)}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Actions on assigned item */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => onNavigate(`/hotels/${assignment.id}`)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.78rem',
                        color: 'var(--primary)',
                        background: 'none',
                        border: 'none',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      View Hotel
                    </button>

                    <button
                      onClick={() => triggerRemoveConfirm(assignment.id, assignment.name, assignment.assignmentId)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.78rem',
                        color: 'var(--accent-rose)',
                        background: 'none',
                        border: 'none',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}>
                <Building2 size={28} style={{ color: 'var(--text-subtle)' }} />
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '850', color: 'var(--text-main)', marginBottom: '0.2rem' }}>No hotels assigned</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '220px', margin: '0 auto', lineHeight: '1.4' }}>
                    Assign this administrator to a hotel to grant restaurant management access.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Remove Assignment Confirmation Dialog Modal Overlay */}
      {confirmRemove.isOpen && (
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
            background: 'var(--bg-card)',
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
            }}>Remove Hotel Assignment?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              This administrator will no longer have administrative access to <strong>{confirmRemove.hotelName}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={removing}
                onClick={() => setConfirmRemove({ isOpen: false, hotelId: null, hotelName: '', assignmentId: null })}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
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
                disabled={removing}
                onClick={handleRemoveAssignment}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  background: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                }}
              >
                {removing ? 'Removing...' : 'Remove Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

