import React from 'react';
import { 
  Sparkles, 
  Pizza, 
  UtensilsCrossed, 
  Fish, 
  Flame, 
  Soup, 
  Salad, 
  IceCream, 
  Sandwich, 
  CupSoda 
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';

const ICON_MAP = {
  Sparkles,
  Pizza,
  UtensilsCrossed,
  Fish,
  Flame,
  Soup,
  Salad,
  IceCream,
  Sandwich,
  CupSoda
};

export default function CategoryFilter({ activeCategory, onSelectCategory }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
          Explore Cuisines
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing top recommendations near you
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        scrollbarWidth: 'thin'
      }}>
        {CATEGORIES.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Sparkles;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.65rem 1.1rem',
                borderRadius: 'var(--radius-full)',
                background: isActive 
                  ? 'var(--primary)' 
                  : 'var(--bg-card)',
                color: isActive 
                  ? '#ffffff' 
                  : 'var(--text-main)',
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'var(--shadow-sm)',
                whiteSpace: 'nowrap',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <IconComponent size={18} style={{ color: isActive ? '#ffffff' : 'var(--primary)' }} />
              <span>{cat.name}</span>
              <span style={{
                fontSize: '0.7rem',
                opacity: 0.8,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-full)'
              }}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
