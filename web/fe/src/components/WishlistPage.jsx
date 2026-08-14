import React, { useState } from 'react';
import { 
  Heart, 
  Trash2, 
  ShoppingBag, 
  ArrowLeft, 
  Star, 
  Clock, 
  Sparkles, 
  Utensils, 
  ChefHat, 
  MapPin, 
  ExternalLink,
  Search,
  Check,
  Plus
} from 'lucide-react';
import { RESTAURANTS } from '../data/mockData';

export default function WishlistPage({
  favorites = [],
  favoriteDishes = [],
  onToggleFavorite,
  onToggleFavoriteDish,
  onSelectRestaurant,
  onBackToHome,
  currentUser,
  onAddToCart,
  restaurants = []
}) {
  const [activeTab, setActiveTab] = useState('restaurants'); // 'restaurants' or 'dishes'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'top-rated', 'fast-delivery'

  const restaurantsData = restaurants && restaurants.length > 0 ? restaurants : RESTAURANTS;

  // Get full restaurant objects for saved favorite IDs
  const favoriteRestaurantsList = restaurantsData.filter(r => favorites.includes(r.id));

  // Get full dish objects for saved favorite dish IDs
  const savedDishesList = [];
  restaurantsData.forEach(r => {
    if (r.menu) {
      r.menu.forEach(item => {
        if (favoriteDishes.includes(item.id)) {
          savedDishesList.push({ ...item, restaurant: r });
        }
      });
    }
  });

  // Filtered favorite restaurants
  const filteredRestaurants = favoriteRestaurantsList.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'top-rated') {
      return r.rating >= 4.8;
    }
    if (filterType === 'fast-delivery') {
      return parseInt(r.deliveryTime) <= 25;
    }
    return true;
  });

  // Filtered favorite dishes
  const filteredDishes = savedDishesList.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalFavoritesCount = favoriteRestaurantsList.length + savedDishesList.length;

  return (
    <div style={{ paddingBottom: '3rem', width: '100%', margin: '0 auto' }}>
      
      {/* Top Breadcrumb & Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >
          <ArrowLeft size={18} /> Back to Explore
        </button>

        {totalFavoritesCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {favoriteRestaurantsList.length} Saved Places • {savedDishesList.length} Saved Dishes
            </span>
          </div>
        )}
      </div>

      {/* Hero Wishlist Header Banner */}
      <div 
        className="wishlist-header-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(255, 122, 56, 0.1) 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1.1rem',
          marginBottom: '1.25rem',
          border: '1.5px solid rgba(244, 63, 94, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 4px 14px rgba(244, 63, 94, 0.08)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: '800', marginBottom: '0.3rem' }}>
            <Heart size={12} fill="#f43f5e" /> MY WISHLIST
          </div>
          
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem', lineHeight: '1.2' }}>
            Saved Favorites {currentUser ? `for ${currentUser.name.split(' ')[0]}` : ''} ❤️
          </h2>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '600px', lineHeight: '1.3' }}>
            Your curated collection of top-rated restaurants & favorite dining spots.
          </p>
        </div>

        {/* Tab Selection Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('restaurants')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              border: activeTab === 'restaurants' ? 'none' : '1px solid var(--border-color)',
              background: activeTab === 'restaurants' ? '#f43f5e' : 'var(--bg-card)',
              color: activeTab === 'restaurants' ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: activeTab === 'restaurants' ? '0 4px 12px rgba(244,63,94,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Utensils size={14} /> Saved Places ({favoriteRestaurantsList.length})
          </button>

          <button
            onClick={() => setActiveTab('dishes')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              border: activeTab === 'dishes' ? 'none' : '1px solid var(--border-color)',
              background: activeTab === 'dishes' ? '#f43f5e' : 'var(--bg-card)',
              color: activeTab === 'dishes' ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: activeTab === 'dishes' ? '0 4px 12px rgba(244,63,94,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Heart size={14} fill="currentColor" /> Saved Dishes ({savedDishesList.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {totalFavoritesCount === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          border: '1.5px dashed var(--border-color)',
          maxWidth: '580px',
          margin: '2rem auto'
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.1)',
            color: '#f43f5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Heart size={38} strokeWidth={1.8} />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Your Wishlist is Empty
          </h3>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
            Tap the heart icon ❤️ on any restaurant or dish to save it to your personal wishlist for instant 1-tap ordering!
          </p>

          <button
            onClick={onBackToHome}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.75rem',
              fontSize: '0.9rem',
              fontWeight: '800',
              borderRadius: 'var(--radius-full)',
              gap: '0.5rem'
            }}
          >
            <Utensils size={17} /> Explore Menu & Restaurants
          </button>
        </div>
      ) : (
        <>
          {/* Search Bar for Wishlist */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={`Search saved ${activeTab === 'restaurants' ? 'restaurants' : 'dishes'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem 0.6rem 2.4rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* TAB 1: SAVED RESTAURANTS */}
          {activeTab === 'restaurants' && (
            <div>
              {filteredRestaurants.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No saved restaurants match your search.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {filteredRestaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="glass-card"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        border: '1.5px solid var(--border-color)'
                      }}
                    >
                      <div style={{ position: 'relative', height: '175px', overflow: 'hidden' }}>
                        <img
                          src={restaurant.image}
                          alt={restaurant.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)'
                        }} />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(restaurant.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            zIndex: 3
                          }}
                          title="Remove from Wishlist"
                        >
                          <Heart size={18} fill="#f43f5e" color="#f43f5e" />
                        </button>
                      </div>

                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                              {restaurant.name}
                            </h3>
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#d97706',
                              fontWeight: '800',
                              fontSize: '0.78rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}>
                              <Star size={12} fill="currentColor" /> {restaurant.rating}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            {restaurant.category} • {restaurant.description}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            onClick={() => onSelectRestaurant(restaurant)}
                            className="btn-primary"
                            style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem', fontWeight: '800', justifyContent: 'center' }}
                          >
                            View Menu <ExternalLink size={13} />
                          </button>

                          <button
                            onClick={() => onToggleFavorite(restaurant.id)}
                            style={{
                              padding: '0.55rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(244, 63, 94, 0.1)',
                              color: '#f43f5e',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED DISHES */}
          {activeTab === 'dishes' && (
            <div>
              {filteredDishes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    No saved dishes found. Tap the heart icon ❤️ on any food item to save it here!
                  </p>
                  <button onClick={onBackToHome} className="btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.82rem' }}>
                    Browse Menu Items
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {filteredDishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="glass-card"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '1.5px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.75rem' }}>
                        <img 
                          src={dish.image} 
                          alt={dish.name} 
                          style={{ width: '85px', height: '85px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: dish.isVeg ? '#10b981' : '#f43f5e', textTransform: 'uppercase' }}>
                            {dish.isVeg ? '🌱 VEG' : '🍖 NON-VEG'}
                          </span>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.15rem 0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {dish.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                            by {dish.restaurant.name}
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)' }}>
                            ₹{dish.price}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-color)' }}>
                        <button
                          onClick={() => onAddToCart && onAddToCart({
                            cartItemId: `${dish.id}-${Date.now()}`,
                            id: dish.id,
                            name: dish.name,
                            price: dish.price,
                            unitPrice: dish.price,
                            quantity: 1,
                            image: dish.image,
                            restaurantName: dish.restaurant.name
                          })}
                          className="btn-primary"
                          style={{ flex: 1, padding: '0.45rem 0.8rem', fontSize: '0.8rem', gap: '0.3rem', justifyContent: 'center' }}
                        >
                          <ShoppingBag size={14} /> Add to Cart
                        </button>

                        <button
                          onClick={() => onToggleFavoriteDish && onToggleFavoriteDish(dish.id)}
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(244, 63, 94, 0.1)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove from Saved Dishes"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
