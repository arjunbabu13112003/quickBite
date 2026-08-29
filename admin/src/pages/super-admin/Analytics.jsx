import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart3, Calendar, RefreshCw, ChevronDown, Search, ArrowUpRight, 
  ArrowDownRight, Star, Utensils, Award, TrendingUp, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

export default function Analytics({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters State
  const [hotels, setHotels] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState({ id: '', name: 'All Restaurants' });
  const [dateFilter, setDateFilter] = useState('today'); // 'today', '7days', '30days', 'thisMonth', 'custom'
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  // Dropdown States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Analytics Data State
  const [data, setData] = useState(null);

  const renderChangeIndicator = (change) => {
    if (change === null) {
      return (
        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)' }}>
          New
        </span>
      );
    }
    const isPositive = change >= 0;
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.1rem', 
        fontSize: '0.72rem', 
        fontWeight: '800', 
        color: isPositive ? '#10b981' : '#ef4444' 
      }}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}%
      </span>
    );
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filters (restaurants) on mount
  useEffect(() => {
    api.getHotels()
      .then(res => setHotels(res || []))
      .catch(err => console.error('[Fetch Hotels Error]:', err));
  }, []);

  // Fetch Analytics data helper
  const fetchAnalytics = useCallback(async (showRefreshing = false) => {
    showRefreshing ? setRefreshing(true) : setLoading(true);
    setErrorMsg('');

    // Pre-calculate date range
    const now = new Date();
    let startDate = '';
    let endDate = now.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      startDate = endDate;
    } else if (dateFilter === '7days') {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
    } else if (dateFilter === '30days') {
      const d = new Date();
      d.setDate(now.getDate() - 29);
      startDate = d.toISOString().split('T')[0];
    } else if (dateFilter === 'thisMonth') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = d.toISOString().split('T')[0];
    } else if (dateFilter === 'custom') {
      if (!customRange.start || !customRange.end) {
        setErrorMsg('Please select a custom start and end date.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      startDate = customRange.start;
      endDate = customRange.end;
    }

    try {
      const analyticsPayload = await api.getPlatformAnalytics(
        selectedRestaurant.id || undefined,
        startDate,
        endDate
      );
      setData(analyticsPayload);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurant.id, dateFilter, customRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle manual refresh click
  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  // Pre-calculate date ranges
  const { startDate, endDate } = (() => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];
    if (dateFilter === 'today') {
      start = end;
    } else if (dateFilter === '7days') {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      start = d.toISOString().split('T')[0];
    } else if (dateFilter === '30days') {
      const d = new Date();
      d.setDate(now.getDate() - 29);
      start = d.toISOString().split('T')[0];
    } else if (dateFilter === 'thisMonth') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    } else if (dateFilter === 'custom') {
      start = customRange.start;
      end = customRange.end;
    }
    return { startDate: start, endDate: end };
  })();

  // Filtered hotel list for dropdown search
  const filteredHotels = hotels.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── HEADER & GLOBAL FILTERS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Analytics</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Monitor platform performance and restaurant-level insights.
          </p>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Restaurant Search Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', width: '220px' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {selectedRestaurant.name}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
            </button>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
                maxHeight: '300px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={14} style={{ color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="Search restaurant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '0.8rem',
                      width: '100%',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <button
                    onClick={() => {
                      setSelectedRestaurant({ id: '', name: 'All Restaurants' });
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      textAlign: 'left',
                      background: selectedRestaurant.id === '' ? 'var(--bg-hover)' : 'transparent',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: selectedRestaurant.id === '' ? '800' : '600',
                      color: selectedRestaurant.id === '' ? 'var(--primary)' : 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    All Restaurants
                  </button>
                  {filteredHotels.map(h => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedRestaurant({ id: h.id, name: h.name });
                        setIsDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 1rem',
                        textAlign: 'left',
                        background: selectedRestaurant.id === h.id ? 'var(--bg-hover)' : 'transparent',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: selectedRestaurant.id === h.id ? '800' : '600',
                        color: selectedRestaurant.id === h.id ? 'var(--primary)' : 'var(--text-main)',
                        cursor: 'pointer',
                      }}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Picker Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.5rem' }}>
            <Calendar size={16} style={{ color: 'var(--text-subtle)', marginLeft: '0.25rem' }} />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                padding: '0.35rem 0.5rem',
                cursor: 'pointer'
              }}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--text-main)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── LOADER / ERROR MSG / EMPTY STATE ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: '110px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', animation: 'pulse 1.5s infinite ease-in-out' }} />)}
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, height: '350px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-xl)' }} />
            <div style={{ flex: 1, height: '350px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-xl)' }} />
          </div>
        </div>
      ) : errorMsg ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--text-danger)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Error Loading Analytics</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0', maxWidth: '400px' }}>{errorMsg}</p>
          <button onClick={handleRefresh} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}>Retry Request</button>
        </div>
      ) : !data || data.metrics.totalOrders.value === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <BarChart3 size={48} style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>No Analytics Available</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
            No analytics available for this period.
          </p>
        </div>
      ) : (
        <>
          {/* ── TOP METRIC CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            
            {/* 1. Total Revenue */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)' }}>₹{data.metrics.totalRevenue.value.toLocaleString('en-IN')}</span>
                {renderChangeIndicator(data.metrics.totalRevenue.change)}
              </div>
            </div>

            {/* 2. Total Orders */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)' }}>{data.metrics.totalOrders.value.toLocaleString('en-IN')}</span>
                {renderChangeIndicator(data.metrics.totalOrders.change)}
              </div>
            </div>

            {/* 3. Avg Order Value */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Order Value</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)' }}>₹{Math.round(data.metrics.avgOrderValue.value)}</span>
                {renderChangeIndicator(data.metrics.avgOrderValue.change)}
              </div>
            </div>

            {/* 4. Completed Orders */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed Orders</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)' }}>{data.metrics.completedOrders.value.toLocaleString('en-IN')}</span>
                  {renderChangeIndicator(data.metrics.completedOrders.change)}
                </div>
                {/* Visual completion progress bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                  <div style={{ width: `${data.metrics.completedOrders.rate}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                </div>
              </div>
            </div>

            {/* 5. Customer Rating */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Rating</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {data.metrics.customerRating.value} <Star size={20} fill="#f59e0b" color="#f59e0b" />
                </span>
                {renderChangeIndicator(data.metrics.customerRating.change)}
              </div>
            </div>

          </div>

          {/* ── REVENUE TREND & ORDER STATUS CHARTS SPLIT ── */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Interactive Trend Chart */}
            <TrendChart trendRaw={data.trendData} startDate={startDate} endDate={endDate} />

            {/* Donut Status Chart */}
            <StatusDonut statusData={data.statusData} totalOrders={data.metrics.totalOrders.value} />

          </div>

          {/* ── TOP ITEMS & PERFORMANCE TABLES SPLIT ── */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* Top Selling Items Table */}
            <TopSellingItems items={data.topItems} isSingleRestaurant={!!selectedRestaurant.id} />

            {/* Restaurant Performance Table (rendered only in platform-wide mode) */}
            {!selectedRestaurant.id && (
              <RestaurantPerformance list={data.performanceData} onSelectRestaurant={(id, name) => {
                setSelectedRestaurant({ id, name });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
            )}

          </div>
        </>
      )}
    </div>
  );
}

