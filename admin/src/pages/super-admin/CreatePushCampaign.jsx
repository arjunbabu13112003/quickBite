import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Users, 
  HelpCircle, 
  AlertCircle, 
  Activity, 
  Calendar,
  Image,
  Link2,
  Upload
} from 'lucide-react';
import { api } from '../../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function CreatePushCampaign({ id, onNavigate }) {
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL_CUSTOMERS');
  const [selectedUserIdsStr, setSelectedUserIdsStr] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [tapAction, setTapAction] = useState('HOME');
  const [tapActionArgument, setTapActionArgument] = useState('');
  const [scheduleType, setScheduleType] = useState('NOW');
  const [scheduledAt, setScheduledAt] = useState('');

  // Repeat fields
  const [repeatPattern, setRepeatPattern] = useState('DAILY');
  const [repeatDays, setRepeatDays] = useState([]);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [sendTime, setSendTime] = useState('18:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [endDateType, setEndDateType] = useState('NEVER');
  const [endDate, setEndDate] = useState('');
  const [endAfterSendsCount, setEndAfterSendsCount] = useState('');

  // Preview audience count
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [hotels, setHotels] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    api.getHotels()
      .then(data => setHotels(data || []))
      .catch(err => console.warn('Failed to load hotels:', err));
  }, []);

  // Load campaign if editing
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.getPushCampaign(id)
        .then(data => {
          setTitle(data.title || '');
          setBody(data.body || '');
          setImageUrl(data.imageUrl || '');
          setTargetAudience(data.targetAudience || 'ALL_CUSTOMERS');
          setSelectedUserIdsStr(data.selectedUserIds ? data.selectedUserIds.join(', ') : '');
          setSelectedCity(data.selectedCity || '');
          setTapAction(data.tapAction || 'HOME');
          setTapActionArgument(data.tapActionArgument || '');
          setScheduleType(data.scheduleType || 'NOW');
          
          if (data.scheduledAt) {
            // Convert UTC to local ISO format for input
            const localDate = new Date(data.scheduledAt);
            const offset = localDate.getTimezoneOffset();
            const adjustedDate = new Date(localDate.getTime() - (offset * 60 * 1000));
            setScheduledAt(adjustedDate.toISOString().slice(0, 16));
          }

          setRepeatPattern(data.repeatPattern || 'DAILY');
          setRepeatDays(data.repeatDays || []);
          setRepeatInterval(data.repeatInterval || 1);
          if (data.startDate) {
            setStartDate(new Date(data.startDate).toISOString().slice(0, 10));
          }
          setSendTime(data.sendTime || '18:00');
          setTimezone(data.timezone || 'Asia/Kolkata');
          setEndDateType(data.endDateType || 'NEVER');
          if (data.endDate) {
            setEndDate(new Date(data.endDate).toISOString().slice(0, 10));
          }
          setEndAfterSendsCount(data.endAfterSendsCount || '');
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load campaign details.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  // Recalculate preview count when targeting fields change
  const triggerAudiencePreview = async () => {
    setPreviewLoading(true);
    setPreviewCount(null);
    try {
      const selectedUserIds = selectedUserIdsStr
        ? selectedUserIdsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : [];
      
      const res = await api.previewPushCampaignAudience({
        targetAudience,
        selectedUserIds,
        selectedCity: selectedCity.trim() || undefined
      });
      setPreviewCount(res.count);
    } catch (err) {
      console.warn('Failed to preview audience size:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    // Debounce preview count fetch
    const delay = setTimeout(() => {
      triggerAudiencePreview();
    }, 800);
    return () => clearTimeout(delay);
  }, [targetAudience, selectedUserIdsStr, selectedCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    // Frontend validations
    if (!title.trim() || !body.trim()) {
      setError('Title and Notification Message are required.');
      return;
    }

    if (targetAudience === 'SELECTED_CUSTOMERS' && !selectedUserIdsStr.trim()) {
      setError('At least one User ID is required for SELECTED_CUSTOMERS audience.');
      return;
    }

    if (targetAudience === 'SELECTED_CITY' && !selectedCity.trim()) {
      setError('City name is required for SELECTED_CITY audience.');
      return;
    }

    if (['RESTAURANT', 'CAMPAIGN'].includes(tapAction) && !tapActionArgument.trim()) {
      setError(`Tap action ${tapAction} requires an ID argument.`);
      return;
    }

    if (scheduleType === 'LATER') {
      if (!scheduledAt) {
        setError('Please specify a valid schedule date and time.');
        return;
      }
      const schedTime = new Date(scheduledAt).getTime();
      if (schedTime <= Date.now()) {
        setError('Scheduled date and time must be in the future.');
        return;
      }
    }

    if (scheduleType === 'REPEAT') {
      if (!startDate) {
        setError('Please specify a start date for the recurrence.');
        return;
      }
      if (!sendTime) {
        setError('Please specify a local send time.');
        return;
      }
      if (!timezone) {
        setError('Please select a timezone.');
        return;
      }
      if (endDateType === 'ON_DATE') {
        if (!endDate) {
          setError('Please specify an end date.');
          return;
        }
        if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
          setError('End date must be after start date.');
          return;
        }
      }
      if (endDateType === 'AFTER_N_SENDS') {
        const sendsVal = parseInt(endAfterSendsCount, 10);
        if (isNaN(sendsVal) || sendsVal <= 0) {
          setError('Please specify a positive number of sends.');
          return;
        }
      }
    }

    // Confirm dialog with exact recipient count resolved on backend
    const countText = previewCount !== null ? `${previewCount} unique customers` : 'targeted customers';
    let confirmMessage = '';
    if (scheduleType === 'NOW') {
      confirmMessage = `This campaign will immediately broadcast push notifications to ${countText}. Are you sure you want to proceed?`;
    } else if (scheduleType === 'LATER') {
      confirmMessage = `This campaign will be scheduled to broadcast notifications to ${countText} at ${new Date(scheduledAt).toLocaleString()}. Are you sure?`;
    } else if (scheduleType === 'REPEAT') {
      confirmMessage = `This campaign will repeat according to the recurrence schedule. Are you sure you want to proceed?`;
    }

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    setSubmitting(true);
    try {
      const selectedUserIds = selectedUserIdsStr
        ? selectedUserIdsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : null;

      const payload = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        targetAudience,
        selectedUserIds: selectedUserIds || undefined,
        selectedCity: selectedCity.trim() || undefined,
        tapAction,
        tapActionArgument: tapActionArgument.trim() || undefined,
        scheduleType,
        scheduledAt: scheduleType === 'LATER' ? new Date(scheduledAt).toISOString() : undefined,
        repeatPattern: scheduleType === 'REPEAT' ? repeatPattern : undefined,
        repeatDays: (scheduleType === 'REPEAT' && ['WEEKLY', 'SELECTED_DAYS'].includes(repeatPattern)) ? repeatDays : undefined,
        repeatInterval: scheduleType === 'REPEAT' ? parseInt(repeatInterval, 10) : undefined,
        startDate: scheduleType === 'REPEAT' ? new Date(startDate).toISOString() : undefined,
        sendTime: scheduleType === 'REPEAT' ? sendTime : undefined,
        timezone: scheduleType === 'REPEAT' ? timezone : undefined,
        endDateType: scheduleType === 'REPEAT' ? endDateType : undefined,
        endDate: (scheduleType === 'REPEAT' && endDateType === 'ON_DATE') ? new Date(endDate).toISOString() : undefined,
        endAfterSendsCount: (scheduleType === 'REPEAT' && endDateType === 'AFTER_N_SENDS') ? parseInt(endAfterSendsCount, 10) : undefined,
      };

      let savedCampaign;
      if (isEdit) {
        savedCampaign = await api.updatePushCampaign(id, payload);
      } else {
        savedCampaign = await api.createPushCampaign(payload);
      }

      // If scheduled type is NOW, we also trigger send immediately
      if (scheduleType === 'NOW') {
        const idempotencyKey = 'now_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        await api.sendPushCampaign(savedCampaign.id, idempotencyKey);
        alert('Campaign saved and broadcast started successfully.');
      } else {
        alert('Campaign saved and scheduled successfully.');
      }

      onNavigate('/super-admin/push-campaigns');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save push campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Loading campaign details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Back link */}
      <button
        onClick={() => onNavigate('/super-admin/push-campaigns')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          fontWeight: '700',
          marginBottom: '1rem',
          padding: 0
        }}
      >
        <ArrowLeft size={16} />
        Back to campaigns
      </button>

      <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
        {isEdit ? 'Edit Campaign' : 'Create Push Campaign'}
      </h1>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#b91c1c',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Campaign info */}
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>1. Campaign Details</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Notification Title</label>
            <input
              type="text"
              placeholder="e.g. Payday deals are here! 🍔"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Notification Body Message</label>
            <textarea
              placeholder="e.g. Get flat 50% discount on your favorite restaurants. Order now!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              style={{
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Optional Banner Image URL (HTTPS)</label>
            <div style={{ position: 'relative' }}>
              <Image size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                placeholder="https://example.com/banner.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attached as promotional inbox banner and push content where supported.</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Upload Banner Image from Laptop</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="campaign-image-upload"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    try {
                      setImageUploading(true);
                      const res = await api.uploadPushCampaignImage(file);
                      if (res && res.filename) {
                        setImageUrl(`${API_BASE_URL}/uploads/campaigns/${res.filename}`);
                      }
                    } catch (err) {
                      alert('Failed to upload image: ' + (err.message || err));
                    } finally {
                      setImageUploading(false);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="campaign-image-upload"
                  style={{
                    padding: '0.65rem 1rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-hover, rgba(100, 116, 139, 0.08))',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={14} />
                  {imageUploading ? 'Uploading...' : 'Choose Image File'}
                </label>
                
                {imageUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={imageUrl}
                      alt="Uploaded Preview"
                      style={{ width: '80px', height: '55px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color, #e2e8f0)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '4px',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience selection */}
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>2. Target Audience</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Audience Segment</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              style={{
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card, #fff)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            >
              <option value="ALL_CUSTOMERS">All Customers</option>
              <option value="SELECTED_CUSTOMERS">Selected Customers (Explicit IDs list)</option>
              <option value="ACTIVE_CUSTOMERS">Active Customers (Last 30 days active)</option>
              <option value="ORDERED_BEFORE">Customers who have ordered before</option>
              <option value="NOT_ORDERED_RECENTLY">Inactive Customers (Ordered, but not recently)</option>
              <option value="SELECTED_CITY">City Targeting</option>
            </select>
          </div>

          {targetAudience === 'SELECTED_CUSTOMERS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>User IDs (Comma separated)</label>
              <input
                type="text"
                placeholder="e.g. 10, 15, 34"
                value={selectedUserIdsStr}
                onChange={(e) => setSelectedUserIdsStr(e.target.value)}
                required
                style={{
                  padding: '0.65rem 0.85rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {targetAudience === 'SELECTED_CITY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>City Name</label>
              <input
                type="text"
                placeholder="e.g. Calicut"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                required
                style={{
                  padding: '0.65rem 0.85rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Live Preview Count badge */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)' }}>
              <Users size={16} />
              <span>Resolved Target Count:</span>
            </div>
            <div>
              {previewLoading ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Calculating...</span>
              ) : previewCount !== null ? (
                <strong style={{ color: 'var(--primary, #FF6B1A)', fontSize: '1rem' }}>{previewCount} customers</strong>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>0 customers</span>
              )}
            </div>
          </div>
        </div>

        {/* Tap Action details */}
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>3. Tap Action (Deep Linking)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Action Destination</label>
            <select
              value={tapAction}
              onChange={(e) => setTapAction(e.target.value)}
              style={{
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card, #fff)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            >
              <option value="HOME">Open QuickBite Home Feed</option>
              <option value="OFFERS">Open Offers Category tab</option>
              <option value="CAMPAIGN">Open Platform Campaign Details Modal</option>
              <option value="RESTAURANT">Open Restaurant Menu Screen</option>
              <option value="ORDERS">Open Customer Orders list</option>
            </select>
          </div>

          {['RESTAURANT', 'CAMPAIGN'].includes(tapAction) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                {tapAction === 'RESTAURANT' ? 'Select Target Restaurant Menu' : 'Platform Campaign ID (Store99)'}
              </label>
              <div style={{ position: 'relative' }}>
                <Link2 size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                {tapAction === 'RESTAURANT' ? (
                  <select
                    value={tapActionArgument}
                    onChange={(e) => setTapActionArgument(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card, #fff)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select a Restaurant...</option>
                    {hotels.map(h => (
                      <option key={h.id} value={String(h.id)}>
                        {h.name} (ID: {h.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. 5"
                    value={tapActionArgument}
                    onChange={(e) => setTapActionArgument(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div style={{
          backgroundColor: 'var(--bg-card, #fff)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>4. Schedule Option</h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="radio"
                name="scheduleType"
                value="NOW"
                checked={scheduleType === 'NOW'}
                onChange={() => setScheduleType('NOW')}
                style={{ accentColor: 'var(--primary)' }}
              />
              Send Broadcast Now
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="radio"
                name="scheduleType"
                value="LATER"
                checked={scheduleType === 'LATER'}
                onChange={() => setScheduleType('LATER')}
                style={{ accentColor: 'var(--primary)' }}
              />
              Schedule for Later
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="radio"
                name="scheduleType"
                value="REPEAT"
                checked={scheduleType === 'REPEAT'}
                onChange={() => setScheduleType('REPEAT')}
                style={{ accentColor: 'var(--primary)' }}
              />
              Repeat (Recurring)
            </label>
          </div>

          {scheduleType === 'LATER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Broadcast Date & Time (UTC Normalized)</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {scheduleType === 'REPEAT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem', borderLeft: '3px solid var(--primary, #FF6B1A)', paddingLeft: '1rem' }}>
              
              {/* Timezone and Start date */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>IANA Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card, #fff)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="UTC">UTC / Coordinated Universal Time</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Time and Pattern */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Send Time (Local)</label>
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    required
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Recurrence Pattern</label>
                  <select
                    value={repeatPattern}
                    onChange={(e) => setRepeatPattern(e.target.value)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card, #fff)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="SELECTED_DAYS">Selected Days</option>
                  </select>
                </div>
              </div>

              {/* Repeat Interval */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Repeat Interval (every N {repeatPattern === 'DAILY' ? 'days' : 'weeks'})
                </label>
                <input
                  type="number"
                  min="1"
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: '120px'
                  }}
                />
              </div>

              {/* Selected Days checkboxes */}
              {['WEEKLY', 'SELECTED_DAYS'].includes(repeatPattern) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Select Days of Week</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const isChecked = repeatDays.includes(day);
                      return (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRepeatDays([...repeatDays, day]);
                              } else {
                                setRepeatDays(repeatDays.filter(d => d !== day));
                              }
                            }}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          {day.slice(0, 3)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End Conditions */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>End Recurrence Option</label>
                  <select
                    value={endDateType}
                    onChange={(e) => setEndDateType(e.target.value)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card, #fff)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="NEVER">Never End (Continuous)</option>
                    <option value="ON_DATE">On Date (Inclusive)</option>
                    <option value="AFTER_N_SENDS">After N Occurrences generated</option>
                  </select>
                </div>

                {endDateType === 'ON_DATE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {endDateType === 'AFTER_N_SENDS' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Number of Occurrences Limit</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={endAfterSendsCount}
                      onChange={(e) => setEndAfterSendsCount(e.target.value)}
                      required
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => onNavigate('/super-admin/push-campaigns')}
            disabled={submitting}
            style={{
              padding: '0.65rem 1.5rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.65rem 1.5rem',
              backgroundColor: 'var(--primary, #FF6B1A)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px -1px rgba(255, 107, 26, 0.2)'
            }}
          >
            {scheduleType === 'NOW' ? <Send size={16} /> : <Save size={16} />}
            {submitting ? 'Processing...' : (scheduleType === 'NOW' ? 'Broadcast Now' : 'Save & Schedule')}
          </button>
        </div>

      </form>
    </div>
  );
}
