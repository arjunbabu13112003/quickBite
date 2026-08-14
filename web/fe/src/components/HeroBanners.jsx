import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, Check } from 'lucide-react';

export default function HeroBanners({ onApplyPromoCode }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copiedCode, setCopiedCode] = useState(null);

  const BANNERS = [
    {
      id: 1,
      tag: 'HOT DEAL OF THE DAY',
      title: '50% OFF Your First Feast',
      subtitle: 'Use code WELCOME50 at checkout for up to ₹150 off gourmet Indian & international meals.',
      code: 'WELCOME50',
      bgGradient: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 2,
      tag: 'FREE SHIPPING WEEK',
      title: 'Zero Delivery Fee on All Orders',
      subtitle: 'Craving biryani, pizza, or burgers? Enjoy free express delivery over ₹149.',
      code: 'FREEDELIVERY',
      bgGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 3,
      tag: 'GOURMET SPECIAL',
      title: 'FLAT ₹50 OFF Above ₹399',
      subtitle: 'Order from premium handi biryani, woodfired sourdough pizza & sushi bars.',
      code: 'SAVOUR50',
      bgGradient: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleClaim = (code) => {
    onApplyPromoCode(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const current = BANNERS[activeSlide];

  return (
    <div style={{ margin: '1rem 0 2rem 0' }}>
      {/* Outer Banner Wrapper with Fixed Height to Eliminate Layout Shifts */}
      <div 
        className="hero-banner-container"
        style={{
          background: current.bgGradient,
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem 2.25rem',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
          height: '210px',
          minHeight: '210px',
          maxHeight: '210px',
          boxSizing: 'border-box',
          transition: 'background 0.6s ease-in-out'
        }}
      >
        {/* Glow Element */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '350px',
          height: '350px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        {/* Content Container */}
        <div style={{
          maxWidth: '580px',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            padding: '0.28rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: '800',
            letterSpacing: '0.05em',
            width: 'fit-content',
            marginBottom: '0.5rem'
          }}>
            <Sparkles size={13} />
            {current.tag}
          </div>

          <h2 
            className="hero-banner-title"
            style={{
              fontSize: '1.85rem',
              fontWeight: '800',
              lineHeight: '1.15',
              margin: '0 0 0.35rem 0',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {current.title}
          </h2>

          <p 
            className="hero-banner-subtitle"
            style={{
              fontSize: '0.92rem',
              opacity: 0.92,
              margin: '0 0 0.85rem 0',
              lineHeight: '1.35',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              height: '2.5em'
            }}
          >
            {current.subtitle}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'nowrap' }}>
            <button
              onClick={() => handleClaim(current.code)}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: '800',
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {copiedCode === current.code ? (
                <>
                  <Check size={16} style={{ color: '#10b981' }} />
                  Applied Code!
                </>
              ) : (
                <>
                  <Tag size={16} style={{ color: 'var(--primary)' }} />
                  Claim Code: <span style={{ fontFamily: 'monospace', textDecoration: 'underline' }}>{current.code}</span>
                </>
              )}
            </button>

            <span style={{ fontSize: '0.76rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
              *Auto-applies code to cart
            </span>
          </div>
        </div>

        {/* Right side banner graphic */}
        <div 
          className="hero-banner-img"
          style={{
            position: 'relative',
            zIndex: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <img 
            src={current.image} 
            alt={current.title}
            style={{
              width: '230px',
              height: '150px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.3)',
              transform: 'rotate(2deg)',
              transition: 'opacity 0.5s ease'
            }}
          />
        </div>
      </div>

      {/* Pagination Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
        {BANNERS.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            style={{
              width: activeSlide === index ? '24px' : '8px',
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: activeSlide === index ? 'var(--primary)' : 'var(--border-color)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