// ─── INTERACTIVE SVG TREND CHART MODULE ─────────────────────────────────────
function TrendChart({ trendRaw, startDate, endDate }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const points = (() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dataMap = {};
    (trendRaw || []).forEach(item => {
      const k = new Date(item.dateStr).toISOString().split('T')[0];
      dataMap[k] = item;
    });

    const list = [];
    let curr = new Date(start);
    while (curr <= end) {
      const k = curr.toISOString().split('T')[0];
      const item = dataMap[k];
      const dateLabel = curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      list.push({
        dateStr: k,
        label: dateLabel,
        revenue: item ? parseFloat(item.revenue || 0) : 0,
        orders: item ? parseInt(item.ordersCount || 0, 10) : 0
      });
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  })();

  const padding = { top: 20, right: 30, bottom: 40, left: 55 };
  const width = 640;
  const height = 260;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max calculations
  const maxRevenue = Math.max(...points.map(p => p.revenue), 100);
  const maxOrders = Math.max(...points.map(p => p.orders), 10);

  // Line coordinate strings
  const revenuePoints = points.map((p, idx) => {
    const x = padding.left + (idx * (chartWidth / (points.length - 1 || 1)));
    const y = padding.top + chartHeight - (p.revenue / maxRevenue) * chartHeight;
    return `${x},${y}`;
  });

  const linePath = revenuePoints.join(' ');
  const areaPath = points.length > 0 
    ? `M ${padding.left},${padding.top + chartHeight} L ${linePath} L ${padding.left + chartWidth},${padding.top + chartHeight} Z` 
    : '';

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding.left;
    if (points.length === 0) return;
    const step = chartWidth / (points.length - 1 || 1);
    let idx = Math.round(mouseX / step);
    if (idx < 0) idx = 0;
    if (idx >= points.length) idx = points.length - 1;
    
    const pt = points[idx];
    setHoveredPoint(pt);
    
    const x = padding.left + idx * step;
    const y = padding.top + chartHeight - (pt.revenue / maxRevenue) * chartHeight;
    setTooltipPos({ x, y: y - 10 });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div style={{ flex: 2, minWidth: '320px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '0.98rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Revenue & Orders Trend</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: '750' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            Revenue
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(2, 132, 199, 0.4)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'rgba(2, 132, 199, 0.4)', display: 'inline-block' }} />
            Orders
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          width="100%" 
          height="100%" 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ overflow: 'visible', cursor: 'crosshair' }}
        >
          {/* Gradients definitions */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
            const y = padding.top + val * chartHeight;
            return (
              <g key={idx}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={padding.left + chartWidth} 
                  y2={y} 
                  stroke="var(--border-color)" 
                  strokeWidth="0.8" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={padding.left - 10} 
                  y={y + 4} 
                  fill="var(--text-subtle)" 
                  fontSize="9px" 
                  fontWeight="600"
                  textAnchor="end"
                >
                  ₹{Math.round((1 - val) * maxRevenue).toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            // Render only select labels depending on size to prevent overlaps
            const step = Math.ceil(points.length / 7);
            if (idx % step !== 0 && idx !== points.length - 1) return null;
            const x = padding.left + (idx * (chartWidth / (points.length - 1 || 1)));
            return (
              <text 
                key={idx} 
                x={x} 
                y={padding.top + chartHeight + 18} 
                fill="var(--text-subtle)" 
                fontSize="9.5px" 
                fontWeight="700"
                textAnchor="middle"
              >
                {p.label}
              </text>
            );
          })}

          {/* Orders Bars */}
          {points.map((p, idx) => {
            const xStep = chartWidth / (points.length - 1 || 1);
            const barWidth = Math.max(xStep * 0.4, 6);
            const x = padding.left + (idx * xStep) - (barWidth / 2);
            const barHeight = (p.orders / maxOrders) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="rgba(2, 132, 199, 0.15)"
                stroke="rgba(2, 132, 199, 0.3)"
                strokeWidth="1"
                rx="1"
              />
            );
          })}

          {/* Revenue Area & Line Path */}
          {points.length > 1 && (
            <>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
            </>
          )}

          {/* Interactive Tooltip Hover Line */}
          {hoveredPoint && (
            (() => {
              const idx = points.indexOf(hoveredPoint);
              const x = padding.left + idx * (chartWidth / (points.length - 1 || 1));
              return (
                <line 
                  x1={x} 
                  y1={padding.top} 
                  x2={x} 
                  y2={padding.top + chartHeight} 
                  stroke="var(--primary)" 
                  strokeWidth="1.5" 
                  strokeDasharray="2 2"
                />
              );
            })()
          )}
        </svg>

        {/* Hover Tooltip Render */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            left: `${(tooltipPos.x / width) * 100}%`,
            top: `${(tooltipPos.y / height) * 100}%`,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.75rem',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            minWidth: '100px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '850', color: 'var(--text-muted)' }}>{hoveredPoint.label}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: '900', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>Revenue:</span>
              <span>₹{hoveredPoint.revenue.toLocaleString('en-IN')}</span>
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: '900', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>Orders:</span>
              <span>{hoveredPoint.orders}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SVG STATUS DONUT CHART MODULE ──────────────────────────────────────────
