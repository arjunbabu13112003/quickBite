import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Upload, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function BrandingAppIcons() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [appIcons, setAppIcons] = useState([]);
  const [editNames, setEditNames] = useState({ CUSTOMER: '', DELIVERY_PARTNER: '' });
  const [expandedAdvanced, setExpandedAdvanced] = useState({ CUSTOMER: false, DELIVERY_PARTNER: false });
  const [transforms, setTransforms] = useState({
    CUSTOMER: { scale: 1.0, offsetX: 0.0, offsetY: 0.0, padding: 0.0 },
    DELIVERY_PARTNER: { scale: 1.0, offsetX: 0.0, offsetY: 0.0, padding: 0.0 }
  });
  const [dragStart, setDragStart] = useState(null);
  const [actionLoading, setActionLoading] = useState({
    CUSTOMER: false,
    DELIVERY_PARTNER: false
  });
  const [isSynced, setIsSynced] = useState({
    CUSTOMER: true,
    DELIVERY_PARTNER: true
  });

  const handleDragStart = (appType, e) => {
    // Prevent default ghost drag
    if (e.cancelable) e.preventDefault();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === undefined) return;

    const currentVal = transforms[appType] || { scale: 1.0, offsetX: 0.0, offsetY: 0.0, padding: 0.0 };
    setDragStart({
      clientX,
      clientY,
      offsetX: currentVal.offsetX,
      offsetY: currentVal.offsetY,
      appType
    });
  };

  const handleDragMove = (e) => {
    if (!dragStart) return;
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === undefined) return;

    const deltaX = clientX - dragStart.clientX;
    const deltaY = clientY - dragStart.clientY;

    const sensitivity = 0.4;
    const newOffsetX = Math.max(-50, Math.min(50, dragStart.offsetX + deltaX * sensitivity));
    const newOffsetY = Math.max(-50, Math.min(50, dragStart.offsetY + deltaY * sensitivity));

    setTransforms(prev => ({
      ...prev,
      [dragStart.appType]: {
        ...prev[dragStart.appType],
        offsetX: Math.round(newOffsetX),
        offsetY: Math.round(newOffsetY)
      }
    }));
  };

  const handleDragEnd = () => {
    setDragStart(null);
  };

  useEffect(() => {
    if (dragStart) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragStart]);

  const fetchBrandingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAppIcons();
      setAppIcons(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load app icon branding configuration from backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandingData();
  }, []);

  useEffect(() => {
    if (appIcons && appIcons.length > 0) {
      const initial = {};
      const initialTransforms = {};
      appIcons.forEach(icon => {
        initial[icon.appType] = icon.pendingAppName || icon.currentAppName || '';
        initialTransforms[icon.appType] = {
          scale: icon.pendingScale !== null && icon.pendingScale !== undefined ? icon.pendingScale : (icon.currentScale ?? 1.0),
          offsetX: icon.pendingOffsetX !== null && icon.pendingOffsetX !== undefined ? icon.pendingOffsetX : (icon.currentOffsetX ?? 0.0),
          offsetY: icon.pendingOffsetY !== null && icon.pendingOffsetY !== undefined ? icon.pendingOffsetY : (icon.currentOffsetY ?? 0.0),
          padding: icon.pendingPadding !== null && icon.pendingPadding !== undefined ? icon.pendingPadding : (icon.currentPadding ?? 0.0)
        };
      });
      setEditNames(prev => ({ ...prev, ...initial }));
      setTransforms(prev => ({ ...prev, ...initialTransforms }));
    }
  }, [appIcons]);

  // Debounced API updates for transform settings
  useEffect(() => {
    const timers = [];
    appIcons.forEach(icon => {
      const appType = icon.appType;
      const currentVal = transforms[appType];
      if (!currentVal) return;

      const dbVal = {
        scale: icon.pendingScale !== null && icon.pendingScale !== undefined ? icon.pendingScale : (icon.currentScale ?? 1.0),
        offsetX: icon.pendingOffsetX !== null && icon.pendingOffsetX !== undefined ? icon.pendingOffsetX : (icon.currentOffsetX ?? 0.0),
        offsetY: icon.pendingOffsetY !== null && icon.pendingOffsetY !== undefined ? icon.pendingOffsetY : (icon.currentOffsetY ?? 0.0),
        padding: icon.pendingPadding !== null && icon.pendingPadding !== undefined ? icon.pendingPadding : (icon.currentPadding ?? 0.0)
      };

      const hasChanged = 
        Math.abs(currentVal.scale - dbVal.scale) > 0.001 ||
        Math.abs(currentVal.offsetX - dbVal.offsetX) > 0.001 ||
        Math.abs(currentVal.offsetY - dbVal.offsetY) > 0.001 ||
        Math.abs(currentVal.padding - dbVal.padding) > 0.001;

      if (hasChanged) {
        setIsSynced(prev => ({ ...prev, [appType]: false }));
        const timer = setTimeout(async () => {
          try {
            const updated = await api.updateTransform(
              appType,
              currentVal.scale,
              currentVal.offsetX,
              currentVal.offsetY,
              currentVal.padding
            );
            setAppIcons(prev => prev.map(item => item.appType === appType ? updated : item));
          } catch (err) {
            console.error('Failed to auto-save transforms:', err);
          }
        }, 500);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [transforms, appIcons]);

  const handleFileUpload = async (appType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-side size validation
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert('File size exceeds the 10MB limit. Please upload a smaller image.');
      return;
    }

    // 2. Client-side type validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file format. Only PNG, JPG, and JPEG files are supported.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const updated = await api.uploadAppIcon(appType, file);
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage(`Icon uploaded and prepared successfully for ${appType === 'CUSTOMER' ? 'Customer App' : 'Delivery Partner App'}.`);
      setIsSynced(prev => ({ ...prev, [appType]: false }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to upload icon.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
      e.target.value = '';
    }
  };

  const handleNotificationUpload = async (appType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-side size validation
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert('File size exceeds the 10MB limit. Please upload a smaller image.');
      return;
    }

    // 2. Client-side type validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file format. Only PNG, JPG, and JPEG files are supported.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const updated = await api.uploadNotificationIcon(appType, file);
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage(`Notification icon uploaded and prepared successfully for ${appType === 'CUSTOMER' ? 'Customer App' : 'Delivery Partner App'}. Rebuild the app to apply it.`);
      setIsSynced(prev => ({ ...prev, [appType]: false }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to upload notification icon.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
      e.target.value = '';
    }
  };

  const handleSaveForNextUpdate = async (appType) => {
    const config = appIcons.find(icon => icon.appType === appType);
    if (!config) return;

    const newName = (editNames[appType] || '').trim();
    if (!newName) {
      alert('App name is required and cannot be empty.');
      return;
    }
    if (newName.length < 2 || newName.length > 30) {
      alert('App name must be between 2 and 30 characters.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const nameChanged = newName !== (config.pendingAppName || config.currentAppName);
      let updated = config;

      if (nameChanged) {
        updated = await api.updateAppName(appType, newName);
      }

      updated = await api.activateAppIconForNextUpdate(appType);
      
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage('Branding prepared successfully. Rebuild the app to apply it.');
      alert('Branding saved for next update and synced to Expo assets successfully!');
      setIsSynced(prev => ({ ...prev, [appType]: true }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
    }
  };

  const handleSaveAppName = async (appType) => {
    const config = appIcons.find(icon => icon.appType === appType);
    if (!config) return;

    const newName = (editNames[appType] || '').trim();
    if (!newName) {
      alert('App name is required and cannot be empty.');
      return;
    }
    if (newName.length < 2 || newName.length > 30) {
      alert('App name must be between 2 and 30 characters.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      let updated = await api.updateAppName(appType, newName);
      updated = await api.activateAppIconForNextUpdate(appType);
      
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage('App name updated and synchronized successfully.');
      setIsSynced(prev => ({ ...prev, [appType]: true }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save app name.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
    }
  };

  const handleDeletePending = async (appType) => {
    if (!confirm('Are you sure you want to cancel the pending icon update? This will remove the uploaded files.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const updated = await api.deletePendingAppIcon(appType);
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage(`Pending icon update discarded for ${appType === 'CUSTOMER' ? 'Customer App' : 'Delivery Partner App'}.`);
      setIsSynced(prev => ({ ...prev, [appType]: true }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to cancel pending icon.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
    }
  };

  const handleMarkCurrent = async (appType) => {
    if (!confirm('Have you successfully rebuilt and deployed the app with the new icon and name? Clicking OK will promote these pending settings to current.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const updated = await api.markAppIconAsCurrent(appType);
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage(`Branding promoted to Current successfully for ${appType === 'CUSTOMER' ? 'Customer App' : 'Delivery Partner App'}.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to promote branding changes.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
    }
  };

  const formatUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  if (loading) {
    return (
      <div style={{
        padding: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            border: '4px solid var(--border-color)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading branding configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <Palette size={28} />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            margin: 0
          }}>App Branding & Icons</h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            fontWeight: '600',
            margin: '0.25rem 0 0'
          }}>Manage launcher and adaptive icons for the QuickBite platform apps</p>
        </div>
      </div>

      {/* Warning / Explanation Box */}
      <div style={{
        background: 'var(--bg-warning-subtle)',
        border: '1px solid var(--border-warning-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        marginBottom: '2.5rem'
      }}>
        <AlertCircle size={22} color="var(--icon-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 0.35rem', fontWeight: '800', color: 'var(--text-warning-heading)', fontSize: '0.95rem' }}>
            Launcher Icon Update Notice
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-warning)', fontWeight: '600', lineHeight: '1.5' }}>
            Android launcher icons are compiled into the native binary assets and <strong>cannot change instantly on already installed devices</strong>.
            New logos uploaded here are prepared with adaptive safe padding and marked as <span style={{ textDecoration: 'underline' }}>Pending Next Update</span>.
            The icon changes will be bundled and automatically deployed with the next native app compilation and store release.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          background: 'var(--bg-danger-subtle)',
          border: '1px solid var(--border-danger-subtle)',
          color: 'var(--text-danger)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'var(--bg-success-subtle)',
          border: '1px solid var(--border-success-subtle)',
          color: 'var(--text-success)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid containing both app configurations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
        gap: '2.5rem'
      }}>
        {['CUSTOMER', 'DELIVERY_PARTNER'].map((appType) => {
          const config = appIcons.find(icon => icon.appType === appType) || {
            appType,
            currentIconUrl: '',
            currentPreparedIconUrl: null,
            pendingIconUrl: null,
            pendingPreparedIconUrl: null,
            status: 'CURRENT'
          };

          const isCustomer = appType === 'CUSTOMER';
          const appName = isCustomer ? 'QuickBite Customer App' : 'QuickBite Delivery Partner';
          const isPending = config.status === 'PENDING_UPDATE';
          const hasDraft = !!config.pendingPreparedIconUrl || !!config.pendingPreparedNotificationIconUrl || !!config.pendingAppName;
          const isAppLoading = actionLoading[appType];
          const nameModified = (editNames[appType] || '').trim() !== (config.pendingAppName || config.currentAppName || '').trim();
          const isDirty = hasDraft || nameModified;

          return (
            <div 
              key={appType}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-md)',
                position: 'relative'
              }}
            >
              {/* Card Loading Overlay */}
              {isAppLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  backdropFilter: 'blur(2px)'
                }}>
                  <div className="spinner" style={{
                    border: '3px solid var(--border-color)',
                    borderTop: '3px solid var(--primary)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
              )}

              {/* Card Header & Status Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem'
              }}>
                <h3 style={{
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  color: 'var(--text-main)',
                  margin: 0
                }}>{appName}</h3>

                {isPending ? (
                  <span style={{
                    background: 'var(--bg-warning-badge)',
                    color: 'var(--text-warning-badge)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid var(--border-warning-badge)'
                  }}>
                    <Clock size={12} style={{ color: 'var(--icon-warning-badge)' }} />
                    Pending Next Update
                  </span>
                ) : (
                  <span style={{
                    background: 'var(--bg-success-subtle)',
                    color: 'var(--text-success)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid var(--border-success-subtle)'
                  }}>
                    <CheckCircle size={12} />
                    Current
                  </span>
                )}
              </div>

              {/* App Name Section */}
              <div style={{
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>CURRENT APP NAME</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>{config.currentAppName || 'None'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>PENDING APP NAME</span>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: '800', 
                      color: config.pendingAppName ? 'var(--text-warning)' : 'var(--text-muted)' 
                    }}>
                      {config.pendingAppName || '(None)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '800', 
                    color: 'var(--text-muted)', 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase'
                  }}>
                    Configure Launcher App Name
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={editNames[appType] || ''} 
                      onChange={(e) => {
                        setEditNames(prev => ({ ...prev, [appType]: e.target.value }));
                        setIsSynced(prev => ({ ...prev, [appType]: false }));
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-input)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        transition: 'all var(--transition-fast)'
                      }}
                      placeholder="Enter launcher name..."
                      disabled={isAppLoading}
                    />
                    {nameModified && (
                      <button
                        onClick={() => handleSaveAppName(appType)}
                        disabled={isAppLoading}
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'var(--primary)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-glow)',
                          transition: 'all var(--transition-fast)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Save Name
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid Comparison for Launcher and Notification Icons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
                
                {/* Row 1: Original Launcher Icon */}
                <div>
                  <h4 style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    margin: '0 0 0.75rem 0',
                    borderLeft: '3px solid var(--primary)',
                    paddingLeft: '0.5rem'
                  }}>1. Original Launcher Icon</h4>
                  <p style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontWeight: '600',
                    marginTop: '-0.25rem',
                    marginBottom: '0.75rem',
                    lineHeight: '1.4'
                  }}>
                    On some Android devices such as Vivo/Funtouch OS, the colored app logo shown in heads-up notifications is derived from the installed Launcher/App icon.
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem'
                  }}>
                    {/* Current Original */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CURRENT</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {config.currentIconUrl ? (
                          <img 
                            src={formatUrl(config.currentIconUrl)} 
                            alt="Current Launcher Icon"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Icon</span>
                        )}
                      </div>
                    </div>

                    {/* Pending Original */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: config.pendingIconUrl ? 'var(--bg-pending)' : 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: config.pendingIconUrl ? '1px solid var(--border-pending)' : '1px dashed var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>NEW UPLOAD</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        border: config.pendingIconUrl ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {config.pendingIconUrl ? (
                          <img 
                            src={formatUrl(config.pendingIconUrl)} 
                            alt="Pending Original Icon"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <HelpCircle size={20} style={{ margin: '0 auto 0.25rem', opacity: '0.5' }} />
                            <span style={{ fontSize: '0.7rem' }}>None</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Android Icon Crop & Padding */}
                <div>
                  <h4 style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    margin: '0 0 0.75rem 0',
                    borderLeft: '3px solid var(--primary)',
                    paddingLeft: '0.5rem'
                  }}>2. Android Icon Crop & Padding</h4>

                  {/* Previews and Controls Container */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    {/* Visual Shape Previews */}
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', textAlign: 'center' }}>LIVE ADAPTIVE PREVIEW SHAPES (DRAG IMAGE TO MOVE)</span>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1.5rem',
                        flexWrap: 'wrap'
                      }}>
                        {/* Circle Mask Preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div 
                            onMouseDown={(e) => handleDragStart(appType, e)}
                            onTouchStart={(e) => handleDragStart(appType, e)}
                            style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '50%',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              overflow: 'hidden',
                              boxShadow: 'var(--shadow-sm)',
                              position: 'relative',
                              cursor: dragStart ? 'grabbing' : 'grab',
                              userSelect: 'none'
                            }}
                          >
                            {(config.pendingIconUrl || config.currentIconUrl) ? (
                              <img 
                                src={formatUrl(config.pendingIconUrl || config.currentIconUrl)} 
                                alt="Adaptive Circle Preview"
                                style={{
                                  width: '150%',
                                  height: '150%',
                                  position: 'absolute',
                                  top: '-25%',
                                  left: '-25%',
                                  objectFit: 'contain',
                                  pointerEvents: 'none',
                                  transform: `translate(${transforms[appType]?.offsetX || 0}px, ${transforms[appType]?.offsetY || 0}px) scale(${(transforms[appType]?.scale || 1) * (1 - (transforms[appType]?.padding || 0))})`,
                                  transition: dragStart ? 'none' : 'transform 0.1s ease-out'
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Icon</div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>Circle</span>
                        </div>

                        {/* Rounded Square Mask Preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div 
                            onMouseDown={(e) => handleDragStart(appType, e)}
                            onTouchStart={(e) => handleDragStart(appType, e)}
                            style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '22px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              overflow: 'hidden',
                              boxShadow: 'var(--shadow-sm)',
                              position: 'relative',
                              cursor: dragStart ? 'grabbing' : 'grab',
                              userSelect: 'none'
                            }}
                          >
                            {(config.pendingIconUrl || config.currentIconUrl) ? (
                              <img 
                                src={formatUrl(config.pendingIconUrl || config.currentIconUrl)} 
                                alt="Adaptive Rounded Preview"
                                style={{
                                  width: '150%',
                                  height: '150%',
                                  position: 'absolute',
                                  top: '-25%',
                                  left: '-25%',
                                  objectFit: 'contain',
                                  pointerEvents: 'none',
                                  transform: `translate(${transforms[appType]?.offsetX || 0}px, ${transforms[appType]?.offsetY || 0}px) scale(${(transforms[appType]?.scale || 1) * (1 - (transforms[appType]?.padding || 0))})`,
                                  transition: dragStart ? 'none' : 'transform 0.1s ease-out'
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Icon</div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>Rounded</span>
                        </div>

                        {/* Safe Zone Grid Square Preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div 
                            onMouseDown={(e) => handleDragStart(appType, e)}
                            onTouchStart={(e) => handleDragStart(appType, e)}
                            style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              overflow: 'hidden',
                              boxShadow: 'var(--shadow-sm)',
                              position: 'relative',
                              cursor: dragStart ? 'grabbing' : 'grab',
                              userSelect: 'none'
                            }}
                          >
                            {(config.pendingIconUrl || config.currentIconUrl) ? (
                              <>
                                <img 
                                  src={formatUrl(config.pendingIconUrl || config.currentIconUrl)} 
                                  alt="Adaptive Square Preview"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    pointerEvents: 'none',
                                    transform: `translate(${transforms[appType]?.offsetX || 0}px, ${transforms[appType]?.offsetY || 0}px) scale(${(transforms[appType]?.scale || 1) * (1 - (transforms[appType]?.padding || 0))})`,
                                    transition: dragStart ? 'none' : 'transform 0.1s ease-out'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: '17px',
                                  left: '17px',
                                  width: '66px',
                                  height: '66px',
                                  borderRadius: '50%',
                                  border: '1px dashed var(--primary)',
                                  pointerEvents: 'none',
                                  opacity: 0.8
                                }} />
                              </>
                            ) : (
                              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Icon</div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>Safe Zone (66%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Editor Controls */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      {/* Zoom Scale Slider */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          <span>ZOOM (SCALE)</span>
                          <span>{Math.round((transforms[appType]?.scale || 1.0) * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.05"
                          value={transforms[appType]?.scale || 1.0}
                          onChange={(e) => setTransforms(prev => ({
                            ...prev,
                            [appType]: { ...prev[appType], scale: parseFloat(e.target.value) }
                          }))}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>

                      {/* Padding Slider */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          <span>PADDING</span>
                          <span>{Math.round((transforms[appType]?.padding || 0.0) * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.0" 
                          max="0.6" 
                          step="0.02"
                          value={transforms[appType]?.padding || 0.0}
                          onChange={(e) => setTransforms(prev => ({
                            ...prev,
                            [appType]: { ...prev[appType], padding: parseFloat(e.target.value) }
                          }))}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>

                      {/* X and Y Position Sliders */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            <span>POSITION X</span>
                            <span>{transforms[appType]?.offsetX || 0}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="-50" 
                            max="50" 
                            step="1"
                            value={transforms[appType]?.offsetX || 0}
                            onChange={(e) => setTransforms(prev => ({
                              ...prev,
                              [appType]: { ...prev[appType], offsetX: parseInt(e.target.value) }
                            }))}
                            style={{ width: '100%', accentColor: 'var(--primary)' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            <span>POSITION Y</span>
                            <span>{transforms[appType]?.offsetY || 0}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="-50" 
                            max="50" 
                            step="1"
                            value={transforms[appType]?.offsetY || 0}
                            onChange={(e) => setTransforms(prev => ({
                              ...prev,
                              [appType]: { ...prev[appType], offsetY: parseInt(e.target.value) }
                            }))}
                            style={{ width: '100%', accentColor: 'var(--primary)' }}
                          />
                        </div>
                      </div>

                      {/* Reset Button */}
                      <button
                        onClick={() => setTransforms(prev => ({
                          ...prev,
                          [appType]: { scale: 1.0, offsetX: 0.0, offsetY: 0.0, padding: 0.0 }
                        }))}
                        type="button"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-btn-secondary)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.4rem',
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          color: 'var(--text-btn-secondary)',
                          cursor: 'pointer',
                          marginTop: '0.25rem',
                          textAlign: 'center',
                          transition: 'all var(--transition-fast)'
                        }}
                        className="hover-card"
                      >
                        Reset Position & Scale
                      </button>
                    </div>

                    <p style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      fontWeight: '600',
                      margin: 0,
                      lineHeight: '1.4',
                      textAlign: 'center'
                    }}>
                      Use zoom, padding and position adjustments to fit the launcher logo inside the primary circular safe area zone. These bounds will be used to generate the finished adaptive icon asset.
                    </p>
                  </div>
                </div>

                {/* Row 3: Notification App Logo */}
                <div>
                  <h4 style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    margin: '0 0 0.75rem 0',
                    borderLeft: '3px solid var(--primary)',
                    paddingLeft: '0.5rem'
                  }}>3. Notification App Logo</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem'
                  }}>
                    {/* Current Notification Popup App Logo */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CURRENT POPUP LOGO</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {config.currentIconUrl ? (
                          <img 
                            src={formatUrl(config.currentIconUrl)} 
                            alt="Current Popup App Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Icon</span>
                        )}
                      </div>
                    </div>

                    {/* Pending Notification Popup App Logo */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: config.pendingIconUrl ? 'var(--bg-pending)' : 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: config.pendingIconUrl ? '1px solid var(--border-pending)' : '1px dashed var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>NEW POPUP LOGO</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        border: config.pendingIconUrl ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {config.pendingIconUrl ? (
                          <img 
                            src={formatUrl(config.pendingIconUrl)} 
                            alt="Pending Popup App Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <HelpCircle size={20} style={{ margin: '0 auto 0.25rem', opacity: '0.5' }} />
                            <span style={{ fontSize: '0.7rem' }}>None</span>
                          </div>
                        )}
                      </div>
                      {config.pendingIconUrl && (
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '800', 
                          color: 'var(--text-warning)', 
                          marginTop: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Pending Rebuild
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontWeight: '600',
                    marginTop: '0.5rem',
                    marginBottom: 0,
                    lineHeight: '1.4'
                  }}>
                    This is the app identity shown in notifications on supported devices. On our tested Vivo/Funtouch device, the launcher/app logo is used for both the heads-up notification logo and notification indicator.
                  </p>
                </div>

                {/* Advanced: Android Notification Small Icon */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  padding: '1.25rem',
                  marginTop: '0.5rem'
                }}>
                  <button
                    onClick={() => setExpandedAdvanced(prev => ({ ...prev, [appType]: !prev[appType] }))}
                    type="button"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-main)',
                      fontWeight: '800',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '3px',
                        height: '14px',
                        background: 'var(--text-muted)',
                        display: 'inline-block'
                      }}></span>
                      Advanced: Android Notification Small Icon
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontWeight: '600'
                    }}>
                      {expandedAdvanced[appType] ? 'Hide Details' : 'Show Settings'}
                    </span>
                  </button>

                  {expandedAdvanced[appType] && (
                    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <p style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        fontWeight: '600',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        This white transparent icon is the native Android notification small-icon resource. Some Android devices may display or tint this icon directly, while devices such as Vivo/Funtouch OS may visually use the app identity logo instead.
                      </p>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1.5rem'
                      }}>
                        {/* Current Prepared Notification Icon */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CURRENT NOTIFICATION</span>
                          <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: '#1a1a24', // dark preview container
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '12px'
                          }}>
                            {config.currentPreparedNotificationIconUrl ? (
                              <img 
                                src={formatUrl(config.currentPreparedNotificationIconUrl)} 
                                alt="Current Notification Icon"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Icon</span>
                            )}
                          </div>
                        </div>

                        {/* Pending Prepared Notification Icon */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          border: '1px dashed var(--border-color)'
                        }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>NEW NOTIFICATION PREVIEW</span>
                          <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '8px',
                            border: config.pendingPreparedNotificationIconUrl ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                            background: '#1a1a24', // dark preview container
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '12px'
                          }}>
                            {config.pendingPreparedNotificationIconUrl ? (
                              <img 
                                src={formatUrl(config.pendingPreparedNotificationIconUrl)} 
                                alt="Pending Prepared Notification Icon"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                <HelpCircle size={20} style={{ margin: '0 auto 0.25rem', opacity: '0.5' }} />
                                <span style={{ fontSize: '0.7rem' }}>None</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dedicated Upload Button for Notification Small Icon */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        marginTop: '0.5rem'
                      }}
                      className="hover-card"
                      >
                        <Upload size={16} />
                        <span>Upload Notification Small Icon</span>
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg" 
                          onChange={(e) => handleNotificationUpload(appType, e)}
                          style={{ display: 'none' }}
                          disabled={isAppLoading}
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>

              {/* Action notice helper */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                marginBottom: '1.5rem',
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                {hasDraft ? (
                  <span style={{ color: 'var(--text-warning)' }}>✓ Changes saved in database. Click "Save for Next Update" to sync changes to Expo build assets.</span>
                ) : (
                  <span>Upload a square logo (PNG/JPG/JPEG, Recommended: 1024x1024px)</span>
                )}
              </div>

              {/* Buttons panel */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: 'auto'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                  {/* Upload Launcher Icon */}
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                  >
                    <Upload size={16} />
                    <span>Upload Launcher Icon</span>
                    <input 
                      type="file" 
                      accept=".png,.jpg,.jpeg" 
                      onChange={(e) => handleFileUpload(appType, e)}
                      style={{ display: 'none' }}
                      disabled={isAppLoading}
                    />
                  </label>
                  
                  {/* Cancel pending icon button */}
                  {hasDraft && (
                    <button
                      onClick={() => handleDeletePending(appType)}
                      disabled={isAppLoading}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-danger-subtle)',
                        background: 'var(--bg-danger-subtle)',
                        color: 'var(--text-danger)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                      title="Discard pending changes"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                 {/* Save button */}
                 {isDirty && !isSynced[appType] && (
                  <button
                    onClick={() => handleSaveForNextUpdate(appType)}
                    disabled={isAppLoading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-glow)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Save size={16} />
                    <span>Save for Next Update</span>
                  </button>
                )}

                {/* Mark Update as Applied button */}
                {isPending && (
                  <button
                    onClick={() => handleMarkCurrent(appType)}
                    disabled={isAppLoading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--text-success)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-glow)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>Mark Update as Applied</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
