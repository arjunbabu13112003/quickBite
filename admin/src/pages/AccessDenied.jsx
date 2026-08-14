import React from 'react';
import { ShieldX, ArrowLeft } from 'lucide-react';

/**
 * AccessDenied — shown when a role tries to navigate to a route they're not authorized for.
 * e.g. hotel_admin manually navigating to /super-admin/dashboard.
 */
export default function AccessDenied({ onGoBack, userRole }) {
  const roleDashboard = userRole === 'super_admin'
    ? '/super-admin/dashboard'
    : userRole === 'hotel_admin'
    ? '/hotel-admin/dashboard'
    : '/login';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '2rem',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '3.5rem 3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'var(--bg-danger-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: 'var(--text-danger)',
        }}>
          <ShieldX size={38} />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)',
          marginBottom: '0.75rem', lineHeight: '1.2',
        }}>
          Access Denied
        </h1>

        {/* Message */}
        <p style={{
          fontSize: '1rem', color: 'var(--text-muted)',
          lineHeight: '1.6', marginBottom: '2.5rem',
        }}>
          You don&apos;t have permission to access this section.
          <br />
          <strong style={{ color: 'var(--text-main)' }}>This area is restricted to authorized administrators only.</strong>
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button
            onClick={() => {
              window.history.pushState(null, '', roleDashboard);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', justifyContent: 'center' }}
          >
            Go to My Dashboard
          </button>
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
