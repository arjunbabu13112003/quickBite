import React, { useState } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  Search, 
  Sun, 
  Moon, 
  Heart, 
  ChevronDown, 
  Utensils,
  Plus,
  Star,
  Clock,
  User,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { RESTAURANTS } from '../data/mockData';

export default function Navbar({
  selectedAddress,
  onOpenAddressModal,
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  favoriteCount,
  onOpenFavorites,
  theme,
  onToggleTheme,
  onResetToHome,
  onSelectRestaurant,
  onOpenItemCustomizer,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenAdminDashboard,
  restaurants = []
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const restaurantsData = restaurants && restaurants.length > 0 ? restaurants : RESTAURANTS;

  const locationTitle = selectedAddress 
    ? (selectedAddress.label === 'Current Location 🎯' || !selectedAddress.label
        ? (selectedAddress.address || selectedAddress.city || 'Live Location')
        : selectedAddress.label)
    : 'Select Address';

  // Live Auto-Complete matching dishes and restaurants
  let matchedDishes = [];
  let matchedRestaurants = [];

  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();

    // Match Restaurants
    matchedRestaurants = restaurantsData.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.category.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );

    // Match Food Items across all restaurants
    restaurantsData.forEach(r => {
      r.menu.forEach(item => {
        if (
          item.name.toLowerCase().includes(q) || 
          item.description.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q)
        ) {
          matchedDishes.push({ ...item, restaurant: r });
        }
      });
    });
  }

  return (
    <header className="glass-header">
      <div className="navbar-inner">

        {/* Row 1: QuickBite on Far Left, Location on Far Right (with Gap in Center) */}
        <div className="navbar-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* QuickBite Brand Logo (Far Left) */}
          <div 
            onClick={onResetToHome}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), #ff7a38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px var(--primary-glow)',
              flexShrink: 0
            }}>
              <Utensils size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.35rem', 
                fontWeight: '800',
                letterSpacing: '-0.02em',
                color: 'var(--text-main)'
              }}>
                Quick<span style={{ color: 'var(--primary)' }}>Bite</span>
              </span>
              <span className="brand-tagline" style={{ 
                display: 'block', 
                fontSize: '0.65rem', 
                fontWeight: '700',
                color: 'var(--primary)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '-3px'
              }}>
                Express Delivery
              </span>
            </div>
          </div>

          {/* Location Picker Button (Far Right of Row 1) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={onOpenAdminDashboard}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.72rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                  cursor: 'pointer'
                }}
                title="Open Admin Control Panel"
              >
                <ShieldCheck size={14} /> Admin
              </button>
            )}

            <button 
              onClick={onOpenAddressModal}
              className="btn-secondary navbar-location-btn"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                gap: '0.4rem',
                maxWidth: '220px'
              }}
              title="Change Delivery Location"
            >
              <MapPin size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ textAlign: 'left', lineHeight: '1.2', overflow: 'hidden' }}>
                <span className="deliver-to-label" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                  Deliver to
                </span>
                <span style={{ 
                  fontWeight: '800', 
                  fontSize: '0.78rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.2rem',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  maxWidth: '140px'
                }}>
                  {locationTitle}
                  <ChevronDown size={13} style={{ flexShrink: 0 }} />
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Row 2: Below Heading with Gap. Left: Logout & Dark Toggle | Right: Wishlist & Cart */}
        <div className="navbar-sub-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '0.35rem' }}>
          
          {/* Left Side: Logout / User Profile Badge & Dark/Light Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {currentUser ? (
              <div className="navbar-user-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--bg-subtle)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: '25px',
                  height: '25px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  boxShadow: '0 2px 6px var(--primary-glow)',
                  flexShrink: 0
                }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name-label" style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {currentUser.name.split(' ')[0]}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                  }}
                  style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#f43f5e',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.18rem 0.45rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f43f5e';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.12)';
                    e.currentTarget.style.color = '#f43f5e';
                  }}
                  title="Click to Sign Out"
                >
                  <LogOut size={12} />
                  <span className="logout-text">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="btn-secondary"
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  gap: '0.3rem'
                }}
              >
                <User size={14} style={{ color: 'var(--primary)' }} /> Sign In
              </button>
            )}

            <button 
              onClick={onToggleTheme}
              className="btn-icon"
              style={{ width: '34px', height: '34px' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Right Side: Wishlist & Cart Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
            {(!currentUser || currentUser.role !== 'admin') && (
              <button 
                onClick={onOpenFavorites}
                className="btn-icon"
                style={{ position: 'relative', width: '34px', height: '34px' }}
                title="Saved Favorites"
              >
                <Heart size={16} style={{ color: favoriteCount > 0 ? 'var(--accent-rose)' : 'inherit', fill: favoriteCount > 0 ? 'var(--accent-rose)' : 'none' }} />
                {favoriteCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--accent-rose)',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: '800',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(244,63,94,0.4)'
                  }}>
                    {favoriteCount}
                  </span>
                )}
              </button>
            )}

            {(!currentUser || currentUser.role !== 'admin') && (
              <button 
                onClick={onOpenCart}
                className="btn-primary"
                style={{ position: 'relative', padding: '0.4rem 0.8rem', fontSize: '0.78rem', gap: '0.3rem' }}
              >
                <ShoppingBag size={16} />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span style={{
                    background: '#ffffff',
                    color: 'var(--primary)',
                    fontWeight: '800',
                    fontSize: '0.68rem',
                    padding: '0.05rem 0.35rem',
                    borderRadius: 'var(--radius-full)',
                    marginLeft: '0.15rem'
                  }}>
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Live Search Bar */}
        <div className="navbar-center" style={{ flex: '1', maxWidth: '440px', minWidth: '240px', position: 'relative', marginTop: '0.35rem' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '14px',
                color: 'var(--primary)'
              }} 
            />
            <input 
              type="text"
              placeholder="Search biryani, pizza, sushi, butter chicken..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.6rem',
                borderRadius: 'var(--radius-full)',
                border: '2px solid var(--primary)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all var(--transition-fast)'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Live Auto-Complete Dropdown Popup */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '380px',
              overflowY: 'auto',
              zIndex: 1000,
              padding: '0.5rem'
            }}>
              
              {/* Matching Dishes */}
              {matchedDishes.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', padding: '0.35rem 0.6rem', textTransform: 'uppercase' }}>
                    Matching Dishes ({matchedDishes.length})
                  </div>
                  {matchedDishes.slice(0, 8).map((dish) => (
                    <div
                      key={dish.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onOpenItemCustomizer(dish, dish.restaurant);
                        setIsSearchFocused(false);
                      }}
                      onClick={() => {
                        onOpenItemCustomizer(dish, dish.restaurant);
                        setIsSearchFocused(false);
                      }}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img src={dish.image} alt={dish.name} style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)', display: 'block' }}>
                            {dish.name}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            by {dish.restaurant.name}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', gap: '0.25rem', flexShrink: 0 }}
                      >
                        <Plus size={13} /> ₹{dish.price}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Restaurants */}
              {matchedRestaurants.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', padding: '0.35rem 0.6rem', textTransform: 'uppercase' }}>
                    Matching Restaurants ({matchedRestaurants.length})
                  </div>
                  {matchedRestaurants.map((rest) => (
                    <div
                      key={rest.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectRestaurant(rest);
                        setIsSearchFocused(false);
                      }}
                      onClick={() => {
                        onSelectRestaurant(rest);
                        setIsSearchFocused(false);
                      }}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img src={rest.image} alt={rest.name} style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)', display: 'block' }}>
                            {rest.name}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ★ {rest.rating} • {rest.deliveryTime}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)' }}>
                        View Menu →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {matchedDishes.length === 0 && matchedRestaurants.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No dishes or restaurants found for "{searchQuery}"
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
