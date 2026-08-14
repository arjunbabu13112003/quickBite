import React from 'react';
import { Star, Clock, Heart, Tag } from 'lucide-react';

export default function RestaurantCard({
  restaurant,
  isFavorite,
  onToggleFavorite,
  onSelectRestaurant
}) {
  return (
    <div 
      className="glass-card"
      onClick={() => onSelectRestaurant(restaurant)}
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
        <img 
          src={restaurant.image} 
          alt={restaurant.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap'
        }}>
          {restaurant.isTopRated && (
            <span className="badge badge-star">
              <Star size={12} fill="currentColor" /> Top Rated
            </span>
          )}
          {restaurant.offerText && (
            <span className="badge badge-offer">
              <Tag size={12} /> {restaurant.offerText}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(restaurant.id);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            transition: 'transform 0.2s ease'
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart 
            size={18} 
            style={{ 
              color: isFavorite ? 'var(--accent-rose)' : '#ffffff', 
              fill: isFavorite ? 'var(--accent-rose)' : 'none' 
            }} 
          />
        </button>

        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          color: '#ffffff',
          padding: '0.25rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <Clock size={13} style={{ color: 'var(--primary)' }} />
          {restaurant.deliveryTime}
        </div>
      </div>

      <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', flex: '1', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: '800',
              color: 'var(--text-main)',
              lineHeight: '1.25'
            }}>
              {restaurant.name}
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: '800',
              fontSize: '0.9rem',
              color: 'var(--accent-amber)'
            }}>
              <Star size={15} fill="currentColor" />
              <span>{restaurant.rating}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                ({restaurant.reviewsCount})
              </span>
            </div>
          </div>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {restaurant.description}
          </p>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <span style={{ fontWeight: '600', color: restaurant.deliveryFee === 0 ? '#10b981' : 'var(--text-muted)' }}>
            {restaurant.deliveryFee === 0 ? 'FREE Delivery' : `₹${restaurant.deliveryFee} Delivery`}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
              {restaurant.priceTier}
            </span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              background: 'var(--bg-subtle)'
            }}>
              Min ₹{restaurant.minOrder}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
