import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CreditCard, Eye, Bike, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export default function PartnerWalletsList({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchWallets = async (searchVal = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPartnerWallets(searchVal);
      setWallets(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load partner wallets. Please check NestJS connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchWallets(searchQuery);
  };

  const handleRefresh = () => {
    fetchWallets(searchQuery);
  };

  // --- PAGINATION CALCULATIONS ---
  const totalCount = wallets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedWallets = wallets.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(num);
  };

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCard size={28} className="text-primary" />
            Partner Wallets
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', fontWeight: '600' }}>
            Manage delivery partner ledger balances and manual settlements.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '700',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          background: 'var(--bg-danger-subtle)',
          color: 'var(--text-danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button 
            onClick={() => fetchWallets(searchQuery)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-danger)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: '800'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Filter Bar */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="text"
              placeholder="Search partner by name, mobile, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)'
            }}
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchWallets('');
              }}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{
              border: '4px solid var(--border-color)',
              borderTop: '4px solid var(--primary)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Loading partner wallets...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Bike size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>No delivery partners found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              No wallets exist or match the current search query.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Partner</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Partner ID</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Available</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Pending</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Reserved</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Total Earnings</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>Total Settled</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)' }}>COD Outstanding</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWallets.map((wallet) => (
                  <tr 
                    key={wallet.partnerId} 
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'all var(--transition-fast)' }}
                    className="hover-row"
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{wallet.name || 'Unnamed Rider'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '0.1rem' }}>
                          {wallet.mobileNumber || 'No phone'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                      #{wallet.partnerId}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--success)' }}>
                      {formatCurrency(wallet.availableBalance)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {formatCurrency(wallet.pendingBalance)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--warning)' }}>
                      {formatCurrency(wallet.reservedBalance)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {formatCurrency(wallet.totalEarnings)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {formatCurrency(wallet.totalSettled)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: parseFloat(wallet.codOutstanding) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {formatCurrency(wallet.codOutstanding)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate(`/super-admin/payments/${wallet.partnerId}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.9rem',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--primary-light)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                      >
                        <Eye size={14} />
                        View Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && wallets.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-main)'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalCount)} of {totalCount} partners
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: currentPage === i + 1 ? 'var(--primary)' : 'var(--bg-card)',
                    color: currentPage === i + 1 ? '#ffffff' : 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  opacity: currentPage === totalPages ? 0.5 : 1
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
