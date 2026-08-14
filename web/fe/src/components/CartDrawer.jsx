import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, Tag, Check, ArrowRight, ShoppingBag } from 'lucide-react';
import { PROMO_CODES } from '../data/mockData';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
  tipPercent,
  onSelectTip,
  onItemClick,
}) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  // Prevent background scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const subtotal = (cartItems || []).reduce((sum, item) => {
    const itemPrice = Number(item.totalPrice || item.unitPrice || item.price || 0);
    return sum + (isNaN(itemPrice) ? 0 : itemPrice);
  }, 0);

  const deliveryFee = subtotal > 0 ? 35 : 0;
  const tax = subtotal * 0.05; // 5% GST

  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      discount = Math.min((subtotal * (appliedPromo.value || 0)) / 100, appliedPromo.maxDiscount || 999);
    } else if (appliedPromo.discountType === 'delivery') {
      discount = deliveryFee;
    } else if (appliedPromo.discountType === 'fixed') {
      discount = Number(appliedPromo.value || 0);
    }
  }

  const tipAmount = (subtotal * Number(tipPercent || 0)) / 100;
  const finalTotal = Math.max(0, subtotal + deliveryFee + tax + tipAmount - discount);

  const handleApplyPromoCode = (e) => {
    e.preventDefault();
    setPromoError('');
    const found = PROMO_CODES.find(p => p.code.toUpperCase() === promoInput.trim().toUpperCase());
    
    if (!found) {
      setPromoError('Invalid promo code. Try WELCOME50, FREEDELIVERY or SAVOUR50');
      return;
    }

    if (subtotal < found.minOrder) {
      setPromoError(`Minimum order of ₹${found.minOrder} required for this code`);
      return;
    }

    onApplyPromo(found);
    setPromoInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Your Order Cart</h3>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)'
            }}>
              {cartItems.length} items
            </span>
          </div>

          <button 
            onClick={onClose}
            className="btn-icon"
            style={{ width: '34px', height: '34px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          
          {cartItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--text-muted)'
              }}>
                <ShoppingBag size={32} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                Your cart is empty
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '240px', marginBottom: '1.5rem' }}>
                Browse delicious dishes from top local restaurants and add your favorites!
              </p>
              <button 
                onClick={onClose} 
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
              >
                Start Browsing
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {cartItems.map((item) => (
                <div 
                  key={item.cartItemId}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    position: 'relative'
                  }}
                >
                  <img 
                    src={item.image} 
                    alt={item.name}
                    style={{ width: '65px', height: '65px', borderRadius: 'var(--radius-md)', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => onItemClick && onItemClick(item)}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 
                        style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer' }}
                        onClick={() => onItemClick && onItemClick(item)}
                      >
                        {item.name}
                      </h4>
                      <button 
                        onClick={() => onRemoveItem(item.cartItemId)}
                        style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                      {item.size && <span>Size: {item.size} • </span>}
                      {item.addons && item.addons.length > 0 && (
                        <span>+{item.addons.map(a => a.name).join(', ')}</span>
                      )}
                      {item.instructions && <div style={{ fontStyle: 'italic' }}>Note: "{item.instructions}"</div>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--primary)' }}>
                        ₹{item.totalPrice}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                        <button 
                          onClick={() => onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.82rem', minWidth: '16px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: '0.5rem',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-color)',
                background: 'var(--bg-card)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <Tag size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Promo or Coupon Code</span>
                </div>

                {appliedPromo ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: '700'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Check size={16} /> Code applied: <strong>{appliedPromo.code}</strong>
                    </span>
                    <button 
                      onClick={onRemovePromo} 
                      style={{ color: 'var(--accent-rose)', fontWeight: '700', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromoCode} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="e.g. WELCOME50"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-subtle)',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase'
                      }}
                    />
                    <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
                      Apply
                    </button>
                  </form>
                )}

                {promoError && (
                  <p style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: '600' }}>
                    {promoError}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                  Show Delivery Partner Appreciation (Tip)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[0, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => onSelectTip(pct)}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: `1px solid ${tipPercent === pct ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: tipPercent === pct ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        color: tipPercent === pct ? 'var(--primary)' : 'var(--text-main)'
                      }}
                    >
                      {pct === 0 ? 'No Tip' : `${pct}% (₹${((subtotal * pct) / 100).toFixed(0)})`}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {cartItems.length > 0 && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-glass)'
          }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taxes & GST (5%)</span>
                <span>₹{tax.toFixed(0)}</span>
              </div>
              {tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                  <span>Delivery Tip ({tipPercent}%)</span>
                  <span>+₹{tipAmount.toFixed(0)}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: '700' }}>
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span>-₹{discount.toFixed(0)}</span>
                </div>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.15rem',
                fontWeight: '800',
                color: 'var(--text-main)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.6rem',
                marginTop: '0.3rem'
              }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--primary)' }}>₹{finalTotal.toFixed(0)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout({
                  subtotal,
                  deliveryFee,
                  tax,
                  tipAmount,
                  discount,
                  finalTotal
                });
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', gap: '0.5rem' }}
            >
              <span>Proceed to Checkout</span> <ArrowRight size={18} />
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
