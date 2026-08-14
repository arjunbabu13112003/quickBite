import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Plus, Search, Check, AlertTriangle, EyeOff, Edit, Trash2, X, ChevronRight, ChevronDown } from 'lucide-react';

export default function CustomizationsSection({ hotel }) {
  const [foods, setFoods] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [loadingFoods, setLoadingFoods] = useState(true);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Single-choice group (Heading) state
  const [singleGroupId, setSingleGroupId] = useState(null);
  const [headingName, setHeadingName] = useState('');
  const [headingChoices, setHeadingChoices] = useState([]); // { id?, name, additionalPrice: 0, isAvailable }
  const [newHeadingChoice, setNewHeadingChoice] = useState('');

  // Add-ons group state
  const [addonsGroupId, setAddonsGroupId] = useState(null);
  const [addons, setAddons] = useState([]); // { id?, name, additionalPrice, isAvailable }
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  const [isActiveCustomization, setIsActiveCustomization] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await api.getHotelFoods(hotel.id);
        console.log('[Customizations] resolved hotelId:', hotel.id);
        console.log('[Customizations] foods endpoint:', `/hotels/${hotel.id}/foods`);
        console.log('[Customizations] raw response:', res);
        
        const mappedFoods = Array.isArray(res) ? res : (res.data || []);
        console.log('[Customizations] mapped foods:', mappedFoods);
        console.log('[Customizations] food count:', mappedFoods.length);
        
        setFoods(mappedFoods);
      } catch (err) {
        console.error('Failed to fetch foods', err);
      } finally {
        setLoadingFoods(false);
      }
    };
    fetchFoods();
  }, [hotel.id]);

  const fetchGroups = useCallback(async () => {
    if (!selectedFoodId) return;
    setLoadingGroups(true);
    try {
      const res = await api.get(`/foods/${selectedFoodId}/customizations`);
      const fetchedGroups = Array.isArray(res) ? res : (res.data || []);
      
      const singleGrp = fetchedGroups.find(g => g.selectionType === 'single');
      const multiGrp = fetchedGroups.find(g => g.selectionType === 'multiple');

      if (singleGrp) {
        setSingleGroupId(singleGrp.id);
        setHeadingName(singleGrp.name);
        setHeadingChoices(singleGrp.choices || []);
        setIsActiveCustomization(singleGrp.isActive);
      } else {
        setSingleGroupId(null);
        setHeadingName('');
        setHeadingChoices([]);
        setIsActiveCustomization(true);
      }

      if (multiGrp) {
        setAddonsGroupId(multiGrp.id);
        setAddons(multiGrp.choices || []);
        if (!singleGrp) setIsActiveCustomization(multiGrp.isActive);
      } else {
        setAddonsGroupId(null);
        setAddons([]);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
    } finally {
      setLoadingGroups(false);
      setRefreshing(false);
    }
  }, [selectedFoodId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const selectedFood = foods.find(f => f.id.toString() === selectedFoodId);

  const handleAddHeadingChoice = (e) => {
    if (e && e.type === 'keydown' && e.key !== 'Enter') return;
    if (!newHeadingChoice.trim()) return;
    if (headingChoices.some(c => c.name.toLowerCase() === newHeadingChoice.trim().toLowerCase())) return;

    setHeadingChoices([...headingChoices, { 
      name: newHeadingChoice.trim(), 
      additionalPrice: 0, 
      isActive: true,
      isAvailable: true
    }]);
    setNewHeadingChoice('');
  };

  const handleRemoveHeadingChoice = (index) => {
    const newChoices = [...headingChoices];
    newChoices.splice(index, 1);
    setHeadingChoices(newChoices);
  };

  const handleAddAddon = (e) => {
    if (e && e.type === 'keydown' && e.key !== 'Enter') return;
    if (!newAddonName.trim()) return;
    const price = parseFloat(newAddonPrice) || 0;
    if (price < 0) return;
    if (addons.some(o => o.name.toLowerCase() === newAddonName.trim().toLowerCase())) return;

    setAddons([...addons, { 
      name: newAddonName.trim(), 
      additionalPrice: price, 
      isActive: true,
      isAvailable: true
    }]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (index) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    setAddons(newAddons);
  };

  const handleToggleAddonActive = (index) => {
    const newAddons = [...addons];
    newAddons[index].isAvailable = !newAddons[index].isAvailable;
    setAddons(newAddons);
  };

  const handleSave = async () => {
    if (headingChoices.length > 0 && !headingName.trim()) {
      return alert('Customization Heading is required if you add choices.');
    }

    setIsSaving(true);
    try {
      const existingRes = await api.get(`/foods/${selectedFoodId}/customizations`);
      const existingDbGroups = Array.isArray(existingRes) ? existingRes : (existingRes.data || []);
      const existingSingle = existingDbGroups.find(g => g.selectionType === 'single')?.choices || [];
      const existingMulti = existingDbGroups.find(g => g.selectionType === 'multiple')?.choices || [];

      // 1. Process Heading Group
      if (headingChoices.length > 0) {
        if (singleGroupId) {
          await api.patch(`/customization-groups/${singleGroupId}`, {
            name: headingName.trim(),
            selectionType: 'single',
            isRequired: false,
            isActive: isActiveCustomization
          });
          for (const choice of headingChoices) {
            if (choice.id) {
              await api.patch(`/customization-choices/${choice.id}`, { name: choice.name, additionalPrice: 0 });
              await api.patch(`/customization-choices/${choice.id}/availability`, { isAvailable: choice.isAvailable !== false });
            } else {
              await api.post(`/customization-groups/${singleGroupId}/choices`, { name: choice.name, additionalPrice: 0 });
            }
          }

          const currentSingleIds = headingChoices.map(c => c.id).filter(id => id);
          for (const old of existingSingle) {
            if (!currentSingleIds.includes(old.id)) {
              await api.patch(`/customization-choices/${old.id}/deactivate`);
            }
          }
        } else {
          await api.post(`/foods/${selectedFoodId}/customization-groups`, {
            name: headingName.trim(),
            selectionType: 'single',
            isRequired: false,
            choices: headingChoices.map(c => ({ name: c.name, additionalPrice: 0, isAvailable: c.isAvailable !== false }))
          });
        }
      } else if (singleGroupId) {
         await api.patch(`/customization-groups/${singleGroupId}`, { isActive: false });
      }

      // 2. Process Addons Group
      if (addons.length > 0) {
        if (addonsGroupId) {
          await api.patch(`/customization-groups/${addonsGroupId}`, {
            name: 'Popular Add-ons',
            selectionType: 'multiple',
            isRequired: false,
            isActive: isActiveCustomization
          });
          for (const addon of addons) {
            if (addon.id) {
              await api.patch(`/customization-choices/${addon.id}`, { name: addon.name, additionalPrice: addon.additionalPrice });
              await api.patch(`/customization-choices/${addon.id}/availability`, { isAvailable: addon.isAvailable !== false });
            } else {
              await api.post(`/customization-groups/${addonsGroupId}/choices`, { name: addon.name, additionalPrice: addon.additionalPrice });
            }
          }

          const currentMultiIds = addons.map(a => a.id).filter(id => id);
          for (const old of existingMulti) {
            if (!currentMultiIds.includes(old.id)) {
              await api.patch(`/customization-choices/${old.id}/deactivate`);
            }
          }
        } else {
          await api.post(`/foods/${selectedFoodId}/customization-groups`, {
            name: 'Popular Add-ons',
            selectionType: 'multiple',
            isRequired: false,
            choices: addons.map(a => ({ name: a.name, additionalPrice: a.additionalPrice, isAvailable: a.isAvailable !== false }))
          });
        }
      } else if (addonsGroupId) {
         await api.patch(`/customization-groups/${addonsGroupId}`, { isActive: false });
      }

      await fetchGroups();
      alert('Customizations saved successfully!');
    } catch (err) {
      alert('Failed to save customizations. ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingFoods) return <div>Loading foods...</div>;

  return (
    <div>
      {/* Top Food Selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
            Select Food Item to Customize
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedFoodId}
              onChange={(e) => setSelectedFoodId(e.target.value)}
              style={{ width: '100%', appearance: 'none', padding: '0.65rem 1rem 0.65rem 1rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', background: 'var(--bg-card)' }}
            >
              {foods.length === 0 ? (
                <option value="" disabled>No food items available. Add a food item first.</option>
              ) : (
                <>
                  <option value="" disabled>Select a food item to manage customizations</option>
                  {foods.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.category?.name ? `${f.category.name} — ` : ''}₹{f.offerPrice || f.price}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown size={15} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          </div>
        </div>

        {selectedFood && (
          <div style={{ flex: 2, background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <img src={selectedFood.image} alt={selectedFood.name} style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '850', color: 'var(--text-main)' }}>{selectedFood.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {selectedFood.category?.name || 'Category'}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)' }}>
                  Base: ₹{selectedFood.offerPrice || selectedFood.price}
                </span>
              </div>
            </div>
            <button 
              disabled={!singleGroupId && !addonsGroupId}
              onClick={() => document.getElementById('customizations-form')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: '700', color: (!singleGroupId && !addonsGroupId) ? '#cbd5e1' : 'var(--text-muted)', cursor: (!singleGroupId && !addonsGroupId) ? 'not-allowed' : 'pointer', opacity: (!singleGroupId && !addonsGroupId) ? 0.5 : 1 }}>
              Edit Details
            </button>
          </div>
        )}
      </div>

      {selectedFood && (
        <div id="customizations-form" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* SECTION 1: HEADING & CHOICES */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>Customization Heading & Options</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>These options will appear as single-choice pills in the customer app.</p>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Customization Heading *</label>
              <input 
                type="text" 
                value={headingName}
                onChange={(e) => setHeadingName(e.target.value)}
                placeholder="e.g. Choose Spice Level"
                style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', outline: 'none', marginBottom: '1.5rem' }}
              />

              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Options (No Extra Price)</label>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={newHeadingChoice} 
                  onChange={(e) => setNewHeadingChoice(e.target.value)} 
                  onKeyDown={handleAddHeadingChoice}
                  placeholder="e.g. Mild" 
                  style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} 
                />
                <button onClick={() => handleAddHeadingChoice()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={16} /> Add
                </button>
              </div>

              {headingChoices.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                  {headingChoices.map((choice, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{choice.name}</span>
                      <button onClick={() => handleRemoveHeadingChoice(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ADD-ONS */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>Add-ons</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Customers can select multiple add-ons. These will add to the final price.</p>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Add-on Name *</label>
                  <input type="text" value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} onKeyDown={handleAddAddon} placeholder="e.g. Extra Cheese" style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Extra Price (₹) *</label>
                  <input type="number" min="0" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} onKeyDown={handleAddAddon} placeholder="0" style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                </div>
                <button onClick={() => handleAddAddon()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={16} /> Add
                </button>
              </div>

              {addons.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Add-on</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Extra Price</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '800', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map((opt, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>{opt.name}</td>
                        <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center', color: parseFloat(opt.additionalPrice) > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {parseFloat(opt.additionalPrice) > 0 ? `+₹${parseFloat(opt.additionalPrice)}` : '₹0'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                          <div 
                            onClick={() => handleToggleAddonActive(idx)}
                            style={{ width: '36px', height: '20px', backgroundColor: opt.isAvailable !== false ? 'var(--primary)' : '#cbd5e1', borderRadius: '10px', position: 'relative', cursor: 'pointer', margin: '0 auto' }}
                          >
                            <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', position: 'absolute', top: '2px', left: opt.isAvailable !== false ? '18px' : '2px', transition: 'left 0.2s' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                          <button onClick={() => handleRemoveAddon(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '0.2rem' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* FOOTER CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <h5 style={{ fontSize: '0.9rem', fontWeight: '800' }}>Active Customizations</h5>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Turn off to temporarily hide all customizations for this food.</p>
            </div>
            <div 
              onClick={() => setIsActiveCustomization(!isActiveCustomization)}
              style={{ width: '44px', height: '24px', backgroundColor: isActiveCustomization ? 'var(--primary)' : '#cbd5e1', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}
            >
              <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', position: 'absolute', top: '2px', left: isActiveCustomization ? '22px' : '2px', transition: 'left 0.2s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '0.75rem 2rem', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: '800', cursor: isSaving ? 'not-allowed' : 'pointer', color: '#fff', boxShadow: 'var(--shadow-glow)', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? 'Saving...' : 'Save Customizations'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
