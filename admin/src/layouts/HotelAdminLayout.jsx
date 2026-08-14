import React from 'react';

/**
 * HotelAdminLayout — wrapper for hotel admin dashboard content.
 * The HotelAdminDashboard itself renders its own header/sidebar internally,
 * so this layout is intentionally a thin wrapper for future extensibility.
 */
export default function HotelAdminLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      width: '100%',
    }}>
      {children}
    </div>
  );
}
