import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  Lock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  FileText,
  DollarSignIcon,
  ChevronRight,
  Info,
  Calendar,
  XCircle,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';

export default function PartnerWalletDetails({ partnerId, onNavigate }) {
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings' or 'settlements'

  // Earnings State
  const [earnings, setEarnings] = useState([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState(null);
  const [earningsPage, setEarningsPage] = useState(1);
  const [totalEarningsCount, setTotalEarningsCount] = useState(0);
  const earningsLimit = 10;

  // Settlements State
  const [settlements, setSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [settlementsError, setSettlementsError] = useState(null);

  // Settlement Preview & Creation State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [creatingSettlement, setCreatingSettlement] = useState(false);

  // Settlement Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState(null);
  const [settlementDetails, setSettlementDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'warning' }
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewData(null);
    setPreviewError(null);
  };

  // COD Remittance State
  const [remittances, setRemittances] = useState([]);
  const [loadingRemittances, setLoadingRemittances] = useState(false);
  const [remittancesError, setRemittancesError] = useState(null);

  const [showRemitModal, setShowRemitModal] = useState(false);
  const [remitAmount, setRemitAmount] = useState('');
  const [remitPaymentMethod, setRemitPaymentMethod] = useState('CASH');
  const [remitReference, setRemitReference] = useState('');
  const [remitNotes, setRemitNotes] = useState('');
  const [submittingRemit, setSubmittingRemit] = useState(false);

  const fetchRemittances = async () => {
    setLoadingRemittances(true);
    setRemittancesError(null);
    try {
      const res = await api.getPartnerCodRemittances(partnerId);
      setRemittances(res || []);
    } catch (err) {
      console.error(err);
      setRemittancesError('Failed to load COD remittances.');
    } finally {
      setLoadingRemittances(false);
    }
  };

  const handleConfirmRecordRemittance = async () => {
    if (submittingRemit) return;
    const parsed = parseFloat(remitAmount);
    if (isNaN(parsed) || parsed <= 0) {
      showToast('Please enter a valid positive remittance amount.', 'error');
      return;
    }
    const outstanding = parseFloat(wallet.codOutstanding);
    if (parsed > outstanding) {
      showToast('Remittance amount cannot exceed COD outstanding balance.', 'error');
      return;
    }

    if (!window.confirm(`Record ${formatCurrency(remitAmount)} as COD cash received from this delivery partner?`)) {
      return;
    }

    setSubmittingRemit(true);
    try {
      await api.recordPartnerCodRemittance(partnerId, {
        amount: remitAmount,
        paymentMethod: remitPaymentMethod,
        reference: remitReference,
        notes: remitNotes
      });
      setShowRemitModal(false);
      setRemitAmount('');
      setRemitReference('');
      setRemitNotes('');
      // Refresh summaries
      handleRefreshAll();
      showToast('COD remittance recorded successfully.', 'success');
    } catch (err) {
      console.error(err);
      if (err.message?.includes('exceed') || err.message?.includes('outstanding')) {
        handleRefreshAll();
        showToast('COD outstanding changed. Please review the latest balance and try again.', 'warning');
      } else {
        showToast(err.message || 'Failed to record remittance. Please retry.', 'error');
      }
    } finally {
      setSubmittingRemit(false);
    }
  };

  // --- API FETCHES ---
  
  const fetchWalletSummary = async () => {
    setLoadingWallet(true);
    setWalletError(null);
    try {
      const data = await api.getPartnerWallet(partnerId);
      setWallet(data);
    } catch (err) {
      console.error(err);
      setWalletError('Failed to fetch wallet summary.');
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchEarnings = async (page = earningsPage) => {
    setLoadingEarnings(true);
    setEarningsError(null);
    try {
      const res = await api.getPartnerEarnings(partnerId, page, earningsLimit);
      setEarnings(res.items || []);
      setTotalEarningsCount(res.total || 0);
    } catch (err) {
      console.error(err);
      setEarningsError('Failed to load earnings history.');
    } finally {
      setLoadingEarnings(false);
    }
  };

  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    setSettlementsError(null);
    try {
      const res = await api.getPartnerSettlements(partnerId);
      setSettlements(res || []);
    } catch (err) {
      console.error(err);
      setSettlementsError('Failed to load settlement history.');
    } finally {
      setLoadingSettlements(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
  }, [partnerId]);

  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings(earningsPage);
    } else if (activeTab === 'settlements') {
      fetchSettlements();
    } else if (activeTab === 'cod') {
      fetchRemittances();
    }
  }, [activeTab, earningsPage]);

  const handleRefreshAll = () => {
    fetchWalletSummary();
    if (activeTab === 'earnings') {
      fetchEarnings(earningsPage);
    } else if (activeTab === 'settlements') {
      fetchSettlements();
    } else if (activeTab === 'cod') {
      fetchRemittances();
    }
  };

  // --- SETTLEMENT CREATION FLOW ---

  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
    setLoadingPreview(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const res = await api.getSettlementPreview(partnerId);
      setPreviewData(res);
    } catch (err) {
      console.error(err);
      setPreviewError(err.message || 'Error fetching settlement preview. There may be no eligible earnings.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmCreateSettlement = async () => {
    if (creatingSettlement) return;
    setCreatingSettlement(true);
    try {
      await api.createSettlement(partnerId);
      handleClosePreviewModal();
      // Refresh state
      handleRefreshAll();
      showToast('Settlement created successfully and earnings reserved.', 'success');
    } catch (err) {
      console.error(err);
      if (err.message?.includes('No eligible') || err.message?.includes('No active')) {
        handleClosePreviewModal();
        handleRefreshAll();
        showToast('These earnings have already been reserved in another settlement. Wallet has been refreshed.', 'warning');
      } else {
        showToast(err.message || 'Failed to create settlement. Please refresh.', 'error');
      }
    } finally {
      setCreatingSettlement(false);
    }
  };

  // --- SETTLEMENT ACTIONS FLOW ---

  const handleOpenDetails = async (settlementId) => {
    setShowDetailModal(true);
    setSelectedSettlementId(settlementId);
    setLoadingDetails(true);
    setDetailsError(null);
    setSettlementDetails(null);
    try {
      const res = await api.getSettlementDetails(settlementId);
      setSettlementDetails(res);
    } catch (err) {
      console.error(err);
      setDetailsError('Failed to fetch settlement details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async (statusType) => {
    if (updatingStatus || !settlementDetails) return;
    
    let confirmMsg = '';
    if (statusType === 'processing') confirmMsg = 'Move this settlement to PROCESSING?';
    else if (statusType === 'paid') confirmMsg = 'Confirm that this settlement has been paid externally?';
    else if (statusType === 'failed') confirmMsg = 'Confirm that this settlement has failed?';
    else if (statusType === 'cancelled') confirmMsg = 'Confirm that this settlement has been cancelled?';

    if (!window.confirm(confirmMsg)) return;

    setUpdatingStatus(true);
    try {
      if (statusType === 'processing') {
        await api.startSettlementProcessing(settlementDetails.id);
      } else if (statusType === 'paid') {
        await api.markSettlementPaid(settlementDetails.id);
      } else if (statusType === 'failed') {
        await api.markSettlementFailed(settlementDetails.id);
      } else if (statusType === 'cancelled') {
        await api.cancelSettlement(settlementDetails.id);
      }

      // Reload details and summary
      const updated = await api.getSettlementDetails(settlementDetails.id);
      setSettlementDetails(updated);
      handleRefreshAll();
      showToast('Settlement status updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || `Failed to update status to ${statusType}`, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --- UTILITIES ---

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'AVAILABLE':
      case 'APPROVED':
      case 'PAID':
        return { bg: 'var(--bg-success-subtle)', text: 'var(--text-success)' };
      case 'RESERVED':
      case 'PROCESSING':
      case 'PENDING':
        return { bg: 'var(--bg-warning-subtle)', text: 'var(--text-warning)' };
      case 'SETTLED':
        return { bg: 'var(--bg-primary-subtle)', text: 'var(--primary)' };
      case 'FAILED':
      case 'CANCELLED':
      case 'REVERSED':
      case 'SUSPENDED':
        return { bg: 'var(--bg-danger-subtle)', text: 'var(--text-danger)' };
      default:
        return { bg: 'var(--bg-main)', text: 'var(--text-muted)' };
    }
  };

  const totalEarningsPages = Math.max(1, Math.ceil(totalEarningsCount / earningsLimit));

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Back & Breadcrumb */}
      <div>
        <button
          onClick={() => onNavigate('/super-admin/payments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '700',
            padding: 0,
            marginBottom: '1rem',
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={16} />
          Back to Wallets
        </button>

        {loadingWallet ? (
          <div>
            <div style={{ height: '2rem', width: '200px', background: 'var(--border-color)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite' }}></div>
          </div>
        ) : walletError ? (
          <div style={{ color: 'var(--text-danger)', fontWeight: '600' }}>Error loading partner information</div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                {wallet.name || 'Unnamed Rider'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', fontWeight: '600', display: 'flex', gap: '1rem' }}>
                <span>Partner ID: #{partnerId}</span>
                <span>•</span>
                <span>Mobile: {wallet.mobileNumber || 'N/A'}</span>
              </p>
            </div>
            
            {/* Create Settlement Action */}
            <button
              onClick={handleOpenPreview}
              disabled={parseFloat(wallet.availableBalance) <= 0}
              style={{
                padding: '0.75rem 1.5rem',
                background: parseFloat(wallet.availableBalance) > 0 ? 'var(--primary)' : 'var(--border-color)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: parseFloat(wallet.availableBalance) > 0 ? 'pointer' : 'not-allowed',
                boxShadow: parseFloat(wallet.availableBalance) > 0 ? '0 4px 12px var(--primary-glow)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Create Settlement
            </button>
          </div>
        )}
      </div>

      {loadingWallet ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[...Array(5)].map((_, idx) => (
            <div key={idx} style={{ height: '100px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }}></div>
          ))}
        </div>
      ) : wallet && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>{formatCurrency(wallet.availableBalance)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Eligible for immediate payout</span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Balance</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatCurrency(wallet.pendingBalance)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Future earning allocations</span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reserved Balance</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--warning)' }}>{formatCurrency(wallet.reservedBalance)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Locked in active settlements</span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earnings</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatCurrency(wallet.totalEarnings)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Lifetime gross earnings</span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Settled</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatCurrency(wallet.totalSettled)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Payouts successfully cleared</span>
            </div>

          </div>

          {/* COD Outstanding Separate Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-danger-subtle)', color: 'var(--text-danger)' }}>
                <Info size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Cash On Delivery (COD) Outstanding</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', maxWidth: '800px', fontWeight: '600' }}>
                  COD cash is tracked separately from partner earnings and is not automatically netted from settlements. Remittance by the partner is administered externally.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: '900', color: parseFloat(wallet.codOutstanding) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {formatCurrency(wallet.codOutstanding)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Cash currently held by driver</span>
              </div>
              
              <button
                onClick={() => setShowRemitModal(true)}
                disabled={parseFloat(wallet.codOutstanding) <= 0}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: parseFloat(wallet.codOutstanding) > 0 ? 'var(--primary)' : 'var(--border-color)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: parseFloat(wallet.codOutstanding) > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                Record Remittance
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('earnings')}
              style={{
                padding: '0.75rem 0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'earnings' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'earnings' ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '1rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              Earnings History
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              style={{
                padding: '0.75rem 0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'settlements' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'settlements' ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '1rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              Settlement History
            </button>
            <button
              onClick={() => {
                setActiveTab('cod');
                fetchRemittances();
              }}
              style={{
                padding: '0.75rem 0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'cod' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'cod' ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '1rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              COD Remittance
            </button>
          </div>

          {/* Tab Content */}
          <div>
            
            {activeTab === 'earnings' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {loadingEarnings ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading earnings history...</p>
                  </div>
                ) : earningsError ? (
                  <div style={{ color: 'var(--text-danger)', fontWeight: '600' }}>{earningsError}</div>
                ) : earnings.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>No earnings found for this partner.</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Order #</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Delivered At</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Base Fee</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Distance Fee</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Incentive</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Tip</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Adjustment</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Gross Earning</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.map((e, idx) => {
                            const badge = getStatusBadgeColor(e.status);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                                  #{e.orderNumber || e.orderId || 'N/A'}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {formatDate(e.deliveredAt)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.baseDeliveryFee)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.distanceFee)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.incentive)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.tip)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.adjustment)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                  {formatCurrency(e.grossEarning)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    backgroundColor: badge.bg,
                                    color: badge.text
                                  }}>
                                    {e.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Earnings Pagination */}
                    {totalEarningsCount > earningsLimit && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-main)'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          Page {earningsPage} of {totalEarningsPages}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            disabled={earningsPage === 1}
                            onClick={() => setEarningsPage(p => Math.max(1, p - 1))}
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-main)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              opacity: earningsPage === 1 ? 0.5 : 1
                            }}
                          >
                            Previous
                          </button>
                          <button
                            disabled={earningsPage === totalEarningsPages}
                            onClick={() => setEarningsPage(p => Math.min(totalEarningsPages, p + 1))}
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-main)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              opacity: earningsPage === totalEarningsPages ? 0.5 : 1
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'settlements' ? (
              // Settlements list view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {loadingSettlements ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading settlement history...</p>
                  </div>
                ) : settlementsError ? (
                  <div style={{ color: 'var(--text-danger)', fontWeight: '600' }}>{settlementsError}</div>
                ) : settlements.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>No settlements yet.</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Settlement ID</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Created At</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Net Amount</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Status</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Payment Method</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Paid At</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Reference</th>
                            <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlements.map((s) => {
                            const badge = getStatusBadgeColor(s.status);
                            return (
                              <tr key={s.settlementId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                  #{s.settlementId}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {formatDate(s.createdAt)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--success)' }}>
                                  {formatCurrency(s.amount)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    backgroundColor: badge.bg,
                                    color: badge.text
                                  }}>
                                    {s.status}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {s.paymentMethod}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {s.paidAt ? formatDate(s.paidAt) : '—'}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {s.reference || '—'}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleOpenDetails(s.settlementId)}
                                    style={{
                                      padding: '0.4rem 0.8rem',
                                      background: 'var(--bg-main)',
                                      color: 'var(--text-main)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-md)',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // COD Remittance Handover history panel
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total COD Collected</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatCurrency(wallet.totalCodCollected)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Sum of all COD orders delivered</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Remitted</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>{formatCurrency(wallet.totalCodRemitted)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Deposited cash returned to admin</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COD Outstanding</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: parseFloat(wallet.codOutstanding) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCurrency(wallet.codOutstanding)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Outstanding balance held by driver</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Remittance Handover History</h3>
                    <button
                      onClick={() => setShowRemitModal(true)}
                      disabled={parseFloat(wallet.codOutstanding) <= 0}
                      style={{
                        padding: '0.5rem 1rem',
                        background: parseFloat(wallet.codOutstanding) > 0 ? 'var(--primary)' : 'var(--border-color)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: parseFloat(wallet.codOutstanding) > 0 ? 'pointer' : 'not-allowed',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}
                    >
                      Record Remittance
                    </button>
                  </div>

                  {loadingRemittances ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                      <div className="spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                      <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading remittance records...</p>
                    </div>
                  ) : remittancesError ? (
                    <div style={{ color: 'var(--text-danger)', fontWeight: '600' }}>{remittancesError}</div>
                  ) : remittances.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                      <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>No remittances recorded yet.</p>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Remittance ID</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Handover Date</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Amount</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Method</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Reference</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Recorded By</th>
                              <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {remittances.map((r) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                  #{r.id}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {formatDate(r.createdAt)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--success)' }}>
                                  {formatCurrency(r.amount)}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-color)'
                                  }}>
                                    {r.paymentMethod}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                  {r.reference || '—'}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                  {r.recordedBy}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>
                                  {r.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* --- CREATE SETTLEMENT PREVIEW MODAL --- */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Create Settlement Preview
              </h2>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {loadingPreview ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                  <p style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Querying eligible ledger entries...</p>
                </div>
              ) : previewError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-danger)', fontWeight: '600' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={20} />
                    <span>Preview failed: {previewError}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Eligible earnings may already have been reserved or another transaction is lock-checking. Please refresh.
                  </p>
                </div>
              ) : previewData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {(!previewData.eligibleEarningsCount || parseFloat(previewData.netAmount) <= 0) ? (
                    <div style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-danger-subtle, #f8d7da)',
                      border: '1px solid var(--border-color, #f5c2c7)',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--text-danger, #842029)',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={24} />
                      <span>No eligible earnings available for settlement.</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Eligible Earnings Count</span>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{previewData.eligibleEarningsCount || 0} items</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Gross Earnings</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{formatCurrency(previewData.grossEarningsAmount)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Credit Adjustments</span>
                        <span style={{ fontWeight: '700', color: 'var(--success)' }}>+ {formatCurrency(previewData.creditAdjustmentsAmount)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Debit Adjustments</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-danger)' }}>- {formatCurrency(previewData.debitAdjustmentsAmount)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: '800', fontSize: '1.05rem' }}>Net Settlement Amount</span>
                        <span style={{ fontWeight: '900', color: 'var(--success)', fontSize: '1.25rem' }}>{formatCurrency(previewData.netAmount)}</span>
                      </div>

                      {/* Operational Notes */}
                      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                          <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>Note: </span>
                          This action atomically transitions the included AVAILABLE earnings to RESERVED. No bank transfer is performed in this phase.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-main)' }}>
              <button
                onClick={handleClosePreviewModal}
                disabled={creatingSettlement}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmCreateSettlement}
                disabled={loadingPreview || !!previewError || creatingSettlement || !previewData || !previewData.eligibleEarningsCount || parseFloat(previewData.netAmount) <= 0}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: (loadingPreview || !!previewError || creatingSettlement || !previewData || !previewData.eligibleEarningsCount || parseFloat(previewData.netAmount) <= 0) ? 'var(--border-color)' : 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: (loadingPreview || !!previewError || creatingSettlement || !previewData || !previewData.eligibleEarningsCount || parseFloat(previewData.netAmount) <= 0) ? 'not-allowed' : 'pointer',
                  fontWeight: '800',
                  fontSize: '0.85rem'
                }}
              >
                {creatingSettlement ? 'Creating...' : 'Create Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTLEMENT DETAILS AND TRANSITIONS MODAL --- */}
      {showDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Settlement Details (ID #{selectedSettlementId})
              </h2>
              <button 
                onClick={() => setShowDetailModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', fontWeight: '800' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {loadingDetails ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                  <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading details...</p>
                </div>
              ) : detailsError ? (
                <div style={{ color: 'var(--text-danger)', fontWeight: '600' }}>{detailsError}</div>
              ) : settlementDetails && (
                <>
                  {/* Status Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        backgroundColor: getStatusBadgeColor(settlementDetails.status).bg,
                        color: getStatusBadgeColor(settlementDetails.status).text,
                        width: 'fit-content'
                      }}>
                        {settlementDetails.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Method</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{settlementDetails.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Financial Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Gross Earnings</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>{formatCurrency(settlementDetails.grossEarningsAmount)}</span>
                      </div>
                      <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Credit Adjustments</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.2rem' }}>{formatCurrency(settlementDetails.creditAdjustmentsAmount)}</span>
                      </div>
                      <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Debit Adjustments</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-danger)', marginTop: '0.2rem' }}>{formatCurrency(settlementDetails.debitAdjustmentsAmount)}</span>
                      </div>
                      <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Net Amount</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.2rem' }}>{formatCurrency(settlementDetails.netAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Immutable Settlement Items */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Line Items ({settlementDetails.items?.length || 0})</h3>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0.6rem 0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>Type</th>
                            <th style={{ padding: '0.6rem 0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>Reference / Details</th>
                            <th style={{ padding: '0.6rem 0.8rem', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlementDetails.items?.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.6rem 0.8rem', fontWeight: '700' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: '800',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: item.itemType === 'EARNING' ? 'var(--bg-primary-subtle)' : 'var(--bg-warning-subtle)',
                                  color: item.itemType === 'EARNING' ? 'var(--primary)' : 'var(--text-warning)'
                                }}>
                                  {item.itemType}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {item.itemType === 'EARNING' 
                                  ? `Order #${item.orderNumber || 'Unknown'}` 
                                  : `Adjustment: ${item.adjustmentReason || 'System Adjustment'}`}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                                {formatCurrency(item.amountSnapshot)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transition Actions */}
                  {['PENDING', 'PROCESSING'].includes(settlementDetails.status) && (
                    <div style={{
                      padding: '1.25rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)' }}>Available Administrative Actions</span>
                      
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {settlementDetails.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus('processing')}
                              disabled={updatingStatus}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.6rem 1rem', background: 'var(--primary)', color: '#ffffff',
                                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: '700'
                              }}
                            >
                              <Play size={14} />
                              Start Processing
                            </button>
                            <button
                              onClick={() => handleUpdateStatus('cancelled')}
                              disabled={updatingStatus}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.6rem 1rem', background: 'var(--bg-card)', color: 'var(--text-danger)',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: '700'
                              }}
                            >
                              <XCircle size={14} />
                              Cancel Settlement
                            </button>
                          </>
                        )}

                        {settlementDetails.status === 'PROCESSING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus('paid')}
                              disabled={updatingStatus}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.6rem 1rem', background: 'var(--success)', color: '#ffffff',
                                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: '700'
                              }}
                            >
                              <CheckCircle size={14} />
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleUpdateStatus('failed')}
                              disabled={updatingStatus}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.6rem 1rem', background: 'var(--bg-card)', color: 'var(--text-danger)',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: '700'
                              }}
                            >
                              <XCircle size={14} />
                              Mark Failed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-main)' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record COD Remittance Modal */}
      {showRemitModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Record COD Remittance</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontWeight: '600' }}>
                  Handover for {wallet.name || 'Unnamed Rider'} (Partner #{partnerId})
                </p>
              </div>
              <button 
                onClick={() => setShowRemitModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-danger-subtle, #fff5f5)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Current COD Outstanding</span>
                <span style={{ fontWeight: '900', color: 'var(--danger)', fontSize: '1.25rem' }}>{formatCurrency(wallet.codOutstanding)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remittance Amount (₹)</label>
                    <button
                      onClick={() => setRemitAmount(wallet.codOutstanding)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', padding: 0 }}
                    >
                      Remit Full Amount
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount (e.g. 500.00)"
                    value={remitAmount}
                    onChange={(e) => setRemitAmount(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: '700',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Handover Method</label>
                  <select
                    value={remitPaymentMethod}
                    onChange={(e) => setRemitPaymentMethod(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: '700',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="CASH">CASH (Physical handover)</option>
                    <option value="BANK">BANK (Direct deposit / UPI transfer)</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference / Receipt # (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter reference number"
                    value={remitReference}
                    onChange={(e) => setRemitReference(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Handover Notes (Optional)</label>
                  <textarea
                    placeholder="Enter notes or explanation"
                    value={remitNotes}
                    onChange={(e) => setRemitNotes(e.target.value)}
                    rows={2}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>Disclaimer: </span>
                  This reduces the partner's COD outstanding balance. It does not affect partner earnings.
                </p>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-main)' }}>
              <button
                onClick={() => setShowRemitModal(false)}
                disabled={submittingRemit}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmRecordRemittance}
                disabled={submittingRemit || !remitAmount || parseFloat(remitAmount) <= 0}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: (submittingRemit || !remitAmount || parseFloat(remitAmount) <= 0) ? 'var(--border-color)' : 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: (submittingRemit || !remitAmount || parseFloat(remitAmount) <= 0) ? 'not-allowed' : 'pointer',
                  fontWeight: '800',
                  fontSize: '0.85rem'
                }}
              >
                {submittingRemit ? 'Recording...' : 'Record Remittance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toast.type === 'success' ? 'var(--bg-success-subtle, #d1e7dd)' : 
                      (toast.type === 'warning' ? 'var(--bg-warning-subtle, #fff3cd)' : 'var(--bg-danger-subtle, #f8d7da)'),
          border: `1px solid ${toast.type === 'success' ? 'var(--text-success, #0f5132)' : 
                               (toast.type === 'warning' ? 'var(--text-warning, #664d03)' : 'var(--text-danger, #842029)')}`,
          color: toast.type === 'success' ? 'var(--text-success, #0f5132)' : 
                 (toast.type === 'warning' ? 'var(--text-warning, #664d03)' : 'var(--text-danger, #842029)'),
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '700',
          fontSize: '0.9rem',
          animation: 'qbSlideIn 0.3s ease-out'
        }}>
          <Info size={18} />
          <span>{toast.message}</span>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes qbSlideIn {
              from { transform: translateY(1rem); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
        </div>
      )}

    </div>
  );
}
