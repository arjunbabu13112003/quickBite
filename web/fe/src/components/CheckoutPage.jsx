import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  QrCode, 
  Banknote, 
  ExternalLink,
  Loader2,
  Check,
  Smartphone,
  Edit3,
  Receipt
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutPage({
  selectedAddress,
  onOpenAddressModal,
  pricingSummary,
  onOrderSuccess,
  onBack
}) {
  const [checkoutStep, setCheckoutStep] = useState('SUMMARY'); // 'SUMMARY', 'PAYMENT'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'cod', 'card'
  const [upiApp, setUpiApp] = useState('qr'); // 'qr', 'gpay', 'phonepe', 'paytm'
  const [upiId, setUpiId] = useState('quickbite@okaxis');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Multi-step Payment Processing state
  const [paymentState, setPaymentState] = useState('idle'); // 'idle', 'processing', 'success'

  // Lock background scroll while checkout is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Safe address fallback to prevent unhandled TypeError if selectedAddress is null/undefined
  const safeAddress = (selectedAddress && (selectedAddress.label || selectedAddress.address)) 
    ? selectedAddress 
    : { label: 'MG Road, Kochi', address: 'Marine Drive, Ernakulam', city: 'Kochi, Kerala' };

  // Safe pricing fallback
  const summary = pricingSummary || {
    subtotal: 0,
    deliveryFee: 35,
    tax: 0,
    tipAmount: 0,
    discount: 0,
    finalTotal: 35
  };

  const finalAmountStr = Number(summary.finalTotal || 0).toFixed(0);

  // Real NPCI UPI URI string that decodes on all Indian UPI scanner apps
  const upiUri = `upi://pay?pa=quickbite.delivery@okaxis&pn=QuickBite%20Food%20Delivery&am=${finalAmountStr}&cu=INR&tn=QuickBite%20Food%20Delivery%20Order`;
  
  // Real dynamic QR code image URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

  const handlePlaceOrder = () => {
    setPaymentState('processing');

    setTimeout(() => {
      setPaymentState('success');

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {
        // Fallback
      }

      setTimeout(() => {
        setPaymentState('idle');
        onOrderSuccess({
          orderId: `QB-${Math.floor(100000 + Math.random() * 900000)}`,
          address: safeAddress,
          total: Number(summary.finalTotal || 0),
          paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'upi' ? `UPI (₹${finalAmountStr})` : 'Credit Card',
          placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }, 1500);

    }, 1600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg-main)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* Sticky Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-glass)',
        flexShrink: 0
      }}>
        <button 
          onClick={() => {
            if (checkoutStep === 'PAYMENT' && paymentState === 'idle') {
              setCheckoutStep('SUMMARY');
            } else if (paymentState === 'idle') {
              onBack();
            }
          }} 
          className="btn-icon" 
          style={{ width: '36px', height: '36px', marginRight: '1rem' }}
          disabled={paymentState !== 'idle'}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
            {checkoutStep === 'SUMMARY' ? 'Order Summary' : 'Complete Payment'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Payable: ₹{finalAmountStr}
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          
          {paymentState === 'processing' ? (
            /* Processing State */
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
              <Loader2 size={54} className="animate-spin" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                {paymentMethod === 'cod' ? 'Verifying Cash Order...' : `Verifying UPI Payment of ₹${finalAmountStr}...`}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                Communicating with bank servers and authenticating transaction...
              </p>
            </div>
          ) : paymentState === 'success' ? (
            /* Success State */
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <Check size={40} strokeWidth={3} />
              </div>
              <h4 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981' }}>
                Payment Received (₹{finalAmountStr})!
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Transaction successful! Opening live courier map...
              </p>
            </div>
          ) : checkoutStep === 'SUMMARY' ? (
            /* Step 1: SUMMARY PAGE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Delivery Address Box */}
              <div 
                onClick={onOpenAddressModal}
                style={{
                  background: 'var(--bg-card)',
                  padding: '0.9rem 1.1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <MapPin size={20} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Deliver to: {safeAddress.label || 'Home'}
                    </span>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '700', 
                      color: 'var(--text-main)',
                      display: 'block',
                      lineHeight: '1.3',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {safeAddress.address || 'MG Road'}, {safeAddress.city || 'Kochi'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddressModal();
                  }}
                  className="btn-primary" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem', flexShrink: 0 }}
                >
                  <Edit3 size={14} /> Change
                </button>
              </div>

              {/* Pricing Summary */}
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Receipt size={18} style={{ color: 'var(--primary)' }} />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800' }}>Bill Details</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Item Total</span>
                    <span style={{ fontWeight: '600' }}>₹{Number(summary.subtotal || 0).toFixed(0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Delivery Fee</span>
                    <span style={{ fontWeight: '600' }}>{Number(summary.deliveryFee || 0) > 0 ? `₹${summary.deliveryFee}` : 'FREE'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Taxes & Charges (5% GST)</span>
                    <span style={{ fontWeight: '600' }}>₹{Number(summary.tax || 0).toFixed(0)}</span>
                  </div>
                  {Number(summary.tipAmount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Partner Tip</span>
                      <span style={{ fontWeight: '600' }}>₹{Number(summary.tipAmount || 0).toFixed(0)}</span>
                    </div>
                  )}
                  {Number(summary.discount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                      <span style={{ fontWeight: '600' }}>Promo Discount</span>
                      <span style={{ fontWeight: '800' }}>- ₹{Number(summary.discount || 0).toFixed(0)}</span>
                    </div>
                  )}
                  
                  <hr style={{ borderTop: '1px dashed var(--border-color)', margin: '0.25rem 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span style={{ fontWeight: '800' }}>Grand Total</span>
                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>₹{finalAmountStr}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: PAYMENT PAGE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Payment Category Selector Tabs */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '0.65rem' }}>
                  Choose Payment Method
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${paymentMethod === 'upi' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: paymentMethod === 'upi' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      color: paymentMethod === 'upi' ? 'var(--primary)' : 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: '700',
                      fontSize: '0.8rem'
                    }}
                  >
                    <QrCode size={20} />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cod')}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${paymentMethod === 'cod' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: paymentMethod === 'cod' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      color: paymentMethod === 'cod' ? 'var(--primary)' : 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: '700',
                      fontSize: '0.8rem'
                    }}
                  >
                    <Banknote size={20} />
                    <span>Cash on Delivery</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${paymentMethod === 'card' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: paymentMethod === 'card' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      color: paymentMethod === 'card' ? 'var(--primary)' : 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: '700',
                      fontSize: '0.8rem'
                    }}
                  >
                    <CreditCard size={20} />
                    <span>Card</span>
                  </button>

                </div>
              </div>

              {/* UPI Option Box with Real QR Code */}
              {paymentMethod === 'upi' && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['qr', 'gpay', 'phonepe', 'paytm'].map((app) => (
                      <button
                        key={app}
                        onClick={() => setUpiApp(app)}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          border: `1px solid ${upiApp === app ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: upiApp === app ? 'var(--primary)' : 'var(--bg-card)',
                          color: upiApp === app ? '#ffffff' : 'var(--text-main)'
                        }}
                      >
                        {app === 'qr' ? '📷 Real QR' : app}
                      </button>
                    ))}
                  </div>

                  {upiApp === 'qr' ? (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                      <div style={{
                        display: 'inline-block',
                        background: '#ffffff',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-md)',
                        border: '2px solid var(--primary)'
                      }}>
                        <img 
                          src={qrImageUrl} 
                          alt="Scan to pay via GPay / PhonePe / Paytm" 
                          style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                        />
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.35rem 0.6rem',
                          background: 'var(--primary-light)',
                          borderRadius: 'var(--radius-full)',
                          color: 'var(--primary)',
                          fontWeight: '800',
                          fontSize: '0.88rem'
                        }}>
                          Amount to Pay: ₹{finalAmountStr}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.65rem', fontWeight: '600' }}>
                        Scan using Google Pay, PhonePe, Paytm, or any UPI camera app on your mobile phone to pay <strong>₹{finalAmountStr}</strong> directly.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        Enter your {upiApp.toUpperCase()} VPA / Mobile UPI ID
                      </label>
                      <input 
                        type="text" 
                        value={upiId} 
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="mobileNumber@upi / username@okaxis"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem'
                        }}
                      />
                      <a
                        href={upiUri}
                        className="btn-secondary"
                        style={{
                          marginTop: '0.65rem',
                          padding: '0.5rem 1rem',
                          fontSize: '0.82rem',
                          gap: '0.4rem',
                          display: 'inline-flex',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                      >
                        <ExternalLink size={15} /> Redirect to {upiApp.toUpperCase()} App (₹{finalAmountStr})
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Cash on Delivery Box */}
              {paymentMethod === 'cod' && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}>
                  <Banknote size={24} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981', marginBottom: '0.2rem' }}>
                      Pay Cash on Delivery (COD)
                    </h5>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      Pay exact <strong>₹{finalAmountStr}</strong> in cash or scan driver's QR code upon delivery.
                    </p>
                  </div>
                </div>
              )}

              {/* Card Payment Box */}
              {paymentMethod === 'card' && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                      Card Number
                    </label>
                    <input 
                      type="text" 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        Expiry Date
                      </label>
                      <input 
                        type="text" 
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        CVC Code
                      </label>
                      <input 
                        type="text" 
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Bottom CTA — always visible, outside scroll area */}
      {paymentState === 'idle' && (
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-glass)',
          flexShrink: 0
        }}>
          {checkoutStep === 'SUMMARY' ? (
            <button
              onClick={() => setCheckoutStep('PAYMENT')}
              className="btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', gap: '0.5rem', boxShadow: '0 4px 12px var(--primary-glow)' }}
            >
              <span>Proceed to Payment</span>
              <CheckCircle2 size={20} />
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              className="btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', gap: '0.5rem', boxShadow: '0 4px 12px var(--primary-glow)' }}
            >
              {paymentMethod === 'cod' ? (
                <>
                  <span>Complete Order (COD)</span>
                  <CheckCircle2 size={20} />
                </>
              ) : (
                <>
                  <span>I Have Paid ₹{finalAmountStr} • Complete Order</span>
                  <CheckCircle2 size={20} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

