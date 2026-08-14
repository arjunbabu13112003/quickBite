import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  MapPin, 
  Mail, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Loader2,
  X,
  Search,
  Check
} from 'lucide-react';
import { api } from '../../services/api';

export default function EditHotelAdmin({ id, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Original fetched states
  const [originalAdmin, setOriginalAdmin] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Assignments State
  const [assignments, setAssignments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Cancel discard changes modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Assign Hotel Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allHotels, setAllHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [searchHotelQuery, setSearchHotelQuery] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Remove Assignment Confirmation Modal States
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [targetRemoval, setTargetRemoval] = useState({
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
      
      const adminInfo = {
        name: data.name || '',
        email: data.email || ''
      };

      setFormData(adminInfo);
      setOriginalAdmin(adminInfo);
      setAssignments(data.assignedHotels || []);
    } catch (err) {
      console.error(err);
      if (err.message.includes('404') || err.message.includes('NotFound')) {
        setError('AdminNotFound');
      } else {
        setError('Unable to load hotel administrator details for editing. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Form dirty state check
  const isDirty = originalAdmin ? formData.name !== originalAdmin.name || formData.email !== originalAdmin.email : false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Open Assign Modal and fetch platform hotels
  const openAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingHotels(true);
    try {
      const data = await api.getHotels();
      setAllHotels(data || []);
    } catch (err) {
      console.warn('Failed to load hotels list:', err);
    } finally {
      setLoadingHotels(false);
    }
  };

  // Close Assign Modal
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSearchHotelQuery('');
    setSelectedHotelId('');
    setAllHotels([]);
  };

  // Execute assignment creation (idempotent / reactivate)
  const handleAssignHotelSubmit = async () => {
    if (!selectedHotelId || assigning) return;

    setAssigning(true);
    try {
      await api.assignHotelToAdmin(id, Number(selectedHotelId));
      closeAssignModal();
      alert('Hotel assigned successfully.');
      // Refresh details
      await fetchDetails();
    } catch (err) {
      console.error(err);
      alert(`Assignment failed: ${err.message || 'Server error'}`);
    } finally {
      setAssigning(false);
    }
  };

  // Trigger Remove Assignment Modal
  const triggerRemoveClick = (hotelId, hotelName, assignmentId) => {
    setTargetRemoval({
      hotelId,
      hotelName,
      assignmentId
    });
    setShowRemoveModal(true);
  };

  // Execute Deactivation/Removal
  const handleRemoveConfirm = async () => {
    const { hotelId, assignmentId } = targetRemoval;
    if (!hotelId || !assignmentId) return;

    setRemoving(true);
    try {
      await api.deactivateHotelAdminAssignment(hotelId, assignmentId);
      setShowRemoveModal(false);
      setTargetRemoval({ hotelId: null, hotelName: '', assignmentId: null });
      alert('Hotel assignment removed successfully.');
      await fetchDetails();
    } catch (err) {
      console.error(err);
      alert(`Removal failed: ${err.message || 'Server error'}`);
    } finally {
      setRemoving(false);
    }
  };

  // Cancel details edit
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      onNavigate(`/hotel-admins/${id}`);
    }
  };

  // Validations
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Account details changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isDirty) return;

    setApiError('');
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {};
      if (formData.name.trim() !== originalAdmin.name) payload.name = formData.name.trim();
      if (formData.email.trim() !== originalAdmin.email) payload.email = formData.email.trim();

      await api.updateHotelAdmin(id, payload);
      alert('Hotel administrator updated successfully.');
      onNavigate(`/hotel-admins/${id}`);
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceholderPhoto = () => {
    alert('"Change Photo" functionality is not available yet. Image persistence will be added in a future release.');
  };

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

  // Filter out hotels already assigned
  const availableHotels = allHotels.filter(hotel => {
    const alreadyAssigned = assignments.some(a => Number(a.id) === Number(hotel.id));
    if (alreadyAssigned) return false;

    const query = searchHotelQuery.toLowerCase().trim();
    if (query) {
      return hotel.name?.toLowerCase().includes(query) || hotel.city?.toLowerCase().includes(query);
    }
    return true;
  });

  // --- RENDER LOADING SKELETONS ---

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '260px', height: '28px', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)' }}></div>
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)' }}></div>
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
          The requested administrator account does not exist or has been removed.
        </p>
        <button
          onClick={() => onNavigate('/hotel-admins')}
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
          Load Failure
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {error}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            onClick={() => onNavigate(`/hotel-admins/${id}`)}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
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
      
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--text-subtle)',
            fontWeight: '700'
          }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/hotel-admins')}>Hotel Admins</span>
            <ChevronRight size={12} />
            <span style={{ cursor: 'pointer' }} onClick={() => onNavigate(`/hotel-admins/${id}`)}>{originalAdmin.name}</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--primary)' }}>Edit</span>
          </div>

          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            letterSpacing: '-0.5px',
            marginTop: '0.25rem'
          }}>Edit Hotel Admin</h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
            Manage account details and restaurant assignments for {originalAdmin.name}.
          </p>
        </div>

        {/* Action Buttons in Header */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCancelClick}
            className="btn-secondary"
            style={{
              padding: '0.65rem 1.5rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || !isDirty}
            onClick={handleSubmit}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.75rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-md)',
              gap: '0.5rem',
              minWidth: '135px',
              justifyContent: 'center',
              opacity: !isDirty ? 0.6 : 1,
              cursor: !isDirty ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      {/* Top Level Error Banner */}
      {apiError && (
        <div style={{
          background: 'var(--bg-danger-subtle)',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          color: 'var(--text-danger)',
          fontSize: '0.88rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '1.5rem',
        alignItems: 'flex-start'
      }}>
        
        {/* LEFT COLUMN: Account Details Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            Account Details
          </h3>

          {/* Profile Photo Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '0.5rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1.75rem',
              border: '1px solid var(--border-color)'
            }}>
              {formData.name.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={handlePlaceholderPhoto}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.45rem 1rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              Change Photo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
              Full Name
            </label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: validationErrors.name ? '1px solid #dc2626' : '1px solid var(--border-color)',
                fontSize: '0.88rem',
                outline: 'none',
                background: 'var(--bg-main)',
                fontWeight: '600'
              }}
            />
            {validationErrors.name && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                {validationErrors.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <input 
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: validationErrors.email ? '1px solid #dc2626' : '1px solid var(--border-color)',
                fontSize: '0.88rem',
                outline: 'none',
                background: 'var(--bg-main)',
                fontWeight: '600'
              }}
            />
            {validationErrors.email && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>
                {validationErrors.email}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '855', color: 'var(--text-muted)' }}>
              Role
            </label>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.88rem',
              background: 'var(--bg-main)',
              color: 'var(--text-muted)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'not-allowed'
            }}>
              <Lock size={14} />
              <span>Hotel Admin</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Restaurant Assignments */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                Restaurant Assignments
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Hotels currently managed by this admin.
              </span>
            </div>
            
            <button 
              type="button"
              onClick={openAssignModal}
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
              <span>Assign Another Hotel</span>
            </button>
          </div>

          {/* Assignments Table representation */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Hotel Name</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>City</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Assigned Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      
                      {/* Hotel Name with icon fallback */}
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.75rem'
                          }}>
                            {assignment.name ? assignment.name.charAt(0).toUpperCase() : 'H'}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {assignment.name}
                          </span>
                        </div>
                      </td>

                      {/* City */}
                      <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '650' }}>
                        {assignment.city || '—'}
                      </td>

                      {/* Hotel Status */}
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          background: assignment.hotelIsActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                          color: assignment.hotelIsActive ? 'var(--text-success)' : 'var(--text-danger)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: '800'
                        }}>
                          {assignment.hotelIsActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Assigned Date */}
                      <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {formatDate(assignment.assignedAt)}
                      </td>

                      {/* Remove Button */}
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => triggerRemoveClick(assignment.id, assignment.name, assignment.assignmentId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--accent-rose)',
                            padding: '0.25rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                      No hotels assigned to this administrator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* MODAL 1: Assign Hotel */}
      {showAssignModal && (
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
            maxWidth: '520px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                Assign Hotel
              </h3>
              <button 
                type="button" 
                onClick={closeAssignModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Hotel Search bar */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '0.8rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)'
              }} />
              <input 
                type="text"
                value={searchHotelQuery}
                onChange={(e) => setSearchHotelQuery(e.target.value)}
                placeholder="Search hotel name or city..."
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem 0.5rem 2.2rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* List options box */}
            <div style={{
              maxHeight: '240px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-main)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              {loadingHotels ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="spinner" />
                  <span>Loading platform hotels...</span>
                </div>
              ) : availableHotels.length > 0 ? (
                availableHotels.map((hotel) => {
                  const isSelected = Number(selectedHotelId) === Number(hotel.id);
                  return (
                    <div 
                      key={hotel.id}
                      onClick={() => setSelectedHotelId(hotel.id)}
                      style={{
                        padding: '0.65rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {hotel.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <MapPin size={10} />
                          <span>{hotel.city}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          background: hotel.isActive ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)',
                          color: hotel.isActive ? 'var(--text-success)' : 'var(--text-danger)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '2px',
                          fontSize: '0.65rem',
                          fontWeight: '800'
                        }}>
                          {hotel.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isSelected && <Check size={16} style={{ color: 'var(--primary)' }} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
                  {allHotels.length === 0 ? 'No hotels available for assignment.' : 'No available hotels match your search.'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={assigning}
                onClick={closeAssignModal}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={assigning || !selectedHotelId}
                onClick={handleAssignHotelSubmit}
                className="btn-primary"
                style={{
                  padding: '0.55rem 1.5rem',
                  fontSize: '0.85rem',
                  opacity: !selectedHotelId ? 0.6 : 1,
                  cursor: !selectedHotelId ? 'not-allowed' : 'pointer'
                }}
              >
                {assigning ? 'Assigning...' : 'Assign Hotel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Remove Assignment Confirmation */}
      {showRemoveModal && (
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
              This administrator will no longer have administrative access to <strong>{targetRemoval.hotelName}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  setShowRemoveModal(false);
                  setTargetRemoval({ hotelId: null, hotelName: '', assignmentId: null });
                }}
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
                onClick={handleRemoveConfirm}
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

      {/* MODAL 3: Discard Details Changes Confirmation */}
      {showCancelModal && (
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
            maxWidth: '400px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>Discard Changes?</h3>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              You have unsaved account changes.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
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
                Continue Editing
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onNavigate(`/hotel-admins/${id}`);
                }}
                className="btn-primary"
                style={{
                  padding: '0.65rem 1.75rem',
                  fontSize: '0.88rem',
                  background: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