function StatusDonut({ statusData, totalOrders }) {
  const config = {
    placed:           { label: 'Placed',           color: '#ff5520' },
    accepted:         { label: 'Accepted',         color: '#3b82f6' },
    preparing:        { label: 'Preparing',        color: '#f59e0b' },
    ready_for_pickup: { label: 'Ready for Pickup', color: '#8b5cf6' },
    picked_up:        { label: 'Out for Delivery', color: '#0ea5e9' },
    out_for_delivery: { label: 'Out for Delivery', color: '#0ea5e9' },
    delivered:        { label: 'Delivered',        color: '#10b981' },
    cancelled:        { label: 'Cancelled',        color: '#ef4444' },
    rejected:         { label: 'Rejected',         color: '#7f1d1d' },
  };

  // Group similar states for clean summary presentation
  const grouped = {};
  (statusData || []).forEach(item => {
    const statusKey = item.status;
    const mapped = config[statusKey] || { label: statusKey, color: '#94a3b8' };
    const label = mapped.label;
    if (!grouped[label]) {
      grouped[label] = { label, count: 0, color: mapped.color };
    }
    grouped[label].count += parseInt(item.count || 0, 10);
  });

  const segments = Object.values(grouped)
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);

  // SVG calculations
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~314.16

  let accumulatedPercent = 0;

  return (
    <div style={{ flex: 1, minWidth: '280px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
      <h2 style={{ fontSize: '0.98rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Order Status</h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* SVG Circle Render */}
        <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" width="100%" height="100%">
            {/* Empty base circle */}
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              fill="none" 
              stroke="var(--bg-hover)" 
              strokeWidth={strokeWidth} 
            />
            {segments.map((seg, idx) => {
              const percent = (seg.count / (totalOrders || 1)) * 100;
              const dashArray = `${(percent / 100) * circumference} ${circumference}`;
              const dashOffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              );
            })}
          </svg>
          {/* Inner Text overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)' }}>{totalOrders.toLocaleString('en-IN')}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Total</span>
          </div>
        </div>

        {/* Legend list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '120px' }}>
          {segments.map((seg, idx) => {
            const pct = Math.round((seg.count / (totalOrders || 1)) * 100);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '750' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                  {seg.label}
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: '850' }}>{pct}%</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ─── TOP SELLING ITEMS TABLE MODULE ─────────────────────────────────────────
function TopSellingItems({ items, isSingleRestaurant }) {
  const formatUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div style={{ flex: 1.2, minWidth: '320px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '0.98rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Top Selling Items</h2>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Item</th>
              {!isSingleRestaurant && (
                <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Restaurant</th>
              )}
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', textAlign: 'right' }}>Sold</th>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.82rem', fontWeight: '800' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.image ? (
                        <img 
                          src={formatUrl(item.image)} 
                          alt={item.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <Utensils size={14} style={{ color: 'var(--text-subtle)' }} />
                      )}
                    </div>
                    <span style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{item.name}</span>
                  </div>
                </td>
                {!isSingleRestaurant && (
                  <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px', display: 'inline-block' }}>{item.restaurantName}</span>
                  </td>
                )}
                <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', textAlign: 'right' }}>
                  {parseInt(item.soldCount, 10).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.8rem', fontWeight: '850', color: 'var(--text-main)', textAlign: 'right' }}>
                  ₹{parseFloat(item.revenue).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── RESTAURANT PERFORMANCE RANKINGS MODULE ─────────────────────────────────
function RestaurantPerformance({ list, onSelectRestaurant }) {
  return (
    <div style={{ flex: 1.5, minWidth: '320px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
      <h2 style={{ fontSize: '0.98rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Restaurant Performance</h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Branch</th>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', textAlign: 'right' }}>Orders</th>
              <th style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(list || []).map((item, idx) => (
              <tr 
                key={idx} 
                style={{ 
                  borderBottom: idx === list.length - 1 ? 'none' : '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
                className="table-row-hover"
                onClick={() => onSelectRestaurant(item.hotelId, item.name)}
              >
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>{item.name}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>Mgr: {item.managerName}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontSize: '0.62rem',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: item.status === 'EXCELLENT' ? 'rgba(16,185,129,0.1)' : item.status === 'STABLE' ? 'var(--bg-hover)' : 'rgba(239,68,68,0.1)',
                    color: item.status === 'EXCELLENT' ? '#10b981' : item.status === 'STABLE' ? 'var(--text-muted)' : '#ef4444',
                    border: `1px solid ${item.status === 'EXCELLENT' ? 'rgba(16,185,129,0.2)' : item.status === 'STABLE' ? 'var(--border-color)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', textAlign: 'right' }}>
                  {item.orders.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '850', color: 'var(--text-main)' }}>₹{Math.round(item.revenue).toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>AOV ₹{Math.round(item.avgOrderValue)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
