import React, { useState } from 'react';
import { ArrowLeft, Star, Clock, MapPin, Plus, Eye, Heart, Check } from 'lucide-react';

export default function RestaurantDetail({
  restaurant,
  onBack,
  onOpenItemCustomizer,
  favoriteDishes = [],
  onToggleFavoriteDish,
  onAddToCart,
  cartItems = [],
  onRemoveFromCartByItemId
}) {
  const [activeMenuCategory, setActiveMenuCategory] = useState('All');

  const menuCategories = ['All', ...new Set(restaurant.menu.map(item => item.categoryName))];

  const filteredItems = activeMenuCategory === 'All' 
    ? restaurant.menu 
    : restaurant.menu.filter(item => item.categoryName === activeMenuCategory);

  const defaultFoodImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      <button
        onClick={onBack}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', gap: '0.5rem', fontWeight: '700' }}
      >
        <ArrowLeft size={18} /> Back to Restaurants
      </button>

      {/* Hero Banner */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)'
      }}>
        <div className="restaurant-cover-container" style={{ height: '260px', width: '100%', position: 'relative' }}>
          <img 
            src={restaurant.coverImage || restaurant.image} 
            alt={restaurant.name}
            onError={(e) => { e.currentTarget.src = defaultFoodImg; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.3) 60%, transparent 100%)'
          }} />
        </div>

        <div className="restaurant-cover-content" style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '1.75rem',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <span style={{
              background: 'var(--primary)',
              color: '#ffffff',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
              display: 'inline-block'
            }}>
              {restaurant.category.toUpperCase()}
            </span>

            <h1 className="restaurant-title-heading" style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.4rem', color: '#ffffff' }}>
              {restaurant.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.88rem', opacity: 0.9, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-amber)', fontWeight: '800' }}>
                <Star size={16} fill="currentColor" /> {restaurant.rating} ({restaurant.reviewsCount} reviews)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={16} /> {restaurant.deliveryTime}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={16} /> {restaurant.address}
              </span>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: '#ffffff'
          }}>
            <span style={{ opacity: 0.9, fontSize: '0.72rem' }}>Delivery:</span>
            <span style={{ fontWeight: '800', fontSize: '0.82rem' }}>
              {restaurant.deliveryFee === 0 ? 'FREE' : `₹${restaurant.deliveryFee}`}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Categories */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem'
      }}>
        {menuCategories.map((catName) => (
          <button
            key={catName}
            onClick={() => setActiveMenuCategory(catName)}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: '700',
              fontSize: '0.9rem',
              background: activeMenuCategory === catName ? 'var(--primary)' : 'var(--bg-card)',
              color: activeMenuCategory === catName ? '#ffffff' : 'var(--text-main)',
              border: `1px solid ${activeMenuCategory === catName ? 'var(--primary)' : 'var(--border-color)'}`,
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)'
            }}
          >
            {catName}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid-menu">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            className="glass-card"
            onClick={() => onOpenItemCustomizer(item, restaurant)}
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img 
                  src={item.image} 
                  alt={item.name}
                  onError={(e) => { e.currentTarget.src = defaultFoodImg; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {item.isPopular && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: '800',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    Popular
                  </span>
                )}
              </div>

              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  {item.isVeg ? (
                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '800' }}>🌱 VEG</span>
                  ) : (
                    <span style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: '800' }}>🍖 NON-VEG</span>
                  )}
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                  {item.name}
                </h4>

                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)', 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden' 
                }}>
                  {item.description}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>
                ₹{item.price}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleFavoriteDish) onToggleFavoriteDish(item.id);
                  }}
                  className="btn-icon"
                  style={{ width: '34px', height: '34px' }}
                  title={favoriteDishes.includes(item.id) ? 'Remove from favorites' : 'Save dish to favorites'}
                >
                  <Heart 
                    size={16} 
                    style={{ 
                      color: favoriteDishes.includes(item.id) ? 'var(--accent-rose)' : 'var(--text-muted)', 
                      fill: favoriteDishes.includes(item.id) ? 'var(--accent-rose)' : 'none' 
                    }} 
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isAdded = cartItems.some(c => c.itemId === item.id);
                    if (isAdded) {
                      if (onRemoveFromCartByItemId) {
                        onRemoveFromCartByItemId(item.id);
                      }
                    } else {
                      if (onAddToCart) {
                        onAddToCart({
                          cartItemId: `${item.id}-${Date.now()}`,
                          itemId: item.id,
                          name: item.name,
                          image: item.image,
                          restaurantId: restaurant.id,
                          restaurantName: restaurant.name,
                          unitPrice: item.price,
                          quantity: 1,
                          totalPrice: item.price
                        });
                      }
                    }
                  }}
                  className="btn-primary"
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    gap: '0.35rem',
                    background: cartItems.some(c => c.itemId === item.id) ? '#10b981' : undefined,
                    boxShadow: cartItems.some(c => c.itemId === item.id) ? '0 2px 10px rgba(16,185,129,0.35)' : undefined,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cartItems.some(c => c.itemId === item.id) ? (
                    <>
                      <Check size={15} strokeWidth={3} /> Added
                    </>
                  ) : (
                    <>
                      <Plus size={15} /> Add
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
