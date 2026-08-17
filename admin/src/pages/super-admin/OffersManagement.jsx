import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Users, Bike, ClipboardList, Tag, Plus, Check, Edit, Trash2, 
  Search, Filter, Calendar, Clock, ArrowLeft, Image as ImageIcon, AlertTriangle, Eye, RefreshCw,
  IndianRupee
} from 'lucide-react';
import { api } from '../../services/api';

// ─── UTILS & FORMATTERS ──────────────────────────────────────────────────────
const getCampaignStatus = (campaign) => {
  if (!campaign.isActive) return 'Paused';
  const now = new Date();
  const start = new Date(campaign.startAt);
  const end = new Date(campaign.endAt);
  if (now < start) return 'Scheduled';
  if (now > end) return 'Expired';
  return 'Active';
};

const renderStatusBadge = (status) => {
  const s = status.toUpperCase();
  let bg = 'rgba(100,116,139,0.08)';
  let text = 'var(--text-muted)';
  
  if (s === 'ACTIVE') {
    bg = 'rgba(16,185,129,0.08)';
    text = '#10b981';
  } else if (s === 'SCHEDULED') {
    bg = 'rgba(59,130,246,0.08)';
    text = '#3b82f6';
  } else if (s === 'PAUSED') {
    bg = 'rgba(245,158,11,0.08)';
    text = '#f59e0b';
  } else if (s === 'EXPIRED') {
    bg = 'rgba(239,68,68,0.08)';
    text = '#ef4444';
  }

  return (
    <span style={{
      background: bg,
      color: text,
      padding: '0.25rem 0.6rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.72rem',
      fontWeight: '800',
      textTransform: 'uppercase',
      display: 'inline-block'
    }}>
      {status}
    </span>
  );
};

// ─── 1. SUPER ADMIN OFFERS MAIN LIST PAGE ───────────────────────────────────
export function SuperAdminOffersList({ onNavigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAll99Campaigns();
      setCampaigns(data || []);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch platform campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Derived Summary Counters
  const activeCount = campaigns.filter(c => getCampaignStatus(c) === 'Active').length;
  const scheduledCount = campaigns.filter(c => getCampaignStatus(c) === 'Scheduled').length;
  const uniqueHotels = [...new Set(campaigns.flatMap(c => c.hotelCount || 0))].reduce((a, b) => a + b, 0);

  const handleToggleActive = async (campaign) => {
    try {
      await api.toggle99CampaignActive(campaign.id);
      fetchCampaigns();
    } catch (e) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      await api.delete99Campaign(id);
      fetchCampaigns();
    } catch (e) {
      alert(e.message || 'Failed to delete campaign');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Offers</h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Create and manage platform-wide promotions</p>
        </div>
        <button 
          onClick={() => onNavigate('/super-admin/offers/choose')}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: '800' }}
        >
          <Plus size={18} /> Create Offer
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', width: '48px', height: '48px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)' }}>{activeCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Active Offers</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)' }}>{scheduledCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Scheduled Offers</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(249,115,22,0.08)', color: 'var(--primary)', width: '48px', height: '48px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)' }}>{uniqueHotels}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Participating Restaurants</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', width: '48px', height: '48px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)' }}>0</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Offer Orders</div>
          </div>
        </div>
      </div>

      {/* Offer Types Cards */}
      <div id="offer-types-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>Create New Promotion Type</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          
          {/* Card: Fixed Price Offer */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '180px', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Fixed Price Offer</span>
                <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Active</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                Create campaigns with a fixed selling price for selected food items.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <button onClick={() => onNavigate('/super-admin/offers/99store')} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem', fontWeight: '800' }}>View Campaigns</button>
              <button onClick={() => onNavigate('/super-admin/offers/99store/new')} className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem', fontWeight: '800' }}>Create Offer</button>
            </div>
          </div>

          {/* Card: Free Delivery */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '180px', opacity: 0.7 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Free Delivery</span>
                <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                Create platform-wide free delivery promotions.
              </p>
            </div>
          </div>

          {/* Card: Percentage Discount */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '180px', opacity: 0.7 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Percentage Discount</span>
                <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                Create percentage-based platform discounts.
              </p>
            </div>
          </div>

          {/* Card: Flat Discount */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '180px', opacity: 0.7 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Flat Discount</span>
                <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                Create fixed-value discount campaigns.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* All Offers Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: 'var(--text-main)' }}>All Offers</h3>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
            {error}
          </div>
        ) : campaigns.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No campaigns found. Click "Create Offer" on the Fixed Price Offer card to get started.</p>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: '800' }}>
                  <th style={{ padding: '1rem' }}>Offer Name</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Offer Value</th>
                  <th style={{ padding: '1rem' }}>Start Date</th>
                  <th style={{ padding: '1rem' }}>End Date</th>
                  <th style={{ padding: '1rem' }}>Restaurants</th>
                  <th style={{ padding: '1rem' }}>Items</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const status = getCampaignStatus(c);
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <td style={{ padding: '1rem', fontWeight: '750' }}>{c.name}</td>
                      <td style={{ padding: '1rem' }}>Fixed Price</td>
                      <td style={{ padding: '1rem', fontWeight: '800', color: 'var(--primary)' }}>₹{parseFloat(c.price).toFixed(0)}</td>
                      <td style={{ padding: '1rem' }}>{new Date(c.startAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem' }}>{new Date(c.endAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', fontWeight: '750' }}>{c.hotelCount || 0}</td>
                      <td style={{ padding: '1rem', fontWeight: '750' }}>{c.foodCount || 0}</td>
                      <td style={{ padding: '1rem' }}>{renderStatusBadge(status)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onNavigate(`/super-admin/offers/99store/${c.id}/edit`)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(c)}
                            style={{ background: 'none', border: 'none', color: c.isActive ? '#f59e0b' : '#10b981', cursor: 'pointer', padding: '4px', fontSize: '0.75rem', fontWeight: '800' }}
                            title={c.isActive ? "Pause" : "Resume"}
                          >
                            {c.isActive ? "Pause" : "Resume"}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. SUPER ADMIN 99 STORE CAMPAIGNS LIST PAGE ────────────────────────────
