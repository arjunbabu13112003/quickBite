import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Search,
  Play,
  HelpCircle,
  Pause,
  XOctagon,
  Eye,
  Copy,
  Archive
} from 'lucide-react';
import { api } from '../../services/api';

export default function PushCampaignsList({ onNavigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [runRecipients, setRunRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchQuery]);

  const fetchCampaigns = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await api.getPushCampaigns();
      setCampaigns(data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch marketing push campaigns.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(() => {
      fetchCampaigns(true);
      // Auto-refresh details modal if open
      if (detailsModalOpen && selectedCampaignDetails) {
        api.getPushCampaign(selectedCampaignDetails.id)
          .then(data => setSelectedCampaignDetails(data))
          .catch(err => console.warn('Failed to refresh details modal:', err));
      }
    }, 15000); // refresh every 15s for status updates
    return () => clearInterval(interval);
  }, [detailsModalOpen, selectedCampaignDetails]);

  const handleSendNow = async (id) => {
    const confirmSend = window.confirm('Are you sure you want to broadcast this campaign now? This will send push notifications to all targeted customers.');
    if (!confirmSend) return;

    setActionLoadingId(id);
    try {
      const idempotencyKey = 'manual_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      await api.sendPushCampaign(id, idempotencyKey);
      alert('Campaign claimed successfully and broadcast initiated.');
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to dispatch campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeRun = async (runId) => {
    const confirmResume = window.confirm('Resume processing this campaign run? Stale processing states will be cleared and pending recipients will be sent.');
    if (!confirmResume) return;

    setActionLoadingId(runId);
    try {
      await api.resumePushCampaignRun(runId);
      alert('Resume process initiated successfully.');
      fetchCampaigns();
      if (selectedCampaignDetails) {
        const freshData = await api.getPushCampaign(selectedCampaignDetails.id);
        setSelectedCampaignDetails(freshData);
      }
    } catch (err) {
      alert(err.message || 'Failed to resume run.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (id) => {
    const confirmPause = window.confirm('Pause this recurring campaign schedule? Future occurrences will not execute.');
    if (!confirmPause) return;

    setActionLoadingId(id);
    try {
      await api.pausePushCampaign(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to pause campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeRecurring = async (id) => {
    const confirmResume = window.confirm('Resume this recurring campaign schedule? It will resume from the next future occurrence.');
    if (!confirmResume) return;

    setActionLoadingId(id);
    try {
      await api.resumeRecurringPushCampaign(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to resume campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (id) => {
    const confirmStop = window.confirm('Stop this recurring campaign recurrence permanently? This action cannot be undone.');
    if (!confirmStop) return;

    setActionLoadingId(id);
    try {
      await api.stopPushCampaignRecurrence(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to stop campaign recurrence.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id) => {
    const confirmArchive = window.confirm('Archive this campaign? It will be hidden from the default active list but remains available in historical audits.');
    if (!confirmArchive) return;

    setActionLoadingId(id);
    try {
      await api.archivePushCampaign(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to archive campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendAgain = async (id) => {
    const confirmClone = window.confirm('Send this campaign again? It will clone the configuration into a new Draft campaign.');
    if (!confirmClone) return;

    setActionLoadingId(id);
    try {
      const cloned = await api.clonePushCampaign(id);
      onNavigate(`/super-admin/push-campaigns/${cloned.id}/edit`);
    } catch (err) {
      alert(err.message || 'Failed to clone campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewDetails = async (id) => {
    setLoading(true);
    try {
      const data = await api.getPushCampaign(id);
      setSelectedCampaignDetails(data);
      setDetailsModalOpen(true);
    } catch (err) {
      alert('Failed to load campaign runs details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this campaign?');
    if (!confirmDelete) return;

    setActionLoadingId(id);
    try {
      await api.deletePushCampaign(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to delete campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSchedule = async (id) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel the schedule for this campaign? The pending run will be marked Cancelled.');
    if (!confirmCancel) return;

    setActionLoadingId(id);
    try {
      await api.cancelPushCampaignSchedule(id);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to cancel campaign schedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckReceipts = async (runId) => {
    setActionLoadingId(runId);
    try {
      const result = await api.checkPushCampaignRunReceipts(runId);
      alert(`Manual check complete. Checked pending receipts.`);
      // Refresh campaign details modal
      if (selectedCampaignDetails) {
        const freshData = await api.getPushCampaign(selectedCampaignDetails.id);
        setSelectedCampaignDetails(freshData);
      }
      // If the expanded run is the current run, reload its recipients list too!
      if (expandedRunId === runId) {
        const details = await api.getPushCampaignRunDetails(runId);
        setRunRecipients(details.recipients || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to check receipts.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpandRun = async (runId) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setRunRecipients([]);
      return;
    }

    setExpandedRunId(runId);
    setRecipientsLoading(true);
    try {
      const details = await api.getPushCampaignRunDetails(runId);
      setRunRecipients(details.recipients || []);
    } catch (err) {
      alert(err.message || 'Failed to load run recipient details.');
      setExpandedRunId(null);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.body.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'Draft':
        return c.status === 'Draft' && !c.isArchived;
      case 'Scheduled':
        return c.status === 'Scheduled/Active' && c.scheduleType === 'LATER' && !c.isArchived;
      case 'Recurring':
        return c.scheduleType === 'REPEAT' && !c.isArchived;
      case 'Sent':
        return c.status === 'Sent' && !c.isArchived;
      case 'Failed':
        return c.status === 'Failed' && !c.isArchived;
      case 'Archived':
        return c.isArchived === true;
      case 'All':
      default:
        return !c.isArchived;
    }
  });

  const totalCampaigns = filteredCampaigns.length;
  const totalPages = Math.ceil(totalCampaigns / pageSize);
  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (c) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '700',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    };

    if (c.isArchived) {
      return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-hover, #f1f5f9)', color: 'var(--text-btn-secondary, #475569)', border: '1px solid var(--border-btn-secondary, #cbd5e1)' }}><Archive size={12} /> Archived</span>;
    }

    if (c.scheduleType === 'REPEAT') {
      const recStatus = c.recurrenceStatus || 'Active';
      if (recStatus === 'Active') {
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-info-subtle, #eff6ff)', color: 'var(--text-info, #2563eb)', border: '1px solid var(--border-info-subtle, #bfdbfe)' }}><RefreshCw size={12} /> Recurring (Active)</span>;
      } else if (recStatus === 'Paused') {
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-warning-badge, #fef3c7)', color: 'var(--text-warning-badge, #d97706)', border: '1px solid var(--border-warning-badge, #fde68a)' }}><Clock size={12} /> Recurring (Paused)</span>;
      } else if (recStatus === 'Stopped') {
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-danger-subtle, #fef2f2)', color: 'var(--text-danger, #dc2626)', border: '1px solid var(--border-danger-subtle, #fecaca)' }}><AlertCircle size={12} /> Recurring (Stopped)</span>;
      } else if (recStatus === 'Completed') {
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-success-subtle, #ecfdf5)', color: 'var(--text-success, #059669)', border: '1px solid var(--border-success-subtle, #a7f3d0)' }}><CheckCircle2 size={12} /> Recurring (Completed)</span>;
      }
    }

    switch (c.status) {
      case 'Draft':
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-hover, #f1f5f9)', color: 'var(--text-btn-secondary, #475569)', border: '1px solid var(--border-btn-secondary, #cbd5e1)' }}><Clock size={12} /> Draft</span>;
      case 'Scheduled':
      case 'Scheduled/Active':
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-info-subtle, #eff6ff)', color: 'var(--text-info, #2563eb)', border: '1px solid var(--border-info-subtle, #bfdbfe)' }}><Clock size={12} /> Scheduled</span>;
      case 'Sending':
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-warning-subtle, #fff7ed)', color: 'var(--text-warning, #ea580c)', border: '1px solid var(--border-warning-subtle, #fed7aa)' }}><RefreshCw size={12} className="spin" /> Sending</span>;
      case 'Sent':
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-success-subtle, #f0fdf4)', color: 'var(--text-success, #16a34a)', border: '1px solid var(--border-success-subtle, #bbf7d0)' }}><CheckCircle2 size={12} /> Sent</span>;
      case 'Failed':
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-danger-subtle, #fef2f2)', color: 'var(--text-danger, #dc2626)', border: '1px solid var(--border-danger-subtle, #fecaca)' }}><AlertCircle size={12} /> Failed</span>;
      default:
        return <span style={{ ...baseStyle, backgroundColor: 'var(--bg-hover, #f1f5f9)', color: 'var(--text-btn-secondary, #475569)', border: '1px solid var(--border-btn-secondary, #cbd5e1)' }}>{c.status}</span>;
    }
  };

  return (
    <div style={{
      padding: '1rem 1.5rem',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 72px)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>Marketing Push Campaigns</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Broadcast promotional notifications and offers to targeted customer groups.</p>
        </div>
        <button
          onClick={() => onNavigate('/super-admin/push-campaigns/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            background: 'var(--primary, #FF6B1A)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: '0 4px 6px -1px rgba(255, 107, 26, 0.2)'
          }}
        >
          <Plus size={16} />
          Create Campaign
        </button>
      </div>

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

      {/* Filters & Search */}
      <div style={{
        backgroundColor: 'var(--bg-card, #fff)',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        marginBottom: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search campaigns by title or body..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>
          <button
            onClick={() => fetchCampaigns()}
            disabled={loading}
            style={{
              padding: '0.6rem',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Pill filters row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', 'Draft', 'Scheduled', 'Recurring', 'Sent', 'Failed', 'Archived'].map(filter => {
            const isActive = selectedFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  border: isActive ? 'none' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: isActive ? 'var(--primary, #FF6B1A)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Container */}
      <div style={{
        backgroundColor: 'var(--bg-card, #fff)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {loading && campaigns.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
            <p>Loading marketing campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Send size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontWeight: '600', margin: 0 }}>No campaigns found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Create a new campaign to broadcast marketing pushes.</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)' }}>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Campaign</th>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Target Segment</th>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Tap Destination</th>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Status / Schedule</th>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Recipient Logs</th>
                  <th style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right', position: 'sticky', top: 0, background: 'var(--bg-subtle, #f8fafc)', zIndex: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCampaigns.map((c) => {
                  const isActionLoading = actionLoadingId === c.id;
                  
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '280px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.8rem', marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
                          {c.body}
                        </div>
                        {c.imageUrl && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.66rem', color: 'var(--primary)' }}>
                            <span>🖼️ Banner URL attached</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={12} color="#94a3b8" />
                          <span>{c.targetAudience.replace('_', ' ')}</span>
                        </div>
                        {c.selectedCity && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '18px' }}>
                            City: <strong style={{ color: 'var(--text-main)' }}>{c.selectedCity}</strong>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                        <span style={{
                          padding: '2px 5px',
                          backgroundColor: 'var(--bg-hover, #f1f5f9)',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          color: 'var(--text-main, #475569)'
                        }}>
                          {c.tapAction}
                        </span>
                        {c.tapActionArgument && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Arg: <code style={{ background: 'var(--bg-hover, #f8fafc)', border: '1px solid var(--border-color, #cbd5e1)', padding: '1px 4px', borderRadius: '3px', color: 'var(--text-main)' }}>{c.tapActionArgument}</code>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                        <div style={{ marginBottom: '4px' }}>{getStatusBadge(c)}</div>
                        {c.scheduleType === 'REPEAT' ? (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            ⏰ Interval: every {c.repeatInterval} {c.repeatPattern === 'DAILY' ? 'days' : 'weeks'}
                          </div>
                        ) : (
                          <>
                            {c.scheduledAt && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                ⏰ {new Date(c.scheduledAt).toLocaleString()}
                              </div>
                            )}
                            {c.sentAt && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                🚀 Sent: {new Date(c.sentAt).toLocaleTimeString()}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.76rem' }}>
                        {c.scheduleType === 'REPEAT' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2' }}>
                            <div>Occurrences: <strong style={{ color: 'var(--text-main)' }}>{c.scheduledOccurrenceCount}</strong></div>
                            {c.nextRunAt && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Next: {new Date(c.nextRunAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : c.stats ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2' }}>
                            <div>Audience: <strong style={{ color: 'var(--text-main)' }}>{c.stats.targetedCount}</strong></div>
                            <div>Submitted: <span style={{ color: '#16a34a', fontWeight: '700' }}>{c.stats.submittedCount}</span></div>
                            <div>Failed: <span style={{ color: '#dc2626', fontWeight: '700' }}>{c.stats.failedCount}</span></div>
                            {c.stats.noTokenCount > 0 && <div>No token: <span style={{ color: '#ea580c' }}>{c.stats.noTokenCount}</span></div>}
                            {c.stats.unknownCount > 0 && <div>Uncertain: <span style={{ color: '#dc2626', fontWeight: '700' }}>{c.stats.unknownCount}</span></div>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending Send</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          
                          {/* View Details/Runs button (All except Draft) */}
                          {c.status !== 'Draft' && (
                            <button
                              onClick={() => handleViewDetails(c.id)}
                              disabled={isActionLoading}
                              title="View Details & Run History"
                              style={{
                                padding: '5px 8px',
                                border: '1px solid var(--border-info-subtle, rgba(59, 130, 246, 0.3))',
                                background: 'var(--bg-info-subtle, rgba(59, 130, 246, 0.12))',
                                borderRadius: '6px',
                                color: 'var(--text-info, #3b82f6)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Eye size={11} />
                              Details
                            </button>
                          )}

                          {/* Send Now Button (Draft / Scheduled only) */}
                          {(c.status === 'Draft' || (c.status === 'Scheduled/Active' && c.scheduleType === 'LATER')) && (
                            <button
                              onClick={() => handleSendNow(c.id)}
                              disabled={isActionLoading}
                              title="Send Broadcast Now"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-success-subtle, rgba(16, 185, 129, 0.12))',
                                border: '1px solid var(--border-success-subtle, rgba(16, 185, 129, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-success, #10b981)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Play size={11} fill="currentColor" />
                              Send
                            </button>
                          )}

                          {/* Pause Recurring Button (Active repeat campaigns only) */}
                          {c.scheduleType === 'REPEAT' && c.recurrenceStatus === 'Active' && (
                            <button
                              onClick={() => handlePause(c.id)}
                              disabled={isActionLoading}
                              title="Pause scheduler occurrences"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-warning-subtle, rgba(245, 158, 11, 0.12))',
                                border: '1px solid var(--border-warning-subtle, rgba(245, 158, 11, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-warning, #fbbf24)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Pause size={11} />
                              Pause
                            </button>
                          )}

                          {/* Resume Recurring Button (Paused repeat campaigns only) */}
                          {c.scheduleType === 'REPEAT' && c.recurrenceStatus === 'Paused' && (
                            <button
                              onClick={() => handleResumeRecurring(c.id)}
                              disabled={isActionLoading}
                              title="Resume scheduler occurrences"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-success-subtle, rgba(16, 185, 129, 0.12))',
                                border: '1px solid var(--border-success-subtle, rgba(16, 185, 129, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-success, #10b981)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Play size={11} />
                              Resume
                            </button>
                          )}

                          {/* Stop Recurring Button (Active or Paused repeat campaigns only) */}
                          {c.scheduleType === 'REPEAT' && ['Active', 'Paused'].includes(c.recurrenceStatus) && (
                            <button
                              onClick={() => handleStop(c.id)}
                              disabled={isActionLoading}
                              title="Permanently terminate recurrence"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.12))',
                                border: '1px solid var(--border-danger-subtle, rgba(239, 68, 68, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-danger, #ef4444)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <XOctagon size={11} />
                              Stop
                            </button>
                          )}

                          {/* Clone / Send Again Button (Sent campaigns only) */}
                          {c.status === 'Sent' && !c.isArchived && (
                            <button
                              onClick={() => handleSendAgain(c.id)}
                              disabled={isActionLoading}
                              title="Send campaign configuration again"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-info-subtle, rgba(59, 130, 246, 0.12))',
                                border: '1px solid var(--border-info-subtle, rgba(59, 130, 246, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-info, #3b82f6)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Copy size={11} />
                              Send Again
                            </button>
                          )}

                          {/* Archive Button (Sent / Failed / Stopped / Completed only) */}
                          {!c.isArchived && (c.status === 'Sent' || c.status === 'Failed' || (c.scheduleType === 'REPEAT' && ['Stopped', 'Completed'].includes(c.recurrenceStatus))) && (
                            <button
                              onClick={() => handleArchive(c.id)}
                              disabled={isActionLoading}
                              title="Archive historical campaign record"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-hover, rgba(100, 116, 139, 0.12))',
                                border: '1px solid var(--border-btn-secondary, rgba(100, 116, 139, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-btn-secondary, #94a3b8)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Archive size={11} />
                              Archive
                            </button>
                          )}

                          {/* Edit Button (Draft/Scheduled only) */}
                          {!c.isArchived && (c.status === 'Draft' || (c.status === 'Scheduled/Active' && c.scheduleType === 'LATER')) && (
                            <button
                              onClick={() => onNavigate(`/super-admin/push-campaigns/${c.id}/edit`)}
                              disabled={isActionLoading}
                              title="Edit Campaign"
                              style={{
                                padding: '5.5px',
                                border: '1px solid var(--border-color, rgba(100, 116, 139, 0.3))',
                                background: 'var(--bg-hover, rgba(100, 116, 139, 0.12))',
                                borderRadius: '6px',
                                color: 'var(--text-main, #e2e8f0)',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          {/* Delete Button (Draft only) */}
                          {!c.isArchived && c.status === 'Draft' && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={isActionLoading}
                              title="Delete Campaign"
                              style={{
                                padding: '5.5px',
                                background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.12))',
                                border: '1px solid var(--border-danger-subtle, rgba(239, 68, 68, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-danger, #ef4444)',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* Cancel Schedule Button (Scheduled only) */}
                          {!c.isArchived && (c.status === 'Scheduled/Active' && c.scheduleType === 'LATER') && (
                            <button
                              onClick={() => handleCancelSchedule(c.id)}
                              disabled={isActionLoading}
                              title="Cancel Schedule"
                              style={{
                                padding: '5px 8px',
                                background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.12))',
                                border: '1px solid var(--border-danger-subtle, rgba(239, 68, 68, 0.3))',
                                borderRadius: '6px',
                                color: 'var(--text-danger, #ef4444)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              <Trash2 size={11} />
                              Cancel
                            </button>
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--bg-subtle, #f8fafc)',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (Total <strong>{totalCampaigns}</strong> campaigns)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    background: 'var(--bg-card, #fff)',
                    color: 'var(--text-main)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontWeight: '700'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    background: 'var(--bg-card, #fff)',
                    color: 'var(--text-main)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontWeight: '700'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Campaign Details & Runs Modal */}
      {detailsModalOpen && selectedCampaignDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card, #fff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            color: 'var(--text-main)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-subtle, #f8fafc)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Campaign Details & Run History</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ID: #{selectedCampaignDetails.id} | {selectedCampaignDetails.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedCampaignDetails(null);
                }}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  color: 'var(--text-muted)'
                }}
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Campaign configuration details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #cbd5e1)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Targeting</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>{selectedCampaignDetails.targetAudience.replace('_', ' ')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Schedule Type</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>{selectedCampaignDetails.scheduleType}</div>
                </div>
                {selectedCampaignDetails.scheduleType === 'REPEAT' && (
                  <>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interval / Timezone</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
                        every {selectedCampaignDetails.repeatInterval} {selectedCampaignDetails.repeatPattern === 'DAILY' ? 'days' : 'weeks'} ({selectedCampaignDetails.timezone})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EndDate / Limit</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
                        {selectedCampaignDetails.endDateType === 'NEVER' && 'Continuous'}
                        {selectedCampaignDetails.endDateType === 'ON_DATE' && `Ends ${new Date(selectedCampaignDetails.endDate).toLocaleDateString()}`}
                        {selectedCampaignDetails.endDateType === 'AFTER_N_SENDS' && `Ends after ${selectedCampaignDetails.endAfterSendsCount} occurrences`}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notifications Sent</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
                    {selectedCampaignDetails.scheduleType === 'REPEAT' ? selectedCampaignDetails.scheduledOccurrenceCount : (selectedCampaignDetails.status === 'Sent' ? 1 : 0)}
                  </div>
                </div>
              </div>

              {/* Notification contents summary */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>Message Body</h4>
                <div style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  backgroundColor: 'transparent'
                }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>{selectedCampaignDetails.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{selectedCampaignDetails.body}</div>
                  {selectedCampaignDetails.tapActionArgument && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontWeight: '600' }}>
                      🔗 Action: {selectedCampaignDetails.tapAction} ({selectedCampaignDetails.tapActionArgument})
                    </div>
                  )}
                </div>
              </div>

              {/* Runs history */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Run Dispatch History</span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--primary, #FF6B1A)',
                    color: '#fff'
                  }}>{selectedCampaignDetails.runs ? selectedCampaignDetails.runs.length : 0} dispatches</span>
                </h4>

                {!selectedCampaignDetails.runs || selectedCampaignDetails.runs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    No runs have been triggered yet for this campaign.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', fontWeight: '700', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 12px' }}>Run ID</th>
                          <th style={{ padding: '8px 12px' }}>Scheduled For</th>
                          <th style={{ padding: '8px 12px' }}>Trigger / Status</th>
                          <th style={{ padding: '8px 12px' }}>Stats Breakdown</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCampaignDetails.runs.map(run => {
                          const isRunStale = run.status === 'Sending' && (Date.now() - new Date(run.heartbeatAt || run.startedAt || run.createdAt).getTime()) > 10 * 60 * 1000;
                          const showResume = run.status === 'Failed' || (run.status === 'Sending' && isRunStale);

                          return (
                            <React.Fragment key={run.id}>
                              <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                                <td style={{ padding: '10px 12px', fontWeight: '700' }}>#{run.id}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                                  {new Date(run.scheduledFor).toLocaleString()}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>{run.triggerType}</span>
                                    <span style={{
                                      fontWeight: '700',
                                      color: run.status === 'Sent' ? '#16a34a' : (run.status === 'Sending' ? '#ea580c' : (run.status === 'Failed' ? '#dc2626' : '#64748b'))
                                    }}>
                                      {run.status} {run.status === 'Sending' && isRunStale && '(Stale)'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {run.status === 'Scheduled' ? (
                                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Pending trigger</span>
                                  ) : run.status === 'Skipped' ? (
                                    <span style={{ color: 'var(--text-danger, #dc2626)', fontSize: '0.8rem' }}>Skipped (Misfire downtime recovery)</span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {/* Dispatch Status Badges */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          fontSize: '0.72rem',
                                          fontWeight: '700',
                                          background: 'rgba(100, 116, 139, 0.1)',
                                          color: 'var(--text-muted, #64748b)',
                                          border: '1px solid var(--border-color, rgba(100, 116, 139, 0.2))'
                                        }}>
                                          Audience: {run.targetedCount}
                                        </span>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          fontSize: '0.72rem',
                                          fontWeight: '700',
                                          background: 'var(--bg-success-subtle, rgba(22, 163, 74, 0.1))',
                                          color: 'var(--text-success, #16a34a)',
                                          border: '1px solid var(--border-success-subtle, rgba(22, 163, 74, 0.2))'
                                        }}>
                                          Sent: {run.submittedCount}
                                        </span>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          fontSize: '0.72rem',
                                          fontWeight: '700',
                                          background: 'var(--bg-danger-subtle, rgba(220, 38, 38, 0.1))',
                                          color: 'var(--text-danger, #dc2626)',
                                          border: '1px solid var(--border-danger-subtle, rgba(220, 38, 38, 0.2))'
                                        }}>
                                          Failed: {run.failedCount}
                                        </span>
                                        {run.noTokenCount > 0 && (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '3px 8px',
                                            borderRadius: '20px',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            background: 'var(--bg-warning-subtle, rgba(234, 88, 12, 0.1))',
                                            color: 'var(--text-warning, #ea580c)',
                                            border: '1px solid var(--border-warning-subtle, rgba(234, 88, 12, 0.2))'
                                          }}>
                                            No Token: {run.noTokenCount}
                                          </span>
                                        )}
                                        {run.unknownCount > 0 && (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '3px 8px',
                                            borderRadius: '20px',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            background: 'var(--bg-danger-subtle, rgba(220, 38, 38, 0.1))',
                                            color: 'var(--text-danger, #dc2626)',
                                            border: '1px solid var(--border-danger-subtle, rgba(220, 38, 38, 0.2))'
                                          }}>
                                            Uncertain: {run.unknownCount}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {(run.status === 'Sent' || run.status === 'Failed') && (
                                        <div style={{ 
                                          borderTop: '1px solid var(--border-color, #e2e8f0)', 
                                          paddingTop: '8px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px'
                                        }} title="Receipt OK means the push provider (FCM/APNs) accepted the notification. It does not guarantee that the device displayed it.">
                                          <div style={{ fontWeight: '800', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Push Receipt Status ℹ️
                                          </div>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              padding: '3px 8px',
                                              borderRadius: '20px',
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              background: 'var(--bg-warning-subtle, rgba(245, 158, 11, 0.1))',
                                              color: 'var(--text-warning, #f59e0b)',
                                              border: '1px solid var(--border-warning-subtle, rgba(245, 158, 11, 0.2))'
                                            }}>
                                              Pending: {run.receiptPendingCount || 0}
                                            </span>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              padding: '3px 8px',
                                              borderRadius: '20px',
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              background: 'var(--bg-success-subtle, rgba(16, 185, 129, 0.1))',
                                              color: 'var(--text-success, #10b981)',
                                              border: '1px solid var(--border-success-subtle, rgba(16, 185, 129, 0.2))'
                                            }}>
                                              Receipt OK: {run.receiptOkCount || 0}
                                            </span>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              padding: '3px 8px',
                                              borderRadius: '20px',
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.1))',
                                              color: 'var(--text-danger, #ef4444)',
                                              border: '1px solid var(--border-danger-subtle, rgba(239, 68, 68, 0.2))'
                                            }}>
                                              Receipt Err: {run.receiptErrorCount || 0}
                                            </span>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              padding: '3px 8px',
                                              borderRadius: '20px',
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              background: 'rgba(148, 163, 184, 0.1)',
                                              color: 'var(--text-muted, #94a3b8)',
                                              border: '1px solid var(--border-color, rgba(148, 163, 184, 0.2))'
                                            }}>
                                              Unavailable: {run.receiptUnavailableCount || 0}
                                            </span>
                                            {run.invalidTokensCount > 0 && (
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: '700',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                color: 'var(--text-info, #8b5cf6)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)'
                                              }}>
                                                Invalid Tokens: {run.invalidTokensCount}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {run.errorMessage && (
                                    <div style={{ color: 'var(--text-danger, #dc2626)', fontSize: '0.75rem', marginTop: '4px', maxWidth: '280px', wordBreak: 'break-word' }}>
                                      Error: {run.errorMessage}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      {run.status !== 'Scheduled' && run.status !== 'Skipped' && (
                                        <button
                                          onClick={() => toggleExpandRun(run.id)}
                                          style={{
                                            padding: '4px 8px',
                                            background: 'var(--bg-subtle, #f8fafc)',
                                            border: '1px solid var(--border-color, #cbd5e1)',
                                            borderRadius: '4px',
                                            color: 'var(--text-main)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          {expandedRunId === run.id ? 'Hide Recipients' : 'View Recipients'}
                                        </button>
                                      )}
                                      {run.receiptPendingCount > 0 && (
                                        <button
                                          onClick={() => handleCheckReceipts(run.id)}
                                          disabled={!!actionLoadingId}
                                          style={{
                                            padding: '4px 8px',
                                            background: 'var(--bg-info-subtle, rgba(59, 130, 246, 0.12))',
                                            border: '1px solid var(--border-info-subtle, rgba(59, 130, 246, 0.3))',
                                            borderRadius: '4px',
                                            color: 'var(--text-info, #3b82f6)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          Check Receipts
                                        </button>
                                      )}
                                      {showResume && (
                                        <button
                                          onClick={() => handleResumeRun(run.id)}
                                          disabled={!!actionLoadingId}
                                          style={{
                                            padding: '4px 8px',
                                            background: 'var(--bg-warning-subtle, rgba(245, 158, 11, 0.12))',
                                            border: '1px solid var(--border-warning-subtle, rgba(245, 158, 11, 0.3))',
                                            borderRadius: '4px',
                                            color: 'var(--text-warning, #fbbf24)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          Resume
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {expandedRunId === run.id && (
                                <tr key={`expanded-${run.id}`} style={{ background: 'var(--bg-subtle, #f8fafc)' }}>
                                  <td colSpan={5} style={{ padding: '12px' }}>
                                    <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '8px', background: 'var(--bg-card, #fff)' }}>
                                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                        Recipient-Level details
                                      </h5>
                                      {recipientsLoading ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                          Loading recipients...
                                        </div>
                                      ) : runRecipients.length === 0 ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                          No recipients recorded for this run.
                                        </div>
                                      ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                                            <thead>
                                              <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                <th style={{ padding: '6px' }}>User ID</th>
                                                <th style={{ padding: '6px' }}>Dispatch Status</th>
                                                <th style={{ padding: '6px' }}>Receipt Status</th>
                                                <th style={{ padding: '6px' }}>Checked Time</th>
                                                <th style={{ padding: '6px' }}>Details / Error</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {runRecipients.map(rec => (
                                                <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                                                  <td style={{ padding: '6px', fontWeight: '600' }}>#{rec.userId}</td>
                                                  <td style={{ padding: '6px' }}>
                                                    <span style={{
                                                      fontWeight: '700',
                                                      color: rec.status === 'submitted' ? '#16a34a' : (rec.status === 'failed' ? '#dc2626' : '#64748b')
                                                    }}>{rec.status}</span>
                                                  </td>
                                                  <td style={{ padding: '6px' }}>
                                                    {rec.receiptStatus ? (
                                                      <span style={{
                                                        fontWeight: '700',
                                                        color: rec.receiptStatus === 'OK' ? '#16a34a' : (rec.receiptStatus === 'ERROR' ? '#dc2626' : '#ea580c')
                                                      }}>{rec.receiptStatus}</span>
                                                    ) : (
                                                      <span style={{ color: 'var(--text-muted)' }}>--</span>
                                                    )}
                                                  </td>
                                                  <td style={{ padding: '6px', color: 'var(--text-muted)' }}>
                                                    {rec.receiptCheckedAt ? new Date(rec.receiptCheckedAt).toLocaleString() : '--'}
                                                  </td>
                                                  <td style={{ padding: '6px', color: rec.receiptErrorCode ? '#dc2626' : 'var(--text-muted)' }}>
                                                    {rec.receiptErrorCode ? `${rec.receiptErrorCode}: ${rec.receiptErrorMessage || ''}` : (rec.errorMessage || '--')}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
