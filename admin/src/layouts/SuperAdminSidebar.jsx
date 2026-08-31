import React from 'react';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Bike,
  ClipboardList,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Pizza,
  Tag,
  Palette,
  Send,
} from 'lucide-react';

const NAVIGATION_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard' },
  { id: 'hotels', name: 'Hotels', icon: Building2, path: '/super-admin/hotels' },
  { id: 'hotel-admins', name: 'Hotel Admins', icon: UserCheck, path: '/super-admin/hotel-admins' },
  { id: 'food-categories', name: 'Food Categories', icon: Pizza, path: '/super-admin/food-categories' },
  { id: 'delivery-partners', name: 'Delivery Partners', icon: Bike, path: '/super-admin/delivery-partners' },
  { id: 'orders', name: 'Orders', icon: ClipboardList, path: '/super-admin/orders' },
  { id: 'payments', name: 'Payments', icon: CreditCard, path: '/super-admin/payments' },
  { id: 'offers', name: 'Offers', icon: Tag, path: '/super-admin/offers' },
  { id: 'push-campaigns', name: 'Push Campaigns', icon: Send, path: '/super-admin/push-campaigns' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/super-admin/analytics' },
  { id: 'branding', name: 'Branding', icon: Palette, path: '/super-admin/branding/app-icons' },
  { id: 'settings', name: 'Settings', icon: Settings, path: '/super-admin/settings' },
];

const IMPLEMENTED_ITEMS = ['dashboard', 'hotels', 'hotel-admins', 'food-categories', 'delivery-partners', 'orders', 'payments', 'offers', 'branding', 'push-campaigns'];

export default function SuperAdminSidebar({ currentUser, currentTab, onNavigate, onLogout }) {
  const handleItemClick = (e, item) => {
    e.preventDefault();
    if (IMPLEMENTED_ITEMS.includes(item.id)) {
      onNavigate(item.path);
    } else {
      alert(`"${item.name}" management screen is coming in the next release.`);
    }
  };

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>

      {/* Branding */}
      <div style={{
        padding: '1.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        borderBottom: '1px solid var(--border-sidebar)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'var(--primary)', color: '#ffffff',
            width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '1.1rem',
          }}>Q</div>
          <span style={{
            fontSize: '1.35rem', fontWeight: '900',
            color: 'var(--text-main)', letterSpacing: '-0.5px',
          }}>QuickBite</span>
        </div>
        <span style={{
          fontSize: '0.68rem', color: 'var(--text-muted)',
          fontWeight: '800', textTransform: 'uppercase',
          letterSpacing: '0.5px', paddingLeft: '2.3rem',
        }}>
          Platform Admin
        </span>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1, padding: '1.5rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.25rem',
        overflowY: 'auto',
      }}>
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = item.id === currentTab;
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={item.path}
              onClick={(e) => handleItemClick(e, item)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', fontSize: '0.9rem',
                fontWeight: isActive ? '800' : '600',
                color: isActive ? 'var(--sidebar-active-color)' : 'var(--sidebar-inactive-color)',
                backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg)';
                  e.currentTarget.style.color = 'var(--sidebar-hover-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--sidebar-inactive-color)';
                }
              }}
            >
              <Icon size={18} color={isActive ? 'var(--sidebar-active-color)' : 'currentColor'} />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Bottom Profile & Logout */}
      <div style={{
        padding: '1.25rem',
        borderTop: '1px solid var(--border-sidebar)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        background: 'var(--bg-sidebar)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser?.profileImage ? (
            <img
              src={currentUser.profileImage}
              alt={currentUser.name}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
                objectFit: 'cover', border: '2px solid var(--primary-glow)',
              }}
            />
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '1rem',
            }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentUser?.name || 'Platform Admin'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Platform Administrator
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.5rem', padding: '0.7rem',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-btn-secondary)',
            background: 'var(--bg-card)', color: 'var(--text-btn-secondary)',
            fontSize: '0.85rem', fontWeight: '700',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-danger-subtle)';
            e.currentTarget.style.color = 'var(--text-danger)';
            e.currentTarget.style.backgroundColor = 'var(--bg-danger-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-btn-secondary)';
            e.currentTarget.style.color = 'var(--text-btn-secondary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
          }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