export function SuperAdminCampaignsList({ onNavigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAll99Campaigns();
      setCampaigns(data || []);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch platform campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleToggleActive = async (campaign) => {
    try {
      await api.toggle99CampaignActive(campaign.id);
      fetchCampaigns();
    } catch (e) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      await api.delete99Campaign(id);
      fetchCampaigns();
    } catch (e) {
      alert(e.message || 'Failed to delete campaign');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      
      {/* Header back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => onNavigate('/super-admin/offers')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Fixed Price Campaigns</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage platform-wide fixed-price promotional campaigns</p>
        </div>
        <button 
          onClick={() => onNavigate('/super-admin/offers/99store/new')}
          className="btn-primary" 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: '800' }}
        >
          <Plus size={18} /> Create Campaign
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No campaigns found. Click "Create Campaign" to build your first promotion campaign.</p>
          <button onClick={() => onNavigate('/super-admin/offers/99store/new')} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: '800' }}>Create Campaign</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {campaigns.map(c => {
            const status = getCampaignStatus(c);
            return (
              <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
                {c.bannerUrl && (
                  <div style={{ height: '140px', width: '100%', overflow: 'hidden' }}>
                    <img src={c.bannerUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '850' }}>{c.name}</strong>
                      {renderStatusBadge(status)}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{c.description}</p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div>
                      <strong>Fixed Price:</strong> <span style={{ color: 'var(--primary)', fontWeight: '800' }}>₹{parseFloat(c.price).toFixed(0)}</span>
                    </div>
                    <div>
                      <strong>Start Date:</strong> {new Date(c.startAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>End Date:</strong> {new Date(c.endAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Restaurants Mapped:</strong> <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>{c.hotelCount || 0}</span>
                    </div>
                    <div>
                      <strong>Eligible Food Items:</strong> <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>{c.foodCount || 0}</span>
                    </div>
                    <div>
                      <strong>Orders Generated:</strong> <span style={{ color: 'var(--text-main)', fontWeight: '750' }}>0</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => onNavigate(`/super-admin/offers/99store/${c.id}/edit`)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: '800', color: c.isActive ? '#f59e0b' : '#10b981' }}
                    >
                      {c.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.65rem', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 3. SUPER ADMIN CREATE/EDIT CAMPAIGN BUILDER (STITCH DESIGN) ─────────────
export function SuperAdminCreateCampaign({ id, onNavigate }) {
  const isEdit = !!id;

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(99);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Pools
  const [hotels, setHotels] = useState([]);
  const [foodsByHotel, setFoodsByHotel] = useState({});
  const [categories, setCategories] = useState([]);

  // Checkmarked list IDs
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);

  // UI filters/searches
  const [searchHotel, setSearchHotel] = useState('');
  const [hotelCityFilter, setHotelCityFilter] = useState('all');
  const [hotelStatusFilter, setHotelStatusFilter] = useState('all');

  const [searchFood, setSearchFood] = useState('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('all');
  const [foodAvailabilityFilter, setFoodAvailabilityFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial Fetch Setup
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        // Fetch hotels list
        const hotelsData = await api.getSuperAdminHotels();
        setHotels(hotelsData || []);

        // Fetch categories list for filters
        setCategories([
          { id: '1', name: 'Biryani' },
          { id: '2', name: 'Burgers & Sandwiches' },
          { id: '3', name: 'Desserts' },
          { id: '4', name: 'Beverages' },
          { id: '5', name: 'North Indian' },
          { id: '6', name: 'Chinese' }
        ]);

        if (isEdit) {
          const details = await api.get99CampaignDetails(id);
          if (details) {
            setName(details.name || '');
            setDescription(details.description || '');
            setPrice(details.price ? parseFloat(details.price) : 99);
            setBannerUrl(details.bannerUrl || '');
            setIsActive(details.isActive !== undefined ? details.isActive : true);

            // Parse Date Start
            if (details.startAt) {
              const startObj = new Date(details.startAt);
              setStartDate(startObj.toISOString().split('T')[0]);
              setStartTime(startObj.toTimeString().split(' ')[0].substring(0, 5));
            }
            // Parse Date End
            if (details.endAt) {
              const endObj = new Date(details.endAt);
              setEndDate(endObj.toISOString().split('T')[0]);
              setEndTime(endObj.toTimeString().split(' ')[0].substring(0, 5));
            }

            setSelectedHotelIds(details.hotelIds || []);
            setSelectedFoodIds(details.foodIds || []);
          }
        }
      } catch (e) {
        console.error('Failed to load campaign metadata pool', e);
        setError('Failed to fetch platform configuration list');
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, [id, isEdit]);

  // Load foods dynamically for selected hotels
  useEffect(() => {
    const fetchFoodsForSelectedHotels = async () => {
      const newFoods = { ...foodsByHotel };
      let changed = false;
      for (const hid of selectedHotelIds) {
        if (!newFoods[hid]) {
          try {
            const data = await api.getSuperAdminFoods(hid);
            newFoods[hid] = data || [];
            changed = true;
          } catch (e) {
            console.error('Failed to fetch foods for hotel ID', hid, e);
          }
        }
      }
      if (changed) {
        setFoodsByHotel(newFoods);
      }
    };
    if (selectedHotelIds.length > 0) {
      fetchFoodsForSelectedHotels();
    }
  }, [selectedHotelIds, foodsByHotel]);

  // Handle Hotel Toggle Checkmark
  const handleToggleHotel = (hotelId) => {
    setSelectedHotelIds(prev => {
      if (prev.includes(hotelId)) {
        // Also deselect food items from this hotel
        const hotelFoods = foodsByHotel[hotelId] || [];
        const hotelFoodIds = hotelFoods.map(f => f.id);
        setSelectedFoodIds(prevFoods => prevFoods.filter(fid => !hotelFoodIds.includes(fid)));
        return prev.filter(hid => hid !== hotelId);
      } else {
        return [...prev, hotelId];
      }
    });
  };

  // Select all valid hotels
  const handleSelectAllHotels = (filteredHotels) => {
    const allFilteredIds = filteredHotels.map(h => h.id);
    const allSelected = allFilteredIds.every(id => selectedHotelIds.includes(id));
    if (allSelected) {
      setSelectedHotelIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedHotelIds(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  // Handle Food Toggle Checkmark
  const handleToggleFood = (foodId) => {
    setSelectedFoodIds(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      } else {
        return [...prev, foodId];
      }
    });
  };

  // Select all eligible foods in filter view
  const handleSelectAllFoods = (filteredFoods) => {
    const allFilteredIds = filteredFoods.map(f => f.id);
    const allSelected = allFilteredIds.every(id => selectedFoodIds.includes(id));
    if (allSelected) {
      setSelectedFoodIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedFoodIds(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  // Derived unique lists
  const allEligibleFoods = selectedHotelIds.flatMap(hid => foodsByHotel[hid] || []);

  const getFilteredHotels = () => {
    return hotels.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchHotel.toLowerCase());
      const matchesCity = hotelCityFilter === 'all' || h.city?.toLowerCase() === hotelCityFilter.toLowerCase();
      const matchesStatus = hotelStatusFilter === 'all' || 
        (hotelStatusFilter === 'active' && h.isActive) ||
        (hotelStatusFilter === 'inactive' && !h.isActive);
      return matchesSearch && matchesCity && matchesStatus;
    });
  };

  const getFilteredFoods = () => {
    return allEligibleFoods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(searchFood.toLowerCase());
      const matchesCat = foodCategoryFilter === 'all' || Number(food.categoryId) === Number(foodCategoryFilter);
      const matchesAvail = foodAvailabilityFilter === 'all' || 
        (foodAvailabilityFilter === 'available' && food.isAvailable && food.isActive) ||
        (foodAvailabilityFilter === 'unavailable' && !(food.isAvailable && food.isActive));
      return matchesSearch && matchesCat && matchesAvail;
    });
  };

  // Form Validation & Submit
  const handleSave = async (e, shouldPublish) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Fixed selling price must be a valid number greater than 0');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and End dates are required');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    if (endDateTime <= startDateTime) {
      setError('End date & time must be after start date & time');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        bannerUrl,
        price: Number(price) || 99.00,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        hotelIds: selectedHotelIds,
        foodIds: selectedFoodIds,
        isActive: shouldPublish
      };

      if (isEdit) {
        await api.update99Campaign(id, payload);
        setSuccess('Campaign updated successfully!');
      } else {
        await api.create99Campaign(payload);
        setSuccess('Campaign published successfully!');
      }
      setTimeout(() => {
        onNavigate('/super-admin/offers/99store');
      }, 1500);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to save campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculatedSummary = () => {
    if (!startDate || !endDate) return '';
    try {
      const startObj = new Date(`${startDate}T${startTime}`);
      const endObj = new Date(`${endDate}T${endTime}`);
      return `Campaign runs from ${startObj.toLocaleDateString()} ${startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${endObj.toLocaleDateString()} ${endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return '';
    }
  };

  const filteredHotels = getFilteredHotels();
  const filteredFoods = getFilteredFoods();

  // Find preview items for mockup app view
  const previewFoodsList = allEligibleFoods.filter(f => selectedFoodIds.includes(f.id)).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => onNavigate('/super-admin/offers/99store')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              {isEdit ? 'Edit Campaign' : 'Create Fixed Price Offer'}
            </h1>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Build platform-wide fixed selling price campaigns</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={(e) => handleSave(e, false)} 
            disabled={saving}
            className="btn-secondary" 
            style={{ padding: '0.65rem 1.25rem', fontWeight: '800' }}
          >
            Save Draft
          </button>
          <button 
            onClick={(e) => handleSave(e, true)} 
            disabled={saving}
            className="btn-primary" 
            style={{ padding: '0.65rem 1.5rem', fontWeight: '800' }}
          >
            {saving ? 'Saving...' : 'Publish Campaign'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: '700' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: '700' }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Main Grid: Builder on Left, Phone Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Panel: Builder Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section: Campaign Details */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Campaign Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon ₹99 Mega Deal"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  placeholder="Tell customers about this discount campaign..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem 1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Offer Price (Fixed)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="premium-form-control"
                    style={{ width: '120px', fontWeight: '900', color: 'var(--primary)', textAlign: 'center', fontSize: '1.1rem' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This campaign locks item prices to exactly the specified selling price.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Schedule */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Schedule</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            {calculatedSummary() && (
              <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px dashed var(--primary)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '750' }}>
                <Clock size={16} /> {calculatedSummary()}
              </div>
            )}
          </div>

          {/* Section: Campaign Banner */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Campaign Banner</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Banner Image URL</label>
              <input
                type="text"
                placeholder="e.g. https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600"
                value={bannerUrl}
                onChange={e => setBannerUrl(e.target.value)}
                className="premium-form-control"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Aspect ratio: 16:6. Recommended size: 1600 × 600 px</span>
            </div>

            {bannerUrl && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', height: '140px', overflow: 'hidden', position: 'relative' }}>
                <img src={bannerUrl} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => setBannerUrl('')} style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '800' }}>Remove</button>
              </div>
            )}
          </div>

          {/* Section: Participating Restaurants */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Participating Restaurants</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '800' }}>{selectedHotelIds.length} Selected</span>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchHotel}
                  onChange={e => setSearchHotel(e.target.value)}
                  className="premium-form-control"
                  style={{ width: '100%', paddingLeft: '2.2rem' }}
                />
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <select
                value={hotelCityFilter}
                onChange={e => setHotelCityFilter(e.target.value)}
                className="premium-form-control"
                style={{ width: '130px' }}
              >
                <option value="all">All Cities</option>
                <option value="kochi">Kochi</option>
                <option value="calicut">Calicut</option>
                <option value="trivandrum">Trivandrum</option>
              </select>
              <select
                value={hotelStatusFilter}
                onChange={e => setHotelStatusFilter(e.target.value)}
                className="premium-form-control"
                style={{ width: '130px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* List Row */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800' }}>
                <input
                  type="checkbox"
                  checked={filteredHotels.length > 0 && filteredHotels.every(h => selectedHotelIds.includes(h.id))}
                  onChange={() => handleSelectAllHotels(filteredHotels)}
                  style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>Restaurant Name</div>
                <div style={{ width: '120px' }}>Location</div>
                <div style={{ width: '80px' }}>Status</div>
              </div>
              
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredHotels.map(h => {
                  const isChecked = selectedHotelIds.includes(h.id);
                  return (
                    <div key={h.id} style={{ display: 'flex', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.8rem', background: isChecked ? 'rgba(255,85,32,0.02)' : 'transparent', color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleHotel(h.id)}
                        style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1, fontWeight: '750', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {h.logo ? (
                          <img src={h.logo} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <Building2 size={16} />
                        )}
                        {h.name}
                      </div>
                      <div style={{ width: '120px', color: 'var(--text-muted)' }}>{h.city || 'Kochi'}</div>
                      <div style={{ width: '80px' }}>
                        <span style={{ fontSize: '0.7rem', color: h.isActive ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                          {h.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Eligible Items */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>Eligible Items</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '800' }}>{selectedFoodIds.length} Selected</span>
            </div>

            {selectedHotelIds.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select participating restaurants above to load eligible food items.</p>
            ) : (
              <>
                {/* Food Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search food items..."
                      value={searchFood}
                      onChange={e => setSearchFood(e.target.value)}
                      className="premium-form-control"
                      style={{ width: '100%', paddingLeft: '2.2rem' }}
                    />
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  <select
                    value={foodCategoryFilter}
                    onChange={e => setFoodCategoryFilter(e.target.value)}
                    className="premium-form-control"
                    style={{ width: '140px' }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={foodAvailabilityFilter}
                    onChange={e => setFoodAvailabilityFilter(e.target.value)}
                    className="premium-form-control"
                    style={{ width: '140px' }}
                  >
                    <option value="all">All Availability</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                {/* Food table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <input
                      type="checkbox"
                      checked={filteredFoods.length > 0 && filteredFoods.every(f => selectedFoodIds.includes(f.id))}
                      onChange={() => handleSelectAllFoods(filteredFoods)}
                      style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>Food Item</div>
                    <div style={{ width: '130px' }}>Restaurant</div>
                    <div style={{ width: '100px' }}>Orig. Price</div>
                    <div style={{ width: '100px' }}>Status</div>
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {filteredFoods.map(food => {
                      const isChecked = selectedFoodIds.includes(food.id);
                      const isAvailable = food.isAvailable && food.isActive;
                      const campaignPrice = Number(price) || 99;
                      const isEligiblePrice = Number(food.price) > campaignPrice;
                      const isEligible = isAvailable && isEligiblePrice;

                      let reason = '';
                      if (!isAvailable) reason = 'Unavailable';
                      else if (!isEligiblePrice) reason = `Price <= ₹${campaignPrice}`;

                      return (
                        <div key={food.id} style={{ display: 'flex', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.8rem', background: isChecked ? 'rgba(255,85,32,0.02)' : 'transparent', opacity: isEligible ? 1 : 0.6, color: 'var(--text-main)' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isEligible}
                            onChange={() => handleToggleFood(food.id)}
                            style={{ marginRight: '1rem', width: '16px', height: '16px', cursor: isEligible ? 'pointer' : 'not-allowed', accentColor: 'var(--primary)' }}
                          />
                          <div style={{ flex: 1, fontWeight: '750', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {food.image && (
                              <img src={food.image} alt="" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                            )}
                            {food.name}
                          </div>
                          <div style={{ width: '130px', color: 'var(--text-muted)' }}>
                            {hotels.find(h => h.id === food.hotelId)?.name || 'Restaurant'}
                          </div>
                          <div style={{ width: '100px', fontWeight: '700' }}>₹{food.price}</div>
                          <div style={{ width: '100px' }}>
                            {isEligible ? (
                              <span style={{ color: '#10b981', fontWeight: '800' }}>Eligible</span>
                            ) : (
                              <span style={{ color: '#ef4444', fontWeight: '800', background: 'rgba(239,68,68,0.08)', padding: '0.15rem 0.4rem', borderRadius: '2px', fontSize: '0.72rem' }}>{reason}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Customer App Sticky Mockup */}
        <div style={{ position: 'sticky', top: '20px', zIndex: 10 }}>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Customer App Preview</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Live preview of the 99 Store section</p>
            
            {/* Phone Frame */}
            <div style={{ border: '12px solid #000', borderRadius: '32px', background: '#121212', height: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              
              {/* Phone Header */}
              <div style={{ height: '36px', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {/* Notch */}
                <div style={{ width: '90px', height: '18px', background: '#000', borderRadius: '0 0 10px 10px', position: 'absolute', top: 0 }} />
              </div>

              {/* Mock App Area */}
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#fff' }}>
                
                {/* App Brand Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f97316' }}>QuickBite</div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#333' }} />
                </div>

                {/* Banner Preview */}
                <div style={{ background: '#1e1e1e', borderRadius: '12px', height: '110px', overflow: 'hidden', border: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                      <ImageIcon size={24} />
                      <span style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>No banner uploaded</span>
                    </div>
                  )}
                  {/* Overlay text */}
                  {bannerUrl && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fff' }}>{name || 'Campaign Name'}</span>
                      <span style={{ fontSize: '0.6rem', color: '#ccc', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{description || 'Campaign Description'}</span>
                    </div>
                  )}
                </div>

                {/* Campaign Header Details */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '900' }}>{name || 'Campaign Name'}</span>
                    <span style={{ fontSize: '0.65rem', color: '#f97316', fontWeight: '800' }}>View All</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#aaa', display: 'block', marginTop: '0.1rem' }}>{description || `Meals at ₹${price || 99} + Free Delivery`}</span>
                </div>

                {/* Food Item Previews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {previewFoodsList.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', border: '1.5px dashed #333', borderRadius: '10px', textAlign: 'center', color: '#666', fontSize: '0.7rem' }}>
                      No items selected. Choose eligible food items on the left to see preview cards.
                    </div>
                  ) : (
                    previewFoodsList.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.6rem', background: '#1c1c1e', borderRadius: '10px', padding: '0.5rem', border: '1px solid #2c2c2e', alignItems: 'center' }}>
                        {item.image && (
                          <img src={item.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '8px', height: '8px', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px' }}><div style={{ width: '4px', height: '4px', background: '#22c55e', borderRadius: '50%' }} /></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{item.name}</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#999', display: 'block' }}>{hotels.find(h => h.id === item.hotelId)?.name || 'Restaurant'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.65rem', textDecoration: 'line-through', color: '#777' }}>₹{item.price}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#f97316' }}>₹{price || 99}</span>
                          </div>
                        </div>
                        <button style={{ border: 'none', background: '#f97316', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>ADD</button>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

// ─── 4. SUPER ADMIN CHOOSE OFFER TYPE PAGE ──────────────────────────────────
export function SuperAdminChooseOfferType({ onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      
      {/* Header back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => onNavigate('/super-admin/offers')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Choose Offer Type</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select the type of promotional campaign you want to build</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* Card: Fixed Price Offer */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '200px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} color="var(--primary)" />
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>Fixed Price Offer</span>
            </div>
            <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Active</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            Set a fixed selling price for selected food items.<br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>Examples: ₹50 &bull; ₹99 &bull; ₹149 &bull; ₹199</span>
          </p>
          <button 
            onClick={() => onNavigate('/super-admin/offers/99store/new')} 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.65rem', fontSize: '0.82rem', fontWeight: '800', marginTop: 'auto' }}
          >
            Create Fixed Price Offer
          </button>
        </div>

        {/* Card: Free Delivery */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '200px', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>Free Delivery</span>
            <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            Create a platform-wide free delivery campaign.
          </p>
        </div>

        {/* Card: Percentage Discount */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '200px', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>Percentage Discount</span>
            <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            Create percentage-based platform offers.
          </p>
        </div>

        {/* Card: Flat Discount */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '200px', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>Flat Discount</span>
            <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: '800' }}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            Create fixed-value platform discounts.
          </p>
        </div>

      </div>

    </div>
  );
}
