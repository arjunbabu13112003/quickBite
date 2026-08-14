import React from 'react';
import { Search, Bell, Store, User } from 'lucide-react';

export default function SuperAdminHeader({ currentUser }) {
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    alert('Global platform search is not available in Step 2.');
  };

  return (
    <header style={{
      height: '72px',
      background: '#ffffff',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 2.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 9
    }}>
      
      {/* Page Title Context */}
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: '900',
        color: 'var(--text-main)',
        letterSpacing: '-0.3px'
      }}>
        QuickBite Admin
      </h3>

      {/* Action Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        
        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-subtle)',
            pointerEvents: 'none'
          }} />
          <input 
            type="text"
            placeholder="Search platform..."
            style={{
              width: '240px',
              padding: '0.55rem 1rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#f8fafc',
              transition: 'all var(--transition-fast)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
        </form>

        {/* Notifications Icon (Bell with Badge) */}
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => alert('Notifications are coming in a future step.')}>
          <Bell size={20} style={{ color: 'var(--text-muted)' }} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            background: 'var(--accent-rose)',
            borderRadius: '50%'
          }}></span>
        </div>

        {/* Store Icon */}
        <div style={{ cursor: 'pointer' }} onClick={() => alert('Store console link is not configured.')}>
          <Store size={20} style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Profile Avatar Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => alert('Profile overview coming soon.')}>
          {currentUser?.profileImage ? (
            <img 
              src={currentUser.profileImage} 
              alt={currentUser.name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--primary-glow)'
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '0.85rem'
            }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
