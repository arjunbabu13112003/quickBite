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
import { api } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function BrandingAppIcons() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [appIcons, setAppIcons] = useState([]);
  const [actionLoading, setActionLoading] = useState({
    CUSTOMER: false,
    DELIVERY_PARTNER: false
  });

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
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to upload icon.');
    } finally {
      setActionLoading(prev => ({ ...prev, [appType]: false }));
      e.target.value = '';
    }
  };

  const handleSaveForNextUpdate = async (appType) => {
    setActionLoading(prev => ({ ...prev, [appType]: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const updated = await api.activateAppIconForNextUpdate(appType);
      setAppIcons(prev => prev.map(icon => icon.appType === appType ? updated : icon));
      setSuccessMessage(`New icon is committed and set as "Pending Next Update" for ${appType === 'CUSTOMER' ? 'Customer App' : 'Delivery Partner App'}.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save configuration.');
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
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to cancel pending icon.');
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
        background: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        marginBottom: '2.5rem'
      }}>
        <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 0.35rem', fontWeight: '800', color: '#92400e', fontSize: '0.95rem' }}>
            Launcher Icon Update Notice
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#b45309', fontWeight: '600', lineHeight: '1.5' }}>
            Android launcher icons are compiled into the native binary assets and <strong>cannot change instantly on already installed devices</strong>.
            New logos uploaded here are prepared with adaptive safe padding and marked as <span style={{ textDecoration: 'underline' }}>Pending Next Update</span>.
            The icon changes will be bundled and automatically deployed with the next native app compilation and store release.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          color: '#ef4444',
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
          background: '#f0fdf4',
          border: '1px solid #dcfce7',
          color: '#16a34a',
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
          const hasDraft = !!config.pendingPreparedIconUrl;
          const isAppLoading = actionLoading[appType];

          return (
            <div 
              key={appType}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
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
                  background: 'rgba(255, 255, 255, 0.75)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  backdropFilter: 'blur(1px)'
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
                    background: '#fff7ed',
                    color: '#c2410c',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid #ffedd5'
                  }}>
                    <Clock size={12} />
                    Pending Next Update
                  </span>
                ) : (
                  <span style={{
                    background: '#f0fdf4',
                    color: '#15803d',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid #dcfce7'
                  }}>
                    <CheckCircle size={12} />
                    Current
                  </span>
                )}
              </div>

              {/* 2x2 Grid Comparison for Original (Row 1) & Prepared (Row 2) */}
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
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgb(0 0 0 / 0.03)'
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
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px dashed var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>NEW UPLOAD</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        border: config.pendingIconUrl ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgb(0 0 0 / 0.03)'
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

                {/* Row 2: Prepared Adaptive Icon */}
                <div>
                  <h4 style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    margin: '0 0 0.75rem 0',
                    borderLeft: '3px solid var(--primary)',
                    paddingLeft: '0.5rem'
                  }}>2. Padded Android Adaptive Icon</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem'
                  }}>
                    {/* Current Prepared */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CURRENT ADAPTIVE</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%', // Circle mask visualizer for Android adaptive
                        border: '1px solid var(--border-color)',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgb(0 0 0 / 0.03)'
                      }}>
                        {config.currentPreparedIconUrl ? (
                          <img 
                            src={formatUrl(config.currentPreparedIconUrl)} 
                            alt="Current Prepared Icon"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Icon</span>
                        )}
                      </div>
                    </div>

                    {/* Pending Prepared */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: '1px dashed var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>NEW ADAPTIVE PREVIEW</span>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%', // Circle mask visualizer for Android adaptive
                        border: config.pendingPreparedIconUrl ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgb(0 0 0 / 0.03)'
                      }}>
                        {config.pendingPreparedIconUrl ? (
                          <img 
                            src={formatUrl(config.pendingPreparedIconUrl)} 
                            alt="Pending Prepared Icon"
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
                  isPending ? (
                    <span style={{ color: '#c2410c' }}>✓ Configuration committed. Icon will be applied with the next app update.</span>
                  ) : (
                    <span style={{ color: 'var(--primary)' }}>Draft prepared. Click "Save for Next Update" to commit changes.</span>
                  )
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
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Upload input trigger */}
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                  >
                    <Upload size={16} />
                    <span>Upload New Icon</span>
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
                        border: '1px solid #fee2e2',
                        background: '#fff5f5',
                        color: '#ef4444',
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
                {hasDraft && !isPending && (
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
                      boxShadow: '0 2px 4px var(--primary-glow)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Save size={16} />
                    <span>Save for Next Update</span>
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
