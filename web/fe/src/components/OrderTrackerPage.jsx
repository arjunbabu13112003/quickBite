import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft,
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck,
  XCircle,
  RotateCcw,
  Receipt,
  Check
} from 'lucide-react';
import { DRIVER_PROFILES } from '../data/mockData';

export default function OrderTrackerPage({
  onClose,
  orderDetails,
  onCancelOrder
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [etaSeconds, setEtaSeconds] = useState(1200);
  const [viewState, setViewState] = useState('tracking'); // 'tracking', 'cancel_reason', 'refund_summary'
  const [selectedReason, setSelectedReason] = useState('Ordered by mistake / wrong items selected');
  const [refundData, setRefundData] = useState(null);

  const driver = DRIVER_PROFILES[0];
  const canvasRef = useRef(null);

  // Auto step progression simulation
  useEffect(() => {
    if (!orderDetails || viewState !== 'tracking') return;
    const timer1 = setTimeout(() => setActiveStep(1), 3000);
    const timer2 = setTimeout(() => setActiveStep(2), 8000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [orderDetails, viewState]);

  // ETA Countdown
  useEffect(() => {
    if (!orderDetails || viewState !== 'tracking') return;
    const interval = setInterval(() => {
      setEtaSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [orderDetails, viewState]);

  // Animated Driver Canvas Map Simulation
  useEffect(() => {
    if (!orderDetails || viewState !== 'tracking') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let progress = 0.15;

    const renderMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const startX = 60, startY = 140;
      const endX = canvas.width - 60, endY = 60;
      const cp1x = canvas.width * 0.35, cp1y = 20;
      const cp2x = canvas.width * 0.65, cp2y = 180;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = 'rgba(255, 107, 38, 0.4)';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.strokeStyle = '#ff6b26';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(startX, startY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.fillText('🍳 Kitchen', startX - 22, startY + 22);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(endX, endY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🏠 Home', endX - 18, endY - 14);

      if (activeStep >= 2) {
        progress += 0.0015;
        if (progress > 0.95) progress = 0.95;
      }

      const t = progress;
      const curX = Math.pow(1-t, 3)*startX + 3*Math.pow(1-t, 2)*t*cp1x + 3*(1-t)*Math.pow(t, 2)*cp2x + Math.pow(t, 3)*endX;
      const curY = Math.pow(1-t, 3)*startY + 3*Math.pow(1-t, 2)*t*cp1y + 3*(1-t)*Math.pow(t, 2)*cp2y + Math.pow(t, 3)*endY;

      ctx.fillStyle = 'rgba(255, 107, 38, 0.35)';
      ctx.beginPath();
      ctx.arc(curX, curY, 18 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6b26';
      ctx.beginPath();
      ctx.arc(curX, curY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🛵', curX - 6, curY + 4);

      animationFrameId = requestAnimationFrame(renderMap);
    };

    renderMap();

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeStep, viewState]);

  const formatEta = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const STEPS = [
    { title: 'Order Placed', desc: 'Received by kitchen' },
    { title: 'In the Kitchen', desc: 'Preparing your order' },
    { title: 'On the Way', desc: 'Courier picked up order' },
    { title: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  const CANCELLATION_REASONS = [
    'Ordered by mistake / wrong items selected',
    'Delivery time is taking longer than expected',
    'Selected incorrect delivery address',
    'Changed my mind / no longer needed',
    'Accidentally placed duplicate order'
  ];

  const handleConfirmCancellation = () => {
    const refId = `REF-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const refundInfo = {
      refId,
      amount: orderDetails.total,
      reason: selectedReason,
      cancelledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: orderDetails.paymentMethod || 'Original Payment Source',
      status: 'PROCESSED'
    };

    setRefundData(refundInfo);
    setViewState('refund_summary');

    if (onCancelOrder) {
      onCancelOrder(refundInfo);
    }
  };

  if (!orderDetails) return null;

  const headerTitle = viewState === 'refund_summary'
    ? 'Order Cancelled & Refunded 💸'
    : viewState === 'cancel_reason'
      ? 'Cancel Your Order'
      : activeStep === 3
        ? 'Order Delivered!'
        : `ETA: ${formatEta(etaSeconds)}`;

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
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-glass)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => {
              if (viewState === 'cancel_reason') {
                setViewState('tracking');
              } else {
                onClose();
              }
            }}
            className="btn-icon" 
            style={{ width: '34px', height: '34px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className={`badge ${viewState === 'refund_summary' ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}>
                {viewState === 'refund_summary' ? 'CANCELLED' : 'LIVE'}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                #{orderDetails.orderId}
              </span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginTop: '0.1rem' }}>
              {headerTitle}
            </h3>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>

        {/* 1. Normal Tracking View */}
        {viewState === 'tracking' && (
          <>
            {/* Live Canvas Map */}
            <div style={{ position: 'relative', width: '100%', height: '190px', overflow: 'hidden' }}>
              <canvas 
                ref={canvasRef} 
                width={600} 
                height={190}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Clock size={12} style={{ color: 'var(--primary)' }} />
                <span>Live GPS active</span>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.25rem 1rem 1.25rem' }}>
              
              {/* Stepper Pipeline */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                marginBottom: '1.25rem'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '10%',
                  right: '10%',
                  height: '3px',
                  background: 'var(--border-color)',
                  zIndex: 1
                }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--primary)',
                    width: `${(activeStep / (STEPS.length - 1)) * 100}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {STEPS.map((step, idx) => {
                  const isCompleted = idx <= activeStep;
                  return (
                    <div key={idx} style={{ textAlign: 'center', zIndex: 2, flex: 1 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isCompleted ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.35rem auto',
                        fontWeight: '800',
                        fontSize: '0.78rem',
                        boxShadow: isCompleted ? '0 4px 10px var(--primary-glow)' : 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        {isCompleted ? <CheckCircle2 size={15} /> : idx + 1}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: isCompleted ? '800' : '600', display: 'block', color: isCompleted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Driver Card Info */}
              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img 
                    src={driver.avatar} 
                    alt={driver.name} 
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: '800' }}>{driver.name}</h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{driver.vehicle}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: '700' }}>
                      ★ {driver.rating} ({driver.trips}+ trips)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <a 
                    href={`tel:${driver.phone}`}
                    className="btn-secondary" 
                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', gap: '0.3rem' }}
                  >
                    <Phone size={13} /> Call
                  </a>
                  <button 
                    onClick={() => alert(`Messaging courier ${driver.name}: "Hello, please leave at the front door!"`)}
                    className="btn-primary" 
                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', gap: '0.3rem' }}
                  >
                    <MessageSquare size={13} /> Message
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => setViewState('cancel_reason')}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(244, 63, 94, 0.1)',
                    color: '#f43f5e',
                    border: '1.5px solid rgba(244, 63, 94, 0.3)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <XCircle size={15} /> Cancel Order
                </button>

                <button
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1rem', fontWeight: '700', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>

            </div>
          </>
        )}

        {/* 2. Cancellation Reason Form */}
        {viewState === 'cancel_reason' && (
          <div style={{ padding: '1.25rem' }}>
            
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.1))',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-lg)',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <ShieldCheck size={26} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.1rem' }}>
                  ⚡ 100% Instant Full Refund Guarantee
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Full amount of <strong>₹{orderDetails.total}</strong> will be refunded to your original payment method immediately.
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.65rem', color: 'var(--text-main)' }}>
              Select a reason for cancellation:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {CANCELLATION_REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  onClick={() => setSelectedReason(reason)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${selectedReason === reason ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: selectedReason === reason ? 'var(--primary-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: selectedReason === reason ? '800' : '600',
                    color: 'var(--text-main)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={handleConfirmCancellation}
                style={{
                  flex: 1,
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(244,63,94,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <XCircle size={16} /> Confirm & Claim ₹{orderDetails.total} Refund
              </button>

              <button
                onClick={() => setViewState('tracking')}
                className="btn-secondary"
                style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.82rem' }}
              >
                Keep Order
              </button>
            </div>

          </div>
        )}

        {/* 3. Refund Summary Section */}
        {viewState === 'refund_summary' && refundData && (
          <div style={{ padding: '1.25rem' }}>
            
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))',
              border: '2px solid #10b981',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 25px rgba(16,185,129,0.15)'
            }}>
              <div style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto',
                boxShadow: '0 6px 18px rgba(16,185,129,0.35)'
              }}>
                <Check size={32} strokeWidth={3} />
              </div>

              <span className="badge badge-green" style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem', marginBottom: '0.5rem' }}>
                REFUND PROCESSED & CREDITED
              </span>

              <h3 style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.4rem' }}>
                ₹{refundData.amount} Refunded!
              </h3>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Ref: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{refundData.refId}</strong>
              </p>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Receipt size={15} style={{ color: 'var(--primary)' }} /> Refund Receipt
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {refundData.cancelledAt}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Order Items Total</span>
                  <span>₹{refundData.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cancellation Penalty</span>
                  <span style={{ color: '#10b981', fontWeight: '700' }}>₹0 (Waived)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Refund Destination</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{refundData.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Credit Speed</span>
                  <span style={{ color: '#10b981', fontWeight: '700' }}>Instant (0-5 mins)</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.55rem',
                  marginTop: '0.25rem',
                  borderTop: '1px dashed var(--border-color)',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  color: 'var(--text-main)'
                }}>
                  <span>Total Refunded</span>
                  <span style={{ color: '#10b981' }}>₹{refundData.amount}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => alert(`Downloading Refund Receipt ${refundData.refId}.pdf...`)}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.72rem', fontWeight: '800', fontSize: '0.82rem', gap: '0.35rem' }}
              >
                <Receipt size={15} /> Download Receipt
              </button>

              <button
                onClick={() => {
                  setViewState('tracking');
                  onClose();
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '0.72rem', fontWeight: '800', fontSize: '0.82rem', justifyContent: 'center' }}
              >
                Done & Return to Store
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
