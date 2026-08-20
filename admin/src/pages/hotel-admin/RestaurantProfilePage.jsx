import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, Phone, Mail, MapPin, Clock, Truck, FileText, 
  Camera, Trash2, Edit, Check, X, Star, Upload, Sparkles, Map, Search
} from 'lucide-react';
import { api } from '../../services/api';

const CUISINE_OPTIONS = [
  'Kerala', 'Indian', 'Chinese', 'Biryani', 'Arabian', 
  'Fast Food', 'Desserts', 'Healthy', 'Seafood', 'Continental'
];

const DEFAULT_HOURS = [
  { day: 'Mon', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Tue', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Wed', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Thu', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Fri', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Sat', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
  { day: 'Sun', isOpen: true, openTime: '11:00 AM', closeTime: '11:00 PM' },
];

export default function RestaurantProfilePage({ hotel, setHotel }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0 });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [searchingMapLoc, setSearchingMapLoc] = useState(false);

  // Fetch / Initialize data
  useEffect(() => {
    if (hotel && !isEditMode) {
      // Parse operatingHours
      let parsedHours = DEFAULT_HOURS;
      if (hotel.operatingHours) {
        try {
          parsedHours = JSON.parse(hotel.operatingHours);
        } catch (e) {
          parsedHours = DEFAULT_HOURS;
        }
      }

      // Parse gallery
      let parsedGallery = [];
      if (hotel.gallery) {
        try {
          parsedGallery = JSON.parse(hotel.gallery);
        } catch (e) {}
      }

      const initial = {
        name: hotel.name || '',
        description: hotel.description || '',
        cuisines: hotel.cuisines ? hotel.cuisines.split(',').map(c => c.trim()).filter(Boolean) : [],
        restaurantType: hotel.restaurantType || 'Both',
        averagePreparationTime: hotel.averagePreparationTime || 30,
        minimumOrderAmount: hotel.minimumOrderAmount || 0,
        ownerName: hotel.ownerName || '',
        phoneNumber: hotel.phoneNumber || '',
        alternatePhoneNumber: hotel.alternatePhoneNumber || '',
        email: hotel.email || '',
        address: hotel.address || '',
        landmark: hotel.landmark || '',
        city: hotel.city || '',
        district: hotel.district || '',
        state: hotel.state || '',
        pincode: hotel.pincode || '',
        latitude: hotel.latitude || 9.9816,
        longitude: hotel.longitude || 76.2999,
        isDeliveryAvailable: hotel.isDeliveryAvailable !== false,
        deliveryRadiusKm: hotel.deliveryRadiusKm || 10,
        deliveryFee: hotel.deliveryFee !== undefined ? Number(hotel.deliveryFee) : 0,
        estimatedDeliveryTime: hotel.estimatedDeliveryTime || 30,
        legalName: hotel.legalName || '',
        fssaiNumber: hotel.fssaiNumber || '',
        gstNumber: hotel.gstNumber || '',
        operatingHours: parsedHours,
        gallery: parsedGallery,
        logo: hotel.logo || '',
        image: hotel.image || ''
      };

      setFormData(initial);
      setInitialData(initial);

      // Fetch rating summary
      api.getHotelRatingSummary(hotel.id)
        .then(res => {
          if (res) setRatingSummary(res);
        })
        .catch(err => console.warn('Failed to fetch rating summary', err));
    }
  }, [hotel, isEditMode]);

  // Save profile changes
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Basic Validations
    if (!formData.name.trim()) {
      setErrorMsg('Restaurant Name is required.');
      setSaving(false);
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Full Address is required.');
      setSaving(false);
      return;
    }
    if (!formData.city.trim()) {
      setErrorMsg('City is required.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        cuisines: formData.cuisines.join(', '),
        operatingHours: JSON.stringify(formData.operatingHours),
        gallery: JSON.stringify(formData.gallery),
      };

      const updated = await api.updateHotelProfile(hotel.id, payload);
      setHotel(updated);
      setIsEditMode(false);
      setSuccessMsg('Restaurant profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update restaurant profile.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel edit mode
  const handleCancel = () => {
    setFormData(initialData);
    setIsEditMode(false);
    setErrorMsg('');
  };

  // Input change handler
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle cuisine choice
  const toggleCuisine = (cuisine) => {
    if (!isEditMode) return;
    setFormData(prev => {
      const current = prev.cuisines || [];
      if (current.includes(cuisine)) {
        return { ...prev, cuisines: current.filter(c => c !== cuisine) };
      } else {
        return { ...prev, cuisines: [...current, cuisine] };
      }
    });
  };

  // Handle operating hours changes
  const handleHoursChange = (index, field, value) => {
    if (!isEditMode) return;
    setFormData(prev => {
      const updated = [...prev.operatingHours];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, operatingHours: updated };
    });
  };

  // File Upload Handlers
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.uploadHotelLogo(hotel.id, file);
      handleChange('logo', res.url);
      setHotel(prev => ({ ...prev, logo: res.url }));
    } catch (err) {
      alert('Logo upload failed: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setLoading(true);
    try {
      await api.updateHotelProfile(hotel.id, { logo: '' });
      handleChange('logo', '');
      setHotel(prev => ({ ...prev, logo: '' }));
    } catch (err) {
      alert('Failed to remove logo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.uploadHotelCover(hotel.id, file);
      handleChange('image', res.url);
      setHotel(prev => ({ ...prev, image: res.url }));
    } catch (err) {
      alert('Cover upload failed: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveCover = async () => {
    setLoading(true);
    try {
      await api.updateHotelProfile(hotel.id, { image: '' });
      handleChange('image', '');
      setHotel(prev => ({ ...prev, image: '' }));
    } catch (err) {
      alert('Failed to remove cover image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.uploadHotelGallery(hotel.id, file);
      handleChange('gallery', res.gallery);
      setHotel(prev => ({ ...prev, gallery: JSON.stringify(res.gallery) }));
    } catch (err) {
      alert('Gallery photo upload failed: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const removeGalleryImage = async (index) => {
    if (!isEditMode) return;
    const updatedGallery = (formData.gallery || []).filter((_, idx) => idx !== index);
    setLoading(true);
    try {
      await api.updateHotelProfile(hotel.id, { gallery: JSON.stringify(updatedGallery) });
      handleChange('gallery', updatedGallery);
      setHotel(prev => ({ ...prev, gallery: JSON.stringify(updatedGallery) }));
    } catch (err) {
      alert('Failed to remove gallery image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Location selector mock (updates to random Kochi values for demo, or allows inputting)
  const handleUpdateLocation = () => {
    if (!isEditMode) return;
    const randomOffsetLat = (Math.random() - 0.5) * 0.05;
    const randomOffsetLng = (Math.random() - 0.5) * 0.05;
    const nextLat = Number((9.9816 + randomOffsetLat).toFixed(6));
    const nextLng = Number((76.2999 + randomOffsetLng).toFixed(6));
    
    handleChange('latitude', nextLat);
    handleChange('longitude', nextLng);
  };

  // 1. Dynamic Leaflet script and stylesheet loader
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // 2. Interactive Map initializer and synchronization hook
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    const initialLat = parseFloat(formData.latitude) || 9.9816;
    const initialLng = parseFloat(formData.longitude) || 76.2999;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet Map
      const map = window.L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView([initialLat, initialLng], 14);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Create Custom Pulsing Marker Icon matching QuickBite's orange/red primary theme color
      const pulsingIcon = window.L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; background: rgba(255, 85, 32, 0.25); border-radius: 50%; animation: mapPulse 2s infinite; pointer-events: none;"></div>
            <div style="background-color: #ff5520; width: 15px; height: 15px; border-radius: 50%; border: 3.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.45); z-index: 10;"></div>
          </div>
        `,
        className: 'custom-map-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = window.L.marker([initialLat, initialLng], {
        icon: pulsingIcon,
        draggable: isEditMode
      }).addTo(map);

      // Handle marker drag
      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        handleChange('latitude', Number(lat.toFixed(6)));
        handleChange('longitude', Number(lng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      // Sync map and marker with changing coords from inputs or buttons
      const map = mapInstanceRef.current;
      const marker = markerInstanceRef.current;
      const currentMarkerLatLng = marker.getLatLng();

      if (Math.abs(currentMarkerLatLng.lat - initialLat) > 0.00001 || Math.abs(currentMarkerLatLng.lng - initialLng) > 0.00001) {
        marker.setLatLng([initialLat, initialLng]);
        map.setView([initialLat, initialLng], map.getZoom());
      }

      // Update marker draggability depending on isEditMode
      if (isEditMode) {
        marker.dragging.enable();
      } else {
        marker.dragging.disable();
      }
    }
  }, [leafletLoaded, formData.latitude, formData.longitude, isEditMode]);

  // 3. Browser Location Geolocation Retriever
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);

    const optionsHigh = { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 };
    const optionsLow = { enableHighAccuracy: false, timeout: 6000, maximumAge: 10000 };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        handleChange('latitude', lat);
        handleChange('longitude', lng);
        setLoading(false);
      },
      (error) => {
        console.warn('High accuracy location failed, trying low accuracy fallback...', error);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            handleChange('latitude', lat);
            handleChange('longitude', lng);
            setLoading(false);
          },
          (err) => {
            alert('Failed to retrieve location: ' + err.message + '. Please check browser location permissions.');
            setLoading(false);
          },
          optionsLow
        );
      },
      optionsHigh
    );
  };

  // 4. Geocoding Query suggestion loader from OpenStreetMap Photon API
  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.trim().length < 2) {
      setMapSuggestions([]);
      return;
    }

    setSearchingMapLoc(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const query = encodeURIComponent(mapSearchQuery.trim());
        const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=6&lat=11.2588&lon=75.7804`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.features) {
            const suggestions = data.features.map(feat => {
              const props = feat.properties;
              const coords = feat.geometry.coordinates;
              const name = props.name || props.street || mapSearchQuery;
              const district = props.district || props.city || props.county || 'Kerala';
              const state = props.state || 'Kerala';
              return {
                label: name,
                address: `${name}, ${district}, ${state}`,
                lat: coords[1],
                lon: coords[0],
                city: props.city || props.town || props.village || district,
                state: state,
                postcode: props.postcode || '',
                district: district
              };
            });
            setMapSuggestions(suggestions);
          }
        }
      } catch (err) {
        console.error('Failed to geocode location query', err);
      } finally {
        setSearchingMapLoc(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [mapSearchQuery]);

  // 5. Autocomplete selection handler to update coordinates and address fields
  const handleSelectSuggestion = (place) => {
    handleChange('latitude', Number(place.lat.toFixed(6)));
    handleChange('longitude', Number(place.lon.toFixed(6)));
    if (place.city) handleChange('city', place.city);
    if (place.state) handleChange('state', place.state);
    if (place.postcode) handleChange('pincode', place.postcode);
    if (place.district) handleChange('district', place.district);
    
    // Set landmark or append to address
    handleChange('landmark', place.label);
    
    setMapSearchQuery('');
    setMapSuggestions([]);
  };

  if (!hotel) {
    return <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading Profile...</div>;
  }

  return (
    <div style={{ padding: '0.5rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Alert Banners */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-success-subtle)', border: '1px solid var(--text-success)', color: 'var(--text-success)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontWeight: '700' }}>
          <Check size={18} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-danger-subtle)', border: '1px solid var(--text-danger)', color: 'var(--text-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontWeight: '700' }}>
          <X size={18} />
          {errorMsg}
        </div>
      )}

      {/* ── HEADER ACTION ROW ── */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 999, 
        background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-color)', 
        padding: '1rem 0.75rem', 
        margin: '-0.5rem -0.75rem 1.5rem -0.75rem',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>Restaurant Profile</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Manage your restaurant details, operating hours, and media.</p>
        </div>
        <div>
          {!isEditMode ? (
            <button 
              onClick={() => setIsEditMode(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: '800', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer' }}
            >
              <Edit size={16} /> Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={handleCancel}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: '800', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--text-success)', border: 'none', padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: '800', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : <><Check size={16} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TOP RESTAURANT PROFILE SUMMARY CARD ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        
        {/* Logo Container */}
        <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {formData.logo ? (
            <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Building size={36} style={{ color: 'var(--text-subtle)' }} />
          )}
          {isEditMode && (
            <label style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px 0', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
              <Camera size={14} color="#fff" />
              <input type="file" onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
            </label>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
              {formData.name || 'Vite Test Kitchen'}
            </h3>
            
            {/* Status Badges */}
            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: 'var(--bg-success-subtle)', color: 'var(--text-success)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--text-success)' }}>
              Approved
            </span>
            
            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: hotel.isOpen ? 'var(--bg-success-subtle)' : 'var(--bg-danger-subtle)', color: hotel.isOpen ? 'var(--text-success)' : 'var(--text-danger)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', border: `1px solid ${hotel.isOpen ? 'var(--text-success)' : 'var(--text-danger)'}` }}>
              {hotel.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.4rem 0 0.6rem' }}>
            {formData.cuisines && formData.cuisines.length > 0 ? formData.cuisines.join(' • ') : 'Cuisine not configured'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
            <MapPin size={14} />
            <span>{formData.address || 'Address not configured'}</span>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star size={14} fill="var(--accent-amber)" color="var(--accent-amber)" />
              <span style={{ fontWeight: '850', color: 'var(--text-main)' }}>{ratingSummary.averageRating ? Number(ratingSummary.averageRating).toFixed(1) : '0.0'}</span>
              <span>({ratingSummary.ratingCount || 0} reviews)</span>
            </div>
          </div>
        </div>

        {/* Small floating edit overlay trigger if in edit mode */}
        {isEditMode && (
          <label style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Upload size={12} /> Change Cover
            <input type="file" onChange={handleCoverUpload} style={{ display: 'none' }} accept="image/*" />
          </label>
        )}
      </div>

      {/* ── TWO-COLUMN MAIN DETAILS GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* COLUMN 1 CARD 1: RESTAURANT INFORMATION */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <Building size={16} /> Restaurant Information
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Restaurant Name</label>
              <input 
                type="text" 
                value={formData.name || ''} 
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Description</label>
              <textarea 
                rows={3}
                value={formData.description || ''} 
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Cuisine Types</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {CUISINE_OPTIONS.map(c => {
                  const isSelected = (formData.cuisines || []).includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCuisine(c)}
                      disabled={!isEditMode}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: isEditMode ? 'pointer' : 'default',
                        border: '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Category</label>
                <select 
                  value={formData.restaurantType || 'Both'} 
                  onChange={(e) => handleChange('restaurantType', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '700' }}
                >
                  <option value="Pure Veg">Pure Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Both">Both (Veg & Non-Veg)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Avg Prep Time (mins)</label>
                <input 
                  type="number" 
                  value={formData.averagePreparationTime || 30} 
                  onChange={(e) => handleChange('averagePreparationTime', parseInt(e.target.value, 10))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 CARD 1: CONTACT INFORMATION */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <Phone size={16} /> Contact Information
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Owner Name</label>
              <input 
                type="text" 
                value={formData.ownerName || ''} 
                onChange={(e) => handleChange('ownerName', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Primary Phone</label>
                <input 
                  type="text" 
                  value={formData.phoneNumber || ''} 
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Alternate Phone</label>
                <input 
                  type="text" 
                  value={formData.alternatePhoneNumber || ''} 
                  onChange={(e) => handleChange('alternatePhoneNumber', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Email Address</label>
              <input 
                type="email" 
                value={formData.email || ''} 
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>
          </div>
        </div>

        {/* COLUMN 1 CARD 2: LOCATION & ADDRESS */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <MapPin size={16} /> Location & Address
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Full Address</label>
              <input 
                type="text" 
                value={formData.address || ''} 
                onChange={(e) => handleChange('address', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Landmark</label>
                <input 
                  type="text" 
                  value={formData.landmark || ''} 
                  onChange={(e) => handleChange('landmark', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>City</label>
                <input 
                  type="text" 
                  value={formData.city || ''} 
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>District</label>
                <input 
                  type="text" 
                  value={formData.district || ''} 
                  onChange={(e) => handleChange('district', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>State</label>
                <input 
                  type="text" 
                  value={formData.state || ''} 
                  onChange={(e) => handleChange('state', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Pincode</label>
                <input 
                  type="text" 
                  value={formData.pincode || ''} 
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Latitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.latitude || ''} 
                  onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Longitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.longitude || ''} 
                  onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            {/* Map Preview Wrapper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <style>{`
                @keyframes mapPulse {
                  0% { transform: scale(0.5); opacity: 1; }
                  100% { transform: scale(1.6); opacity: 0; }
                }
                .custom-map-marker {
                  background: transparent !important;
                  border: none !important;
                }
                .map-search-suggestion-item:hover {
                  background-color: var(--bg-hover) !important;
                }
              `}</style>

              {/* Location Search Input */}
              {isEditMode && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', gap: '0.5rem' }}>
                    <Search size={16} style={{ color: 'var(--text-subtle)' }} />
                    <input
                      type="text"
                      placeholder="Search and set location (e.g. Kannur Road, Focus Mall)..."
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem' }}
                    />
                    {searchingMapLoc && <div className="spinner-small" style={{ width: '14px', height: '14px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                  </div>

                  {mapSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', zIndex: 1000, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto' }}>
                      {mapSuggestions.map((place, idx) => (
                        <div
                          key={idx}
                          className="map-search-suggestion-item"
                          onClick={() => handleSelectSuggestion(place)}
                          style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', borderBottom: idx < mapSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-main)' }}>{place.label}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{place.address}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: '240px', width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-subtle)' }}>
                {leafletLoaded ? (
                  <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 0 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.7 }}>
                    <Map size={36} className="spin" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading Map engine...</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                  📍 Marker Coordinates: {formData.latitude || '9.9816'}, {formData.longitude || '76.2999'}
                </span>
                
                {isEditMode && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--text-success)', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      <MapPin size={12} /> Use My Current GPS
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 CARD 2: OPERATING HOURS */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <Clock size={16} /> Operating Hours
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(formData.operatingHours || []).map((hour, idx) => (
              <div 
                key={hour.day}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  opacity: hour.isOpen ? 1 : 0.45,
                  transition: 'opacity 0.2s ease',
                  padding: '0.25rem 0'
                }}
              >
                {/* Checkbox toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '70px', cursor: isEditMode ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={hour.isOpen}
                    disabled={!isEditMode}
                    onChange={(e) => handleHoursChange(idx, 'isOpen', e.target.checked)}
                    style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{hour.day}</span>
                </label>

                {hour.isOpen ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <input
                      type="text"
                      value={hour.openTime || '11:00 AM'}
                      disabled={!isEditMode}
                      onChange={(e) => handleHoursChange(idx, 'openTime', e.target.value)}
                      placeholder="e.g. 11:00 AM"
                      style={{ flex: 1, background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: '600', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                    <input
                      type="text"
                      value={hour.closeTime || '11:00 PM'}
                      disabled={!isEditMode}
                      onChange={(e) => handleHoursChange(idx, 'closeTime', e.target.value)}
                      placeholder="e.g. 11:00 PM"
                      style={{ flex: 1, background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: '600', textAlign: 'center' }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-danger)', fontWeight: '800', flex: 1, textAlign: 'right', paddingRight: '1rem' }}>Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 1 CARD 3: DELIVERY SETTINGS */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <Truck size={16} /> Delivery Settings
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)', display: 'block' }}>Delivery Available</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Allow customers to order for delivery</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', cursor: isEditMode ? 'pointer' : 'default' }}>
                <input 
                  type="checkbox"
                  checked={formData.isDeliveryAvailable}
                  disabled={!isEditMode}
                  onChange={(e) => handleChange('isDeliveryAvailable', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: isEditMode ? 'pointer' : 'default', inset: 0,
                  backgroundColor: formData.isDeliveryAvailable ? 'var(--text-success)' : 'var(--bg-hover)',
                  borderRadius: '34px', transition: '0.3s',
                  display: 'flex', alignItems: 'center', padding: '0 4px'
                }}>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                    transform: formData.isDeliveryAvailable ? 'translateX(22px)' : 'translateX(0px)',
                    transition: '0.3s', display: 'block'
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Delivery Radius (km)</label>
                <input 
                  type="number" 
                  value={formData.deliveryRadiusKm || 10} 
                  onChange={(e) => handleChange('deliveryRadiusKm', parseFloat(e.target.value))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Min. Order Value (Rs)</label>
                <input 
                  type="number" 
                  value={formData.minimumOrderAmount || 0} 
                  onChange={(e) => handleChange('minimumOrderAmount', parseFloat(e.target.value))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Delivery Fee (₹)</label>
                <input 
                  type="number" 
                  value={formData.deliveryFee === undefined ? '' : formData.deliveryFee} 
                  onChange={(e) => handleChange('deliveryFee', parseFloat(e.target.value) || 0)}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Est. Prep Time (mins)</label>
                <input 
                  type="number" 
                  value={formData.averagePreparationTime || 30} 
                  disabled
                  style={{ width: '100%', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Est. Delivery Time (mins)</label>
                <input 
                  type="number" 
                  value={formData.estimatedDeliveryTime || 30} 
                  onChange={(e) => handleChange('estimatedDeliveryTime', parseInt(e.target.value, 10))}
                  disabled={!isEditMode}
                  style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
                />
              </div>
              <div />
            </div>
          </div>
        </div>

        {/* COLUMN 2 CARD 3: BUSINESS DETAILS */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <FileText size={16} /> Business Details
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Legal / Entity Name</label>
              <input 
                type="text" 
                value={formData.legalName || ''} 
                onChange={(e) => handleChange('legalName', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>FSSAI License Number</label>
              <input 
                type="text" 
                value={formData.fssaiNumber || ''} 
                onChange={(e) => handleChange('fssaiNumber', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>GSTIN</label>
              <input 
                type="text" 
                value={formData.gstNumber || ''} 
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                disabled={!isEditMode}
                style={{ width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: '600' }}
              />
            </div>
          </div>
        </div>

        {/* FULL WIDTH CARD: RESTAURANT MEDIA */}
        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', marginTop: 0 }}>
            <Upload size={16} /> Restaurant Media
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Logo Section */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Restaurant Logo</span>
              <div style={{ width: '100%', height: '180px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {formData.logo ? (
                  <>
                    <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Building size={32} style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }} />
                    {isEditMode ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>
                        <Upload size={12} /> Upload Logo
                        <input type="file" onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
                      </label>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No logo uploaded</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cover Banner Section */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Cover / Banner Image</span>
              <div style={{ width: '100%', height: '180px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {formData.image ? (
                  <>
                    <img src={formData.image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Camera size={32} style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }} />
                    {isEditMode ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>
                        <Upload size={12} /> Upload Cover
                        <input type="file" onChange={handleCoverUpload} style={{ display: 'none' }} accept="image/*" />
                      </label>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No cover image uploaded</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Gallery Section */}
            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '750', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Photo Gallery</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                {(formData.gallery || []).map((img, idx) => (
                  <div key={idx} style={{ width: '100px', height: '100px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <img src={img} alt={`Gallery-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}

                {isEditMode && (
                  <label style={{ width: '100px', height: '100px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-subtle)' }}>
                    <Upload size={20} style={{ color: 'var(--text-subtle)' }} />
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', marginTop: '0.25rem' }}>+ Add Image</span>
                    <input type="file" onChange={handleGalleryUpload} style={{ display: 'none' }} accept="image/*" />
                  </label>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
