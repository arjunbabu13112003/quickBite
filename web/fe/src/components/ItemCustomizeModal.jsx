import React, { useState } from 'react';
import { X, Plus, Minus, Check, Star, Clock, Flame, ShieldAlert, Sparkles, Heart, ThumbsUp } from 'lucide-react';

export default function ItemCustomizeModal({
  item,
  restaurant,
  onClose,
  onAddToCart
}) {
  if (!item) return null;

  // Gallery images array (fallback to generated gallery if single image)
  const galleryImages = [
    item.image,
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
  ];

  const [activeImage, setActiveImage] = useState(galleryImages[0]);
  const [selectedSize, setSelectedSize] = useState(
    item.sizes && item.sizes.length > 0 ? item.sizes[0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [activeTab, setActiveTab] = useState('customize'); // 'customize', 'ingredients', 'reviews'

  // Default Mock Ingredients if not specified
  const ingredients = item.ingredients || [
    'Organic Wheat Flour Sourdough',
    'San Marzano Italian Tomatoes',
    'Fresh Fior Di Latte Mozzarella',
    'Cold Pressed Extra Virgin Olive Oil',
    'Fresh Handpicked Basil Leaves',
    'Signature Chef Herb Seasoning'
  ];

  // Default Mock Reviews
  const reviews = [
    {
      id: 1,
      name: 'Ananya S.',
      rating: 5,
      date: 'Yesterday',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      comment: 'Absolutely authentic flavor! Arrived piping hot within 20 mins. Will order again.'
    },
    {
      id: 2,
      name: 'Vipin Kumar',
      rating: 4.8,
      date: '3 days ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      comment: 'Generous portions and fresh ingredients. The extra truffle cheese topping is a must-try!'
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

  const handleConfirmAdd = () => {
    onAddToCart({
      cartItemId: `${item.id}-${Date.now()}`,
      itemId: item.id,
      name: item.name,
      image: activeImage,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      size: selectedSize ? selectedSize.name : null,
      addons: selectedAddons,
      instructions,
      unitPrice,
      quantity,
      totalPrice
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        
        {/* Main Photo Hero + Gallery Switcher */}
        <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
          <img 
            src={activeImage} 
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s ease' }}
          />

          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(15, 23, 42, 0.75)',
              color: '#ffffff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              zIndex: 10
            }}
          >
            <X size={18} />
          </button>

          {/* Gallery Thumbnails Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 10
          }}>
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: `2px solid ${activeImage === img ? 'var(--primary)' : '#ffffff'}`,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Header Info */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--accent-amber)', fontWeight: '800', fontSize: '0.9rem' }}>
                <Star size={16} fill="currentColor" />
                <span>4.9</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>(140+ reviews)</span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {item.name}
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              {item.description}
            </p>
          </div>

          {/* Quick Specs Pill Highlights */}
          <div style={{
            display: 'flex',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Flame size={14} style={{ color: 'var(--primary)' }} /> 480 Calories
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Clock size={14} style={{ color: 'var(--accent-amber)' }} /> 15-20 min Prep
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)'
            }}>
              <Sparkles size={14} style={{ color: '#10b981' }} /> 100% Fresh Daily
            </div>
          </div>

          {/* Details / Ingredients / Reviews Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1.25rem',
            paddingBottom: '0.5rem'
          }}>
            <button
              onClick={() => setActiveTab('customize')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: '700',
                fontSize: '0.85rem',
                background: activeTab === 'customize' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'customize' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              Customize & Add
            </button>

            <button
              onClick={() => setActiveTab('ingredients')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: '700',
                fontSize: '0.85rem',
                background: activeTab === 'ingredients' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'ingredients' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              Fresh Ingredients
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: '700',
                fontSize: '0.85rem',
                background: activeTab === 'reviews' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'reviews' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              Customer Reviews (4.9)
            </button>
          </div>

          {/* Tab 1: Customization Form */}
          {activeTab === 'customize' && (
            <div>
              {/* Size Options */}
              {item.sizes && item.sizes.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                    Choose Portion Size
                  </h4>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {item.sizes.map((sz) => {
                      const isSelected = selectedSize?.name === sz.name;
                      return (
                        <button
                          key={sz.name}
                          onClick={() => setSelectedSize(sz)}
                          style={{
                            padding: '0.5rem 0.9rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
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

              {/* Add-ons & Toppings */}
              {item.addons && item.addons.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                    Add Extra Toppings & Sides
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: isChecked ? 'var(--primary-light)' : 'var(--bg-subtle)',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                            <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{addon.name}</span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>
                            +₹{addon.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Cooking Instructions
                </h4>
                <input 
                  type="text"
                  placeholder="e.g., Make it extra spicy, sauce on the side..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Ingredients List */}
          {activeTab === 'ingredients' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.75rem' }}>
                Fresh & Authentic Ingredients
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {ingredients.map((ing, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    <Check size={14} style={{ color: '#10b981' }} />
                    <span>{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reviews.map((rev) => (
                <div key={rev.id} style={{
                  background: 'var(--bg-subtle)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img src={rev.avatar} alt={rev.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', display: 'block' }}>{rev.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Verified Customer • {rev.date}</span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: '800' }}>
                      ★ {rev.rating}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Controls & Add Button Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-subtle)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: '800', fontSize: '0.95rem', minWidth: '20px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={handleConfirmAdd}
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap', justifyContent: 'center', gap: '0.4rem' }}
            >
              <span>Add to Cart</span> • <span>₹{totalPrice}</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
