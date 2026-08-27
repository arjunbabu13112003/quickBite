// QuickBite Mock Data - Indian Currency (₹) & Localized Preset Locations

export const CATEGORIES = [
  { id: 'all', name: 'All Cuisines', icon: 'Sparkles', count: 100 },
  { id: 'indian', name: 'Indian Spices', icon: 'Flame', count: 20 },
  { id: 'pizza', name: 'Pizza & Pasta', icon: 'Pizza', count: 10 },
  { id: 'burger', name: 'Burgers & Fries', icon: 'UtensilsCrossed', count: 10 },
  { id: 'sushi', name: 'Japanese & Asian', icon: 'Fish', count: 10 },
  { id: 'healthy', name: 'Healthy Bowls', icon: 'Salad', count: 10 },
  { id: 'tacos', name: 'Street Tacos', icon: 'Sandwich', count: 10 },
  { id: 'seafood', name: 'Coastal Seafood', icon: 'Fish', count: 10 },
  { id: 'middle_eastern', name: 'Shawarma & Grill', icon: 'Flame', count: 10 },
  { id: 'chinese', name: 'Indo-Chinese Wok', icon: 'Soup', count: 10 },
  { id: 'desserts', name: 'Café & Desserts', icon: 'IceCream', count: 10 }
];

export const PROMO_CODES = [
  { code: 'WELCOME50', discountType: 'percentage', value: 50, maxDiscount: 150, minOrder: 199, description: '50% OFF up to ₹150 on your first order' },
  { code: 'FREEDELIVERY', discountType: 'delivery', value: 0, minOrder: 149, description: 'Free delivery on orders over ₹149' },
  { code: 'SAVOUR50', discountType: 'fixed', value: 50, minOrder: 399, description: 'FLAT ₹50 OFF on orders above ₹399' }
];

export const PRESET_ADDRESSES = [
  { id: 'kannur', label: 'Fort Road, Kannur', address: 'Near Railway Station, Fort Road', city: 'Kannur, Kerala', default: true, latitude: 11.8722, longitude: 75.3740 },
  { id: 'kozhikode', label: 'Mavoor Road, Kozhikode', address: 'Focus Mall Area, Mavoor Road', city: 'Kozhikode, Kerala', default: false, latitude: 11.2588, longitude: 75.7804 },
  { id: 'kollam', label: 'Chinnakada, Kollam', address: 'Near Clock Tower, Chinnakada', city: 'Kollam, Kerala', default: false, latitude: 8.8932, longitude: 76.6141 },
  { id: 'kochi', label: 'MG Road, Kochi', address: 'Marine Drive, MG Road, Ernakulam', city: 'Kochi, Kerala', default: false, latitude: 9.9816, longitude: 76.2999 },
  { id: 'trivandrum', label: 'Technopark, Trivandrum', address: 'Phase 3, Technopark Campus, Kazhakkoottam', city: 'Trivandrum, Kerala', default: false, latitude: 8.5241, longitude: 76.9366 },
  { id: 'thrissur', label: 'Swaraj Round, Thrissur', address: 'Round North, City Center', city: 'Thrissur, Kerala', default: false, latitude: 10.5276, longitude: 76.2144 },
  { id: 'kottayam', label: 'Kanjikuzhy, Kottayam', address: 'Kottayam Kumarakom Rd', city: 'Kottayam, Kerala', default: false, latitude: 9.5916, longitude: 76.5222 }
];

export const DRIVER_PROFILES = [
  { name: 'Rahul Sharma', rating: 4.95, trips: 1420, vehicle: 'Red TVS Jupiter (Reg # KL-07-EQ-4589)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', phone: '+91 98765 43210' },
  { name: 'Priya Nair', rating: 5.0, trips: 2890, vehicle: 'Electric Honda Activa (Reg # KL-01-EV-1029)', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', phone: '+91 91234 56789' },
  { name: 'Amit Patel', rating: 4.88, trips: 980, vehicle: 'Hero Splendor (Reg # KL-11-AB-7744)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', phone: '+91 99887 76655' }
];

export const RESTAURANTS = [];
