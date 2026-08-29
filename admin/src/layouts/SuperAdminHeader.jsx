import React from 'react';
import { Search, Bell, Store } from 'lucide-react';

export default function SuperAdminHeader({ currentUser, theme, setTheme }) {
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    alert('Global platform search is coming in a future release.');
  };

  return (
    <header style={{
      height: '72px',
      background: 'var(--bg-header)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 2.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 9,
      flexShrink: 0,
    }}>
      {/* Page title */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
        QuickBite Admin
      </h3>

      {/* Action controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--icon-color)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search platform..."
            style={{
              width: '240px', padding: '0.55rem 1rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-full)', border: '1px solid var(--border-search-input)',
              fontSize: '0.85rem', background: 'var(--bg-search-input)',
              color: 'var(--text-search-input)',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.background = 'var(--bg-card)';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-search-input)';
              e.target.style.background = 'var(--bg-search-input)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </form>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--icon-color)',
            transition: 'transform var(--transition-fast)',
            outline: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => alert('Notifications coming in a future release.')}
        >
          <Bell size={20} style={{ color: 'var(--icon-color)' }} />
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '8px', height: '8px',
            background: 'var(--accent-rose)', borderRadius: '50%',
          }} />
        </div>

        {/* Store */}
        <div style={{ cursor: 'pointer' }} onClick={() => alert('Store console link not configured.')}>
          <Store size={20} style={{ color: 'var(--icon-color)' }} />
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          {currentUser?.profileImage ? (
            <img
              src={currentUser.profileImage}
              alt={currentUser.name}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                objectFit: 'cover', border: '1.5px solid var(--primary-glow)',
              }}
            />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '0.85rem',
            }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
