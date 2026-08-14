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
  { id: 'kochi', label: 'MG Road, Kochi', address: 'Marine Drive, MG Road, Ernakulam', city: 'Kochi, Kerala', default: true },
  { id: 'trivandrum', label: 'Technopark, Trivandrum', address: 'Phase 3, Technopark Campus, Kazhakkoottam', city: 'Trivandrum, Kerala', default: false },
  { id: 'calicut', label: 'Mavoor Road, Kozhikode', address: 'Focus Mall Area, Mavoor Road', city: 'Kozhikode, Kerala', default: false },
  { id: 'bengaluru', label: 'Indiranagar, Bengaluru', address: 'Flat 402, Lotus Residency, 100 Feet Rd', city: 'Bengaluru, Karnataka', default: false }
];

export const DRIVER_PROFILES = [
  { name: 'Rahul Sharma', rating: 4.95, trips: 1420, vehicle: 'Red TVS Jupiter (Reg # KL-07-EQ-4589)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', phone: '+91 98765 43210' },
  { name: 'Priya Nair', rating: 5.0, trips: 2890, vehicle: 'Electric Honda Activa (Reg # KL-01-EV-1029)', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', phone: '+91 91234 56789' },
  { name: 'Amit Patel', rating: 4.88, trips: 980, vehicle: 'Hero Splendor (Reg # KL-11-AB-7744)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', phone: '+91 99887 76655' }
];

export const RESTAURANTS = [
  // Hotel 1
  {
    id: 'rest-1',
    name: 'Taj Mahal Royal Spices & Biryani',
    category: 'indian',
    rating: 4.9,
    reviewsCount: 680,
    deliveryTime: '20-30 min',
    deliveryFee: 35,
    minOrder: 150,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: '50% OFF with WELCOME50',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    address: '55 MG Road, Kochi, Kerala',
    description: 'Aromatic Malabar & Hyderabadi Dum Biryani, butter chicken, tandoori naan, and authentic Indian delights.',
    menu: [
      { id: 'item-101', name: 'Hyderabadi Chicken Dum Biryani', categoryName: 'Biryani Specials', price: 299, description: 'Fragrant Basmati rice layered with marinated chicken, saffron, caramelized onions, served with Raita.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-102', name: 'Authentic Malabar Mutton Biryani', categoryName: 'Biryani Specials', price: 369, description: 'Traditional Kaima rice cooked in ghee with tender slow-cooked mutton & cashews.', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-103', name: 'Murgh Makhani (Butter Chicken)', categoryName: 'Royal Curries', price: 349, description: 'Charcoal grilled chicken tikka simmered in rich creamy tomato butter gravy.', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-104', name: 'Paneer Tikka Masala', categoryName: 'Royal Curries', price: 289, description: 'Fresh cottage cheese cubes cooked in a spiced onion-tomato gravy.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-105', name: 'Slow Cooked Dal Makhani', categoryName: 'Royal Curries', price: 229, description: 'Black lentils slow cooked overnight with butter, cream, and herbs.', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-106', name: 'Clay Oven Tandoori Chicken', categoryName: 'Tandoori Starters', price: 279, description: 'Whole chicken leg marinated in spiced yogurt and roasted in tandoor.', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-107', name: 'Kadhai Paneer Special', categoryName: 'Royal Curries', price: 269, description: 'Paneer tossed with capsicum, onions, and freshly ground coriander spices.', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-108', name: 'Garlic Butter Naan Basket (3 pcs)', categoryName: 'Breads', price: 129, description: 'Fluffy tandoori naans brushed with minced garlic and fresh ghee.', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-109', name: 'Jeera Saffron Basmati Rice', categoryName: 'Rice', price: 139, description: 'Long grain rice tempered with cumin seeds and pure saffron.', image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-110', name: 'Gulab Jamun with Rabri (2 pcs)', categoryName: 'Desserts', price: 99, description: 'Soft melt-in-mouth milk dumplings soaked in cardamom rose syrup with chilled rabri.', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 2
  {
    id: 'rest-2',
    name: 'Bella Italia Woodfired Pizza & Pasta',
    category: 'pizza',
    rating: 4.85,
    reviewsCount: 420,
    deliveryTime: '20-35 min',
    deliveryFee: 40,
    minOrder: 199,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'Free Delivery over ₹149',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=80',
    address: 'Marine Drive, Kochi, Kerala',
    description: 'Authentic sourdough pizzas cooked in a 450°C woodfired brick oven with imported mozzarella.',
    menu: [
      { id: 'item-201', name: 'Truffle Mushroom & Cheese Pizza', categoryName: 'Woodfired Pizzas', price: 499, description: 'Creamy truffle base, wild roasted mushrooms, fior di latte mozzarella, and basil.', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-202', name: 'Spicy Artisanal Pepperoni Pizza', categoryName: 'Woodfired Pizzas', price: 479, description: 'San Marzano tomato sauce, double spicy pepperoni, hot honey drizzle.', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-203', name: 'Classic Margherita Supreme', categoryName: 'Woodfired Pizzas', price: 349, description: 'Organic San Marzano tomato sauce, fresh buffalo mozzarella, extra virgin olive oil.', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-204', name: 'Quattuor Formaggi (Four Cheese)', categoryName: 'Woodfired Pizzas', price: 459, description: 'Mozzarella, Gorgonzola blue cheese, Parmesan Reggiano, and creamy Ricotta.', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-205', name: 'Chicken Barbecue Fiesta Pizza', categoryName: 'Woodfired Pizzas', price: 469, description: 'Smoky BBQ chicken, red onions, bell peppers, mozzarella, cilantro.', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-206', name: 'Garlic Cheese Breadsticks', categoryName: 'Sides & Starters', price: 189, description: 'Freshly baked sourdough sticks with garlic butter and melted mozzarella.', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-207', name: 'Creamy Alfredo Mushroom Penne', categoryName: 'Pastas', price: 329, description: 'Penne pasta tossed in rich parmesan cream sauce with sauteed mushrooms.', image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281270?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-208', name: 'Spicy Arrabbiata Red Sauce Pasta', categoryName: 'Pastas', price: 299, description: 'Penne in fiery chili tomato sauce with garlic and fresh parsley.', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-209', name: 'Italian Tiramisu Cup', categoryName: 'Desserts', price: 199, description: 'Layers of espresso dipped ladyfingers, whipped mascarpone cream & cocoa powder.', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-210', name: 'Chilled Mint Lemonade', categoryName: 'Beverages', price: 99, description: 'Refreshing sparkling lemonade with crushed fresh mint leaves.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 3
  {
    id: 'rest-3',
    name: 'Burger & Smokehouse Lab',
    category: 'burger',
    rating: 4.8,
    reviewsCount: 310,
    deliveryTime: '15-25 min',
    deliveryFee: 29,
    minOrder: 120,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'FLAT ₹50 OFF',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    address: 'Panampilly Nagar, Kochi, Kerala',
    description: 'Juicy smashed Wagyu patties, smoked bacon, melted cheddar cheese, and secret house sauce.',
    menu: [
      { id: 'item-301', name: 'Double Cheeseburger Smash', categoryName: 'Burgers', price: 299, description: 'Two crispy edged patties, double yellow cheddar, grilled onions, house sauce.', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-302', name: 'Crispy Peri Peri Chicken Burger', categoryName: 'Burgers', price: 259, description: 'Crispy buttermilk fried chicken breast, peri peri sauce, coleslaw & pickles.', image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-303', name: 'Smoky BBQ Bacon Monster Burger', categoryName: 'Burgers', price: 349, description: 'Triple beef patty, smoked bacon, onion rings, BBQ sauce & double cheddar.', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-304', name: 'Veggie Supreme Quinoa Burger', categoryName: 'Burgers', price: 229, description: 'Crispy black bean & quinoa patty, smashed avocado, vegan chipotle mayo.', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-305', name: 'Fiery Jalapeno Angus Burger', categoryName: 'Burgers', price: 319, description: 'Angus patty, grilled jalapenos, pepper jack cheese, spicy siracha mayo.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-306', name: 'Truffle Parmesan Loaded Fries', categoryName: 'Sides', price: 179, description: 'Golden cut fries tossed in white truffle oil, shaved parmesan & parsley.', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-307', name: 'Crispy Buffalo Wings (8 pcs)', categoryName: 'Sides', price: 269, description: 'Deep fried chicken wings tossed in hot spicy buffalo sauce with ranch dip.', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-308', name: 'Cheesy Mozzarella Sticks (6 pcs)', categoryName: 'Sides', price: 199, description: 'Golden fried gooey mozzarella cheese sticks served with marinara dip.', image: 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-309', name: 'Classic Salted Caramel Milkshake', categoryName: 'Shakes', price: 159, description: 'Thick vanilla ice cream blend with sea salted caramel sauce.', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-310', name: 'Chocolate Fudge Brownie Shake', categoryName: 'Shakes', price: 179, description: 'Rich Belgian chocolate shake blended with gooey brownie chunks.', image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 4
  {
    id: 'rest-4',
    name: 'Sakura Asian & Sushi Bar',
    category: 'sushi',
    rating: 4.92,
    reviewsCount: 510,
    deliveryTime: '25-35 min',
    deliveryFee: 49,
    minOrder: 250,
    priceTier: '₹₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'Gourmet Japanese',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80',
    address: 'Kakkanad, Kochi, Kerala',
    description: 'Master sushi rolls, salmon sashimi platters, Tokyo ramen, and authentic Asian delights.',
    menu: [
      { id: 'item-401', name: 'Dragon Emperor Sushi Roll (8 pcs)', categoryName: 'Sushi', price: 549, description: 'Shrimp tempura, avocado, topped with torched unagi eel & tobiko caviar.', image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-402', name: 'Fresh Salmon Sashimi Set (8 pcs)', categoryName: 'Sashimi', price: 699, description: 'Prime grade Norwegian salmon sashimi served with soy sauce & wasabi.', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-403', name: 'Tokyo Spicy Miso Ramen Bowl', categoryName: 'Ramen & Noodles', price: 399, description: 'Rich pork & chicken broth, ramen noodles, soft egg, chashu pork & nori.', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-404', name: 'Crispy Pork Gyoza Dumplings (6 pcs)', categoryName: 'Starters', price: 249, description: 'Pan-fried Japanese dumplings served with ponzu soy sesame dipping sauce.', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-405', name: 'Thai Green Curry with Jasmine Rice', categoryName: 'Asian Mains', price: 379, description: 'Fragrant coconut green curry with bamboo shoots, basil, peppers & chicken.', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-406', name: 'Spicy Tuna Volcano Roll (8 pcs)', categoryName: 'Sushi', price: 529, description: 'Spicy yellowfin tuna, cucumber, topped with sriracha mayo & crispy tempura flakes.', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-407', name: 'Chicken Pad Thai Noodles', categoryName: 'Ramen & Noodles', price: 349, description: 'Stir-fried flat rice noodles with chicken, bean sprouts, peanuts & tamarind sauce.', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-408', name: 'Steamed Edamame with Sea Salt', categoryName: 'Starters', price: 189, description: 'Steamed young soybeans tossed in sea salt flakes & sesame oil.', image: 'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-409', name: 'Japanese Matcha Green Tea Ice Cream', categoryName: 'Desserts', price: 169, description: 'Authentic Kyoto ceremonial grade matcha green tea ice cream scoop.', image: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-410', name: 'Mango Sticky Rice Dessert', categoryName: 'Desserts', price: 199, description: 'Sweet coconut sticky rice served with fresh Alphonso mango slices.', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true }
    ]
  },

  // Hotel 5
  {
    id: 'rest-5',
    name: 'Green Bowl & Healthy Salads',
    category: 'healthy',
    rating: 4.75,
    reviewsCount: 180,
    deliveryTime: '15-25 min',
    deliveryFee: 35,
    minOrder: 150,
    priceTier: '₹₹',
    isTopRated: false,
    isVeg: true,
    offerText: 'Organic & Fresh',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
    address: 'Vyttila, Kochi, Kerala',
    description: 'Nourishing power bowls packed with quinoa, avocado, wild salmon, organic kale, and lemon tahini dressing.',
    menu: [
      { id: 'item-501', name: 'Avocado Quinoa Power Bowl', categoryName: 'Healthy Bowls', price: 329, description: 'Haas avocado, tri-color quinoa, sweet potatoes, edamame, and lemon tahini.', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-502', name: 'Mediterranean Falafel & Hummus Bowl', categoryName: 'Healthy Bowls', price: 279, description: 'Crispy falafels, brown rice, cucumber tomato salad, hummus & tahini.', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-503', name: 'Smoked Salmon Caesar Salad', categoryName: 'Salads', price: 389, description: 'Norwegian smoked salmon, romaine lettuce, parmesan shavings & Caesar dressing.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-504', name: 'Grilled Paneer Protein Grain Bowl', categoryName: 'Healthy Bowls', price: 299, description: 'Herb grilled cottage cheese, wild rice, broccoli, walnuts & lemon dressing.', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-505', name: 'Roasted Sweet Potato & Kale Salad', categoryName: 'Salads', price: 249, description: 'Tender kale, honey roasted sweet potatoes, cranberries & pumpkin seeds.', image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-506', name: 'Cold Pressed Dragonfruit Smoothie', categoryName: 'Smoothies', price: 159, description: '100% organic dragonfruit, coconut water, lime & chia seeds.', image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-507', name: 'Fresh Berry Acai Super Bowl', categoryName: 'Smoothies', price: 269, description: 'Organic acai berry blend topped with banana slices, blueberries & granola.', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-508', name: 'Detox Green Apple & Cucumber Juice', categoryName: 'Beverages', price: 129, description: 'Cold pressed green apple, cucumber, celery, mint and ginger juice.', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-509', name: 'Organic Peanut Butter Energy Bites', categoryName: 'Snacks', price: 119, description: 'No-bake oats, peanut butter, dark chocolate chips & flaxseed balls.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-510', name: 'Chia Seed & Mango Coconut Pudding', categoryName: 'Desserts', price: 149, description: 'Overnight chia seeds soaked in coconut milk topped with Alphonso mango puree.', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 6
  {
    id: 'rest-6',
    name: 'El Mariachi Street Tacos & Burritos',
    category: 'tacos',
    rating: 4.82,
    reviewsCount: 340,
    deliveryTime: '15-30 min',
    deliveryFee: 35,
    minOrder: 150,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'Mexican Special',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    address: 'Kaloor, Kochi, Kerala',
    description: 'Authentic Mexican street tacos, Birria quesatacos with dipping consommé broth & burritos.',
    menu: [
      { id: 'item-601', name: 'Beef Birria Quesatacos (3 pcs + Broth)', categoryName: 'Tacos', price: 349, description: 'Crispy corn tortillas dipped in chili oil, melted cheese, braised beef & broth.', image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-602', name: 'Loaded Chicken Burrito Bowl', categoryName: 'Burritos', price: 299, description: 'Cilantro lime rice, grilled chicken, black beans, guacamole & sour cream.', image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-603', name: 'Crispy Fish Tacos with Chipotle Mayo', categoryName: 'Tacos', price: 329, description: 'Battered crispy fish fillets, purple cabbage slaw, avocado salsa & chipotle mayo.', image: 'https://images.unsplash.com/photo-1512838243191-e81e8f66f1fd?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-604', name: 'Spicy Pork Carnitas Burrito', categoryName: 'Burritos', price: 319, description: 'Slow cooked pulled pork, Mexican rice, pinto beans, jalapenos & melted cheese.', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-605', name: 'Cheesy Loaded Nachos Supreme', categoryName: 'Sides', price: 249, description: 'Crispy tortilla chips smothered in warm queso cheese, salsa & jalapenos.', image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-606', name: 'Cheesy Chicken Quesadilla', categoryName: 'Quesadillas', price: 279, description: 'Toasted flour tortilla stuffed with spiced chicken, melted jack cheese & peppers.', image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-607', name: 'Guacamole & Fresh Corn Chips', categoryName: 'Sides', price: 179, description: 'Housemade guacamole with fresh avocados, lime, onion & crispy tortilla chips.', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-608', name: 'Churros with Warm Chocolate Dip', categoryName: 'Desserts', price: 169, description: 'Fried cinnamon sugar churro loops served with rich hot chocolate dip.', image: 'https://images.unsplash.com/photo-1624371414361-e670edf4898d?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-609', name: 'Mexican Horchata Cinnamon Milk', categoryName: 'Beverages', price: 119, description: 'Traditional sweet rice and almond milk beverage infused with cinnamon.', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-610', name: 'Frozen Passionfruit Margarita', categoryName: 'Beverages', price: 149, description: 'Chilled passionfruit slushy with fresh lime & chili salt rim.', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true }
    ]
  },

  // Hotel 7
  {
    id: 'rest-7',
    name: 'Malabar Coastal Seafood Kitchen',
    category: 'seafood',
    rating: 4.88,
    reviewsCount: 460,
    deliveryTime: '25-35 min',
    deliveryFee: 39,
    minOrder: 200,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'Fresh Catch Daily',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
    address: 'Fort Kochi, Kerala',
    description: 'Fresh local coastal catches, Karimeen Pollichathu, Kerala prawns roast, and traditional fish curry.',
    menu: [
      { id: 'item-701', name: 'Karimeen Pollichathu (Pearlspot)', categoryName: 'Seafood Specials', price: 449, description: 'Fresh Pearlspot fish marinated in spicy Kerala masala and baked inside banana leaf.', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-702', name: 'Malabar Fish Curry with Coconut Milk', categoryName: 'Curries', price: 349, description: 'Seer fish cooked in roasted coconut milk, kudampuli (gamboge), and curry leaves.', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-703', name: 'Kerala Fiery Prawn Roast', categoryName: 'Seafood Specials', price: 399, description: 'Jumbo prawns roasted with caramelized shallots, garlic, black pepper, and coconut strips.', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-704', name: 'Crab Masala Special', categoryName: 'Seafood Specials', price: 429, description: 'Mud crabs cooked in spicy Kerala onion tomato gravy infused with fennel spices.', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-705', name: 'Kerala Soft Flaky Parotta (3 pcs)', categoryName: 'Breads', price: 69, description: 'Layered flaky Kerala wheat parottas prepared with ghee.', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-706', name: 'Appam with Veg Coconut Stew', categoryName: 'Breads', price: 149, description: 'Soft lacy rice hoppers served with aromatic mild coconut vegetable stew.', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-707', name: 'Squid Fry Pepper Masala', categoryName: 'Starters', price: 319, description: 'Tender squid rings tossed with crushed black pepper, garlic, and fried curry leaves.', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-708', name: 'Chemmeen (Prawns) Biryani', categoryName: 'Rice', price: 379, description: 'Kaima rice cooked with spiced prawns, ghee, cashews & raisins.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-709', name: 'Tender Coconut Payasam', categoryName: 'Desserts', price: 129, description: 'Chilled dessert made with tender coconut pulp, milk, and cardamom.', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-710', name: 'Kerala Kulukki Sarbath', categoryName: 'Beverages', price: 69, description: 'Shaken lemonade with green chilies, basil seeds, and crushed ice.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true }
    ]
  },

  // Hotel 8
  {
    id: 'rest-8',
    name: "Sultan's Lebanese Grill & Shawarma",
    category: 'middle_eastern',
    rating: 4.86,
    reviewsCount: 390,
    deliveryTime: '20-30 min',
    deliveryFee: 30,
    minOrder: 150,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: false,
    offerText: 'FLAT ₹50 OFF',
    image: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    address: 'Edappally, Kochi, Kerala',
    description: 'Charcoal grilled chicken shawarma, mutton kebabs, authentic creamy hummus and falafel wraps.',
    menu: [
      { id: 'item-801', name: 'Signature Whole Chicken Shawarma Roll', categoryName: 'Shawarma', price: 189, description: 'Slow roasted chicken wrapped in rumali roti with garlic toum sauce and french fries.', image: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-802', name: 'Falafel Wrap with Garlic Toum', categoryName: 'Shawarma', price: 149, description: 'Crispy fried chickpea falafels with tahini, pickled turnip, and fresh pita.', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-803', name: 'Mixed Meat Grill Platter (Shish Kebab)', categoryName: 'Grills', price: 499, description: 'Assorted chicken tikka, mutton seekh kebab, and grilled wings served with garlic dip.', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-804', name: 'Mutton Seekh Kebab Platter', categoryName: 'Grills', price: 389, description: 'Minced mutton skewers seasoned with Arabic spices and grilled over hot coals.', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-805', name: 'Creamy Authentic Hummus with Pita (2 pcs)', categoryName: 'Dips', price: 199, description: 'Smooth chickpea & tahini dip drizzled with olive oil, served with warm pita.', image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-806', name: 'Baba Ganoush Roasted Eggplant Dip', categoryName: 'Dips', price: 189, description: 'Smoky fire roasted eggplant dip blended with tahini, garlic, and pomegranate seeds.', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-807', name: 'Spicy Potato Batata Harra', categoryName: 'Starters', price: 169, description: 'Crispy cubed potatoes tossed with red chili flakes, coriander, and garlic.', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-808', name: 'Fattoush Fresh Garden Salad', categoryName: 'Salads', price: 179, description: 'Crisp lettuce, radish, sumac spice, and crunchy toasted pita chips.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-809', name: 'Crisp Pistachio Baklava (4 pcs)', categoryName: 'Desserts', price: 199, description: 'Flaky honey soaked phyllo pastry layered with roasted crushed pistachios.', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-810', name: 'Fresh Mint Laban Milk', categoryName: 'Beverages', price: 89, description: 'Chilled salted yogurt drink infused with crushed mint leaves.', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 9
  {
    id: 'rest-9',
    name: 'Dragon Wok Chinese Express',
    category: 'chinese',
    rating: 4.78,
    reviewsCount: 310,
    deliveryTime: '20-30 min',
    deliveryFee: 35,
    minOrder: 150,
    priceTier: '₹₹',
    isTopRated: false,
    isVeg: false,
    offerText: 'Indo-Chinese Wok',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1200&q=80',
    address: 'Vyttila, Kochi, Kerala',
    description: 'Fiery Schezwan noodles, chilli chicken dry, wok tossed fried rice, and steamy hot momos.',
    menu: [
      { id: 'item-901', name: 'Chicken Hakka Noodles', categoryName: 'Noodles', price: 239, description: 'Wok tossed noodles with shredded chicken, bell peppers, and savory soy sauce.', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-902', name: 'Schezwan Triple Egg Fried Rice', categoryName: 'Rice', price: 269, description: 'Fiery Schezwan fried rice served with crispy fried noodles and Schezwan gravy.', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-903', name: 'Crispy Chilli Chicken Dry', categoryName: 'Starters', price: 279, description: 'Boneless fried chicken tossed with green chilies, garlic, and dark soy sauce.', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-904', name: 'Veg Manchurian Gravy', categoryName: 'Mains', price: 229, description: 'Crispy veg dumplings simmered in tangy ginger-garlic Manchurian gravy.', image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-905', name: 'Honey Chilli Lotus Stem & Potato', categoryName: 'Starters', price: 219, description: 'Crispy lotus stem chips coated in sweet honey chili sauce & sesame seeds.', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-906', name: 'Crispy Fried Chicken Momos (8 pcs)', categoryName: 'Momos', price: 199, description: 'Golden fried chicken momos served with spicy red chili garlic chutney.', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-907', name: 'Steam Veg Momos with Salsa (8 pcs)', categoryName: 'Momos', price: 169, description: 'Steamed cabbage & corn dumplings with dip.', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-908', name: 'Drums of Heaven (Lollipop 6 pcs)', categoryName: 'Starters', price: 289, description: 'Chicken lollipops tossed in sweet spicy Schezwan sauce.', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: true },
      { id: 'item-909', name: 'Hot & Sour Chicken Soup', categoryName: 'Soups', price: 149, description: 'Classic spicy and sour thick broth with shredded chicken and mushrooms.', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80', isVeg: false, isPopular: false },
      { id: 'item-910', name: 'Sweet Date Pancake with Ice Cream', categoryName: 'Desserts', price: 179, description: 'Crispy Chinese date pancake served warm with vanilla ice cream.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false }
    ]
  },

  // Hotel 10
  {
    id: 'rest-10',
    name: 'Sweet Tooth Dessert & Cafe Lounge',
    category: 'desserts',
    rating: 4.95,
    reviewsCount: 750,
    deliveryTime: '15-25 min',
    deliveryFee: 25,
    minOrder: 100,
    priceTier: '₹₹',
    isTopRated: true,
    isVeg: true,
    offerText: 'Sweet Treats',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    coverImage: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80',
    address: 'Kakkanad, Kochi, Kerala',
    description: 'Decadent chocolate molten lava cakes, New York cheesecake slices, artisanal cold brews, and nutella waffles.',
    menu: [
      { id: 'item-1001', name: 'Belgian Dark Chocolate Lava Cake', categoryName: 'Cakes', price: 189, description: 'Warm dark chocolate cake with a molten oozing truffle center.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-1002', name: 'New York Baked Cheesecake Slice', categoryName: 'Cakes', price: 249, description: 'Dense and creamy baked cheesecake slice on a buttery graham cracker crust.', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-1003', name: 'Warm Nutella Waffle with Ice Cream', categoryName: 'Waffles', price: 219, description: 'Crispy Belgian waffle smothered in warm Nutella and topped with vanilla ice cream.', image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-1004', name: 'Sizzling Chocolate Brownie', categoryName: 'Desserts', price: 229, description: 'Fudge brownie served sizzling hot with dark chocolate sauce & ice cream.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-1005', name: 'Red Velvet Cupcake Special', categoryName: 'Cakes', price: 119, description: 'Moist red velvet cupcake with rich cream cheese frosting.', image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-1006', name: 'Iced Caramel Macchiato Coffee', categoryName: 'Coffee', price: 169, description: 'Espresso poured over chilled milk, ice, and sweet vanilla & caramel syrup.', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true },
      { id: 'item-1007', name: 'Classic Espresso Cappuccino', categoryName: 'Coffee', price: 139, description: 'Rich dark espresso topped with steamed milk and thick velvet foam.', image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-1008', name: 'Fresh Mango Cream Parfait', categoryName: 'Desserts', price: 179, description: 'Layered Alphonso mango pulp, vanilla sponge, and whipped sweet cream.', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-1009', name: 'Strawberry Shortcake Sundae', categoryName: 'Ice Cream', price: 199, description: 'Vanilla ice cream topped with fresh strawberry compote & biscuit crumbles.', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: false },
      { id: 'item-1010', name: 'Chilled Spanish Cold Brew Coffee', categoryName: 'Coffee', price: 179, description: '12-hour steep cold brew coffee sweetened with condensed milk over ice.', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80', isVeg: true, isPopular: true }
    ]
  }
];
