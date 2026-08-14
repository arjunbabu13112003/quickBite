import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Plus, Check, Navigation, Loader2 } from 'lucide-react';
import { PRESET_ADDRESSES } from '../data/mockData';

export default function AddressPage({
  onClose,
  selectedAddress,
  onSelectAddress
}) {
  const [addresses, setAddresses] = useState(PRESET_ADDRESSES);
  const [newLabel, setNewLabel] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Lock background scroll while page is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Live GPS Reverse Geocoding via OpenStreetMap API
  const handleDetectLocation = () => {
    setIsDetecting(true);
    setStatusMessage('Acquiring live GPS satellite coordinates...');

    const applyFallback = (lat, lon) => {
      const fallbackLocation = {
        id: `gps-${Date.now()}`,
        label: 'Marine Drive, Kochi',
        address: 'Marine Drive, MG Road, Ernakulam',
        city: 'Kochi, Kerala',
        default: false
      };

      setAddresses(prev => [fallbackLocation, ...prev.filter(a => !a.id.startsWith('gps-'))]);
      onSelectAddress(fallbackLocation);
      setIsDetecting(false);
      setStatusMessage('');
      onClose();
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          setStatusMessage('Fetching live street address...');

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
            );
            const data = await response.json();

            if (data && data.address) {
              const a = data.address;
              const road = a.road || a.pedestrian || a.suburb || a.neighbourhood || a.residential;
              const city = a.city || a.town || a.village || a.county || a.state_district || 'Kerala';
              const state = a.state || 'India';

              const mainTitle = road 
                ? (city ? `${road}, ${city}` : road) 
                : (city ? `${city}` : 'Live Current Location');

              const liveGpsAddress = {
                id: `gps-${Date.now()}`,
                label: mainTitle,
                address: data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : mainTitle,
                city: `${city}, ${state}`,
                default: false
              };

              setAddresses(prev => [liveGpsAddress, ...prev.filter(a => !a.id.startsWith('gps-'))]);
              onSelectAddress(liveGpsAddress);
              setIsDetecting(false);
              setStatusMessage('');
              onClose();
              return;
            }
          } catch (err) {
            console.warn('Geocoding fetch error, using fallback:', err);
          }

          applyFallback(lat, lon);
        },
        (error) => {
          console.warn('GPS permission denied or timeout:', error);
          applyFallback(null, null);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      applyFallback(null, null);
    }
  };

  const handleAddNew = (e) => {
    e.preventDefault();
    if (!newLabel || !newStreet) return;

    const created = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      address: newStreet,
      city: 'Kochi, Kerala',
      default: false
    };

    setAddresses([...addresses, created]);
    onSelectAddress(created);
    setNewLabel('');
    setNewStreet('');
    onClose();
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
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-glass)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button onClick={onClose} className="btn-icon" style={{ width: '36px', height: '36px', marginRight: '1rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Choose Delivery Location</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '1.25rem', maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* GPS Detect Button */}
          <div>
            <button
              onClick={handleDetectLocation}
              disabled={isDetecting}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary), #ff7a38)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                boxShadow: '0 4px 14px var(--primary-glow)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isDetecting ? (
                <>
                  <Loader2 size={17} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Detecting Live Address...</span>
                </>
              ) : (
                <>
                  <Navigation size={17} style={{ fill: '#ffffff', color: '#ffffff' }} />
                  <span>Detect Live Location (GPS)</span>
                </>
              )}
            </button>
            {statusMessage && (
              <span style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.4rem', fontWeight: '600' }}>
                {statusMessage}
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span>OR SELECT SAVED LOCATION</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* Preset List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {addresses.map((addr) => {
              const isSelected = selectedAddress?.id === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => {
                    onSelectAddress(addr);
                    onClose();
                  }}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-hover)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '0.88rem', 
                        fontWeight: '800', 
                        display: 'block', 
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        textTransform: 'capitalize'
                      }}>
                        {addr.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                        {addr.address}, {addr.city}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1 }}></div>

          <form onSubmit={handleAddNew} style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>Add Custom Location</span>
            <input 
              type="text" 
              placeholder="Location Title (e.g. Panampilly Nagar, Kochi)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem'
              }}
            />
            <input 
              type="text" 
              placeholder="Street Address..."
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem'
              }}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '0.6rem', fontSize: '0.82rem', gap: '0.35rem' }}>
              <Plus size={14} /> Save & Select Address
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
