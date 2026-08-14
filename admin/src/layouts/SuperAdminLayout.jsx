import React from 'react';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';

export default function SuperAdminLayout({ currentUser, currentTab, onNavigate, onLogout, theme, setTheme, children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      width: '100%',
    }}>
      {/* Sidebar navigation */}
      <SuperAdminSidebar
        currentUser={currentUser}
        currentTab={currentTab}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main panel content workspace */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Header bar */}
        <SuperAdminHeader currentUser={currentUser} theme={theme} setTheme={setTheme} />

        {/* Content body */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
