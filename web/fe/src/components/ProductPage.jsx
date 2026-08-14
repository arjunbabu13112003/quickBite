import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Flame, 
  Sparkles, 
  Check, 
  Plus, 
  Minus, 
  ShoppingBag,
  ShieldCheck,
  Heart,
  MessageSquare,
  Zap
} from 'lucide-react';

export default function ProductPage({
  item,
  restaurant,
  onBack,
  onAddToCart,
  onBuyNow,
  isFavoriteDish,
  onToggleFavoriteDish,
  cartItems = [],
  onRemoveFromCartByItemId
}) {
  // Reset window scroll position to top when product page mounts so image is visible immediately
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [item?.id]);

  if (!item) return null;

  const defaultFoodImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

  // Gallery images array
  const galleryImages = [
    item.image || defaultFoodImg,
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
  ];

  const [activeImage, setActiveImage] = useState(galleryImages[0]);
  const [selectedSize, setSelectedSize] = useState(
    item.sizes && item.sizes.length > 0 ? item.sizes[0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  const ingredients = item.ingredients || [
    'Organic Sourdough Base',
    'San Marzano Italian Tomatoes',
    'Fresh Fior Di Latte Mozzarella',
    'Extra Virgin Olive Oil',
    'Fresh Handpicked Basil Leaves',
    'Aromatic Chef Herb Seasoning'
  ];

  const reviews = [
    {
      id: 1,
      name: 'Ananya S.',
      rating: 5,
      date: 'Yesterday',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      comment: 'Super fresh and piping hot! The authentic taste and quality were unmatched. 10/10 recommend.'
    },
    {
      id: 2,
      name: 'Vipin Kumar',
      rating: 4.8,
      date: '3 days ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      comment: 'Great portion size and amazing crust texture. Delivered well within estimated time.'
    }
  ];

  // Dynamic price calculation
  const basePrice = item.price;
  const sizeExtra = selectedSize ? selectedSize.priceExtra : 0;
  const addonsTotal = selectedAddons.reduce((acc, addon) => acc + addon.price, 0);
  const unitPrice = basePrice + sizeExtra + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addon) => {
    if (selectedAddons.find(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const isAdded = cartItems.some(c => c.itemId === item.id);

  const handleConfirmAdd = () => {
    if (isAdded) {
      if (onRemoveFromCartByItemId) {
        onRemoveFromCartByItemId(item.id);
      }
    } else {
      onAddToCart({
        cartItemId: `${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        image: activeImage,
        restaurantId: restaurant ? restaurant.id : null,
        restaurantName: restaurant ? restaurant.name : 'QuickBite Partner',
        size: selectedSize ? selectedSize.name : null,
        addons: selectedAddons,
        instructions,
        unitPrice,
        quantity: 1,
        totalPrice: unitPrice
      });
    }
  };

  const handleBuyNow = () => {
    const newItem = {
      cartItemId: `${item.id}-${Date.now()}`,
      itemId: item.id,
      name: item.name,
      image: activeImage,
      restaurantId: restaurant ? restaurant.id : null,
      restaurantName: restaurant ? restaurant.name : 'QuickBite Partner',
      size: selectedSize ? selectedSize.name : null,
      addons: selectedAddons,
      instructions,
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice
    };
    if (onBuyNow) {
      onBuyNow(newItem);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '3rem' }}>
      
      {/* Top Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ gap: '0.5rem', fontWeight: '700' }}
        >
          <ArrowLeft size={18} /> Back to {restaurant ? restaurant.name : 'Menu'}
        </button>

        <button
          onClick={onToggleFavoriteDish}
          className="btn-icon"
          title={isFavoriteDish ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart size={20} style={{ color: isFavoriteDish ? 'var(--accent-rose)' : 'inherit', fill: isFavoriteDish ? 'var(--accent-rose)' : 'none' }} />
        </button>
      </div>

      {/* Main Full Page Two-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Full Hero Photo + Gallery Thumbnails + Ingredients + Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Main Hero Photo Container */}
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <div style={{ height: '380px', width: '100%', position: 'relative' }}>
              <img 
                src={activeImage} 
                alt={item.name}
                onError={(e) => { e.currentTarget.src = defaultFoodImg; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s ease' }}
              />
            </div>

            {/* Gallery Thumbnails Row */}
            <div style={{
              padding: '1rem',
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.75rem'
            }}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: `2px solid ${activeImage === img ? 'var(--primary)' : 'var(--border-color)'}`,
                    boxShadow: activeImage === img ? '0 4px 12px var(--primary-glow)' : 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  <img 
                    src={img} 
                    alt="thumb" 
                    onError={(e) => { e.currentTarget.src = defaultFoodImg; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Fresh Ingredients Section Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text-main)' }}>
              🌱 Fresh & Premium Ingredients
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-subtle)',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <Check size={16} style={{ color: '#10b981' }} />
                  <span>{ing}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                ⭐ Verified Customer Reviews
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontWeight: '800' }}>
                ★ 4.9 / 5.0 Rating
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {reviews.map((rev) => (
                <div key={rev.id} style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img src={rev.avatar} alt={rev.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: '800', display: 'block' }}>{rev.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Verified Order • {rev.date}</span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: '800' }}>
                      ★ {rev.rating}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Sticky Product Options & Ordering Panel */}
        <div className="glass-card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
          
          {/* Product Badges & Rating */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {item.isVeg ? (
                <span className="badge badge-green">🌱 VEG</span>
              ) : (
                <span className="badge badge-offer">🍖 NON-VEG</span>
              )}
              {item.isPopular && (
                <span className="badge badge-primary">CHEF SPECIAL</span>
              )}
            </div>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              by {restaurant ? restaurant.name : 'QuickBite'}
            </span>
          </div>

          {/* Product Title & Price */}
          <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {item.name}
          </h1>

          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem' }}>
            ₹{item.price}
          </div>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            {item.description}
          </p>

          {/* Highlight Specs Bar */}
          <div style={{
            display: 'flex',
            gap: '0.65rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Flame size={15} style={{ color: 'var(--primary)' }} /> 480 Calories
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Clock size={15} style={{ color: 'var(--accent-amber)' }} /> 15-20 min Prep
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Sparkles size={15} style={{ color: '#10b981' }} /> 100% Fresh Daily
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.25rem 0' }} />

          {/* Portion Size Selection */}
          {item.sizes && item.sizes.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.65rem', color: 'var(--text-main)' }}>
                Select Portion Size
              </h4>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {item.sizes.map((sz) => {
                  const isSelected = selectedSize?.name === sz.name;
                  return (
                    <button
                      key={sz.name}
                      onClick={() => setSelectedSize(sz)}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {sz.name} {sz.priceExtra > 0 && `(+₹${sz.priceExtra})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-on Toppings Selection */}
          {item.addons && item.addons.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.65rem', color: 'var(--text-main)' }}>
                Add Extra Toppings & Sides
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {item.addons.map((addon) => {
                  const isChecked = !!selectedAddons.find(a => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.7rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--text-muted)'}`,
                          background: isChecked ? 'var(--primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}>
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.88rem', fontWeight: '700' }}>{addon.name}</span>
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--primary)' }}>
                        +₹{addon.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cooking Instructions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.45rem', color: 'var(--text-main)' }}>
              Special Cooking Instructions
            </h4>
            <input 
              type="text"
              placeholder="e.g., Less spicy, sauce on the side..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Action Buttons: Add to Cart & Buy Now */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleConfirmAdd}
              className="btn-secondary"
              style={{
                flex: '1',
                minWidth: '130px',
                padding: '0.85rem 1rem',
                fontSize: '0.92rem',
                fontWeight: '800',
                borderRadius: 'var(--radius-full)',
                gap: '0.4rem',
                justifyContent: 'center',
                background: isAdded ? 'rgba(16, 185, 129, 0.15)' : undefined,
                color: isAdded ? '#10b981' : undefined,
                borderColor: isAdded ? '#10b981' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              {isAdded ? (
                <>
                  <Check size={18} strokeWidth={3} />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              className="btn-primary"
              style={{
                flex: '1',
                minWidth: '160px',
                padding: '0.85rem 1rem',
                fontSize: '0.92rem',
                fontWeight: '800',
                borderRadius: 'var(--radius-full)',
                gap: '0.4rem',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Zap size={18} />
              <span>Buy Now • ₹{unitPrice}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
