import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanners from './components/HeroBanners';
import CategoryFilter from './components/CategoryFilter';
import RestaurantCard from './components/RestaurantCard';
import RestaurantDetail from './components/RestaurantDetail';
import ProductPage from './components/ProductPage';
import CartDrawer from './components/CartDrawer';
import CheckoutPage from './components/CheckoutPage';
import OrderTrackerPage from './components/OrderTrackerPage';
import AddressPage from './components/AddressPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import WishlistPage from './components/WishlistPage';
import { verifyJwtToken } from './utils/jwt';

import { RESTAURANTS, PRESET_ADDRESSES } from './data/mockData';
import { Star, Clock, Filter, Plus, Utensils, Sparkles, Heart, ShoppingBag, MapPin } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('light');

  // Live Restaurants State (persisted in LocalStorage)
  const [restaurants, setRestaurants] = useState(() => {
    try {
      const stored = localStorage.getItem('qb_restaurants');
      return stored ? JSON.parse(stored) : RESTAURANTS;
    } catch (e) {
      return RESTAURANTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('qb_restaurants', JSON.stringify(restaurants));
    } catch (e) {}
  }, [restaurants]);

  // Verify JWT Token & Load User Session on Startup
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('qb_token');
      const storedUser = localStorage.getItem('qb_user');

      if (token && storedUser) {
        const payload = verifyJwtToken(token);
        if (payload) {
          return JSON.parse(storedUser);
        }
      }
    } catch (e) {}
    
    // If no verified JWT token is present in Local Storage, default to null (Full Page Login Screen)
    return null;
  });

  const userId = currentUser ? currentUser.id : 'guest';

  // Per-User Saved Favorites Isolation (Empty array [] by default for new users)
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(`qb_favorites_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Per-User Saved Favorite Dishes Isolation
  const [favoriteDishes, setFavoriteDishes] = useState(() => {
    try {
      const stored = localStorage.getItem(`qb_favorite_dishes_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Per-User Cart Isolation
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(`qb_cart_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Per-User Delivery Address Isolation
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const stored = localStorage.getItem(`qb_address_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && (parsed.label || parsed.address)) {
          return parsed;
        }
      }
      return PRESET_ADDRESSES[0];
    } catch (e) {
      return PRESET_ADDRESSES[0];
    }
  });

  // Per-User Active Order Isolation
  const [currentOrder, setCurrentOrder] = useState(() => {
    try {
      const stored = localStorage.getItem(`qb_active_order_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Fetch logged-in user profile from /users/profile using Authorization: Bearer <accessToken>
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('qb_token');
    if (token) {
      fetch('http://localhost:5000/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then(profile => {
        const fullUser = {
          ...profile,
          phone: profile.mobileNumber || profile.phone,
          accessToken: token,
          token
        };
        setCurrentUser(fullUser);
        localStorage.setItem('qb_user', JSON.stringify(fullUser));
      })
      .catch((err) => {
        console.warn('Profile fetch failed or token invalid:', err);
      });
    }
  }, []);

  // Re-load state whenever userId changes
  useEffect(() => {
    if (userId && userId !== 'guest') {
      try {
        const fav = localStorage.getItem(`qb_favorites_${userId}`);
        if (fav) setFavorites(JSON.parse(fav));

        const cart = localStorage.getItem(`qb_cart_${userId}`);
        if (cart) setCartItems(JSON.parse(cart));

        const addr = localStorage.getItem(`qb_address_${userId}`);
        if (addr) {
          const parsedAddr = JSON.parse(addr);
          if (parsedAddr && typeof parsedAddr === 'object' && (parsedAddr.label || parsedAddr.address)) {
            setSelectedAddress(parsedAddr);
          }
        }

        const ord = localStorage.getItem(`qb_active_order_${userId}`);
        if (ord) setCurrentOrder(JSON.parse(ord));
      } catch (e) {}
    }
  }, [userId]);

  // Save per-user state when user or data changes
  useEffect(() => {
    if (userId && userId !== 'guest') {
      localStorage.setItem(`qb_favorites_${userId}`, JSON.stringify(favorites));
    }
  }, [favorites, userId]);

  useEffect(() => {
    if (userId && userId !== 'guest') {
      localStorage.setItem(`qb_favorite_dishes_${userId}`, JSON.stringify(favoriteDishes));
    }
  }, [favoriteDishes, userId]);

  useEffect(() => {
    if (userId && userId !== 'guest') {
      localStorage.setItem(`qb_cart_${userId}`, JSON.stringify(cartItems));
    }
  }, [cartItems, userId]);

  useEffect(() => {
    if (userId && userId !== 'guest') {
      localStorage.setItem(`qb_address_${userId}`, JSON.stringify(selectedAddress));
    }
  }, [selectedAddress, userId]);

  useEffect(() => {
    if (userId && userId !== 'guest') {
      if (currentOrder) {
        localStorage.setItem(`qb_active_order_${userId}`, JSON.stringify(currentOrder));
      } else {
        localStorage.removeItem(`qb_active_order_${userId}`);
      }
    }
  }, [currentOrder, userId]);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [navHistory, setNavHistory] = useState([
    { screen: 'home', params: {} }
  ]);

  const currentNav = navHistory[navHistory.length - 1] || { screen: 'home', params: {} };
  const isAdminDashboardOpen = currentNav.screen === 'admin';
  const isWishlistPageOpen = currentNav.screen === 'wishlist';
  const customizingItem = currentNav.screen === 'product' ? currentNav.params.item : null;
  const selectedRestaurant = currentNav.screen === 'restaurant' ? currentNav.params.restaurant : null;
  const isCheckoutOpen = currentNav.screen === 'checkout';
  const isTrackerOpen = currentNav.screen === 'tracker';

  const navigateTo = (screen, params = {}) => {
    setNavHistory(prev => {
      if (screen === 'home') {
        return [{ screen: 'home', params: {} }];
      }
      return [...prev, { screen, params }];
    });
  };

  const goBack = () => {
    setNavHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  };

  const resetToHome = () => {
    setNavHistory([{ screen: 'home', params: {} }]);
  };

  const setIsAdminDashboardOpen = (val) => {
    if (val) navigateTo('admin');
    else goBack();
  };

  const setIsWishlistPageOpen = (val) => {
    if (val) navigateTo('wishlist');
    else goBack();
  };

  const setSelectedRestaurant = (val) => {
    if (val) navigateTo('restaurant', { restaurant: val });
    else goBack();
  };

  const setCustomizingItem = (val) => {
    if (val) navigateTo('product', { item: val });
    else goBack();
  };

  const setIsCheckoutOpen = (val) => {
    if (val) navigateTo('checkout');
    else goBack();
  };

  const setIsTrackerOpen = (val) => {
    if (val) navigateTo('tracker');
    else goBack();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterTopRatedOnly, setFilterTopRatedOnly] = useState(false);
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [tipPercent, setTipPercent] = useState(15);

  const [customizingRestaurant, setCustomizingRestaurant] = useState(null);
  const [checkoutSummary, setCheckoutSummary] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle typing in Search bar
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      if (customizingItem !== null) setCustomizingItem(null);
      if (selectedRestaurant !== null) setSelectedRestaurant(null);
      if (isAdminDashboardOpen) setIsAdminDashboardOpen(false);
      if (isWishlistPageOpen) setIsWishlistPageOpen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleFavorite = (restaurantId) => {
    if (favorites.includes(restaurantId)) {
      setFavorites(favorites.filter(id => id !== restaurantId));
    } else {
      setFavorites([...favorites, restaurantId]);
    }
  };

  const toggleFavoriteDish = (dishId) => {
    if (favoriteDishes.includes(dishId)) {
      setFavoriteDishes(prev => prev.filter(id => id !== dishId));
    } else {
      setFavoriteDishes(prev => [...prev, dishId]);
    }
  };

  const handleAddToCart = (newItem) => {
    setCartItems(prev => [...prev, newItem]);
  };

  const handleUpdateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
    } else {
      setCartItems(prev => prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const unitPrice = item.unitPrice;
          return {
            ...item,
            quantity: newQty,
            totalPrice: unitPrice * newQty
          };
        }
        return item;
      }));
    }
  };

  const handleRemoveCartItem = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const handleRemoveFromCartByItemId = (itemId) => {
    setCartItems(prev => prev.filter(item => item.itemId !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('qb_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('qb_user');
    setIsAdminDashboardOpen(false);
    setIsWishlistPageOpen(false);
    setSearchQuery('');
    setCustomizingItem(null);
    setCustomizingRestaurant(null);
    setSelectedRestaurant(null);
    // Do NOT clear in-state arrays immediately, as the useEffect triggers will overwrite the logged-out user's localstorage records with [].
    // The load hook above will automatically pull the correct isolated user state when a new user logs in.
  };

  // Filter restaurants
  const filteredRestaurants = restaurants.filter(r => {
    if (activeCategory !== 'all' && r.category !== activeCategory) {
      return false;
    }
    if (filterTopRatedOnly && r.rating < 4.8) {
      return false;
    }
    if (filterVegOnly && !r.isVeg) {
      return false;
    }
    if (showFavoritesOnly && !favorites.includes(r.id)) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.name.toLowerCase().includes(q);
      const descMatch = r.description.toLowerCase().includes(q);
      const menuMatch = r.menu.some(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
      if (!nameMatch && !descMatch && !menuMatch) return false;
    }
    return true;
  });

  // Extract matching dishes when search query is active
  let searchedDishes = [];
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    restaurants.forEach(r => {
      r.menu.forEach(item => {
        if (
          item.name.toLowerCase().includes(q) || 
          item.description.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q)
        ) {
          searchedDishes.push({ ...item, restaurant: r });
        }
      });
    });
  }

  // Standalone Full Page Login Screen if unauthenticated or triggered
  if (isAuthOpen || currentUser === null) {
    return (
      <LoginPage 
        onLoginSuccess={(userData) => {
          setCurrentUser(userData);
          setIsAuthOpen(false);
          if (userData.role === 'admin') {
            setIsAdminDashboardOpen(true);
          }
        }}
        onGuestContinue={() => {
          setIsAuthOpen(false);
        }}
      />
    );
  }

  const handleBuyNowItem = (newItem) => {
    setCartItems(prev => [...prev, newItem]);
    setCustomizingItem(null);
    const sub = newItem.totalPrice;
    const del = 35;
    const tx = sub * 0.05;
    setCheckoutSummary({
      subtotal: sub,
      deliveryFee: del,
      tax: tx,
      tipAmount: 0,
      discount: 0,
      finalTotal: sub + del + tx
    });
    setIsCheckoutOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      
      {/* Universal Responsive Navbar Header */}
      <Navbar 
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
        locationTitle={selectedAddress ? selectedAddress.title : 'Engapuzha'}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        favoriteCount={favorites.length + favoriteDishes.length}
        onOpenFavorites={() => {
          navigateTo('wishlist');
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetToHome={() => {
          resetToHome();
          setActiveCategory('all');
          setSearchQuery('');
          setShowFavoritesOnly(false);
        }}
        onSelectRestaurant={(rest) => {
          navigateTo('restaurant', { restaurant: rest });
        }}
        onOpenItemCustomizer={(item, rest) => {
          setCustomizingRestaurant(rest);
          navigateTo('product', { item });
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenAdminDashboard={() => {
          navigateTo('admin');
        }}
        restaurants={restaurants}
      />

      <main className="main-content">
        
        {isAdminDashboardOpen ? (
          /* Full Page Admin Dashboard Component */
          <AdminDashboard 
            currentUser={currentUser}
            onBackToStore={() => setIsAdminDashboardOpen(false)}
            restaurants={restaurants}
            onUpdateRestaurants={setRestaurants}
          />
        ) : isWishlistPageOpen ? (
          /* Full Page Wishlist Component */
          <WishlistPage
            favorites={favorites}
            favoriteDishes={favoriteDishes}
            onToggleFavorite={toggleFavorite}
            onToggleFavoriteDish={toggleFavoriteDish}
            onSelectRestaurant={(rest) => {
              navigateTo('restaurant', { restaurant: rest });
            }}
            onBackToHome={goBack}
            currentUser={currentUser}
            onAddToCart={handleAddToCart}
            restaurants={restaurants}
          />
        ) : customizingItem ? (
          /* Full Page Product View Component */
          <ProductPage 
            item={customizingItem}
            restaurant={customizingRestaurant}
            onBack={() => setCustomizingItem(null)}
            onAddToCart={(newItem) => {
              handleAddToCart(newItem);
            }}
            onBuyNow={handleBuyNowItem}
            isFavoriteDish={favoriteDishes.includes(customizingItem.id)}
            onToggleFavoriteDish={() => toggleFavoriteDish(customizingItem.id)}
            cartItems={cartItems}
            onRemoveFromCartByItemId={handleRemoveFromCartByItemId}
          />
        ) : selectedRestaurant ? (
          /* Full Page Restaurant View Component */
          <RestaurantDetail 
            restaurant={restaurants.find(r => r.id === selectedRestaurant.id) || selectedRestaurant}
            onBack={() => setSelectedRestaurant(null)}
            onOpenItemCustomizer={(item, rest) => {
              setCustomizingItem(item);
              setCustomizingRestaurant(rest);
            }}
            favoriteDishes={favoriteDishes}
            onToggleFavoriteDish={toggleFavoriteDish}
            onAddToCart={handleAddToCart}
            cartItems={cartItems}
            onRemoveFromCartByItemId={handleRemoveFromCartByItemId}
          />
        ) : (
          /* Main Homepage Grid */
          <>
            {/* Personalized Customer Welcome Banner for Logged In User */}
            {currentUser && (
              <div 
                className="welcome-banner"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 12px var(--primary-glow)'
                  }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      Welcome back, {currentUser.name}! <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Verified JWT Session • <strong>{favorites.length} Saved Favorites</strong> • <strong>{cartItems.length} Cart Items</strong>
                    </span>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setIsAdminDashboardOpen(true)}
                    className="btn-primary"
                    style={{ background: '#10b981', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  >
                    Launch Admin Dashboard
                  </button>
                )}
              </div>
            )}

            {/* Promo Carousel */}
            <HeroBanners 
              onApplyPromoCode={(codeObjOrString) => {
                const found = typeof codeObjOrString === 'string' 
                  ? { code: codeObjOrString, discountType: 'percentage', value: 50, maxDiscount: 150, minOrder: 199 }
                  : codeObjOrString;
                setAppliedPromo(found);
                setIsCartOpen(true);
              }} 
            />

            {/* Category Filter Chips */}
            <CategoryFilter 
              activeCategory={activeCategory}
              onSelectCategory={(catId) => {
                setActiveCategory(catId);
                setShowFavoritesOnly(false);
              }}
            />

            {/* If searching for specific food dishes, display Matching Dishes Section */}
            {searchQuery.trim().length > 0 && searchedDishes.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
                    🍲 Dishes Matching "{searchQuery}" ({searchedDishes.length})
                  </h3>
                </div>

                <div className="grid-menu">
                  {searchedDishes.map((item) => (
                    <div 
                      key={item.id} 
                      className="glass-card"
                      onClick={() => {
                        setCustomizingItem(item);
                        setCustomizingRestaurant(item.restaurant);
                      }}
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
                        <img 
                          src={item.image} 
                          alt={item.name}
                          style={{ width: '90px', height: '90px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '800', display: 'block' }}>
                            {item.restaurant.name}
                          </span>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.2rem', color: 'var(--text-main)' }}>
                            {item.name}
                          </h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)' }}>
                          ₹{item.price}
                        </span>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', gap: '0.3rem' }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Bar Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>
                  {showFavoritesOnly 
                    ? `Saved Favorite Restaurants for ${currentUser ? currentUser.name.split(' ')[0] : 'You'}` 
                    : searchQuery.trim() !== ''
                      ? `Restaurants for "${searchQuery}"`
                      : activeCategory === 'all' 
                        ? 'Popular Restaurants Nearby' 
                        : `${activeCategory.toUpperCase()} Restaurants`}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {filteredRestaurants.length} places available for express delivery
                </span>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterTopRatedOnly(!filterTopRatedOnly)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: `1px solid ${filterTopRatedOnly ? 'var(--accent-amber)' : 'var(--border-color)'}`,
                    background: filterTopRatedOnly ? 'rgba(245,158,11,0.15)' : 'var(--bg-card)',
                    color: filterTopRatedOnly ? 'var(--accent-amber)' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Star size={14} fill={filterTopRatedOnly ? 'currentColor' : 'none'} />
                  4.8+ Top Rated
                </button>

                <button
                  onClick={() => setFilterVegOnly(!filterVegOnly)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: `1px solid ${filterVegOnly ? '#10b981' : 'var(--border-color)'}`,
                    background: filterVegOnly ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
                    color: filterVegOnly ? '#10b981' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  🌱 Pure Veg
                </button>

                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: `1px solid ${showFavoritesOnly ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                    background: showFavoritesOnly ? 'rgba(244,63,94,0.15)' : 'var(--bg-card)',
                    color: showFavoritesOnly ? 'var(--accent-rose)' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  Saved ({favorites.length})
                </button>
              </div>
            </div>

            {/* Restaurant Grid */}
            {filteredRestaurants.length === 0 && searchedDishes.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-color)'
              }}>
                <Filter size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  No restaurants or dishes found for "{searchQuery}"
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Try searching for biryani, pizza, sushi, butter chicken, or burger!
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setFilterTopRatedOnly(false);
                    setFilterVegOnly(false);
                    setShowFavoritesOnly(false);
                  }}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid-restaurants">
                {filteredRestaurants.map((restaurant) => (
                  <RestaurantCard 
                    key={restaurant.id}
                    restaurant={restaurant}
                    isFavorite={favorites.includes(restaurant.id)}
                    onToggleFavorite={toggleFavorite}
                    onSelectRestaurant={setSelectedRestaurant}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* Floating Active Order Tracker Widget */}
      {currentOrder && !isTrackerOpen && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 90,
          background: currentOrder.status === 'CANCELLED' 
            ? 'linear-gradient(135deg, #f43f5e, #e11d48)' 
            : 'linear-gradient(135deg, var(--primary), #ff7a38)',
          color: '#ffffff',
          padding: '0.4rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          boxShadow: currentOrder.status === 'CANCELLED' 
            ? '0 4px 14px rgba(244,63,94,0.4)' 
            : '0 4px 14px var(--primary-glow)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          animation: 'pulseGlow 2s infinite ease-in-out'
        }}
        onClick={() => setIsTrackerOpen(true)}
        >
          <Clock size={15} />
          <div>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: '800', opacity: 0.9, display: 'block', lineHeight: '1.1' }}>
              {currentOrder.status === 'CANCELLED' ? 'Order Cancelled & Refunded' : `Active Order #${currentOrder.orderId}`}
            </span>
            <span style={{ fontSize: '0.76rem', fontWeight: '800', lineHeight: '1.2', display: 'block' }}>
              {currentOrder.status === 'CANCELLED' ? 'Tap to View Refund Receipt 💸' : 'Tap to View Live Courier Map 🛵'}
            </span>
          </div>
        </div>
      )}

      {/* Cart Side Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        appliedPromo={appliedPromo}
        onApplyPromo={setAppliedPromo}
        onRemovePromo={() => setAppliedPromo(null)}
        tipPercent={tipPercent}
        onSelectTip={setTipPercent}
        onItemClick={(cartItem) => {
          setIsCartOpen(false);
          const fullRestaurant = restaurants.find(r => r.id === cartItem.restaurantId);
          if (fullRestaurant) {
            const fullItem = fullRestaurant.menu.find(m => m.id === cartItem.itemId);
            if (fullItem) {
              setCustomizingRestaurant(fullRestaurant);
              navigateTo('product', { item: fullItem });
            }
          }
        }}
        onProceedToCheckout={(summary) => {
          setCheckoutSummary(summary);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Page Full Screen */}
      {isCheckoutOpen && (
        <CheckoutPage 
          onBack={() => setIsCheckoutOpen(false)}
          selectedAddress={selectedAddress}
          onOpenAddressModal={() => setIsAddressModalOpen(true)}
          pricingSummary={checkoutSummary}
          onOrderSuccess={(orderData) => {
            setIsCheckoutOpen(false);
            setCartItems([]);
            setAppliedPromo(null);
            setCurrentOrder(orderData);
            setIsTrackerOpen(true);
          }}
        />
      )}

      {/* Real-time Order Tracker Page */}
      {isTrackerOpen && (
        <OrderTrackerPage 
          onClose={() => setIsTrackerOpen(false)}
          orderDetails={currentOrder}
          onCancelOrder={(refundInfo) => {
            if (currentOrder) {
              setCurrentOrder({
                ...currentOrder,
                status: 'CANCELLED',
                refundDetails: refundInfo
              });
            }
          }}
        />
      )}

      {/* Address Switcher Page */}
      {isAddressModalOpen && (
        <AddressPage 
          onClose={() => setIsAddressModalOpen(false)}
          selectedAddress={selectedAddress}
          onSelectAddress={setSelectedAddress}
        />
      )}



    </div>
  );
}
