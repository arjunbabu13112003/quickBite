import React from 'react';
import AccessDenied from '../pages/AccessDenied';

/**
 * ProtectedRoute — role-aware route guard for the unified admin portal.
 *
 * Usage:
 *   <ProtectedRoute allowedRole="super_admin" currentUser={currentUser}>
 *     <Dashboard />
 *   </ProtectedRoute>
 *
 * If the currentUser's role does not match allowedRole, renders AccessDenied.
 * This is a client-side guard. Server-side JWT guards are the authoritative layer.
 */
export default function ProtectedRoute({ allowedRole, currentUser, children }) {
  if (!currentUser) {
    // No user in state — parent App.jsx handles redirect to /login
    return null;
  }

  if (currentUser.role !== allowedRole) {
    return <AccessDenied userRole={currentUser.role} />;
  }

  return children;
}
