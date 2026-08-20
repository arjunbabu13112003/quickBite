// QuickBite Mobile App - Guaranteed HD Food Avatars & Fallback Badges Fix Reload
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  NativeModules,
  AppState,
  Share
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import * as Location from 'expo-location';
import {
  Sparkles,
  Flame,
  Utensils,
  Heart,
  ShoppingBag,
  MapPin,
  Search,
  User,
  Plus,
  Minus,
  Check,
  X,
  ChevronRight,
  Star,
  AlertTriangle,
  Store,
  Clock,
  ArrowLeft,
  Phone,
  ShieldCheck,
  Award,
  Tag,
  Filter,
  LogOut,
  CreditCard,
  Truck,
  CheckCircle2,
  SlidersHorizontal,
  Home,
  Grid,
  PlusCircle,
  Trash2,
  Navigation,
  LocateFixed,
  Info,
  MessageSquare,
  ThumbsUp,
  Eye,
  EyeOff,
  Pencil,
  Camera,
  Moon,
  Sun,
  Zap,
  Mic,
  EllipsisVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Share2,
  Mail,
  Calendar
} from 'lucide-react-native';

import {
  CATEGORIES,
  RESTAURANTS as INITIAL_RESTAURANTS,
  PRESET_ADDRESSES,
  PROMO_CODES,
  DRIVER_PROFILES
} from './src/data/mockData';

import Constants from 'expo-constants';

// Helper to dynamically extract current PC IP address from Expo Metro
const getExpoHostIp = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
    }
  } catch (e) {
    console.warn('Expo hostUri detection:', e);
  }
  return '192.168.1.3';
};

const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
const BOTTOM_INSET = Platform.OS === 'android' ? 24 : 34;

// Helper to generate realistic ingredients for any dish
const getDishIngredients = (item) => {
  if (!item) return [];
  if (item.ingredientsList && item.ingredientsList.length > 0) return item.ingredientsList;
  if (item.ingredients) {
    if (Array.isArray(item.ingredients)) return item.ingredients;
    if (typeof item.ingredients === 'string') {
      return item.ingredients.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
};

// Helper to generate realistic customer reviews for any dish
const getDishReviews = (item) => {
  return [
    { id: 1, name: 'Anjali Ramesh', rating: 5, date: '2 days ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', comment: `Best ${item.name} in town! Super fresh and arrived piping hot.` },
    { id: 2, name: 'Vipin Kumar', rating: 5, date: '5 days ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', comment: 'Flavorful, authentic taste and great portion size. Highly recommended!' },
    { id: 3, name: 'Sneha Paul', rating: 4, date: '1 week ago', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', comment: 'Really good quality ingredients and fast delivery. Will definitely order again.' }
  ];
};

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80'
];

// Helper to format dynamic review timestamps (Just now, 1 min ago, 2 days ago)
const getTimeAgo = (dateInput) => {
  if (!dateInput) return 'Just now';
  if (typeof dateInput === 'string' && (dateInput.includes('ago') || dateInput === 'Just now')) {
    return dateInput;
  }
  const time = typeof dateInput === 'number' ? dateInput : Date.now();
  const diffSec = Math.max(1, Math.floor((Date.now() - time) / 1000));

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec} secs ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

// Static Food Category Avatars Data
const FOOD_AVATARS = [
  { id: 'burger', name: 'Burgers', bg: '#FFEDD5', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80' },
  { id: 'indian', name: 'Biryani', bg: '#FEF3C7', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=500&q=80' },
  { id: 'pizza', name: 'Pizzas', bg: '#FEE2E2', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80' },
  { id: 'middle_eastern', name: 'Shawarma', bg: '#FFE4E6', img: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=80' },
  { id: 'seafood', name: 'Seafood', bg: '#E0F2FE', img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=500&q=80' },
  { id: 'healthy', name: 'Healthy', bg: '#DCFCE7', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80' },
  { id: 'desserts', name: 'Desserts', bg: '#F3E8FF', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=80', fallback: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80' }
];

// Circular Food Avatar Component with Fixed Outer Ring to prevent Android native view recycling
const FoodAvatarItem = React.memo(({ food, isSelected, onPress, textColor }) => {
  const [imgUri, setImgUri] = useState(food.img);

  return (
    <TouchableOpacity
      style={{ alignItems: 'center', marginRight: 12 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.swiggyAvatarOuterRing,
        { borderColor: isSelected ? '#FF5252' : 'transparent' }
      ]}>
        <View style={[styles.swiggyCircularAvatarBorder, { backgroundColor: food.bg }]}>
          <Image
            source={{ uri: imgUri }}
            style={styles.swiggyCircularAvatarImg}
            resizeMode="cover"
            onError={() => {
              if (imgUri !== food.fallback) {
                setImgUri(food.fallback);
              }
            }}
          />
        </View>
      </View>
      <Text style={[styles.swiggyCircularAvatarLabel, { color: isSelected ? '#FF5252' : textColor }]}>{food.name}</Text>
    </TouchableOpacity>
  );
});

// Shimmering Skeleton Loader Component
const SkeletonCard = ({ darkMode }) => {
  const [pulseAnim] = useState(new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const bg = darkMode ? '#1E293B' : '#E2E8F0';

  return (
    <Animated.View style={[styles.skeletonCardContainer, { backgroundColor: darkMode ? '#181B28' : '#ffffff', borderColor: darkMode ? '#282C40' : '#E5E7EB', opacity: pulseAnim }]}>
      <View style={[styles.skeletonImg, { backgroundColor: bg }]} />
      <View style={{ padding: 12 }}>
        <View style={[styles.skeletonLine, { width: '60%', height: 16, backgroundColor: bg, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 12, backgroundColor: bg, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: bg }]} />
      </View>
    </Animated.View>
  );
};

// --- COUPONS DATA ---
const AVAILABLE_COUPONS = [
  {
    id: 'axis-rewards',
    code: 'AXISREWARDS',
    bankTitle: 'AXISREWARDS',
    discountAmount: 150,
    minOrder: 500,
    desc: 'Save ₹150 on this order using Axis Bank Rewards Credit Cards!',
    subDesc: 'Flat ₹150 discount on orders above ₹500',
    color: '#F97316' // Orange strip
  },
  {
    id: 'axis-200',
    code: 'AXIS200',
    bankTitle: 'AXIS200',
    discountAmount: 200,
    minOrder: 1000,
    desc: 'Save ₹200 on this order using Axis Bank Select Credit Cards!',
    subDesc: 'Flat ₹200 discount on orders above ₹1000',
    color: '#EA580C'
  },
  {
    id: 'bhim-50',
    code: 'BHIMUPI50',
    bankTitle: 'BHIMUPI50',
    discountAmount: 49,
    minOrder: 149,
    desc: 'Save ₹49 on this order using BHIM Payments App!',
    subDesc: 'Flat ₹35 discount on orders above ₹149',
    color: '#F97316'
  }
];

const getBasePrice = (item, spiceLevel) => {
  if (!item) return 0;
  const base = item.price || 0;
  const nameLower = (item.name || '').toLowerCase();

  if (nameLower.includes('mandi')) {
    if (spiceLevel === 'Half') return Math.round(base * 1.8);
    if (spiceLevel === 'Full') return Math.round(base * 3.5);
    return base; // Quarter
  } else if (nameLower.includes('biriyani') || nameLower.includes('biryani')) {
    if (spiceLevel === 'Full') return Math.round(base * 1.8);
    return base; // Half
  }
  return base;
};

const resolveProductImage = (imgStr, activeBackend) => {
  const host = activeBackend || 'http://192.168.1.3:5000';
  if (!imgStr) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  
  let resolved = imgStr;
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    // Replace localhost or 127.0.0.1 (with or without port) with the host IP
    resolved = resolved.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, host);
    return resolved;
  }
  
  // If relative path, prepend host path
  return `${host}/uploads/foods/${resolved}`;
};

let cachedBackendUrl = null;

export default function App() {
  const bottomInset = initialWindowMetrics?.insets?.bottom || (Platform.OS === 'android' ? 24 : 34);

  // Navigation & Tab state: 'home' | 'wishlist' | 'orders' | 'profile' | 'admin'
  const [activeTab, _setActiveTab] = useState('home');
  const [tabHistory, setTabHistory] = useState(['home']);

  const setActiveTab = (tab) => {
    _setActiveTab(prev => {
      if (prev !== tab) {
        setTabHistory(h => [...h, tab]);
      }
      return tab;
    });
  };

  const goBack = () => {
    setTabHistory(prevHistory => {
      if (prevHistory.length > 1) {
        const newHistory = [...prevHistory];
        newHistory.pop(); // remove current tab
        const prevTab = newHistory[newHistory.length - 1];
        _setActiveTab(prevTab);
        return newHistory;
      }
      _setActiveTab('home');
      return ['home'];
    });
  };

  // Backend API & Authentication State
  const API_BASE_URL = 'http://192.168.1.3:5000'; // NestJS + PostgreSQL Backend
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Dark Mode
  const [darkMode, setDarkMode] = useState(false);

  // Active Multi-Order Live Tracking & Details State (Declared at top to avoid Temporal Dead Zone ReferenceError in useEffect hooks)
  const [activeOrderDetail, setActiveOrderDetail] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [myOrdersList, setMyOrdersList] = useState([]);
  const [orderStepMap, setOrderStepMap] = useState({});

  const mapStatusToStep = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return 1;
      case 'accepted':
        return 2;
      case 'preparing':
        return 3;
      case 'ready_for_pickup':
      case 'picked_up':
        return 3;
      case 'out_for_delivery':
        return 4;
      case 'delivered':
        return 5;
      case 'cancelled':
      case 'rejected':
        return -1;
      default:
        return 1;
    }
  };

  // App Data & Filter States
  const [restaurants, setRestaurants] = useState(INITIAL_RESTAURANTS);

  // Helper to dynamically detect active backend endpoint
  const getActiveBackend = async () => {
    if (cachedBackendUrl) return cachedBackendUrl;
    const endpoints = [
      `http://${getExpoHostIp()}:5000`,
      'http://127.0.0.1:5000',
      'http://localhost:5000',
      'http://10.0.2.2:5000'
    ];
    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${url}/hotels`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          cachedBackendUrl = url;
          return url;
        }
      } catch (e) {}
    }
    return 'http://127.0.0.1:5000'; // fallback
  };

  // Dynamic restaurant category classifier based on food items / categories sold
  const mapBackendRestaurantCategory = (dbCategories, dbFoods) => {
    const catNames = (dbCategories || []).map(c => c.name.toLowerCase());
    const foodNames = (dbFoods || []).map(f => f.name.toLowerCase());
    
    if (catNames.some(n => n.includes('burger')) || foodNames.some(n => n.includes('burger'))) {
      return 'burger';
    }
    if (catNames.some(n => n.includes('pizza')) || foodNames.some(n => n.includes('pizza'))) {
      return 'pizza';
    }
    if (catNames.some(n => n.includes('biryani') || n.includes('indian')) || foodNames.some(n => n.includes('biryani'))) {
      return 'indian';
    }
    if (catNames.some(n => n.includes('shawarma') || n.includes('kebab')) || foodNames.some(n => n.includes('shawarma'))) {
      return 'middle_eastern';
    }
    if (catNames.some(n => n.includes('seafood') || n.includes('fish')) || foodNames.some(n => n.includes('seafood') || n.includes('fish'))) {
      return 'seafood';
    }
    if (catNames.some(n => n.includes('healthy') || n.includes('salad')) || foodNames.some(n => n.includes('salad'))) {
      return 'healthy';
    }
    if (catNames.some(n => n.includes('dessert') || n.includes('ice cream') || n.includes('sweet')) || foodNames.some(n => n.includes('dessert') || n.includes('ice cream'))) {
      return 'desserts';
    }
    return 'indian'; // fallback default
  };

  // Fetch backend data and map it into the UI's expected shape
  const fetchBackendData = async () => {
    setIsSkeletonLoading(true);
    setDbConnectionError(false);
    try {
      const backendUrl = await getActiveBackend();
      const res = await fetch(`${backendUrl}/hotels`);
      if (!res.ok) throw new Error('Failed to fetch hotels');
      const fetchedHotels = await res.json();
      
      const mappedRestaurants = [];
      for (const hotel of fetchedHotels) {
        try {
          const foodsRes = await fetch(`${backendUrl}/hotels/${hotel.id}/foods?activeOnly=true`);
          if (foodsRes.ok) {
            const foods = await foodsRes.json();
            
            const categoriesMap = new Map();
            foods.forEach(f => {
              if (f.category) {
                categoriesMap.set(f.category.id, f.category);
              }
            });
            const categories = Array.from(categoriesMap.values());
            
            const resolveImage = (imgStr) => {
              if (!imgStr) return null;
              if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
                if (imgStr.includes('localhost:') || imgStr.includes('127.0.0.1:')) {
                  return imgStr.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/g, backendUrl);
                }
                return imgStr;
              }
              return `${backendUrl}/uploads/foods/${imgStr}`;
            };

            const mappedRest = {
              id: hotel.id,
              name: hotel.name,
              category: mapBackendRestaurantCategory(categories, foods),
              rating: 4.8,
              reviewsCount: 150,
              deliveryTime: `${hotel.deliveryTimeMin || 20}-${hotel.deliveryTimeMax || 35} min`,
              deliveryFee: Number(hotel.deliveryFee) || 0,
              minOrder: Number(hotel.minimumOrderAmount) || 0,
              priceTier: hotel.deliveryFee > 40 ? '₹₹₹' : '₹₹',
              isTopRated: hotel.featured || false,
              isVeg: hotel.isPureVeg || false,
              offerText: hotel.featured ? 'Featured Deal' : '',
              image: resolveImage(hotel.image) || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
              coverImage: resolveImage(hotel.image) || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
              address: hotel.address,
              description: hotel.description || '',
              menu: foods.map(f => ({
                id: f.id,
                itemId: f.id,
                name: f.name,
                categoryName: f.category?.name || 'Specials',
                price: Number(f.price),
                description: f.description || '',
                image: resolveImage(f.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
                isVeg: f.isVeg || false,
                isPopular: f.isBestseller || false,
                hotelId: hotel.id
              }))
            };
            mappedRestaurants.push(mappedRest);
          }
        } catch (e) {
          console.warn(`Error fetching foods for hotel ${hotel.id}:`, e);
        }
      }
      
      setRestaurants(mappedRestaurants);
      setDbConnectionError(false);
    } catch (error) {
      console.warn('Error fetching backend data:', error);
      setDbConnectionError(true);
    } finally {
      setIsSkeletonLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  useEffect(() => {
    if (activeTab === 'home') {
      fetchBackendData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedRestaurant) {
      const updated = restaurants.find(r => r.id === selectedRestaurant.id);
      if (updated) {
        setSelectedRestaurant(updated);
      }
    }
  }, [restaurants]);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or 'offers'
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const handleHeavyAction = (callback) => {
    setIsGlobalLoading(true);
    setTimeout(() => {
      callback();
      setIsGlobalLoading(false);
    }, 150);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);
  const homeScrollY = useRef(new Animated.Value(0)).current;
  const globalScrollY = useRef(new Animated.Value(0)).current;
  const selectedCategoryRef = useRef(selectedCategory);
  const cartScrollRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => { selectedCategoryRef.current = selectedCategory; }, [selectedCategory]);

  const headingOpacity = homeScrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headingTranslateY = homeScrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const topHeaderTranslateY = homeScrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -120],
    extrapolate: 'clamp',
  });

  const topHeaderOpacity = homeScrollY.interpolate({
    inputRange: [0, 35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const searchOpacity = homeScrollY.interpolate({
    inputRange: [0, 35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const clampedScroll = Animated.diffClamp(globalScrollY, 0, 150);
  const bottomBarTranslateY = clampedScroll.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 150],
    extrapolate: 'clamp',
  });

  // Live GPS Location States
  const [favorites, setFavorites] = useState([]);
  const [addressesList, setAddressesList] = useState(PRESET_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState(PRESET_ADDRESSES[0]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [liveApiSuggestions, setLiveApiSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Restaurant Detail & Product Detail Modal States
  const [selectedRestaurant, _setSelectedRestaurant] = useState(null);
  const [modalOpenCount, setModalOpenCount] = useState(0);
  const setSelectedRestaurant = useCallback((val) => {
    if (val) {
      setModalOpenCount(c => c + 1);
    }
    _setSelectedRestaurant(val);
  }, []);
  const [restaurantOffers, setRestaurantOffers] = useState([]);
  const [loadingRestaurantOffers, setLoadingRestaurantOffers] = useState(false);
  const [isRestActionSheetOpen, setIsRestActionSheetOpen] = useState(false);
  const [isRestDetailsModalOpen, setIsRestDetailsModalOpen] = useState(false);
  const [detailedRestaurant, setDetailedRestaurant] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(null);

  // Restaurant Modal Redesign — scroll animation & filter states
  const restScrollY = useRef(new Animated.Value(0)).current;
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [pureVegFilter, setPureVegFilter] = useState(false);
  const [recommendedCollapsed, setRecommendedCollapsed] = useState(false);
  const [searchSectionY, setSearchSectionY] = useState(0);
  const [isRestStickyActive, setIsRestStickyActive] = useState(false);
  const lastStickyState = useRef(false);

  // Reset restaurant modal state when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      setMenuSearchQuery('');
      setPureVegFilter(false);
      setRecommendedCollapsed(false);
      restScrollY.setValue(0);
    }
  }, [selectedRestaurant?.id, modalOpenCount]);

  // Fetch detailed restaurant profile when selectedRestaurant changes
  useEffect(() => {
    if (selectedRestaurant?.id) {
      setLoadingDetails(true);
      setDetailedRestaurant(null); // Clear stale details immediately
      
      const restId = selectedRestaurant.id;
      console.log('RESTAURANT DETAILS ID:', restId);

      fetch(`${resolvedBackendUrl}/hotels/${restId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch detailed restaurant profile');
          return res.json();
        })
        .then(data => {
          console.log('RESTAURANT DETAILS RESPONSE:', JSON.stringify(data));
          console.log('PHONE:', data.phoneNumber);
          console.log('EMAIL:', data.email);
          console.log('LANDMARK:', data.landmark);
          console.log('FULL ADDRESS:', data.address);
          console.log('LOGO:', data.logo);
          console.log('COVER:', data.image);
          console.log('GALLERY:', data.gallery);
          console.log('PREPARATION TIME:', data.averagePreparationTime);
          console.log('MIN ORDER:', data.minimumOrderAmount);
          console.log('DELIVERY RADIUS:', data.deliveryRadiusKm);

          setDetailedRestaurant(data);
        })
        .catch(err => {
          console.warn('Error fetching detailed restaurant profile:', err);
          setDetailedRestaurant(selectedRestaurant);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setDetailedRestaurant(null);
    }
  }, [selectedRestaurant?.id, resolvedBackendUrl]);

  // Animated interpolations for header center title
  const restTitleOpacity = restScrollY.interpolate({
    inputRange: [60, 140],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const restTitleTranslateY = restScrollY.interpolate({
    inputRange: [60, 140],
    outputRange: [5, 0],
    extrapolate: 'clamp',
  });

  // Filtered restaurant menu
  const filteredRestMenu = useMemo(() => {
    if (!selectedRestaurant?.menu) return [];
    let items = [...selectedRestaurant.menu];
    if (pureVegFilter) items = items.filter(i => i.isVeg === true);
    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.trim().toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [selectedRestaurant?.menu, pureVegFilter, menuSearchQuery]);

  // Scroll handler for restaurant modal
  const handleRestScroll = useCallback((event) => {
    const y = event.nativeEvent.contentOffset.y;
    const headerHeight = 56; // fixed header height
    const shouldStick = searchSectionY > 0 && y >= (searchSectionY - headerHeight);
    if (shouldStick !== lastStickyState.current) {
      lastStickyState.current = shouldStick;
      setIsRestStickyActive(shouldStick);
    }
  }, [searchSectionY]);


  useEffect(() => {
    setRestaurantOffers([]);
    if (!selectedRestaurant || !selectedRestaurant.id) {
      return;
    }
    let active = true;
    const fetchOffers = async () => {
      setLoadingRestaurantOffers(true);
      try {
        const backendUrl = await getActiveBackend();
        const token = currentUser?.token;
        const response = await fetch(`${backendUrl}/offers/hotels/${selectedRestaurant.id}/public-offers`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (response.ok && active) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setRestaurantOffers(data);
          }
        }
      } catch (err) {
        console.error('Error fetching restaurant offers:', err);
      } finally {
        if (active) {
          setLoadingRestaurantOffers(false);
        }
      }
    };
    fetchOffers();
    return () => {
      active = false;
    };
  }, [selectedRestaurant?.id, currentUser?.token]);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [productRestaurant, setProductRestaurant] = useState(null);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);

  // Food details reviews & summary states
  const [backendReviews, setBackendReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [detailedFoodItem, setDetailedFoodItem] = useState(null);
  const [resolvedBackendUrl, setResolvedBackendUrl] = useState(`http://${getExpoHostIp()}:5000`);

  // Initialize resolved backend url on mount
  useEffect(() => {
    const initBackend = async () => {
      const active = await getActiveBackend();
      setResolvedBackendUrl(active);
    };
    initBackend();
  }, []);

  // Fetch product detailed details, reviews, and summary from backend
  useEffect(() => {
    if (!viewingProduct || !viewingProduct.id) {
      setBackendReviews([]);
      setRatingSummary(null);
      setDetailedFoodItem(null);
      setActiveImageIndex(0);
      return;
    }
    let active = true;
    const loadProductData = async () => {
      setLoadingReviews(true);
      try {
        const baseUrl = await getActiveBackend();
        setResolvedBackendUrl(baseUrl);
        
        // Fetch full food details (including images list and ingredients list)
        const foodRes = await fetch(`${baseUrl}/foods/${viewingProduct.id}`);
        if (foodRes.ok && active) {
          const foodData = await foodRes.json();
          setDetailedFoodItem(foodData);
        }

        // Fetch reviews
        const revRes = await fetch(`${baseUrl}/foods/${viewingProduct.id}/reviews`);
        if (revRes.ok && active) {
          const revData = await revRes.json();
          setBackendReviews(revData);
        }
        // Fetch rating summary
        const sumRes = await fetch(`${baseUrl}/foods/${viewingProduct.id}/rating-summary`);
        if (sumRes.ok && active) {
          const sumData = await sumRes.json();
          setRatingSummary(sumData);
        }
      } catch (err) {
        console.warn('Error loading product data from backend:', err);
      } finally {
        if (active) {
          setLoadingReviews(false);
        }
      }
    };
    loadProductData();
    return () => {
      active = false;
    };
  }, [viewingProduct?.id]);

  // Item Customization Modal State
  const [customizingItem, setCustomizingItem] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemSpice, setItemSpice] = useState('Medium');
  const [itemAddons, setItemAddons] = useState([]);

  // Cart & Promo State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isStore99ModalOpen, setIsStore99ModalOpen] = useState(false);
  const [backendCoupons, setBackendCoupons] = useState([]);

  // Replace Cart Mismatch Modal State
  const [showReplaceCartModal, setShowReplaceCartModal] = useState(false);
  const [pendingCartAction, setPendingCartAction] = useState(null);

  const handleAddCartItem = (newHotelId, newRestaurantName, addAction) => {
    const firstItem = cartItems.length > 0 ? cartItems[0] : null;
    if (firstItem) {
      const activeHotelId = firstItem.hotelId;
      const activeRestName = firstItem.restaurantName;
      
      const isIdMismatch = activeHotelId && newHotelId && Number(activeHotelId) !== Number(newHotelId);
      const isNameMismatch = activeRestName && newRestaurantName && activeRestName !== newRestaurantName;
      
      if (isIdMismatch || isNameMismatch) {
        setPendingCartAction(() => addAction);
        setShowReplaceCartModal(true);
        return;
      }
    }
    addAction();
  };

  const handleClearCartAndAdd = () => {
    setCartItems([]);
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    if (pendingCartAction) {
      pendingCartAction();
    }
    setShowReplaceCartModal(false);
    setPendingCartAction(null);
  };

  const handleCancelReplace = () => {
    setShowReplaceCartModal(false);
    setPendingCartAction(null);
  };

  const getCartHotelId = () => {
    if (cartItems.length === 0) return null;
    const item = cartItems[0];
    let id = item.hotelId;
    if (id) {
      if (typeof id === 'string') {
        const match = id.match(/(\d+)/);
        if (match) return Number(match[1]);
      } else if (typeof id === 'number') {
        return id;
      }
    }
    if (item.restaurantName) {
      const matched = restaurants.find(r => r.name === item.restaurantName);
      if (matched) {
        if (typeof matched.id === 'string') {
          const match = matched.id.match(/(\d+)/);
          if (match) return Number(match[1]);
        }
        return matched.id;
      }
    }
    return null;
  };

  const activeCartHotelId = getCartHotelId();

  useEffect(() => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  }, [activeCartHotelId]);

  const fetchBackendOffers = async () => {
    const hotelId = getCartHotelId();
    if (!hotelId || !currentUser?.token) {
      setBackendCoupons([]);
      return;
    }
    try {
      const response = await fetch(`${resolvedBackendUrl}/offers/hotels/${hotelId}/public-offers`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setBackendCoupons(data);
        } else {
          setBackendCoupons([]);
        }
      } else {
        setBackendCoupons([]);
      }
    } catch (err) {
      setBackendCoupons([]);
    }
  };

  const fetchMyOrders = async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${resolvedBackendUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedOrders = data.map(o => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          hotel: o.hotel,
           items: (o.items || []).map(item => {
            let img = item.foodImage || '';
            if (img) {
              if (img.startsWith('http://') || img.startsWith('https://')) {
                if (img.includes('localhost:') || img.includes('127.0.0.1:')) {
                  img = img.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/g, resolvedBackendUrl);
                }
              } else {
                img = `${resolvedBackendUrl}/uploads/foods/${img}`;
              }
            }
            return {
              itemId: item.foodId || item.id,
              name: item.foodName,
              price: item.unitPrice,
              image: img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
              quantity: item.quantity
            };
          }),
          total: o.totalAmount,
          subtotal: o.subtotal,
          deliveryFee: o.deliveryFee,
          taxAmount: o.taxAmount,
          discountAmount: o.discountAmount,
          address: o.deliveryAddress,
          paymentMethod: o.paymentMethod,
          placedAt: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          estimatedTime: '25-30 mins',
          orderStatus: o.orderStatus,
          activeAssignment: o.activeAssignment
        }));
        setMyOrdersList(mappedOrders);
      }
    } catch (e) {
      console.warn('Error fetching customer orders:', e);
    }
  };

  const handleCancelOrder = async () => {
    const orderId = selectedOrderForDetail?.orderId || selectedOrderForDetail?.id;
    if (!orderId) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${resolvedBackendUrl}/orders/${orderId}/cancel`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${currentUser?.token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (res.ok) {
                Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
                fetchMyOrders();
                setSelectedOrderForDetail(null);
              } else {
                const errText = await res.text().catch(() => '');
                Alert.alert('Error', errText || 'Failed to cancel order.');
              }
            } catch (e) {
              console.warn('Cancel order error:', e);
              Alert.alert('Error', 'Unable to reach the server. Please check your connection.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (currentUser) {
      fetchMyOrders();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (isCartOpen || isCouponModalOpen || isCheckoutOpen) {
      fetchBackendOffers();
    }
  }, [isCartOpen, isCouponModalOpen, isCheckoutOpen, activeCartHotelId]);

  useEffect(() => {
    if (isCheckoutOpen) {
      syncAddressesFromBackend();
    }
  }, [isCheckoutOpen]);

  useEffect(() => {
    let active = true;
    let intervalId = null;
    let appStateSubscription = null;
    
    // Clear old details immediately when selected order changes/opens
    setActiveOrderDetail(null);
    
    if (selectedOrderForDetail && selectedOrderForDetail.orderId) {
      const orderId = selectedOrderForDetail.orderId;
      
      const fetchStatus = async () => {
        try {
          console.log('[TRACKING] Fetching status for order:', orderId);
          const res = await fetch(`${resolvedBackendUrl}/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${currentUser?.token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('[TRACKING] Fetch response status:', res.status);
          if (res.ok && active) {
            const data = await res.json();
            console.log('[TRACKING] Order data received. Status:', data.orderStatus);
            setActiveOrderDetail(data);
            fetchMyOrders();
            const status = data.orderStatus?.toLowerCase();
            if (status === 'delivered' || status === 'cancelled' || status === 'rejected') {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            }
          } else if (active) {
            const errText = await res.text().catch(() => '');
            console.warn('[TRACKING] Fetch status returned non-OK:', res.status, errText);
          }
        } catch (e) {
          if (active) {
            console.warn('Polling error fetching order status:', e);
          }
        }
      };
      
      fetchStatus();
      intervalId = setInterval(fetchStatus, 4000);
      
      try {
        appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
          if (nextAppState === 'active' && active) {
            fetchStatus();
          }
        });
      } catch (e) {
        console.warn('Failed to add AppState listener:', e);
      }
    } else {
      setActiveOrderDetail(null);
    }
    
    return () => {
      active = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (appStateSubscription && typeof appStateSubscription.remove === 'function') {
        appStateSubscription.remove();
      }
    };
  }, [selectedOrderForDetail?.orderId, currentUser?.token]);

  // Animation & Toast Notification State (Slide in from RIGHT edge)
  const [cartAnim] = useState(new Animated.Value(1));
  const [toastAnimX] = useState(new Animated.Value(500));
  const [toastMessage, setToastMessage] = useState('');

  // Skeleton & Food Loading State
  const [isSkeletonLoading, setIsSkeletonLoading] = useState(false);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  const triggerSkeletonLoading = () => {
    setIsSkeletonLoading(true);
    setTimeout(() => {
      setIsSkeletonLoading(false);
    }, 600);
  };

  // Home Page Dual Mode & Deal Filter States
  const [homeSubMode, setHomeSubMode] = useState('food'); // 'food' | 'instamart'
  const [activeDealFilter, setActiveDealFilter] = useState('all'); // 'all' | '100off' | 'fast' | 'rating4'

  // Cart Scroll Bottom Detector State
  const [isCartScrollAtBottom, setIsCartScrollAtBottom] = useState(false);

  // Checkout & Payment State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'cod'
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState(false);
  const [successScaleAnim] = useState(new Animated.Value(0));
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutLoadingText, setCheckoutLoadingText] = useState('');
  const [checkoutLayoutKey, setCheckoutLayoutKey] = useState(0);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [paymentFailedModal, setPaymentFailedModal] = useState({ visible: false, title: 'Payment Failed', message: '' });

  // User Review & Rating States (Starts at 2 Stars)
  const [productReviews, setProductReviews] = useState({});
  const [userRatingScore, setUserRatingScore] = useState(2);
  const [userReviewComment, setUserReviewComment] = useState('');

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // ─── PERSISTENCE: Load saved session on app start ─────────────────────────
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('qb_user');
        const savedDark = await AsyncStorage.getItem('qb_darkMode');
        if (savedDark !== null) setDarkMode(JSON.parse(savedDark));
        if (savedUser) {
          const user = JSON.parse(savedUser);
          const savedAvatar = await AsyncStorage.getItem(`qb_avatar_${user.id}`);
          if (savedAvatar) user.avatar = savedAvatar;
          setCurrentUser(user);
          // Load user-specific cart, favorites, avatar
          const savedCart = await AsyncStorage.getItem(`qb_cart_${user.id}`);
          const savedFavs = await AsyncStorage.getItem(`qb_favs_${user.id}`);
          if (savedCart) setCartItems(JSON.parse(savedCart));
          if (savedFavs) setFavorites(JSON.parse(savedFavs));
        }
      } catch (e) {
        console.warn('Session load error:', e);
      }
    };
    loadSession();
  }, []);

  // ─── PERSISTENCE: Save user session whenever currentUser changes ───────────
  useEffect(() => {
    if (currentUser) {
      AsyncStorage.setItem('qb_user', JSON.stringify(currentUser)).catch(() => { });
    } else {
      AsyncStorage.removeItem('qb_user').catch(() => { });
    }
  }, [currentUser]);

  // ─── PERSISTENCE: Save cart per user ──────────────────────────────────────
  const prevUserIdRef = useRef(null);
  useEffect(() => {
    if (currentUser?.id) {
      // User just logged in (id changed from null/different to this id) → load their data
      if (prevUserIdRef.current !== currentUser.id) {
        prevUserIdRef.current = currentUser.id;
        const loadUserData = async () => {
          try {
            const savedCart = await AsyncStorage.getItem(`qb_cart_${currentUser.id}`);
            const savedFavs = await AsyncStorage.getItem(`qb_favs_${currentUser.id}`);
            const savedAvatar = await AsyncStorage.getItem(`qb_avatar_${currentUser.id}`);
            if (savedAvatar) {
              setCurrentUser(prev => prev ? { ...prev, avatar: savedAvatar } : prev);
            }
            setCartItems(savedCart ? JSON.parse(savedCart) : []);
            setFavorites(savedFavs ? JSON.parse(savedFavs) : []);
          } catch (e) {
            console.warn('Load user data error:', e);
          }
        };
        loadUserData();
      } else {
        // Same user, just save the current cart
        AsyncStorage.setItem(`qb_cart_${currentUser.id}`, JSON.stringify(cartItems)).catch(() => { });
      }
    } else {
      // Logged out — reset ref
      prevUserIdRef.current = null;
    }
  }, [currentUser]);

  // ─── PERSISTENCE: Save cart changes (not on login) ────────────────────────
  useEffect(() => {
    if (currentUser?.id && prevUserIdRef.current === currentUser.id) {
      AsyncStorage.setItem(`qb_cart_${currentUser.id}`, JSON.stringify(cartItems)).catch(() => { });
    }
  }, [cartItems]);

  // ─── PERSISTENCE: Save favorites per user ─────────────────────────────────
  useEffect(() => {
    if (currentUser?.id) {
      AsyncStorage.setItem(`qb_favs_${currentUser.id}`, JSON.stringify(favorites)).catch(() => { });
    }
  }, [favorites]);

  // ─── PERSISTENCE: Save favorites on login (already done via currentUser useEffect above)

  // ─── PERSISTENCE: Save dark mode preference ───────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem('qb_darkMode', JSON.stringify(darkMode)).catch(() => { });
  }, [darkMode]);

  // Dark mode color palette (Modern Premium Neon Charcoal Theme)
  const D = {
    bg: darkMode ? '#0D0F17' : '#F9FAFB',
    card: darkMode ? '#181B28' : '#FFFFFF',
    cardBorder: darkMode ? '#282C40' : '#E5E7EB',
    text: darkMode ? '#F8FAFC' : '#111827',
    textSub: darkMode ? '#94A3B8' : '#6B7280',
    inputBg: darkMode ? '#1F2335' : '#FFFFFF',
    inputBorder: darkMode ? '#2E334D' : '#E5E7EB',
    navBg: darkMode ? '#121420' : '#FFFFFF',
    navBorder: darkMode ? '#1F2335' : '#F3F4F6',
    headerBg: darkMode ? '#121420' : '#FFFFFF',
    modalBg: darkMode ? '#0D0F17' : '#FFFFFF',
    divider: darkMode ? '#282C40' : '#E5E7EB',
    chipBg: darkMode ? '#1F2335' : '#F3F4F6',
    heading: darkMode ? '#FF7A00' : '#111827',
    accent: '#FF5252',
    accentGreen: '#059669',
  };

  // Reusable Toast Notification Trigger Function (Slide in from RIGHT & Disappear completely)
  const triggerToastNotification = (msg) => {
    setToastMessage(msg);
    toastAnimX.stopAnimation();
    toastAnimX.setValue(500);

    Animated.sequence([
      Animated.spring(toastAnimX, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastAnimX, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const triggerAddToCartAnimation = (itemName) => {
    // 1. Scale pulse animation on Cart Icon badge & floating green bar
    Animated.sequence([
      Animated.timing(cartAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(cartAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
  };

  const addAddressToBackend = async (label, addressText, cityText) => {
    if (!currentUser || !currentUser.token) return null;
    try {
      let phoneNum = currentUser.phone ? currentUser.phone.replace(/\D/g, '').slice(-10) : '';
      if (!/^[6-9]\d{9}$/.test(phoneNum)) {
        phoneNum = '9876543210';
      }
      const payload = {
        label: label || 'Home',
        recipientName: currentUser.name || 'QuickBite Customer',
        phoneNumber: phoneNum,
        addressLine1: addressText || 'Near Railway Station',
        city: cityText || 'Kannur',
        state: 'Kerala',
        pincode: '670001',
        isDefault: false
      };
      const res = await fetch(`${resolvedBackendUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('addAddressToBackend error:', e);
    }
    return null;
  };

  const createDefaultAddressOnBackend = async () => {
    if (!currentUser || !currentUser.token) return;
    try {
      let phoneNum = currentUser.phone ? currentUser.phone.replace(/\D/g, '').slice(-10) : '';
      if (!/^[6-9]\d{9}$/.test(phoneNum)) {
        phoneNum = '9876543210';
      }
      
      const payload = {
        label: selectedAddress.label || 'Home',
        recipientName: currentUser.name || 'QuickBite Customer',
        phoneNumber: phoneNum,
        addressLine1: selectedAddress.address || 'Near Railway Station',
        city: selectedAddress.city ? selectedAddress.city.split(',')[0].trim() : 'Kannur',
        state: 'Kerala',
        pincode: '670001',
        isDefault: true
      };

      const res = await fetch(`${resolvedBackendUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newAddress = await res.json();
        setAddressesList([newAddress]);
        setSelectedAddress(newAddress);
      }
    } catch (e) {
      console.warn('createDefaultAddressOnBackend error:', e);
    }
  };

  const syncAddressesFromBackend = async () => {
    if (!currentUser || !currentUser.token) return;
    try {
      const res = await fetch(`${resolvedBackendUrl}/addresses`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          setAddressesList(list);
          const defaultAddr = list.find(a => a.isDefault) || list[0];
          setSelectedAddress(defaultAddr);
        } else {
          await createDefaultAddressOnBackend();
        }
      }
    } catch (e) {
      console.warn('syncAddressesFromBackend error:', e);
    }
  };

  const startEditingProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name || '');
    setEditEmail(currentUser.email || '');
    setEditPhone(currentUser.phone || '');
    setEditAvatar(currentUser.avatar || PRESET_AVATARS[0]);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }

    // Try to call backend PATCH /users/profile
    const detectedIp = getExpoHostIp();
    const backendEndpoints = [
      `http://${detectedIp}:5000`,
      'http://192.168.1.3:5000',
      'http://localhost:5000',
      'http://10.0.2.2:5000'
    ];

    const mobileClean = editPhone.replace(/\D/g, '').slice(-10);
    const body = {
      name: editName.trim(),
      email: editEmail.trim(),
      ...(mobileClean.length === 10 && { mobileNumber: mobileClean })
    };

    let saved = false;
    if (currentUser?.token) {
      for (const endpoint of backendEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`${endpoint}/users/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(body),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              const updatedUser = {
                ...currentUser,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.mobileNumber || editPhone,
                avatar: editAvatar
              };
              setCurrentUser(updatedUser);
              await AsyncStorage.setItem('qb_user', JSON.stringify(updatedUser)).catch(() => { });
              if (currentUser?.id) {
                await AsyncStorage.setItem(`qb_avatar_${currentUser.id}`, editAvatar).catch(() => { });
              }
              setIsEditingProfile(false);
              triggerToastNotification('✅ Profile updated successfully!');
              saved = true;
              break;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            const msg = Array.isArray(errData?.message) ? errData.message.join(', ') : (errData?.message || 'Update failed');
            Alert.alert('❌ Update Failed', msg);
            return;
          }
        } catch (err) {
          // try next endpoint
        }
      }
    }

    // Offline fallback: update locally
    if (!saved) {
      const updatedUser = {
        ...currentUser,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        avatar: editAvatar
      };
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem('qb_user', JSON.stringify(updatedUser)).catch(() => { });
      if (currentUser?.id) {
        await AsyncStorage.setItem(`qb_avatar_${currentUser.id}`, editAvatar).catch(() => { });
      }
      setIsEditingProfile(false);
      triggerToastNotification('✅ Profile updated (offline mode)');
    }
  };

  // Helper to get reviews for an item (user submitted + default reviews)
  const getDishReviews = (item) => {
    if (!item) return [];
    if (viewingProduct && item.id === viewingProduct.id) {
      return backendReviews || [];
    }
    const custom = productReviews[item.id] || [];
    const defaults = [
      { id: `def-1-${item.id}`, name: 'Anjali Ramesh', rating: 5, date: '2 days ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', comment: `Best ${item.name} in town! Super fresh and arrived piping hot.` },
      { id: `def-2-${item.id}`, name: 'Vipin Kumar', rating: 5, date: '5 days ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', comment: 'Flavorful, authentic taste and great portion size. Highly recommended!' },
      { id: `def-3-${item.id}`, name: 'Sneha Paul', rating: 4, date: '1 week ago', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', comment: 'Really good quality ingredients and fast delivery. Will definitely order again.' }
    ];
    return [...custom, ...defaults];
  };

  const calculateAverageRating = (item) => {
    if (!item) return '0.0';
    if (viewingProduct && item.id === viewingProduct.id && ratingSummary?.averageRating !== undefined && ratingSummary?.averageRating !== null) {
      return Number(ratingSummary.averageRating).toFixed(1);
    }
    if (item.averageRating !== undefined && item.averageRating !== null) {
      return Number(item.averageRating).toFixed(1);
    }
    const reviews = getDishReviews(item);
    if (!reviews || reviews.length === 0) return '0.0';
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const handleAddDishReview = async (itemId) => {
    if (!userReviewComment.trim()) {
      Alert.alert('Write a Review', 'Please enter your review comment before posting.');
      return;
    }
    try {
      const baseUrl = await getActiveBackend();
      const token = currentUser?.token;
      const res = await fetch(`${baseUrl}/foods/${itemId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          rating: userRatingScore,
          review: userReviewComment.trim()
        })
      });

      if (res.ok) {
        setUserReviewComment('');
        setUserRatingScore(5); // reset to 5 stars
        triggerToastNotification('⭐ Review & Rating Published!');
        
        // Refresh reviews and summary
        const revRes = await fetch(`${baseUrl}/foods/${itemId}/reviews`);
        if (revRes.ok) {
          const revData = await revRes.json();
          setBackendReviews(revData);
        }
        const sumRes = await fetch(`${baseUrl}/foods/${itemId}/rating-summary`);
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setRatingSummary(sumData);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        Alert.alert('Review Status', errorData.message || 'Failed to submit review. Try again.');
      }
    } catch (err) {
      console.warn('Error posting review:', err);
      // Fallback local update if offline/backend fails
      const newRev = {
        id: `rev-${Date.now()}`,
        name: currentUser ? currentUser.name : 'QuickBite Foodie',
        rating: userRatingScore,
        date: Date.now(),
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        comment: userReviewComment.trim()
      };
      setProductReviews(prev => ({
        ...prev,
        [itemId]: [newRev, ...(prev[itemId] || [])]
      }));
      setUserReviewComment('');
      setUserRatingScore(5);
      triggerToastNotification('⭐ Review & Rating Published (offline)!');
    }
  };

  // Reusable Toast Banner Renderer
  const renderToastBanner = () => (
    <Animated.View
      pointerEvents="none"
      style={[styles.toastBannerRight, { transform: [{ translateX: toastAnimX }] }]}
    >
      <Text style={styles.toastBannerText}>{toastMessage}</Text>
    </Animated.View>
  );

  const renderSearchAndFilters = () => {
    return (
      <View style={{ backgroundColor: D.card, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={[styles.rdSearchBarContainer, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}>
          <Search size={18} color={D.textSub} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search for dishes"
            placeholderTextColor={D.textSub}
            value={menuSearchQuery}
            onChangeText={setMenuSearchQuery}
            style={[styles.rdSearchInput, { color: D.text }]}
          />
          <Mic size={18} color={D.accent} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingTop: 8 }}
          nestedScrollEnabled={true}
        >
          <TouchableOpacity
            onPress={() => setPureVegFilter(!pureVegFilter)}
            style={[
              styles.rdFilterChip,
              { backgroundColor: D.chipBg, borderColor: D.cardBorder },
              pureVegFilter && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }
            ]}
          >
            <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
            </View>
            <Text style={[styles.rdFilterChipText, { color: D.textSub }, pureVegFilter && { color: '#059669', fontWeight: '700' }]}>Pure Veg</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rdFilterChip, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}
          >
            <Heart size={10} color={D.accent} fill={D.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.rdFilterChipText, { color: D.textSub }]}>EatRight</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rdFilterChip, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}
          >
            <Text style={[styles.rdFilterChipText, { color: D.textSub }]}>Ratings 4.0+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Swiggy Green Floating Bottom Cart Bar Component (Updates Live on item add)
  const renderFloatingCartBar = (bottomOffset = 68, disableHide = false) => {
    if (cartItems.length === 0) return null;
    const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
      <Animated.View
        style={[
          styles.swiggyGreenCartBar,
          { bottom: bottomOffset, transform: [{ scale: cartAnim }, disableHide ? { translateY: 0 } : { translateY: bottomBarTranslateY }] }
        ]}
      >
        <TouchableOpacity
          style={styles.swiggyGreenCartContent}
          activeOpacity={0.9}
          onPress={() => setIsCartOpen(true)}
        >
          <Text style={styles.swiggyGreenCartLeftText}>
            {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} added
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.swiggyGreenCartRightText}>View Cart</Text>
            <ChevronRight size={18} color="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── LIVE REAL-TIME LOCATION API (Photon / OpenStreetMap) + NEARBY PLACES ─────
  useEffect(() => {
    if (!addressSearchQuery.trim() || addressSearchQuery.trim().length < 2) {
      setLiveApiSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(addressSearchQuery.trim());
        // Query OpenStreetMap Photon Geocoding API centered around Kerala, India
        const response = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=6&lat=11.2588&lon=75.7804`);
        const data = await response.json();

        let apiPlaces = [];
        if (data && data.features && data.features.length > 0) {
          apiPlaces = data.features.map((feat, index) => {
            const props = feat.properties;
            const name = props.name || props.street || addressSearchQuery;
            const district = props.district || props.city || props.county || 'Kerala';
            const state = props.state || 'Kerala';
            return {
              id: `api-loc-${index}-${Date.now()}`,
              label: name,
              address: `${name}, ${district}`,
              city: `${district}, ${state}`,
            };
          });
        }

        // Generate 5 Smart Realistic Nearby Places if API returns fewer items (e.g., Chembukadavu)
        const trimmed = addressSearchQuery.trim();
        const fallbackNearby = [
          { id: `fb-1-${Date.now()}`, label: `${trimmed} Junction & Town`, address: `Main Road, ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `fb-2-${Date.now()}`, label: `${trimmed} East / Bus Stand`, address: `Near Bus Terminal, ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `fb-3-${Date.now()}`, label: `Koduvally (Near ${trimmed})`, address: `Koduvally Town, Near ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `fb-4-${Date.now()}`, label: `Thamarassery (Near ${trimmed})`, address: `Thamarassery Bypass, Near ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `fb-5-${Date.now()}`, label: `Mukkam (Near ${trimmed})`, address: `Mukkam Road, Near ${trimmed}`, city: 'Kozhikode, Kerala' },
        ];

        // Combine API places with fallback nearby places to guarantee 5+ options
        const combined = [...apiPlaces];
        fallbackNearby.forEach(fb => {
          if (!combined.some(c => c.label.toLowerCase().includes(fb.label.toLowerCase()))) {
            combined.push(fb);
          }
        });

        setLiveApiSuggestions(combined.slice(0, 5));
      } catch (err) {
        // High resilience fallback nearby places generator
        const trimmed = addressSearchQuery.trim();
        setLiveApiSuggestions([
          { id: `err-1-${Date.now()}`, label: `${trimmed} Town Center`, address: `Main Road, ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `err-2-${Date.now()}`, label: `${trimmed} Bus Stand Area`, address: `Near Station, ${trimmed}`, city: 'Kozhikode, Kerala' },
          { id: `err-3-${Date.now()}`, label: `Koduvally (Near ${trimmed})`, address: `Koduvally Junction`, city: 'Kozhikode, Kerala' },
          { id: `err-4-${Date.now()}`, label: `Thamarassery (Near ${trimmed})`, address: `Thamarassery Bypass`, city: 'Kozhikode, Kerala' },
          { id: `err-5-${Date.now()}`, label: `Mukkam (Near ${trimmed})`, address: `Mukkam Town`, city: 'Kozhikode, Kerala' },
        ]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [addressSearchQuery]);

  // Fetch Current Live GPS Location
  const getCurrentLiveLocation = async () => {
    setIsGettingLocation(true);
    setLocationError('');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please pick a location manually.');
        setIsGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const street = place.street || place.name || place.district || 'Current Location';
        const city = place.city || place.subregion || place.region || 'Kerala';
        const liveAddressObj = {
          id: `live-gps-${Date.now()}`,
          label: `📍 ${street}`,
          address: `${street}, ${place.district || ''}`,
          city: `${city}, ${place.country || 'India'}`,
          isLive: true
        };
        setSelectedAddress(liveAddressObj);
        setAddressesList(prev => [liveAddressObj, ...prev.filter(a => !a.isLive)]);
        setIsAddressModalOpen(false);
        Alert.alert('📍 Live GPS Location Detected', `${street}, ${city}`);
      } else {
        const fallbackLive = {
          id: `live-gps-${Date.now()}`,
          label: `📍 Live Location`,
          address: `GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          city: 'Current Area',
          isLive: true
        };
        setSelectedAddress(fallbackLive);
        setIsAddressModalOpen(false);
      }
    } catch (err) {
      console.warn('GPS location error:', err);
      setLocationError('Could not detect GPS location. Please select a city preset.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Explore Tab Reset to Home & All Hotels
  const handleExploreClick = () => {
    setActiveTab('home');
    setSelectedRestaurant(null);
    setViewingProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setSearchQuery('');
    setSelectedCategory('all');
    setOnlyVeg(false);
  };

  // Auth Handler connecting strictly to NestJS backend
  const handleAuth = async () => {
    setAuthError('');
    const inputEmail = email.trim().toLowerCase();

    if (!inputEmail || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsLoadingAuth(true);

    const detectedIp = getExpoHostIp();

    const backendEndpoints = [
      `http://${detectedIp}:5000`,
      'http://192.168.1.3:5000',
      'http://localhost:5000',
      'http://10.0.2.2:5000'
    ];

    if (authMode === 'register') {
      if (!name.trim()) {
        setAuthError('Please enter your full name.');
        setIsLoadingAuth(false);
        return;
      }

      const mobileNumber = phone.replace(/\D/g, '').slice(-10) || '9876543210';
      let backendRes = null;
      let backendData = null;
      let networkError = false;

      for (const endpoint of backendEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`${endpoint}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              email: inputEmail,
              mobileNumber,
              password
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          backendData = await res.json();
          backendRes = res;
          break;
        } catch (err) {
          networkError = true;
        }
      }

      if (backendRes) {
        if (backendRes.ok && backendData && backendData.user) {
          const userObj = {
            id: backendData.user.id,
            name: backendData.user.name,
            email: backendData.user.email,
            phone: backendData.user.mobileNumber || phone || '+91 9876543210',
            role: backendData.user.role || 'user'
          };
          setCurrentUser(userObj);
          setActiveTab('home');
          setIsLoadingAuth(false);
          triggerToastNotification('🎉 Registration successful! Welcome to QuickBite');
          return;
        } else {
          const msg = Array.isArray(backendData?.message)
            ? backendData.message.join(', ')
            : (backendData?.message || 'Registration failed');
          setAuthError(`❌ ${msg}`);
          setIsLoadingAuth(false);
          return;
        }
      }

      if (networkError) {
        setAuthError(`⚠️ Backend offline. Unable to reach NestJS server at http://${detectedIp}:5000`);
        setIsLoadingAuth(false);
        return;
      }

    } else {
      // Login against NestJS Backend
      let backendRes = null;
      let backendData = null;
      let networkError = false;

      for (const endpoint of backendEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`${endpoint}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inputEmail, password }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          backendData = await res.json();
          backendRes = res;
          break;
        } catch (err) {
          networkError = true;
        }
      }

      if (backendRes) {
        if (backendRes.ok && backendData && backendData.user) {
          const userObj = {
            id: backendData.user.id,
            name: backendData.user.name,
            email: backendData.user.email,
            phone: backendData.user.mobileNumber || '+91 9876543210',
            role: backendData.user.role || 'user',
            token: backendData.accessToken
          };
          setCurrentUser(userObj);
          setActiveTab('home');
          setIsLoadingAuth(false);
          triggerToastNotification(`🎉 Welcome back, ${userObj.name}!`);
          return;
        } else {
          // STRICT BACKEND VERIFICATION: Wrong email or password -> SHOW ERROR & DO NOT LOG IN!
          const msg = Array.isArray(backendData?.message)
            ? backendData.message.join(', ')
            : (backendData?.message || 'Invalid email or password');
          setAuthError(`❌ ${msg}`);
          setIsLoadingAuth(false);
          return;
        }
      }

      if (networkError) {
        setAuthError(`⚠️ Backend offline. Unable to reach NestJS server at http://${detectedIp}:5000`);
        setIsLoadingAuth(false);
        return;
      }
    }

    setIsLoadingAuth(false);
  };

  const handleLogout = async () => {
    // Save cart & favorites before logout so they restore on next login
    if (currentUser?.id) {
      try {
        await AsyncStorage.setItem(`qb_cart_${currentUser.id}`, JSON.stringify(cartItems));
        await AsyncStorage.setItem(`qb_favs_${currentUser.id}`, JSON.stringify(favorites));
      } catch (e) { }
    }
    prevUserIdRef.current = null;
    setCurrentUser(null);
    setActiveTab('home');
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setCartItems([]);
    setCurrentOrder(null);
    setFavorites([]);
    await AsyncStorage.removeItem('qb_user').catch(() => { });
    triggerToastNotification('👋 Logged out successfully');
  };

  // Toggle Wishlist
  const toggleFavorite = (restId) => {
    setFavorites(prev =>
      prev.includes(restId) ? prev.filter(id => id !== restId) : [...prev, restId]
    );
  };

  // Open Product Details Modal
  const openProductDetails = (item, restaurant) => {
    setViewingProduct(item);
    setProductRestaurant(restaurant);
  };

  // Item Customization Modal
  const openCustomizer = (item, restaurant) => {
    setViewingProduct(null);
    const resolvedHotelId = item.hotelId || (restaurant ? restaurant.id : null);
    setCustomizingItem({
      ...item,
      hotelId: resolvedHotelId,
      restaurantName: restaurant ? restaurant.name : 'QuickBite'
    });
    setItemQuantity(1);

    const nameLower = (item?.name || '').toLowerCase();
    if (nameLower.includes('mandi')) {
      setItemSpice('Quarter');
    } else if (nameLower.includes('biriyani') || nameLower.includes('biryani')) {
      setItemSpice('Half');
    } else {
      setItemSpice('Medium');
    }

    setItemAddons([]);
  };

  const toggleAddon = (addonName, addonPrice) => {
    setItemAddons(prev => {
      const exists = prev.some(a => a.name === addonName);
      if (exists) {
        return prev.filter(a => a.name !== addonName);
      } else {
        return [...prev, { name: addonName, price: addonPrice }];
      }
    });
  };

  const confirmAddToCart = () => {
    if (!customizingItem) return;
    const addonsTotal = itemAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = getBasePrice(customizingItem, itemSpice) + addonsTotal;
    const addonNames = itemAddons.map(a => a.name).sort().join(',');

    const action = () => {
      setCartItems(prev => {
        const existingIndex = prev.findIndex(i =>
          i.itemId === customizingItem.id &&
          i.spice === itemSpice &&
          (i.addons || []).sort().join(',') === addonNames
        );

        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + itemQuantity
          };
          return updated;
        }

        const cartItem = {
          cartItemId: `${customizingItem.id}-${Date.now()}`,
          itemId: customizingItem.id,
          name: customizingItem.name,
          restaurantName: customizingItem.restaurantName,
          hotelId: customizingItem.hotelId,
          price: unitPrice,
          image: customizingItem.image,
          quantity: itemQuantity,
          spice: itemSpice,
          addons: itemAddons.map(a => a.name),
          is99StoreItem: customizingItem.is99StoreItem || false,
          isVeg: customizingItem.isVeg || false
        };
        return [...prev, cartItem];
      });

      triggerAddToCartAnimation(customizingItem.name);
      setCustomizingItem(null);
    };

    handleAddCartItem(customizingItem.hotelId, customizingItem.restaurantName, action);
  };

  // Quick Add Item directly to cart with animation
  const quickAddToCart = (item, restaurant) => {
    const itemHotelId = item.hotelId || (restaurant ? restaurant.id : null);
    const itemRestName = restaurant ? restaurant.name : (item.restaurant ? item.restaurant.name : 'QuickBite');

    const action = () => {
      setCartItems(prev => {
        const existingIndex = prev.findIndex(i => i.itemId === item.id && (!i.addons || i.addons.length === 0));
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1
          };
          return updated;
        }

        const newCartItem = {
          cartItemId: `${item.id}-${Date.now()}`,
          itemId: item.id,
          name: item.name,
          restaurantName: itemRestName,
          hotelId: itemHotelId,
          price: item.price,
          image: item.image,
          quantity: 1,
          spice: 'Medium',
          addons: [],
          is99StoreItem: item.is99StoreItem || false
        };
        return [...prev, newCartItem];
      });

      triggerAddToCartAnimation(item.name);
    };

    handleAddCartItem(itemHotelId, itemRestName, action);
  };

  const getGroupedCartItems = (items) => {
    const map = new Map();
    items.forEach(item => {
      const key = `${item.itemId || item.id}-${item.spice || 'Medium'}-${(item.addons || []).sort().join(',')}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.quantity += item.quantity;
      } else {
        map.set(key, { ...item });
      }
    });
    return Array.from(map.values());
  };

  const updateCartQuantity = (targetItemId, delta) => {
    setCartItems(prev => {
      const itemToUpdate = prev.find(i => i.cartItemId === targetItemId || i.itemId === targetItemId || i.id === targetItemId);
      if (!itemToUpdate) return prev;

      const targetId = itemToUpdate.itemId || itemToUpdate.id;
      const targetSpice = itemToUpdate.spice || 'Medium';
      const targetAddons = (itemToUpdate.addons || []).sort().join(',');

      const matchingItems = prev.filter(i =>
        (i.itemId === targetId || i.id === targetId) &&
        (i.spice || 'Medium') === targetSpice &&
        ((i.addons || []).sort().join(',')) === targetAddons
      );

      const currentTotalQty = matchingItems.reduce((s, i) => s + i.quantity, 0);
      const newTotalQty = currentTotalQty + delta;

      const otherItems = prev.filter(i =>
        !((i.itemId === targetId || i.id === targetId) &&
          (i.spice || 'Medium') === targetSpice &&
          ((i.addons || []).sort().join(',')) === targetAddons)
      );

      if (newTotalQty <= 0) {
        return otherItems;
      }

      const mergedItem = {
        ...itemToUpdate,
        quantity: newTotalQty
      };

      return [...otherItems, mergedItem];
    });
  };

  const handleCartScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 90;
    setIsCartScrollAtBottom(isCloseToBottom);
  };

  // Cart Totals & Discount Calculations
  const subtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const has99StoreItem = cartItems.some(i => i.is99StoreItem);
  const rawDeliveryFee = (subtotal > 0 && !has99StoreItem) ? 35 : 0;

  let discountAmount = 0;
  let finalDeliveryFee = rawDeliveryFee;

  if (appliedPromo) {
    if (appliedPromo.discountAmount !== undefined) {
      discountAmount = appliedPromo.discountAmount;
      finalDeliveryFee = appliedPromo.finalDeliveryFee;
    } else {
      if (appliedPromo.discountType === 'percentage') {
        discountAmount = Math.min((subtotal * appliedPromo.value) / 100, appliedPromo.maxDiscount || 999);
      } else if (appliedPromo.discountType === 'fixed' || appliedPromo.discountType === 'flat') {
        discountAmount = appliedPromo.value;
      } else if (appliedPromo.discountType === 'delivery' || appliedPromo.discountType === 'free_delivery') {
        finalDeliveryFee = 0;
      }
    }
  }

  const taxesAndFees = 0; // Aligned with backend OrdersService taxAmount = 0
  const grandTotal = Math.max(0, subtotal - discountAmount + finalDeliveryFee + taxesAndFees);

  const applyPromo = async (codeToApply = null) => {
    setPromoError('');
    const code = (codeToApply || promoInput).trim().toUpperCase();

    if (!code) {
      setPromoError('⚠️ Please enter a coupon code');
      return;
    }

    const hotelId = getCartHotelId();
    if (!hotelId) {
      setPromoError('❌ Unable to find restaurant details for validation');
      return;
    }

    try {
      const validationPayload = {
        code,
        hotelId: Number(hotelId),
        items: cartItems.map(i => ({
          foodId: Number(i.itemId),
          quantity: Number(i.quantity),
          finalUnitPrice: Number(i.price),
        })),
        subtotal: Number(subtotal),
        deliveryFee: Number(rawDeliveryFee),
      };

      const res = await fetch(`${resolvedBackendUrl}/offers/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validationPayload)
      });

      const validation = await res.json();
      if (!res.ok || !validation.isValid) {
        setPromoError(validation.message || '❌ Invalid Coupon Code');
        return;
      }

      const offer = validation.offer;
      setAppliedPromo({
        code: offer.code,
        discountType: offer.discountType,
        value: Number(offer.discountValue),
        maxDiscount: offer.maxDiscount ? Number(offer.maxDiscount) : null,
        minOrder: Number(offer.minimumOrderValue),
        discountAmount: Number(validation.discountAmount),
        finalDeliveryFee: Number(validation.finalDeliveryFee),
        desc: offer.description || `${offer.name} applied`
      });
      setPromoInput('');
      setPromoError('');
      triggerToastNotification(`🎉 Coupon ${offer.code} Applied Successfully!`);
    } catch (err) {
      console.error(err);
      setPromoError('⚠️ Connection error. Please try again.');
    }
  };

  useEffect(() => {
    if (!currentUser?.token) return;
    if (cartItems.length === 0) {
      if (appliedPromo) {
        setAppliedPromo(null);
      }
      return;
    }

    if (appliedPromo) {
      const revalidatePromo = async () => {
        try {
          const hotelId = getCartHotelId();
          if (!hotelId) return;
          const validationPayload = {
            code: appliedPromo.code,
            hotelId: Number(hotelId),
            items: cartItems.map(i => ({
              foodId: Number(i.itemId),
              quantity: Number(i.quantity),
              finalUnitPrice: Number(i.price),
            })),
            subtotal: Number(subtotal),
            deliveryFee: Number(rawDeliveryFee),
          };

          const res = await fetch(`${resolvedBackendUrl}/offers/validate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentUser?.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(validationPayload)
          });

          if (res.ok) {
            const validation = await res.json();
            if (!validation.isValid) {
              setAppliedPromo(null);
              triggerToastNotification('⚠️ Applied coupon is no longer valid for this cart');
            } else {
              setAppliedPromo(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  discountAmount: Number(validation.discountAmount),
                  finalDeliveryFee: Number(validation.finalDeliveryFee)
                };
              });
            }
          } else {
            setAppliedPromo(null);
            triggerToastNotification('⚠️ Applied coupon is no longer valid for this cart');
          }
        } catch (err) {
          console.error('Error revalidating applied promo:', err);
        }
      };

      revalidatePromo();
    }
  }, [cartItems, currentUser?.token]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    if (!selectedAddress) {
      Alert.alert('Delivery Address Required', 'Please select a delivery address to proceed.');
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutLoadingText('Syncing cart with backend...');

    try {
      const backendUrl = resolvedBackendUrl;
      const token = currentUser?.token;
      if (!token) {
        throw new Error('You must be logged in to checkout.');
      }

      // 1. Sync Cart to Backend
      await fetch(`${resolvedBackendUrl}/cart`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      for (const item of cartItems) {
        const choiceIds = item.customizations ? item.customizations.map(c => c.id) : [];
        const requestBody = JSON.stringify({
          foodId: Number(item.itemId),
          quantity: Number(item.quantity),
          choiceIds: choiceIds
        });
        const url = `${resolvedBackendUrl}/cart/items`;
        
        let addRes;
        let responseText = '';
        let syncError = null;

        try {
          addRes = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: requestBody
          });
          responseText = await addRes.text().catch(() => '');
          if (!addRes.ok) {
            syncError = new Error(`HTTP ${addRes.status}: ${responseText}`);
          }
        } catch (e) {
          syncError = e;
        }

        if (syncError) {
          console.warn('SYNC ITEM NAME:', item.name);
          console.warn('SYNC ITEM OBJECT:', JSON.stringify(item));
          console.warn('SYNC FOOD ID:', item.itemId);
          console.warn('SYNC HOTEL ID:', item.hotelId);
          console.warn('SYNC URL:', url);
          console.warn('SYNC REQUEST BODY:', requestBody);
          console.warn('SYNC RESPONSE STATUS:', addRes ? addRes.status : 'N/A');
          console.warn('SYNC RESPONSE DATA:', responseText || 'N/A');
          console.warn('SYNC ERROR:', syncError.message || syncError);
          
          throw new Error(`Failed to sync item "${item.name}" to backend: ${responseText || syncError.message || 'Unknown error'}`);
        }
      }

      // 2. Resolve/Create Address on Backend if it has a string ID
      setCheckoutLoadingText('Verifying delivery address...');
      let finalAddressId = selectedAddress.id;
      if (typeof finalAddressId === 'string' && isNaN(Number(finalAddressId))) {
        const backendAddr = await addAddressToBackend(
          selectedAddress.label, 
          selectedAddress.address, 
          selectedAddress.city ? selectedAddress.city.split(',')[0] : 'Kannur'
        );
        if (backendAddr) {
          finalAddressId = backendAddr.id;
          setSelectedAddress(backendAddr);
        } else {
          throw new Error('Failed to save delivery address on backend');
        }
      }

      // 3. Create Backend Order
      setCheckoutLoadingText('Creating order...');
      const orderRes = await fetch(`${backendUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addressId: Number(finalAddressId),
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
          customerNote: '',
          couponCode: appliedPromo ? appliedPromo.code : undefined,
        })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.message || 'Failed to place order');
      }

      const backendOrder = await orderRes.json();

      // 4. Handle COD Flow
      if (paymentMethod === 'cod') {
        const assignedDriver = DRIVER_PROFILES[Math.floor(Math.random() * DRIVER_PROFILES.length)];
        const codOrder = {
          orderId: backendOrder.id,
          orderNumber: backendOrder.orderNumber,
          items: [...cartItems],
          total: grandTotal,
          subtotal: subtotal,
          deliveryFee: finalDeliveryFee,
          taxAmount: taxesAndFees,
          discountAmount: discountAmount,
          address: selectedAddress,
          paymentMethod: 'COD',
          placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          estimatedTime: '25-30 mins',
          driver: assignedDriver,
          step: 1
        };

        setLastPlacedOrder(codOrder);
        setMyOrdersList(prev => [codOrder, ...prev]);
        setOrderStepMap(prev => ({ ...prev, [backendOrder.id]: 1 }));
        setCartItems([]);
        setAppliedPromo(null);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);

        setIsOrderSuccessModalOpen(true);
        successScaleAnim.setValue(0);
        Animated.spring(successScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true
        }).start();

        setIsProcessingCheckout(false);
        return;
      }

      // 5. Handle Online Payment (Razorpay) Flow
      setCheckoutLoadingText('Preparing secure payment...');
      const rpRes = await fetch(`${backendUrl}/payments/orders/${backendOrder.id}/razorpay/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!rpRes.ok) {
        const errData = await rpRes.json();
        throw new Error(errData.message || 'Failed to create Razorpay order');
      }

      const rpData = await rpRes.json();
      setCheckoutLoadingText('Waiting for payment...');

      const options = {
        description: 'QuickBite Food Order payment',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80',
        currency: rpData.currency || 'INR',
        key: rpData.keyId,
        amount: Math.round(Number(rpData.amount) * 100),
        name: 'QuickBite',
        order_id: rpData.razorpayOrderId,
        prefill: {
          email: currentUser.email || 'customer@quickbite.com',
          contact: currentUser.phone ? currentUser.phone.replace(/\D/g, '').slice(-10) : '9876543210',
          name: currentUser.name || 'QuickBite Customer'
        },
        theme: { color: '#059669' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        setCheckoutLoadingText('Verifying payment...');

        try {
          const verifyRes = await fetch(`${backendUrl}/payments/razorpay/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            })
          });

          if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            throw new Error(errData.message || 'Payment verification failed');
          }

          const assignedDriver = DRIVER_PROFILES[Math.floor(Math.random() * DRIVER_PROFILES.length)];
          const confirmedOrder = {
            orderId: backendOrder.id,
            orderNumber: backendOrder.orderNumber,
            items: [...cartItems],
            total: grandTotal,
            subtotal: subtotal,
            deliveryFee: finalDeliveryFee,
            taxAmount: taxesAndFees,
            discountAmount: discountAmount,
            address: selectedAddress,
            paymentMethod: 'ONLINE',
            placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            estimatedTime: '25-30 mins',
            driver: assignedDriver,
            step: 1
          };

          setLastPlacedOrder(confirmedOrder);
          setMyOrdersList(prev => [confirmedOrder, ...prev]);
          setOrderStepMap(prev => ({ ...prev, [backendOrder.id]: 1 }));
          setCartItems([]);
          setAppliedPromo(null);
          setIsCheckoutOpen(false);
          setIsCartOpen(false);

          setIsOrderSuccessModalOpen(true);
          successScaleAnim.setValue(0);
          Animated.spring(successScaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true
          }).start();
        } catch (e) {
          console.error('Payment verification error:', e);
          setPaymentFailedModal({ visible: true, title: 'Payment Failed', message: "We couldn't verify your payment. Please contact support if the amount was deducted." });
        } finally {
          setIsProcessingCheckout(false);
        }
      }).catch((error) => {
        console.warn('Razorpay checkout error:', error);
        setPaymentFailedModal({ visible: true, title: 'Payment Failed', message: "We couldn't complete your payment. Please try again or choose another payment method." });
        setIsProcessingCheckout(false);
      });

    } catch (err) {
      console.error('handlePlaceOrder error:', err);
      const isUnauthorized = err.message && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'));
      setPaymentFailedModal({
        visible: true,
        title: 'Order Failed',
        message: isUnauthorized 
          ? "Your login session has expired. Please log out and log back in to place your order."
          : `We couldn't place your order. ${err.message || 'Please check your connection and try again.'}`
      });
      setIsProcessingCheckout(false);
    }
  };

  // Dual Search & Location-Based Nearby Hotel Filtering
  const filteredRestaurants = restaurants.filter(r => {
    if (onlyVeg && !r.isVeg) return false;
    if (onlyOffers && (!r.offerText || r.offerText.trim() === '')) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'offers' && r.category !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchMenu = r.menu && r.menu.some(m => m.name.toLowerCase().includes(q));
      if (!matchName && !matchMenu) return false;
    }
    return true;
  }).sort((a, b) => {
    // Sort nearby restaurants prioritizing selected address city/region match
    const fullLocText = `${selectedAddress.label || ''} ${selectedAddress.address || ''} ${selectedAddress.city || ''}`.toLowerCase();
    const aAddress = (a.address || '').toLowerCase();
    const bAddress = (b.address || '').toLowerCase();

    // Check district keywords
    const districts = ['kannur', 'kozhikode', 'calicut', 'kollam', 'kochi', 'ernakulam', 'trivandrum', 'thiruvananthapuram', 'thrissur', 'kottayam'];
    let activeDistrict = '';
    for (const d of districts) {
      if (fullLocText.includes(d)) {
        activeDistrict = d === 'calicut' ? 'kozhikode' : (d === 'ernakulam' ? 'kochi' : (d === 'thiruvananthapuram' ? 'trivandrum' : d));
        break;
      }
    }

    if (activeDistrict) {
      const aMatch = aAddress.includes(activeDistrict);
      const bMatch = bAddress.includes(activeDistrict);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }

    const aMatchPart = fullLocText.split(',').some(part => part.trim().length > 2 && aAddress.includes(part.trim()));
    const bMatchPart = fullLocText.split(',').some(part => part.trim().length > 2 && bAddress.includes(part.trim()));

    if (aMatchPart && !bMatchPart) return -1;
    if (!aMatchPart && bMatchPart) return 1;
    return b.rating - a.rating;
  });

  // Extract all dishes across all restaurants
  const allDishes = restaurants.flatMap(r => {
    if (!r.menu) return [];
    return r.menu.map(item => ({ ...item, restaurant: r }));
  });

  // Extract matching dishes when user types in search bar
  const matchingDishes = searchQuery.trim() === '' ? [] : allDishes.filter(item => {
    if (onlyVeg && !item.isVeg) return false;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));
  });

  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Slide-in Right Toast for Auth Pages */}
        <Animated.View style={[styles.toastBannerRight, { transform: [{ translateX: toastAnimX }] }]}>
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </Animated.View>

        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80' }}
          style={styles.fullScreenBg}
          resizeMode="cover"
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView style={styles.authOverlay}>
              <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.authHeader}>
                  <Text style={styles.brandEmoji}>🛵</Text>
                  <Text style={styles.brandTitle}>QuickBite Mobile</Text>
                  <Text style={styles.brandSubtitle}>Delicious Meals Delivered to Your Doorstep</Text>
                </View>

                <View style={[styles.authCard, { backgroundColor: '#181B28', borderColor: '#282C40', borderWidth: 1 }]}>
                  <View style={[styles.tabRow, { backgroundColor: '#1F2335' }]}>
                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'login' && { backgroundColor: '#FF5252' }]}
                      onPress={() => { setAuthMode('login'); setAuthError(''); }}
                    >
                      <Text style={[styles.tabBtnText, { color: authMode === 'login' ? '#ffffff' : '#94A3B8' }]}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'register' && { backgroundColor: '#FF5252' }]}
                      onPress={() => { setAuthMode('register'); setAuthError(''); }}
                    >
                      <Text style={[styles.tabBtnText, { color: authMode === 'register' ? '#ffffff' : '#94A3B8' }]}>Register</Text>
                    </TouchableOpacity>
                  </View>

                  {authError ? (
                    <View style={[styles.errorBox, { backgroundColor: '#3B171A', borderColor: '#EF4444', borderWidth: 1 }]}>
                      <Text style={[styles.errorText, { color: '#FCA5A5' }]}>{authError}</Text>
                    </View>
                  ) : null}

                  {authMode === 'register' && (
                    <>
                      <Text style={[styles.inputLabel, { color: '#94A3B8' }]}>Full Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#1F2335', borderColor: '#2E334D', color: '#F8FAFC' }]}
                        placeholder="Arjun Kumar"
                        placeholderTextColor="#64748B"
                        value={name}
                        onChangeText={setName}
                      />

                      <Text style={[styles.inputLabel, { color: '#94A3B8' }]}>Mobile Phone</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#1F2335', borderColor: '#2E334D', color: '#F8FAFC' }]}
                        placeholder="+91 9876543210"
                        placeholderTextColor="#64748B"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </>
                  )}

                  <Text style={[styles.inputLabel, { color: '#94A3B8' }]}>Email Address</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#1F2335', borderColor: '#2E334D', color: '#F8FAFC' }]}
                    placeholder="user@quickbite.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />

                  {/* Password Input with Eye Button Toggle */}
                  <Text style={[styles.inputLabel, { color: '#94A3B8' }]}>Password</Text>
                  <View style={[styles.passwordContainer, { backgroundColor: '#1F2335', borderColor: '#2E334D' }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: '#F8FAFC' }]}
                      placeholder="••••••••"
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#94A3B8" />
                      ) : (
                        <Eye size={20} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleAuth}
                    disabled={isLoadingAuth}
                  >
                    {isLoadingAuth ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {authMode === 'login' ? 'Sign In' : 'Create Account'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoLoginBtn}
                    onPress={() => {
                      setEmail('user@quickbite.com');
                      setPassword('password123');
                      setAuthMode('login');
                    }}
                  >
                    <Text style={[styles.demoLoginText, { color: '#FF7A00' }]}>⚡ Quick Demo Fill</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </ImageBackground>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.safeArea, { backgroundColor: D.headerBg }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* Slide-in Right Toast Banner for Main App */}
        <Animated.View style={[styles.toastBannerRight, { top: STATUSBAR_HEIGHT + 6, transform: [{ translateX: toastAnimX }] }]}>
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </Animated.View>

        {/* Main Logged In Application View */}
        <View style={[styles.mainContainer, { backgroundColor: D.bg }]}>
          {isGlobalLoading && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: D.bg, zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#FF5252" />
              <Text style={{ marginTop: 10, color: D.textSub, fontSize: 13, fontWeight: '600' }}>Loading...</Text>
            </View>
          )}

          {/* FEATURE 1: Top Header Bar (Fixed Safe Container; Internal Content Fades on Scroll) */}
          {/* FEATURE 2: Animated Floating QuickBite Brand Header (Hidden on Profile & Orders pages) */}
          {(activeTab !== 'profile' && activeTab !== 'orders' && activeTab !== 'wishlist') && (
            <Animated.View
              pointerEvents="box-none"
              style={[
                styles.topHeader,
                {
                  backgroundColor: D.headerBg,
                  borderBottomColor: D.navBorder,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  opacity: topHeaderOpacity,
                  transform: [{ translateY: topHeaderTranslateY }]
                }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {/* BRAND LOGO */}
                <View style={[styles.headerBrandBadge, { backgroundColor: darkMode ? '#2A181D' : '#FEF2F2', borderColor: darkMode ? '#5B212B' : '#FECDD3' }]}>
                  <Text style={styles.headerBrandIcon}>🍔</Text>
                  <Text style={[styles.headerBrandText, { color: D.text }]}>
                    Quick<Text style={{ color: '#FF5252' }}>Bite</Text>
                  </Text>
                </View>

                <TouchableOpacity style={styles.addressSelector} onPress={() => setIsAddressModalOpen(true)}>
                  <MapPin size={14} color="#FF5252" />
                  <View style={{ marginLeft: 4, flex: 1 }}>
                    <Text style={[styles.addressLabel, { color: D.text, fontSize: 11, fontWeight: '800' }]} numberOfLines={1}>{selectedAddress.label}</Text>
                    <Text style={[styles.addressCity, { fontSize: 10, color: D.textSub }]} numberOfLines={1}>{selectedAddress.city}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.headerRightActions}>
                {/* Dark Mode Toggle */}
                <TouchableOpacity
                  style={[styles.cartIconBtn, { backgroundColor: darkMode ? '#252840' : '#F3F4F6', marginRight: 8 }]}
                  onPress={() => setDarkMode(d => !d)}
                >
                  {darkMode
                    ? <Sun size={18} color="#F59E0B" />
                    : <Moon size={18} color="#4B5563" />
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cartIconBtn, { backgroundColor: darkMode ? '#252840' : '#F3F4F6' }]}
                  onPress={() => setIsCartOpen(true)}
                >
                  <ShoppingBag size={22} color={D.text} />
                  {cartItems.length > 0 && (
                    <Animated.View style={[styles.cartBadge, { transform: [{ scale: cartAnim }] }]}>
                      <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Body Content depending on Active Tab */}
          <View style={{ flex: 1 }}>

            {/* TAB 1: HOME (Native Smooth Animated Sticky Scroll View) */}
            {activeTab === 'home' && (
              <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: homeScrollY } } }],
                  {
                    useNativeDriver: false,
                    listener: Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false })
                  }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: STATUSBAR_HEIGHT + 44, paddingBottom: 90 }}
              >
                {/* 1. SEARCH BAR WITH MIC & VEG TOGGLE (Fades out on scroll) */}
                <Animated.View style={[styles.swiggySearchRow, { opacity: searchOpacity }]}>
                  <View style={[styles.swiggySearchBar, { backgroundColor: D.inputBg, borderColor: D.inputBorder }]}>
                    <Search size={18} color="#FF5252" />
                    <TextInput
                      style={[styles.swiggySearchInput, { color: D.text }]}
                      placeholder="Search for 'Sweets', 'Biryani', 'Pizza'..."
                      placeholderTextColor={darkMode ? '#64748B' : '#9CA3AF'}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                        <X size={16} color={D.textSub} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => { }} style={{ padding: 4 }}>
                        <Mic size={18} color="#FF5252" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.swiggyVegToggleBtn,
                      onlyVeg ? styles.swiggyVegToggleActive : { backgroundColor: D.card, borderColor: D.cardBorder }
                    ]}
                    onPress={() => setOnlyVeg(!onlyVeg)}
                  >
                    <Text style={[styles.swiggyVegToggleText, { color: onlyVeg ? '#059669' : D.text }]}>VEG</Text>
                    <View style={[styles.vegBadgeDot, { backgroundColor: onlyVeg ? '#10B981' : '#9CA3AF', marginLeft: 4 }]} />
                  </TouchableOpacity>
                </Animated.View>

                {/* INDEX 1: STICKY FEATURE FILTER & FOOD AVATARS CONTAINER */}
                <View style={{ backgroundColor: D.card, borderBottomWidth: 1, borderBottomColor: D.divider, zIndex: 99, elevation: 3 }}>
                  {/* "WHAT'S ON YOUR MIND?" HEADING WITH SMOOTH FADE & SLIDE ANIMATION */}
                  <Animated.View style={{
                    opacity: headingOpacity,
                    transform: [{ translateY: headingTranslateY }],
                    marginTop: 6,
                    marginBottom: 2
                  }}>
                    <Text style={[styles.swiggySectionHeading, { color: D.heading, marginVertical: 0 }]}>What's on your mind?</Text>
                  </Animated.View>

                  {/* FEATURE FILTER BAR (ALL vs OFFERS vs BOLT vs EATRIGHT) */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[styles.swiggyTopTab, selectedCategory === 'all' && [styles.swiggyTopTabActive, { backgroundColor: darkMode ? '#3D1A1A' : '#FFF1F2' }]]}
                        onPress={() => handleHeavyAction(() => {
                          if (selectedCategory !== 'all') {
                            setSelectedCategory('all');
                            setOnlyOffers(false);
                          }
                        })}
                      >
                        <Sparkles size={14} color={selectedCategory === 'all' ? '#FF5252' : D.textSub} />
                        <Text style={[styles.swiggyTopTabText, { color: selectedCategory === 'all' ? '#FF5252' : D.textSub }]}>ALL</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.swiggyTopTab, (selectedCategory === 'offers' || onlyOffers) && [styles.swiggyTopTabActive, { backgroundColor: darkMode ? '#3D1A1A' : '#FFF1F2' }]]}
                        onPress={() => handleHeavyAction(() => {
                          if (selectedCategory !== 'offers') {
                            setSelectedCategory('offers');
                            setOnlyOffers(true);
                          }
                        })}
                      >
                        <Tag size={14} color={(selectedCategory === 'offers' || onlyOffers) ? '#FF5252' : D.textSub} />
                        <Text style={[styles.swiggyTopTabText, { color: (selectedCategory === 'offers' || onlyOffers) ? '#FF5252' : D.textSub }]}>OFFERS</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.swiggyTopTab}
                        onPress={() => { }}
                      >
                        <Zap size={14} color="#F59E0B" />
                        <Text style={[styles.swiggyTopTabText, { color: D.textSub }]}>BOLT</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.swiggyTopTab}
                        onPress={() => setOnlyVeg(!onlyVeg)}
                      >
                        <Heart size={14} color="#10B981" />
                        <Text style={[styles.swiggyTopTabText, { color: D.textSub }]}>EATRIGHT</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  {/* CIRCULAR FOOD AVATARS ROW */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 }}>
                    {FOOD_AVATARS.map(food => (
                      <FoodAvatarItem
                        key={food.id}
                        food={food}
                        isSelected={selectedCategory === food.id}
                        textColor={D.text}
                        onPress={() => handleHeavyAction(() => {
                          setSelectedCategory(food.id);
                          setSelectedCategoryModal(food);
                        })}
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* INDEX 2: MAIN SCROLLABLE CONTENT */}
                {selectedCategory === 'offers' && searchQuery.trim() === '' ? (
                  <View style={{ marginTop: 10, paddingTop: 0 }}>
                    {/* Offers Page Header */}
                    <View style={{ backgroundColor: '#FF4500', padding: 16, marginHorizontal: 14, borderRadius: 18 }}>
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900' }}>🏷️ Exclusive Offers & Steal Deals</Text>
                      <Text style={{ color: '#FEF2F2', fontSize: 12, marginTop: 4, fontWeight: '600' }}>Curated discounted food items & special deal restaurants</Text>
                    </View>

                    {/* Section 1: Offer Food Items */}
                    <View style={{ paddingHorizontal: 14, marginTop: 16 }}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: D.heading }]}>🔥 Steal Deal Food Items</Text>
                        <Text style={[styles.sectionCount, { color: D.textSub }]}>Up to 50% OFF</Text>
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                        {allDishes.filter(d => d.restaurant && d.restaurant.offerText).map((item, idx) => {
                          const origPrice = Math.round(item.price * 1.5);
                          const discPercent = Math.round(((origPrice - item.price) / origPrice) * 100);
                          const inCart = cartItems.some(c => c.id === item.id);
                          return (
                            <TouchableOpacity
                              key={`offer-dish-${item.id}-${idx}`}
                              style={[styles.offerFoodGridCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                              activeOpacity={0.85}
                              onPress={() => openProductDetails(item, item.restaurant)}
                            >
                              <View style={{ position: 'relative' }}>
                                <Image source={{ uri: item.image }} style={styles.offerFoodImg} />
                                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>{discPercent}% OFF</Text>
                                </View>
                              </View>

                              <Text style={[styles.gridCardTitle, { color: D.text, marginTop: 8 }]} numberOfLines={1}>{item.name}</Text>
                              <Text style={[styles.gridCardSub, { color: D.textSub }]} numberOfLines={1}>by {item.restaurant?.name}</Text>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FF5252' }}>₹{item.price}</Text>
                                  <Text style={{ fontSize: 11, textDecorationLine: 'line-through', color: D.textSub, marginLeft: 4 }}>₹{origPrice}</Text>
                                </View>

                                <TouchableOpacity
                                  style={[styles.addBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                  onPress={(e) => { e.stopPropagation(); openCustomizer(item, item.restaurant); }}
                                >
                                  <Text style={[styles.addBtnText, inCart && { color: '#ffffff' }]}>{inCart ? 'ADDED ✓' : 'ADD +'}</Text>
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Section 2: Offer Hotels */}
                    <View style={{ paddingHorizontal: 14, marginTop: 20 }}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: D.heading }]}>🏨 Top Offer Restaurants</Text>
                        <Text style={[styles.sectionCount, { color: D.textSub }]}>{filteredRestaurants.length} places</Text>
                      </View>

                      {filteredRestaurants.map(restaurant => {
                        const isFav = favorites.includes(restaurant.id);
                        return (
                          <TouchableOpacity
                            key={`offer-rest-${restaurant.id}`}
                            style={[styles.restaurantCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                            activeOpacity={0.9}
                            onPress={() => setSelectedRestaurant(restaurant)}
                          >
                            <View style={{ position: 'relative' }}>
                              <Image source={{ uri: restaurant.image }} style={styles.restaurantImg} />
                              {restaurant.offerText ? (
                                <View style={styles.offerBadge}>
                                  <Text style={styles.offerText}>{restaurant.offerText}</Text>
                                </View>
                              ) : null}

                              <TouchableOpacity
                                style={styles.favFloatingBtn}
                                onPress={() => toggleFavorite(restaurant.id)}
                              >
                                <Heart size={18} color={isFav ? '#FF5252' : '#ffffff'} fill={isFav ? '#FF5252' : 'transparent'} />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.cardContent}>
                              <View style={styles.cardRow}>
                                <Text style={[styles.restaurantTitle, { color: D.heading }]} numberOfLines={1}>{restaurant.name}</Text>
                                <View style={styles.ratingBadge}>
                                  <Star size={12} color="#ffffff" fill="#ffffff" />
                                  <Text style={styles.ratingText}>{restaurant.rating}</Text>
                                </View>
                              </View>
                              <Text style={[styles.restaurantDesc, { color: D.textSub }]} numberOfLines={2}>{restaurant.description}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <>
                    {/* 3. SEARCH MATCHING FOOD ITEMS / KHAO GULLY BANNER */}
                    {searchQuery.trim() !== '' ? (
                      <View style={{ paddingHorizontal: 14, marginVertical: 10 }}>
                        <View style={styles.sectionHeader}>
                          <Text style={[styles.sectionTitle, { color: D.heading }]}>
                            🍽️ Matching Food Items ({matchingDishes.length})
                          </Text>
                        </View>

                        {matchingDishes.length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                            {matchingDishes.map((item, idx) => {
                              const inCart = cartItems.some(c => c.id === item.id);
                              return (
                                <TouchableOpacity
                                  key={`search-top-dish-${item.id}-${idx}`}
                                  style={[styles.offerFoodGridCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                                  activeOpacity={0.85}
                                  onPress={() => openProductDetails(item, item.restaurant)}
                                >
                                  <View style={{ position: 'relative' }}>
                                    <Image source={{ uri: item.image }} style={styles.offerFoodImg} />
                                    <TouchableOpacity
                                      style={[styles.store99AddBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                      onPress={() => openCustomizer(item, item.restaurant)}
                                    >
                                      <Text style={[styles.store99AddBtnText, inCart && { color: '#ffffff' }]}>{inCart ? 'ADDED ✓' : 'ADD +'}</Text>
                                    </TouchableOpacity>
                                  </View>

                                  <Text style={[styles.gridCardTitle, { color: D.text, marginTop: 6 }]} numberOfLines={1}>{item.name}</Text>
                                  <Text style={[styles.gridCardSub, { color: D.textSub }]} numberOfLines={1}>by {item.restaurant?.name || 'QuickBite'}</Text>

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#FF5252' }}>₹{item.price}</Text>
                                    <View style={styles.itemRatingChip}>
                                      <Star size={9} color="#B45309" fill="#B45309" />
                                      <Text style={styles.itemRatingText}>{calculateAverageRating(item)}</Text>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.emptyStateCenter}>
                            <Search size={40} color={darkMode ? '#475569' : '#9CA3AF'} />
                            <Text style={[styles.emptyTitle, { color: D.text, fontSize: 15 }]}>No matching food items</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
                        <ImageBackground
                          source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80' }}
                          style={styles.khaoGullyBanner}
                          imageStyle={{ borderRadius: 16 }}
                        >
                          <View style={styles.khaoGullyOverlay}>
                            <Text style={styles.khaoGullyTitle}>KHAO GULLY</Text>
                            <Text style={styles.khaoGullySubtitle}>All your street food faves, in one place</Text>
                            <TouchableOpacity
                              style={styles.khaoGullyBtn}
                              onPress={() => {
                                const targetHotel = restaurants.find(r => r.id === 1) || restaurants[0];
                                if (targetHotel) {
                                  setSelectedRestaurant(targetHotel);
                                }
                              }}
                            >
                              <Text style={styles.khaoGullyBtnText}>ORDER NOW</Text>
                            </TouchableOpacity>
                          </View>
                        </ImageBackground>
                      </View>
                    )}

                    {/* 4. "₹99 STORE" DEALS SECTION */}
                    {searchQuery.trim() === '' && (
                      <>
                        <View style={[styles.store99Card, { backgroundColor: darkMode ? '#1E293B' : '#F0F9FF', borderColor: darkMode ? '#334155' : '#BAE6FD' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0284C7', fontStyle: 'italic' }}>99 store</Text>
                              <View style={{ marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
                                <CheckCircle2 size={14} color="#059669" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: D.text, marginLeft: 4 }}>Meals at ₹99 + <Text style={{ color: '#D97706' }}>Free Delivery</Text></Text>
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => setIsStore99ModalOpen(true)}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>View All ›</Text>
                            </TouchableOpacity>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                            {allDishes.filter(d => d.price <= 200).slice(0, 5).map((item, idx) => {
                              const discountedPrice = Math.min(item.price, 99);
                              const originalPrice = Math.max(item.price, 120);
                              const inCart = cartItems.some(c => c.id === item.id);
                              return (
                                <TouchableOpacity
                                  key={`store-99-${idx}`}
                                  style={[styles.store99ItemCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                                  onPress={() => openProductDetails({ ...item, price: discountedPrice, originalPrice, is99StoreItem: true }, item.restaurant)}
                                >
                                  <View style={{ position: 'relative' }}>
                                    <Image source={{ uri: item.image }} style={styles.store99ItemImg} />
                                    <TouchableOpacity
                                      style={[styles.store99AddBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                      onPress={() => openCustomizer({ ...item, price: discountedPrice, originalPrice, is99StoreItem: true }, item.restaurant)}
                                    >
                                      <Text style={[styles.store99AddBtnText, inCart && { color: '#ffffff' }]}>{inCart ? 'ADDED ✓' : 'ADD +'}</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <View style={{ padding: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                      <View style={[styles.vegBadgeIcon, { borderColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                                        <View style={[styles.vegBadgeDot, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]} />
                                      </View>
                                      <Text style={[styles.store99ItemTitle, { color: D.text }]} numberOfLines={1}>{item.name}</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                      <Text style={{ fontSize: 11, textDecorationLine: 'line-through', color: D.textSub, marginRight: 6 }}>₹{originalPrice}</Text>
                                      <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#854D0E' }}>₹{discountedPrice}</Text>
                                      </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                      <Star size={10} color="#D97706" fill="#D97706" />
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: D.textSub, marginLeft: 2 }}>4.5 (50+)</Text>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>

                        {/* 5. MODERN FILTER CHIPS BAR */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, marginVertical: 10 }}>
                          <TouchableOpacity
                            style={[styles.swiggyFilterChip, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                            onPress={() => triggerToastNotification('🎛️ Filters Applied!')}
                          >
                            <SlidersHorizontal size={14} color={D.text} />
                            <Text style={[styles.swiggyFilterChipText, { color: D.text }]}>Filter</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.swiggyFilterChip, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                            onPress={() => triggerToastNotification('🔽 Sorted by popularity!')}
                          >
                            <Text style={[styles.swiggyFilterChipText, { color: D.text }]}>Sort by 🔽</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.swiggyFilterChip, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                            onPress={() => triggerToastNotification('🛍️ 99 Store deals active!')}
                          >
                            <Tag size={13} color="#D97706" />
                            <Text style={[styles.swiggyFilterChipText, { color: '#B45309', fontWeight: '800' }]}>99 Store</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.swiggyFilterChip, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                            onPress={() => triggerToastNotification('⚡ 15 Mins Bolt Delivery active!')}
                          >
                            <Zap size={13} color="#059669" />
                            <Text style={[styles.swiggyFilterChipText, { color: '#047857', fontWeight: '800' }]}>15 Mins Bolt</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </>
                    )}

                    {/* 8. RESTAURANTS & HOTELS SECTION WITH SKELETON & FOOD LOADER */}
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: D.heading }]}>Restaurants & Hotels</Text>
                      <Text style={[styles.sectionCount, { color: D.textSub }]}>{filteredRestaurants.length} places</Text>
                    </View>

                    {isSkeletonLoading ? (
                      <View style={{ paddingHorizontal: 16 }}>
                        <SkeletonCard darkMode={darkMode} />
                        <SkeletonCard darkMode={darkMode} />
                      </View>
                    ) : dbConnectionError ? (
                      <View style={[styles.errorContainer, { backgroundColor: darkMode ? '#2D1B1B' : '#FEF2F2', borderColor: darkMode ? '#7F1D1D' : '#FCA5A5' }]}>
                        <AlertTriangle size={24} color="#EF4444" />
                        <Text style={[styles.errorTitle, { color: darkMode ? '#FCA5A5' : '#991B1B' }]}>Connection Error</Text>
                        <Text style={[styles.errorText, { color: darkMode ? '#F87171' : '#B91C1C' }]}>
                          Unable to connect to the backend server. Make sure the NestJS server is running on port 5000 and the port is reversed.
                        </Text>
                        <TouchableOpacity
                          style={[styles.retryBtn, { backgroundColor: '#EF4444' }]}
                          onPress={fetchBackendData}
                        >
                          <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.retryBtnText}>Retry Connection</Text>
                        </TouchableOpacity>
                      </View>
                    ) : filteredRestaurants.length === 0 ? (
                      <View style={styles.emptyStateCenter}>
                        <Store size={52} color={darkMode ? '#475569' : '#9CA3AF'} />
                        <Text style={[styles.emptyTitle, { color: D.text }]}>No Restaurants Active</Text>
                        <Text style={[styles.emptySubtitle, { color: D.textSub }]}>
                          There are no active restaurants in the database right now. Add a restaurant from the Admin Panel to display it here.
                        </Text>
                        <TouchableOpacity
                          style={[styles.retryBtn, { backgroundColor: darkMode ? '#38BDF8' : '#0284C7' }]}
                          onPress={fetchBackendData}
                        >
                          <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.retryBtnText}>Refresh</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      filteredRestaurants.map(restaurant => {
                        const isFav = favorites.includes(restaurant.id);
                        return (
                          <TouchableOpacity
                            key={restaurant.id}
                            style={[styles.restaurantCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                            activeOpacity={0.9}
                            onPress={() => setSelectedRestaurant(restaurant)}
                          >
                            <View style={{ position: 'relative' }}>
                              <Image source={{ uri: restaurant.image }} style={styles.restaurantImg} />
                              {restaurant.offerText ? (
                                <View style={styles.offerBadge}>
                                  <Text style={styles.offerText}>{restaurant.offerText}</Text>
                                </View>
                              ) : null}

                              <TouchableOpacity
                                style={styles.favFloatingBtn}
                                onPress={() => toggleFavorite(restaurant.id)}
                              >
                                <Heart size={18} color={isFav ? '#FF5252' : '#ffffff'} fill={isFav ? '#FF5252' : 'transparent'} />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.cardContent}>
                              <View style={styles.cardRow}>
                                <Text style={[styles.restaurantTitle, { color: D.heading }]} numberOfLines={1}>{restaurant.name}</Text>
                                <View style={styles.ratingBadge}>
                                  <Star size={12} color="#ffffff" fill="#ffffff" />
                                  <Text style={styles.ratingText}>{restaurant.rating}</Text>
                                </View>
                              </View>

                              <Text style={[styles.restaurantDesc, { color: D.textSub }]} numberOfLines={2}>{restaurant.description}</Text>

                              <View style={styles.cardFooter}>
                                <View style={styles.footerInfo}>
                                  <Clock size={12} color={darkMode ? '#94A3B8' : '#6B7280'} />
                                  <Text style={[styles.footerInfoText, { color: D.textSub }]}>{restaurant.deliveryTime}</Text>
                                </View>

                                <Text style={[styles.dotSeparator, { color: D.textSub }]}>•</Text>

                                <Text style={[styles.footerInfoText, { color: D.textSub }]}>{restaurant.priceTier}</Text>

                                <Text style={[styles.dotSeparator, { color: D.textSub }]}>•</Text>

                                <Text style={[styles.footerInfoText, { color: D.textSub }]}>
                                  {restaurant.isVeg ? '🌱 Pure Veg' : '🍖 Non-Veg'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                )}

                {/* Empty State when Search Query has no matching restaurants or dishes */}
                {searchQuery.trim() !== '' && filteredRestaurants.length === 0 && matchingDishes.length === 0 && (
                  <View style={styles.emptyStateCenter}>
                    <Search size={52} color={darkMode ? '#475569' : '#9CA3AF'} />
                    <Text style={[styles.emptyTitle, { color: D.text }]}>No Items Found</Text>
                    <Text style={[styles.emptySubtitle, { color: D.textSub }]}>
                      We couldn't find any dishes or restaurants matching "{searchQuery}". Try searching for biryani, pizza, or burger!
                    </Text>
                  </View>
                )}
              </Animated.ScrollView>
            )}

            {/* TAB 2: WISHLIST */}
            {activeTab === 'wishlist' && (
              <ScrollView
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                contentContainerStyle={[styles.tabContainer, { paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 24 : 24 }, favorites.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
              >
                <Text style={[styles.pageTitle, { color: D.heading }]}>Your Favorites ❤️</Text>
                {favorites.length === 0 ? (
                  <View style={styles.emptyStateCenter}>
                    <Heart size={52} color={darkMode ? '#475569' : '#D1D5DB'} />
                    <Text style={[styles.emptyTitle, { color: D.text }]}>No Favorites Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: D.textSub }]}>Tap the heart icon on any restaurant or dish to save it here.</Text>
                  </View>
                ) : (
                  <>
                    {restaurants.filter(r => favorites.includes(r.id)).length > 0 && (
                      <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, color: darkMode ? '#38BDF8' : '#0284C7' }]}>Favorite Restaurants</Text>
                        <View style={styles.gridContainer}>
                          {restaurants.filter(r => favorites.includes(r.id)).map(restaurant => (
                            <TouchableOpacity
                              key={restaurant.id}
                              style={[styles.gridCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                              onPress={() => setSelectedRestaurant(restaurant)}
                            >
                              <View style={{ position: 'relative' }}>
                                <Image source={{ uri: restaurant.image }} style={styles.gridCardImg} />
                                <TouchableOpacity
                                  style={[styles.favFloatingBtn, { top: 6, right: 6, width: 28, height: 28 }]}
                                  onPress={() => toggleFavorite(restaurant.id)}
                                >
                                  <Heart size={14} color="#FF5252" fill="#FF5252" />
                                </TouchableOpacity>
                              </View>
                              <View style={styles.gridCardBody}>
                                <Text style={[styles.gridCardTitle, { color: D.text }]} numberOfLines={1}>{restaurant.name}</Text>
                                <Text style={[styles.gridCardSub, { color: D.textSub }]} numberOfLines={1}>{restaurant.category}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {allDishes.filter(d => favorites.includes(`product-${d.id}`)).length > 0 && (
                      <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, color: darkMode ? '#38BDF8' : '#0284C7' }]}>Favorite Dishes</Text>
                        <View style={styles.gridContainer}>
                          {allDishes.filter(d => favorites.includes(`product-${d.id}`)).map(item => (
                            <TouchableOpacity
                              key={`fav-${item.id}`}
                              style={[styles.gridCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                              onPress={() => openProductDetails(item, item.restaurant)}
                            >
                              <View style={{ position: 'relative' }}>
                                <Image source={{ uri: item.image }} style={styles.gridCardImg} />
                                <TouchableOpacity
                                  style={[styles.favFloatingBtn, { top: 6, right: 6, width: 28, height: 28 }]}
                                  onPress={() => toggleFavorite(`product-${item.id}`)}
                                >
                                  <Heart size={14} color="#FF5252" fill="#FF5252" />
                                </TouchableOpacity>
                              </View>
                              <View style={styles.gridCardBody}>
                                <Text style={[styles.gridCardTitle, { color: D.text }]} numberOfLines={1}>{item.name}</Text>
                                <Text style={[styles.gridCardSub, { color: D.textSub }]} numberOfLines={1}>by {item.restaurant?.name}</Text>
                                <Text style={styles.gridCardPrice}>₹{item.price}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}

            {/* TAB 3: LIVE COMPACT MULTI-ORDER LIST */}
            {activeTab === 'orders' && (
              <View style={{ flex: 1, backgroundColor: D.bg }}>
                {/* Fixed Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 14 : 12,
                  paddingBottom: 8,
                  backgroundColor: D.bg
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => goBack()}
                      style={{ marginRight: 8, padding: 4 }}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={22} color={D.text} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: D.heading, marginBottom: 0 }]}>My Orders 🛵</Text>
                  </View>
                  {myOrdersList.length > 0 && (
                    <View style={[styles.liveBadge, { backgroundColor: '#FEF2F2', borderColor: '#FF5252', borderWidth: 1 }]}>
                      <Text style={[styles.liveBadgeText, { color: '#FF5252' }]}>{myOrdersList.length} Orders</Text>
                    </View>
                  )}
                </View>

                {/* Scrollable Order Items */}
                <ScrollView
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false })}
                  scrollEventThrottle={16}
                  contentContainerStyle={[
                    { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
                    myOrdersList.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                  ]}
                >
                  {myOrdersList.length === 0 ? (
                    <View style={styles.emptyStateCenter}>
                      <Truck size={52} color={darkMode ? '#475569' : '#D1D5DB'} />
                      <Text style={[styles.emptyTitle, { color: D.text }]}>No Orders Placed Yet</Text>
                      <Text style={[styles.emptySubtitle, { color: D.textSub }]}>Place an order from any restaurant to view compact order summary & live tracking here.</Text>
                    </View>
                  ) : (
                    myOrdersList.map((ord, orderIdx) => {
                      const firstItem = ord.items && ord.items[0];
                      const foodImg = firstItem ? firstItem.image : 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80';
                      const foodName = firstItem ? firstItem.name : 'Delicious Meal';
                      const extraCount = ord.items.length > 1 ? ` + ${ord.items.length - 1} more` : '';
                      const currentStep = mapStatusToStep(ord.orderStatus || 'placed');
                      const statusText = currentStep === 5 ? 'Delivered' : (currentStep === 4 ? 'On the Way' : (currentStep === 3 ? 'Preparing' : (currentStep === 2 ? 'Accepted' : (currentStep === -1 ? 'Cancelled' : 'Placed'))));
                      const statusBg = currentStep === 5 ? '#ECFDF5' : (currentStep === -1 ? '#FEF2F2' : '#FFF7ED');
                      const statusColor = currentStep === 5 ? '#059669' : (currentStep === -1 ? '#EF4444' : '#FF7A00');

                      return (
                        <View
                          key={ord.orderId}
                          style={[
                            styles.orderCompactRowCard,
                            { backgroundColor: D.card, borderColor: D.cardBorder, marginBottom: 12 }
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              if (!firstItem || !firstItem.itemId) return;
                              // Find the product item in the restaurants list
                              let foundProduct = null;
                              let foundRestaurant = null;
                              
                              for (const r of restaurants) {
                                if (r.menu) {
                                  const prod = r.menu.find(m => m.itemId === firstItem.itemId || m.id === firstItem.itemId);
                                  if (prod) {
                                    foundProduct = prod;
                                    foundRestaurant = r;
                                    break;
                                  }
                                }
                              }
                              
                              if (foundProduct) {
                                openProductDetails(foundProduct, foundRestaurant);
                              } else {
                                // Fallback: construct product details
                                const constructedProduct = {
                                  id: firstItem.itemId,
                                  itemId: firstItem.itemId,
                                  name: firstItem.name,
                                  price: firstItem.price,
                                  image: firstItem.image,
                                  description: 'Ordered item from your history',
                                  hotelId: ord.hotel?.id
                                };
                                openProductDetails(constructedProduct, ord.hotel);
                              }
                            }}
                          >
                            <Image source={{ uri: foodImg }} style={styles.orderCompactImg} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', marginLeft: 12, alignItems: 'center' }}
                            activeOpacity={0.7}
                            onPress={() => setSelectedOrderForDetail(ord)}
                          >
                            <View style={{ flex: 1, marginRight: 6 }}>
                              <Text style={[styles.orderCompactTitle, { color: D.text }]} numberOfLines={1}>{foodName}{extraCount}</Text>
                              <Text style={[styles.orderCompactSub, { color: D.textSub }]}>Order #{ord.orderId} • {ord.placedAt}</Text>
                              <Text style={styles.orderCompactPrice}>₹{ord.total} <Text style={{ fontSize: 11, fontWeight: '700', color: ((ord.paymentMethod || '').toUpperCase().includes('COD') || (ord.paymentMethod || '').toUpperCase().includes('CASH')) ? '#D97706' : '#10B981' }}>({ord.paymentMethod || 'ONLINE'})</Text></Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                              <View style={[styles.orderStatusBadgeSmall, { backgroundColor: statusBg, borderColor: statusColor, borderWidth: 1 }]}>
                                <Text style={[styles.orderStatusBadgeTextSmall, { color: statusColor }]}>{statusText}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF5252', marginRight: 2 }}>Details</Text>
                                <ChevronRight size={14} color="#FF5252" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}

            {/* TAB 4: PROFILE */}
            {activeTab === 'profile' && (
              <ScrollView
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: globalScrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                contentContainerStyle={[styles.tabContainer, { paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 24 : 24 }]}
              >
                {!isEditingProfile ? (
                  <View style={[styles.profileHeaderCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                    <View style={styles.profileAvatarWrapper}>
                      <Image
                        source={{ uri: currentUser.avatar || PRESET_AVATARS[0] }}
                        style={styles.profileAvatarImg}
                      />
                      <TouchableOpacity style={styles.cameraIconBtn} onPress={startEditingProfile}>
                        <Pencil size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.profileName, { color: D.text }]}>{currentUser.name}</Text>
                    <Text style={[styles.profileEmail, { color: D.textSub }]}>{currentUser.email}</Text>
                    <Text style={[styles.profilePhone, { color: D.textSub }]}>{currentUser.phone}</Text>

                    <TouchableOpacity style={styles.editProfileBtn} onPress={startEditingProfile}>
                      <Pencil size={14} color="#ffffff" />
                      <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.profileEditCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                    <Text style={[styles.customizerTitle, { color: D.text }]}>Edit Profile Information</Text>

                    <Text style={[styles.inputLabel, { color: D.textSub }]}>Select Profile Avatar</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
                      {PRESET_AVATARS.map((av, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setEditAvatar(av)}
                          style={[styles.avatarOptionCircle, editAvatar === av && styles.avatarOptionCircleSelected]}
                        >
                          <Image source={{ uri: av }} style={styles.avatarOptionImg} />
                          {editAvatar === av && (
                            <View style={styles.avatarCheckBadge}>
                              <Check size={10} color="#ffffff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={[styles.inputLabel, { color: D.textSub }]}>Full Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: D.inputBg, borderColor: D.inputBorder, color: D.text }]}
                      value={editName}
                      onChangeText={setEditName}
                    />

                    <Text style={[styles.inputLabel, { color: D.textSub }]}>Email Address</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: D.inputBg, borderColor: D.inputBorder, color: D.text }]}
                      keyboardType="email-address"
                      value={editEmail}
                      onChangeText={setEditEmail}
                    />

                    <Text style={[styles.inputLabel, { color: D.textSub }]}>Mobile Phone Number</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: D.inputBg, borderColor: D.inputBorder, color: D.text }]}
                      keyboardType="phone-pad"
                      value={editPhone}
                      onChangeText={setEditPhone}
                    />

                    <View style={{ flexDirection: 'row', marginTop: 14 }}>
                      <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0, marginRight: 8 }]} onPress={handleSaveProfile}>
                        <Text style={styles.primaryBtnText}>Save Profile</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.cancelProfileBtn, { backgroundColor: D.chipBg }]} onPress={() => setIsEditingProfile(false)}>
                        <Text style={[styles.cancelProfileBtnText, { color: D.text }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={[styles.menuSection, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                  <TouchableOpacity style={[styles.menuItem, { borderBottomColor: D.divider }]} onPress={() => setIsAddressModalOpen(true)}>
                    <MapPin size={18} color={darkMode ? '#94A3B8' : '#4B5563'} />
                    <Text style={[styles.menuItemText, { color: D.text }]}>Saved Addresses</Text>
                    <ChevronRight size={18} color={D.textSub} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.menuItem, { borderBottomColor: D.divider }]} onPress={() => setActiveTab('wishlist')}>
                    <Heart size={18} color={darkMode ? '#94A3B8' : '#4B5563'} />
                    <Text style={[styles.menuItemText, { color: D.text }]}>My Favorites</Text>
                    <ChevronRight size={18} color={D.textSub} />
                  </TouchableOpacity>

                  {currentUser.role === 'admin' && (
                    <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('admin')}>
                      <Award size={18} color="#FF5252" />
                      <Text style={[styles.menuItemText, { color: '#FF5252', fontWeight: '700' }]}>Admin Dashboard</Text>
                      <ChevronRight size={18} color="#FF5252" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                    <LogOut size={18} color="#EF4444" />
                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Log Out</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* TAB 5: ADMIN DASHBOARD */}
            {activeTab === 'admin' && (
              <ScrollView contentContainerStyle={styles.tabContainer}>
                <Text style={styles.pageTitle}>Admin Dashboard 🛡️</Text>
                <Text style={styles.pageSubtitle}>Manage Restaurant Listings & Menu Items</Text>

                {restaurants.map(rest => (
                  <View key={rest.id} style={styles.adminCard}>
                    <Text style={styles.adminRestName}>{rest.name}</Text>
                    <Text style={styles.adminRestCat}>{rest.category} • {rest.menu ? rest.menu.length : 0} Items</Text>
                  </View>
                ))}
              </ScrollView>
            )}

          </View>

          {/* Sticky Swiggy Green Floating Cart Bar (Appears on tabs where items are added) */}
          {(activeTab === 'home' || activeTab === 'wishlist') && renderFloatingCartBar(66)}

          {/* FEATURE 4: Bottom Navigation Bar with Explore Click Reset */}
          <Animated.View style={[styles.bottomNav, { backgroundColor: D.navBg, borderTopColor: D.navBorder, transform: [{ translateY: bottomBarTranslateY }] }]}>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleHeavyAction(handleExploreClick)}>
              <Home size={20} color={activeTab === 'home' ? '#FF5252' : (darkMode ? '#64748B' : '#9CA3AF')} />
              <Text style={[styles.navLabel, { color: darkMode ? '#64748B' : '#9CA3AF' }, activeTab === 'home' && styles.navLabelActive]}>Explore</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => handleHeavyAction(() => setActiveTab('wishlist'))}>
              <Heart size={20} color={activeTab === 'wishlist' ? '#FF5252' : (darkMode ? '#64748B' : '#9CA3AF')} />
              <Text style={[styles.navLabel, { color: darkMode ? '#64748B' : '#9CA3AF' }, activeTab === 'wishlist' && styles.navLabelActive]}>Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => handleHeavyAction(() => setActiveTab('orders'))}>
              <Truck size={20} color={activeTab === 'orders' ? '#FF5252' : (darkMode ? '#64748B' : '#9CA3AF')} />
              <Text style={[styles.navLabel, { color: darkMode ? '#64748B' : '#9CA3AF' }, activeTab === 'orders' && styles.navLabelActive]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => handleHeavyAction(() => setActiveTab('profile'))}>
              <User size={20} color={activeTab === 'profile' ? '#FF5252' : (darkMode ? '#64748B' : '#9CA3AF')} />
              <Text style={[styles.navLabel, { color: darkMode ? '#64748B' : '#9CA3AF' }, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* RESTAURANT DETAIL MODAL (FEATURE 1: STICKY TOP HEADER WITH CART ICON) */}
          <Modal
            key={selectedRestaurant ? `restaurant-modal-${selectedRestaurant.id}-${modalOpenCount}` : 'restaurant-modal-closed'}
            visible={!!selectedRestaurant}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setSelectedRestaurant(null)}
          >
            {selectedRestaurant && (
              <View key={selectedRestaurant.id} style={{ height, width, backgroundColor: D.modalBg }}>
                {renderToastBanner()}
                
                {/* ─── FIXED TOP HEADER ─── */}
                <View style={[styles.rdFixedHeader, { backgroundColor: D.headerBg, borderBottomColor: D.navBorder, height: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 56 : 64, paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0 }]}>
                  <TouchableOpacity onPress={() => setSelectedRestaurant(null)} style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}>
                    <ArrowLeft size={20} color={D.text} />
                  </TouchableOpacity>
                  
                  {/* Smooth animated fade-in hotel title */}
                  <Animated.View style={{ opacity: restTitleOpacity, transform: [{ translateY: restTitleTranslateY }], flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.rdHeaderTitleText, { color: D.text }]} numberOfLines={1}>
                      {selectedRestaurant.name}
                    </Text>
                  </Animated.View>

                  <TouchableOpacity 
                    onPress={() => setIsRestActionSheetOpen(true)}
                    style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}
                  >
                    <EllipsisVertical size={20} color={D.text} />
                  </TouchableOpacity>
                </View>

                {/* ─── SCROLLABLE CONTENT ─── */}
                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
                  onScroll={(event) => {
                    restScrollY.setValue(event.nativeEvent.contentOffset.y);
                  }}
                  scrollEventThrottle={16}
                  stickyHeaderIndices={[1]}
                  nestedScrollEnabled={true}
                >
                  {/* Restaurant Details Card */}
                  <View style={[styles.rdRestaurantCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        {selectedRestaurant.isTopRated && (
                          <View style={styles.rdTopLabelRow}>
                            <ShieldCheck size={14} color="#EF4444" />
                            <Text style={styles.rdTopLabelText}>Midnight Certified</Text>
                          </View>
                        )}
                        <Text style={[styles.rdRestaurantName, { color: D.text }]} numberOfLines={2}>
                          {selectedRestaurant.name}
                        </Text>
                        <Text style={[styles.rdRestaurantMeta, { color: D.textSub }]}>
                          {selectedRestaurant.deliveryTime || '20-30 min'} • {selectedRestaurant.address || 'Local Area'} ˅
                        </Text>
                        <Text style={[styles.rdRestaurantDesc, { color: D.textSub }]} numberOfLines={2}>
                          {selectedRestaurant.description}
                        </Text>
                      </View>

                      {/* Rating Badge Box */}
                      <View style={[styles.rdRatingBox, { borderColor: D.cardBorder }]}>
                        <View style={styles.rdRatingBadge}>
                          <Text style={styles.rdRatingBadgeText}>{selectedRestaurant.rating || '4.0'}</Text>
                          <Star size={11} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                        </View>
                        <Text style={[styles.rdRatingCountText, { color: D.textSub }]}>
                          {selectedRestaurant.reviewsCount || '100'}+ ratings
                        </Text>
                      </View>
                    </View>

                    {/* Offers Section */}
                    {(() => {
                      if (loadingRestaurantOffers) {
                        return (
                          <View style={{ marginTop: 12, paddingVertical: 8, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#EA580C" />
                          </View>
                        );
                      }

                      const offers = [];
                      if (restaurantOffers && restaurantOffers.length > 0) {
                        restaurantOffers.forEach((o) => {
                          let title = '';
                          if (o.discountType === 'percentage') {
                            title = `${o.discountValue}% OFF up to Rs. ${o.maxDiscount || 100}`;
                          } else if (o.discountType === 'flat') {
                            title = `Rs. ${o.discountValue} OFF`;
                          } else if (o.discountType === 'free_delivery') {
                            title = `FREE DELIVERY`;
                          } else {
                            title = `OFFER`;
                          }

                          offers.push({
                            title: title,
                            subtitle: `USE ${o.code}`,
                            iconType: 'tag'
                          });
                        });
                      }

                      if (offers.length === 0) return null;

                      return (
                        <View style={{ marginTop: 12 }}>
                          <View style={{ height: 1, backgroundColor: D.divider, marginBottom: 12 }} />
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} nestedScrollEnabled={true}>
                            {offers.map((off, idx) => (
                              <View
                                key={`offer-${idx}`}
                                style={[styles.rdOfferCard, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}
                              >
                                <Tag size={12} color="#FF5252" style={{ marginRight: 6 }} />
                                <View>
                                  <Text style={[styles.rdOfferTitle, { color: D.text }]} numberOfLines={1}>
                                    {off.title}
                                  </Text>
                                  <Text style={[styles.rdOfferSubtitle, { color: D.textSub }]} numberOfLines={1}>
                                    {off.subtitle}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Normal Scroll Flow Search + Filters Section */}
                  <View style={{ backgroundColor: D.card }}>
                    {renderSearchAndFilters()}
                  </View>

                  {/* Recommended Headers Specials Section */}
                  <View style={[styles.rdMenuHeadingRow, { borderBottomColor: D.divider }]}>
                    <Text style={[styles.rdMenuHeadingText, { color: D.text }]}>
                      Recommended ({filteredRestMenu.length})
                    </Text>
                    <TouchableOpacity onPress={() => setRecommendedCollapsed(!recommendedCollapsed)}>
                      {recommendedCollapsed ? (
                        <ChevronDown size={20} color={D.text} />
                      ) : (
                        <ChevronUp size={20} color={D.text} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Two-Column Food Card Grid */}
                  {!recommendedCollapsed && (
                    <View style={styles.rdFoodGrid}>
                      {filteredRestMenu.map(item => {
                        const inCart = cartItems.some(c => c.id === item.id || c.itemId === item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.rdFoodCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                            activeOpacity={0.9}
                            onPress={() => openProductDetails(item, selectedRestaurant)}
                          >
                            {/* Card Image Area */}
                            <View style={styles.rdFoodImageContainer}>
                              <Image source={{ uri: item.image }} style={styles.rdFoodImage} />
                              
                              {/* Favorite Heart Icon */}
                              <TouchableOpacity
                                style={styles.rdFoodFavBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(`product-${item.id}`);
                                }}
                              >
                                <Heart
                                  size={13}
                                  color={favorites.includes(`product-${item.id}`) ? '#FF5252' : '#ffffff'}
                                  fill={favorites.includes(`product-${item.id}`) ? '#FF5252' : 'transparent'}
                                />
                              </TouchableOpacity>

                              {/* Veg / Non-veg label tag */}
                              {item.isVeg !== undefined && (
                                <View style={[styles.rdVegBadge, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                                  <Text style={styles.rdVegBadgeText}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
                                </View>
                              )}

                              {/* Bestseller badge if applicable */}
                              {item.isPopular && (
                                <View style={styles.rdBestsellerBadge}>
                                  <Star size={8} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                                  <Text style={styles.rdBestsellerText}>Bestseller</Text>
                                </View>
                              )}
                            </View>

                            {/* Card Content Area */}
                            <View style={styles.rdFoodCardBody}>
                              <Text style={[styles.rdFoodName, { color: D.text }]} numberOfLines={2}>
                                {item.name}
                              </Text>

                              <View style={styles.rdFoodMetaRow}>
                                {item.averageRating > 0 ? (
                                  <>
                                    <Star size={10} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 2 }} />
                                    <Text style={[styles.rdFoodMetaText, { color: D.textSub }]}>{Number(item.averageRating).toFixed(1)}</Text>
                                  </>
                                ) : (
                                  <Text style={[styles.rdFoodMetaText, { color: D.textSub }]}>New</Text>
                                )}
                              </View>

                              {/* Price + Add Button Row */}
                              <View style={styles.rdFoodFooterRow}>
                                <Text style={[styles.rdFoodPrice, { color: D.text }]}>₹{item.price}</Text>
                                <TouchableOpacity
                                  style={[styles.rdAddBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    openCustomizer(item, selectedRestaurant);
                                  }}
                                >
                                  <Text style={[styles.rdAddBtnText, inCart && { color: '#ffffff' }]}>
                                    {inCart ? 'ADDED' : 'ADD'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Floating View Cart bar */}
                {renderFloatingCartBar(Math.max(12, bottomInset) + 12, true)}
              </View>
            )}
          </Modal>

          {/* Restaurant Actions Bottom Sheet */}
          <Modal
            visible={isRestActionSheetOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsRestActionSheetOpen(false)}
          >
            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
              activeOpacity={1}
              onPress={() => setIsRestActionSheetOpen(false)}
            >
              <View style={{ backgroundColor: D.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(24, bottomInset) }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 16, textAlign: 'center' }}>
                  {selectedRestaurant?.name || 'Restaurant Actions'}
                </Text>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.divider }}
                  onPress={() => {
                    setIsRestActionSheetOpen(false);
                    if (selectedRestaurant) {
                      toggleFavorite(selectedRestaurant.id);
                    }
                  }}
                >
                  <Heart 
                    size={20} 
                    color={selectedRestaurant && favorites.includes(selectedRestaurant.id) ? '#FF5252' : D.text} 
                    fill={selectedRestaurant && favorites.includes(selectedRestaurant.id) ? '#FF5252' : 'transparent'} 
                  />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: D.text, marginLeft: 12 }}>
                    {selectedRestaurant && favorites.includes(selectedRestaurant.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.divider }}
                  onPress={async () => {
                    setIsRestActionSheetOpen(false);
                    if (selectedRestaurant) {
                      try {
                        await Share.share({
                          title: selectedRestaurant.name,
                          message: `Check out ${selectedRestaurant.name} on QuickBite!\nCuisines: ${selectedRestaurant.cuisines || 'Multi'}\nAddress: ${selectedRestaurant.address || 'Kerala'}\nRating: ${selectedRestaurant.rating || '4.0'} ★`
                        });
                      } catch (err) {
                        console.warn(err);
                      }
                    }
                  }}
                >
                  <Share2 size={20} color={D.text} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: D.text, marginLeft: 12 }}>
                    Share Restaurant
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
                  onPress={() => {
                    setIsRestActionSheetOpen(false);
                    setTimeout(() => setIsRestDetailsModalOpen(true), 200);
                  }}
                >
                  <Info size={20} color={D.text} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: D.text, marginLeft: 12 }}>
                    Restaurant Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ marginTop: 12, backgroundColor: D.chipBg, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  onPress={() => setIsRestActionSheetOpen(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '750', color: D.text }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Restaurant Details Modal */}
          <Modal
            key={isRestDetailsModalOpen ? `info-modal-${selectedRestaurant?.id}-${modalOpenCount}` : 'info-modal-closed'}
            visible={isRestDetailsModalOpen}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setIsRestDetailsModalOpen(false)}
          >
            {selectedRestaurant && (() => {
              const data = detailedRestaurant || selectedRestaurant || {};
              
              const resolveImageUrl = (imgStr) => {
                if (!imgStr) return null;
                if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
                  if (imgStr.includes('localhost:') || imgStr.includes('127.0.0.1:')) {
                    return imgStr.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/g, resolvedBackendUrl);
                  }
                  return imgStr;
                }
                return `${resolvedBackendUrl}/uploads/hotels/${imgStr}`;
              };

              const resolvedCover = resolveImageUrl(data.image) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500';
              const resolvedLogo = resolveImageUrl(data.logo) || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100';

              const addressParts = [];
              if (data.address && data.address.trim()) addressParts.push(data.address.trim());
              if (data.landmark && data.landmark.trim()) addressParts.push(data.landmark.trim());
              if (data.city && data.city.trim()) addressParts.push(data.city.trim());
              if (data.district && data.district.trim()) addressParts.push(data.district.trim());
              if (data.state && data.state.trim()) addressParts.push(data.state.trim());
              
              let fullLocationStr = addressParts.join(', ');
              if (data.pincode && data.pincode.trim()) {
                fullLocationStr += ` - ${data.pincode.trim()}`;
              }
              if (!fullLocationStr) {
                fullLocationStr = data.address || 'N/A';
              }

              let gallery = [];
              if (data.gallery) {
                try {
                  gallery = typeof data.gallery === 'string' ? JSON.parse(data.gallery) : data.gallery;
                } catch (e) {
                  console.warn(e);
                }
              }
              const resolvedGallery = (gallery || []).map(img => resolveImageUrl(img)).filter(Boolean);

              const getTodayOpenStatus = () => {
                if (!data.operatingHours) return true;
                try {
                  const parsed = typeof data.operatingHours === 'string' ? JSON.parse(data.operatingHours) : data.operatingHours;
                  if (!Array.isArray(parsed) || parsed.length === 0) return true;
                  
                  const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const todayName = daysList[new Date().getDay()];
                  
                  const todaySchedule = parsed.find(d => d.day && d.day.toLowerCase() === todayName.toLowerCase());
                  if (todaySchedule) {
                    if (!todaySchedule.isOpen) return false;
                    
                    const now = new Date();
                    const currentMins = now.getHours() * 60 + now.getMinutes();
                    
                    const parseTimeToMins = (timeStr) => {
                      if (!timeStr) return 0;
                      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                      if (!match) return 0;
                      let hrs = parseInt(match[1], 10);
                      const mins = parseInt(match[2], 10);
                      const ampm = match[3];
                      if (ampm) {
                        if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
                        if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
                      }
                      return hrs * 60 + mins;
                    };
                    
                    const openMins = parseTimeToMins(todaySchedule.openTime || todaySchedule.open);
                    const closeMins = parseTimeToMins(todaySchedule.closeTime || todaySchedule.close);
                    
                    if (openMins === 0 && closeMins === 0) return true;
                    
                    if (closeMins < openMins) {
                      return currentMins >= openMins || currentMins <= closeMins;
                    }
                    return currentMins >= openMins && currentMins <= closeMins;
                  }
                } catch (e) {
                  console.warn(e);
                }
                return true;
              };

              const isOpenNow = getTodayOpenStatus();

              const handleViewOnMap = () => {
                const query = encodeURIComponent(`${data.name}, ${fullLocationStr}`);
                const url = Platform.select({
                  ios: `maps://?q=${query}`,
                  android: `geo:0,0?q=${query}`
                });
                Linking.openURL(url).catch(() => {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                });
              };

              return (
                <View key={data.id} style={{ height, width, backgroundColor: D.modalBg }}>
                  {/* Header */}
                  <View style={[styles.rdFixedHeader, { backgroundColor: D.headerBg, borderBottomColor: D.navBorder, height: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 56 : 64, paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0 }]}>
                    <TouchableOpacity onPress={() => setIsRestDetailsModalOpen(false)} style={{ padding: 8 }}>
                      <ArrowLeft size={22} color={D.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[styles.rdHeaderTitleText, { color: D.text, fontSize: 16, fontWeight: '800' }]} numberOfLines={1}>
                        Restaurant Details
                      </Text>
                    </View>
                    <TouchableOpacity style={{ padding: 8 }}>
                      <EllipsisVertical size={20} color={D.text} />
                    </TouchableOpacity>
                  </View>

                  {loadingDetails && !detailedRestaurant ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.modalBg }}>
                      <ActivityIndicator size="large" color="#FF5252" />
                      <Text style={{ color: D.textSub, marginTop: 10, fontSize: 13 }}>Fetching restaurant details...</Text>
                    </View>
                  ) : (
                    <ScrollView 
                      style={{ flex: 1 }}
                      contentContainerStyle={{ padding: 16, paddingBottom: Math.max(32, bottomInset) + 40, flexGrow: 1 }}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {/* Hero Restaurant Card */}
                      <View style={{ backgroundColor: D.card, borderRadius: 20, borderWidth: 1, borderColor: D.cardBorder, overflow: 'hidden', marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                        <ImageBackground 
                          source={{ uri: resolvedCover }} 
                          style={{ height: 210, justifyContent: 'flex-end', padding: 16 }}
                          resizeMode="cover"
                        >
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{data.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                <MapPin size={12} color="#cbd5e1" />
                                <Text style={{ fontSize: 12, color: '#cbd5e1' }} numberOfLines={1}>
                                  {data.landmark || data.address || 'Local Address'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 12, fontStyle: 'italic', fontWeight: '500' }}>
                            {`"${data.description || 'Friendly and affordable restaurant'}"`}
                          </Text>

                          {/* Chips Row */}
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '750', color: '#fff' }}>Restaurant</Text>
                            </View>
                            {data.restaurantType && (
                              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '750', color: '#fff' }}>
                                  {data.restaurantType === 'veg' ? 'Pure Veg' : (data.restaurantType === 'both' ? 'Veg & Non-Veg' : 'Non-Veg')}
                                </Text>
                              </View>
                            )}
                            <View style={{ backgroundColor: isOpenNow ? '#10B981' : '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Check size={10} color="#fff" />
                              <Text style={{ fontSize: 11, fontWeight: '750', color: '#fff' }}>
                                {isOpenNow ? 'Open Now' : 'Closed'}
                              </Text>
                            </View>
                          </View>
                        </ImageBackground>
                      </View>

                      {/* Restaurant Gallery Section */}
                      {resolvedGallery.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                          <Text style={{ fontSize: 15, fontWeight: '850', color: D.text, marginBottom: 12 }}>Gallery</Text>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={{ gap: 10 }}
                            nestedScrollEnabled={true}
                          >
                            {resolvedGallery.slice(0, 3).map((imgUrl, idx) => {
                              const isLastVisible = idx === 2 && resolvedGallery.length > 3;
                              const remainingCount = resolvedGallery.length - 3;
                              return (
                                <TouchableOpacity 
                                  key={idx} 
                                  onPress={() => setViewerImageIndex(idx)}
                                  style={{ width: 110, height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: D.bg }}
                                >
                                  <Image 
                                    source={{ uri: imgUrl }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    resizeMode="cover"
                                  />
                                  {isLastVisible && (
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{`+${remainingCount}`}</Text>
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '750', marginTop: 2 }}>View All</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      {/* Quick Information Cards */}
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        <View style={{ flex: 1, backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                          <Clock size={18} color="#FF7A00" />
                          <Text style={{ fontSize: 10, color: D.textSub, marginTop: 4, fontWeight: '600' }}>Preparation</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: D.text, marginTop: 2 }}>{`${data.averagePreparationTime || '30'} mins`}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                          <ShoppingBag size={18} color="#FF7A00" />
                          <Text style={{ fontSize: 10, color: D.textSub, marginTop: 4, fontWeight: '600' }}>Min Order</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: D.text, marginTop: 2 }}>{`₹${data.minimumOrderAmount || '0'}`}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                          <Truck size={18} color="#FF7A00" />
                          <Text style={{ fontSize: 10, color: D.textSub, marginTop: 4, fontWeight: '600' }}>Delivery Radius</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: D.text, marginTop: 2 }}>{`${data.deliveryRadiusKm || '10'} km`}</Text>
                        </View>
                      </View>

                      {/* Contact & Location Details */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 15, fontWeight: '850', color: D.text, marginBottom: 12 }}>Contact & Location</Text>
                        <View style={{ backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                          {data.ownerName && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <User size={18} color="#FF7A00" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: D.textSub, fontWeight: '500' }}>Owner</Text>
                                <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2 }}>{data.ownerName}</Text>
                              </View>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                              <Phone size={18} color="#FF7A00" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: D.textSub, fontWeight: '500' }}>Phone</Text>
                              <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2 }}>{data.phoneNumber || 'N/A'}</Text>
                            </View>
                            {data.phoneNumber && (
                              <TouchableOpacity 
                                onPress={() => Linking.openURL(`tel:${data.phoneNumber}`)}
                                style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#FFE0CC', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Phone size={16} color="#FF7A00" />
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                              <Mail size={18} color="#FF7A00" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: D.textSub, fontWeight: '500' }}>Email</Text>
                              <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2 }} numberOfLines={1}>{data.email || 'N/A'}</Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                              <MapPin size={18} color="#FF7A00" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: D.textSub, fontWeight: '500' }}>Address</Text>
                              <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2, lineHeight: 18 }}>{fullLocationStr}</Text>
                            </View>
                          </View>

                          <TouchableOpacity 
                            onPress={handleViewOnMap}
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              borderWidth: 1, 
                              borderColor: '#FF7A00', 
                              borderRadius: 12, 
                              paddingVertical: 12, 
                              marginTop: 8,
                              gap: 6
                            }}
                          >
                            <MapPin size={16} color="#FF7A00" />
                            <Text style={{ fontSize: 13, fontWeight: '750', color: '#FF7A00' }}>View on Map</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Merchant Information */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 15, fontWeight: '850', color: D.text, marginBottom: 12 }}>Merchant Information</Text>
                        <View style={{ backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, color: D.textSub }}>Legal Name</Text>
                            <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2 }}>{data.legalName || data.name}</Text>
                          </View>

                          <View style={{ height: 1, backgroundColor: D.divider, marginVertical: 10 }} />

                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, color: D.textSub }}>FSSAI License Number</Text>
                            <Text style={{ fontSize: 13, fontWeight: '750', color: D.text, marginTop: 2 }}>{data.fssaiNumber || 'Applied/Awaiting'}</Text>
                          </View>

                          <View style={{ height: 1, backgroundColor: D.divider, marginVertical: 10 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: D.textSub }}>FSSAI Status</Text>
                            {data.fssaiNumber ? (
                              <View style={{ backgroundColor: '#E6F7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>Verified</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B' }}>Applied/Awaiting</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Weekly Operating Hours Card */}
                      {(() => {
                        let operatingHours = [];
                        let isJson = false;
                        
                        if (data.operatingHours) {
                          try {
                            const parsed = JSON.parse(data.operatingHours);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              operatingHours = parsed;
                              isJson = true;
                            }
                          } catch (e) {
                            // Plain string fallback
                          }
                        }

                        // If empty, use default standard hours
                        if (!data.operatingHours) {
                          operatingHours = [
                            { day: 'Monday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Tuesday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Wednesday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Thursday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Friday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Saturday', isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
                            { day: 'Sunday', isOpen: true, openTime: '09:00 AM', closeTime: '10:00 PM' },
                          ];
                          isJson = true;
                        }

                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const todayName = days[new Date().getDay()];

                        return (
                          <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text style={{ fontSize: 15, fontWeight: '850', color: D.text }}>Weekly Operating Hours</Text>
                              {isOpenNow ? (
                                <View style={{ backgroundColor: '#E6F7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>Open Now</Text>
                                </View>
                              ) : (
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>Closed</Text>
                                </View>
                              )}
                            </View>

                            <View style={{ backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 }}>
                              {isJson ? (
                                operatingHours.map((hour, idx) => {
                                  const isToday = hour.day.toLowerCase() === todayName.toLowerCase();
                                  const dayText = isToday ? `${hour.day} (Today)` : hour.day;
                                  return (
                                    <View 
                                      key={idx} 
                                      style={{ 
                                        flexDirection: 'row', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        paddingVertical: isToday ? 8 : 6,
                                        paddingHorizontal: isToday ? 10 : 0,
                                        backgroundColor: isToday ? '#FFF0E6' : 'transparent',
                                        borderRadius: isToday ? 8 : 0,
                                        marginVertical: 2
                                      }}
                                    >
                                      <Text style={{ fontSize: 13, color: isToday ? '#FF7A00' : D.text, fontWeight: isToday ? '750' : '600' }}>{dayText}</Text>
                                      <Text style={{ fontSize: 13, color: hour.isOpen ? (isToday ? '#FF7A00' : D.text) : '#EF4444', fontWeight: isToday ? '750' : '700' }}>
                                        {hour.isOpen ? `${hour.openTime} - ${hour.closeTime}` : 'Closed'}
                                      </Text>
                                    </View>
                                  );
                                })
                              ) : (
                                <Text style={{ fontSize: 13, color: D.text, fontWeight: '600' }}>
                                  {data.operatingHours}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                    </ScrollView>
                  )}
                </View>
              );
            })()}
          </Modal>

          {/* Full Screen Image Viewer Modal */}
          <Modal
            visible={viewerImageIndex !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setViewerImageIndex(null)}
          >
            {viewerImageIndex !== null && (() => {
              const data = detailedRestaurant || selectedRestaurant || {};
              
              const resolveImageUrl = (imgStr) => {
                if (!imgStr) return null;
                if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
                  if (imgStr.includes('localhost:') || imgStr.includes('127.0.0.1:')) {
                    return imgStr.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/g, resolvedBackendUrl);
                  }
                  return imgStr;
                }
                return `${resolvedBackendUrl}/uploads/hotels/${imgStr}`;
              };

              let gallery = [];
              if (data.gallery) {
                try {
                  gallery = typeof data.gallery === 'string' ? JSON.parse(data.gallery) : data.gallery;
                } catch (e) {}
              }
              const resolvedGallery = (gallery || []).map(img => resolveImageUrl(img)).filter(Boolean);

              return (
                <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center' }}>
                  <StatusBar barStyle="light-content" backgroundColor="#000000" />
                  
                  {/* Header Row */}
                  <View style={{ position: 'absolute', top: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 40, left: 0, right: 0, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 100 }}>
                    <TouchableOpacity 
                      onPress={() => setViewerImageIndex(null)}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={20} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '750', color: '#ffffff' }}>
                      {`${viewerImageIndex + 1} / ${resolvedGallery.length}`}
                    </Text>
                    <View style={{ width: 36 }} />
                  </View>

                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: viewerImageIndex * Dimensions.get('window').width, y: 0 }}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                      setViewerImageIndex(idx);
                    }}
                    style={{ flex: 1 }}
                  >
                    {resolvedGallery.map((imgUrl, idx) => (
                      <View key={idx} style={{ width: Dimensions.get('window').width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Image
                          source={{ uri: imgUrl }}
                          style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </Modal>

          {/* FOOD PRODUCT DETAILS MODAL (FEATURE 1: STICKY TOP CART ICON) */}
          <Modal visible={!!viewingProduct} animationType="slide" statusBarTranslucent onRequestClose={() => setViewingProduct(null)}>
            {viewingProduct && (() => {
              const displayReviewDate = (rev) => {
                if (rev.createdAt) {
                  return getTimeAgo(new Date(rev.createdAt).getTime());
                }
                return typeof rev.date === 'string' ? rev.date : getTimeAgo(rev.date || Date.now());
              };

              const currentProduct = detailedFoodItem || viewingProduct;
              const nameLower = (currentProduct.name || '').toLowerCase();
              const isCustomizable = (currentProduct.customizationGroups && currentProduct.customizationGroups.length > 0) || nameLower.includes('mandi') || nameLower.includes('biriyani') || nameLower.includes('biryani');

              return (
                <View style={{ height, width, backgroundColor: D.modalBg, paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0 }}>
                  {renderToastBanner()}
                  
                  {/* ─── FIXED TOP HEADER ─── */}
                  <View style={[styles.modalHeader, { backgroundColor: D.headerBg, borderBottomColor: D.navBorder }]}>
                    <TouchableOpacity onPress={() => setViewingProduct(null)} style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}>
                      <ArrowLeft size={20} color={D.text} />
                    </TouchableOpacity>
                    
                    <Text style={[styles.modalHeaderTitle, { color: D.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                      {currentProduct.name}
                    </Text>

                    {/* Top Right Cart Icon with Dynamic Count Badge */}
                    <TouchableOpacity
                      style={[styles.cartIconBtnModal, { backgroundColor: D.chipBg }]}
                      onPress={() => setIsCartOpen(true)}
                    >
                      <ShoppingBag size={20} color={D.text} />
                      {cartItems.length > 0 && (
                        <Animated.View style={[styles.cartBadge, { transform: [{ scale: cartAnim }] }]}>
                          <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* ─── SCROLLABLE CONTENT ─── */}
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                    
                    {/* Food Image Carousel Card */}
                    {(() => {
                      const rawImages = (currentProduct.images && currentProduct.images.length > 0)
                        ? currentProduct.images.filter(img => typeof img === 'string' && img.trim().length > 0)
                        : (currentProduct.image ? [currentProduct.image] : []);
                      const images = rawImages.length > 0
                        ? rawImages.map(img => resolveProductImage(img, resolvedBackendUrl))
                        : ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'];
                      
                      return (
                        <View style={[styles.rdFoodDetailsImageWrapper, { backgroundColor: D.card }]}>
                          <FlatList
                            data={images}
                            horizontal
                            pagingEnabled
                            scrollEnabled={true}
                            nestedScrollEnabled={true}
                            snapToInterval={width - 32}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item, index) => index.toString()}
                            style={{ width: width - 32, height: 220, padding: 0, margin: 0 }}
                            contentContainerStyle={{ height: 220, padding: 0, margin: 0 }}
                            onMomentumScrollEnd={(e) => {
                              const index = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                              setActiveImageIndex(index);
                            }}
                            renderItem={({ item }) => (
                              <Image source={{ uri: item }} style={[styles.rdFoodDetailsHeroImg, { padding: 0, margin: 0 }]} />
                            )}
                          />

                          {/* Veg/Non-Veg badge on top-left of image card */}
                          <View style={[
                            styles.rdCardVegBadge, 
                            { 
                              position: 'absolute',
                              top: 12, 
                              left: 12, 
                              backgroundColor: '#FFFFFF', 
                              borderRadius: 14, 
                              paddingHorizontal: 10, 
                              paddingVertical: 5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              elevation: 2,
                              shadowColor: '#000',
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              shadowOffset: { width: 0, height: 1 },
                              zIndex: 10
                            }
                          ]}>
                            <Text style={{ 
                              fontSize: 11, 
                              fontWeight: '700', 
                              color: currentProduct.isVeg ? '#10B981' : '#EF4444' 
                            }}>
                              {currentProduct.isVeg ? '🌱 Pure Veg' : '🍖 Non-Veg'}
                            </Text>
                          </View>

                          {/* Favorite button on top-right of image card */}
                          <TouchableOpacity
                            style={styles.rdFoodDetailsFavBtn}
                            onPress={() => toggleFavorite(`product-${currentProduct.id}`)}
                          >
                            <Heart
                              size={18}
                              color={favorites.includes(`product-${currentProduct.id}`) ? '#FF5252' : '#ffffff'}
                              fill={favorites.includes(`product-${currentProduct.id}`) ? '#FF5252' : 'transparent'}
                            />
                          </TouchableOpacity>

                          {/* Carousel Pagination Dots (Only if multiple images exist) */}
                          {images.length > 1 && (
                            <View style={styles.rdCarouselDotsContainer}>
                              <View style={{
                                flexDirection: 'row',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                alignItems: 'center'
                              }}>
                                {images.map((_, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.rdCarouselDot,
                                      activeImageIndex === idx && styles.rdCarouselDotActive
                                    ]}
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    <View style={styles.productBody}>
                      {/* Food Title */}
                      <Text style={[styles.productTitle, { color: D.text }]}>{currentProduct.name}</Text>
                      
                      {/* Price and Rating Row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={[styles.productPriceText, { color: D.accent }]}>₹{currentProduct.price}</Text>
                        <View style={[styles.itemRatingChip, { marginLeft: 12 }]}>
                          <Star size={12} color="#B45309" fill="#B45309" />
                          <Text style={styles.itemRatingText}>{calculateAverageRating(currentProduct)} / 5.0</Text>
                        </View>
                      </View>

                      {/* Restaurant Name */}
                      {productRestaurant && (
                        <Text style={[styles.productRestName, { color: D.textSub, marginTop: 6 }]}>by {productRestaurant.name}</Text>
                      )}

                      <Text style={[styles.productDescText, { color: D.textSub, marginTop: 10 }]}>{currentProduct.description}</Text>

                      <View style={[styles.divider, { backgroundColor: D.divider }]} />

                      {/* Ingredients Section (hidden if empty) */}
                      {(() => {
                        const ingredients = getDishIngredients(currentProduct);
                        if (!ingredients || ingredients.length === 0) return null;
                        
                        return (
                          <View>
                            <Text style={[styles.detailSectionHeading, { color: D.text }]}>🌿 Ingredients & Recipe Components</Text>
                            <View style={styles.ingredientsGrid}>
                              {ingredients.map((ing, idx) => (
                                <View key={idx} style={[styles.ingredientChip, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}>
                                  <Check size={12} color="#10B981" />
                                  <Text style={[styles.ingredientChipText, { color: D.text }]}>{ing}</Text>
                                </View>
                              ))}
                            </View>
                            <View style={[styles.divider, { backgroundColor: D.divider }]} />
                          </View>
                        );
                      })()}

                      {/* Customer Reviews Header */}
                      <View style={styles.reviewsHeaderRow}>
                        <Text style={[styles.detailSectionHeading, { color: D.text }]}>⭐ Customer Reviews & Ratings</Text>
                        <View style={styles.ratingBadgeLarge}>
                          <Star size={14} color="#ffffff" fill="#ffffff" />
                          <Text style={styles.ratingBadgeLargeText}>{calculateAverageRating(currentProduct)} / 5.0</Text>
                        </View>
                      </View>

                      {/* Rate & Write a Review Card */}
                      <View style={[styles.addReviewCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                        <Text style={[styles.addReviewTitle, { color: D.text }]}>Rate & Write a Review</Text>

                        <View style={styles.starSelectionRow}>
                          {[1, 2, 3, 4, 5].map(starNum => (
                            <TouchableOpacity
                              key={starNum}
                              onPress={() => setUserRatingScore(starNum)}
                              style={{ paddingRight: 8 }}
                            >
                              <Star
                                size={24}
                                color={starNum <= userRatingScore ? '#F59E0B' : (darkMode ? '#475569' : '#D1D5DB')}
                                fill={starNum <= userRatingScore ? '#F59E0B' : 'transparent'}
                              />
                            </TouchableOpacity>
                          ))}
                          <Text style={[styles.starScoreText, { color: D.textSub }]}>{userRatingScore} / 5 Stars</Text>
                        </View>

                        <TextInput
                          style={[styles.reviewTextInput, { backgroundColor: D.inputBg, borderColor: D.inputBorder, color: D.text }]}
                          placeholder="Share your feedback on taste, freshness & portion size..."
                          placeholderTextColor={darkMode ? '#64748B' : '#9CA3AF'}
                          multiline
                          numberOfLines={3}
                          value={userReviewComment}
                          onChangeText={setUserReviewComment}
                        />

                        <TouchableOpacity
                          style={styles.submitReviewBtn}
                          onPress={() => handleAddDishReview(currentProduct.id)}
                        >
                          <Text style={styles.submitReviewBtnText}>Post Rating & Review</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Review List */}
                      {(() => {
                        const reviews = getDishReviews(currentProduct);
                        if (reviews.length === 0) {
                          return (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                              <Text style={{ color: D.textSub, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                                No reviews yet. Add the first review on this product.
                              </Text>
                            </View>
                          );
                        }
                        
                        return (
                          <View>
                            <Text style={[styles.detailSectionHeading, { color: D.text, marginTop: 16 }]}>
                              Customer Reviews ({reviews.length})
                            </Text>

                            {reviews.map(rev => {
                              const authorName = rev.user?.name || rev.name || 'QuickBite Foodie';
                              const authorAvatar = rev.user?.avatar || rev.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                              const commentText = rev.review || rev.comment;
                              
                              return (
                                <View key={rev.id} style={[styles.reviewCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                                  <View style={styles.reviewHeaderRow}>
                                    <Image source={{ uri: authorAvatar }} style={styles.reviewAvatar} />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                      <Text style={[styles.reviewAuthor, { color: D.text }]}>{authorName}</Text>
                                      <Text style={[styles.reviewDate, { color: D.textSub }]}>{displayReviewDate(rev)}</Text>
                                    </View>
                                    <View style={styles.starsRow}>
                                      {[...Array(rev.rating)].map((_, i) => (
                                        <Star key={i} size={12} color="#F59E0B" fill="#F59E0B" />
                                      ))}
                                    </View>
                                  </View>
                                  <Text style={[styles.reviewComment, { color: D.textSub }]}>{commentText}</Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })()}
                    </View>
                  </ScrollView>

                  {/* Bottom Add to Cart Button */}
                  <View style={[styles.rdFoodDetailsBottomBar, { backgroundColor: D.headerBg, borderTopColor: D.navBorder, paddingBottom: Math.max(12, bottomInset) }]}>
                    <TouchableOpacity
                      style={styles.rdFoodDetailsBottomBarBtn}
                      onPress={() => openCustomizer(currentProduct, productRestaurant)}
                    >
                      <Text style={styles.rdFoodDetailsBottomBarBtnText}>
                        {isCustomizable ? 'Customize & Add to Cart' : 'Add to Cart'} · ₹{currentProduct.price}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </Modal>

          {/* REPLACE CART CONFIRMATION MODAL */}
          <Modal
            visible={showReplaceCartModal}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleCancelReplace}
          >
            <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 }]}>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 320,
                alignItems: 'center',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8
              }}>
                {/* Red Shopping Bag Icon in Light Pink Circle */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FEE2E2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <ShoppingBag size={24} color="#EF4444" />
                </View>

                {/* Title */}
                <Text style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: '#111827',
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  Replace cart?
                </Text>

                {/* Subtitle */}
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginBottom: 24,
                  lineHeight: 20
                }}>
                  Your cart contains items from another restaurant. Adding this item will clear your existing cart.
                </Text>

                {/* Action Buttons Row */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 14,
                      paddingVertical: 12,
                      marginRight: 10,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={handleCancelReplace}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '750',
                      color: '#4B5563'
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  {/* Clear Cart & Add Button */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#EF4444',
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={handleClearCartAndAdd}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#FFFFFF'
                    }}>
                      Clear Cart & Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ITEM CUSTOMIZER MODAL */}
          <Modal visible={!!customizingItem} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCustomizingItem(null)}>
            <View style={[styles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0 }]}>
              <View style={[styles.customizerCard, { backgroundColor: D.card, borderColor: D.cardBorder, paddingBottom: 60, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.customizerTitle, { color: D.heading }]}>{customizingItem?.name}</Text>
                  <TouchableOpacity onPress={() => setCustomizingItem(null)}>
                    <X size={20} color={D.textSub} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.customizerSub}>₹{getBasePrice(customizingItem, itemSpice)}</Text>

                {/* Spice Level / Portion Size */}
                <Text style={[styles.customSectionTitle, { color: D.heading }]}>
                  {customizingItem?.name?.toLowerCase().includes('biriyani') || customizingItem?.name?.toLowerCase().includes('biryani') || customizingItem?.name?.toLowerCase().includes('mandi') ? 'Choose Portion Size' : 'Choose Spice Level'}
                </Text>
                <View style={styles.optionRow}>
                  {(() => {
                    let options = ['Mild', 'Medium', 'Extra Spicy'];
                    const nameLower = (customizingItem?.name || '').toLowerCase();
                    if (nameLower.includes('mandi')) {
                      options = ['Quarter', 'Half', 'Full'];
                    } else if (nameLower.includes('biriyani') || nameLower.includes('biryani')) {
                      options = ['Half', 'Full'];
                    }
                    return options.map(sp => (
                      <TouchableOpacity
                        key={sp}
                        style={[styles.optionChip, { backgroundColor: itemSpice === sp ? '#FF5252' : D.chipBg, borderColor: D.cardBorder }]}
                        onPress={() => setItemSpice(sp)}
                      >
                        <Text style={[styles.optionChipText, { color: itemSpice === sp ? '#ffffff' : D.text }]}>{sp}</Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>

                {/* Add-ons */}
                <Text style={[styles.customSectionTitle, { color: D.heading }]}>Popular Add-ons</Text>

                {[
                  { name: 'Extra Cheese', price: 40 },
                  { name: 'Extra Sauce Dip', price: 25 },
                  { name: 'Cold Beverage', price: 45 }
                ].map(addon => {
                  const selected = itemAddons.some(a => a.name === addon.name);
                  return (
                    <TouchableOpacity
                      key={addon.name}
                      style={[styles.addonRow, { borderBottomColor: D.divider }]}
                      onPress={() => toggleAddon(addon.name, addon.price)}
                    >
                      <Text style={[styles.addonName, { color: D.text }]}>{addon.name} (+₹{addon.price})</Text>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && <Check size={12} color="#ffffff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Quantity Control */}
                <View style={styles.qtyRow}>
                  <Text style={[styles.qtyLabel, { color: D.text }]}>Quantity</Text>
                  <View style={[styles.qtyBox, { backgroundColor: D.chipBg, borderColor: D.cardBorder }]}>
                    <TouchableOpacity onPress={() => setItemQuantity(Math.max(1, itemQuantity - 1))}>
                      <Minus size={16} color={D.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: D.text }]}>{itemQuantity}</Text>
                    <TouchableOpacity onPress={() => setItemQuantity(itemQuantity + 1)}>
                      <Plus size={16} color={D.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={confirmAddToCart}>
                  <Text style={styles.primaryBtnText}>
                    Add Item • ₹{(customizingItem ? getBasePrice(customizingItem, itemSpice) + itemAddons.reduce((s, a) => s + a.price, 0) : 0) * itemQuantity}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* CART DRAWER MODAL */}
          <Modal
            visible={isCartOpen}
            animationType="slide"
            statusBarTranslucent
            onShow={() => setIsCartScrollAtBottom(false)}
            onRequestClose={() => setIsCartOpen(false)}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: D.modalBg }}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[styles.modalHeader, { 
                  backgroundColor: D.headerBg, 
                  borderBottomColor: D.navBorder, 
                  paddingTop: Platform.OS === 'android' ? 12 : 8, 
                  paddingBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }]}>
                  <TouchableOpacity 
                    onPress={() => setIsCartOpen(false)} 
                    style={[styles.closeCircleBtn, { 
                      backgroundColor: D.chipBg,
                      position: 'absolute',
                      left: 16,
                      zIndex: 10
                    }]}
                  >
                    <ArrowLeft size={20} color={D.text} />
                  </TouchableOpacity>
                  <Text style={{ 
                    color: D.text, 
                    fontSize: 18, 
                    fontWeight: '800',
                    textAlign: 'center'
                  }}>
                    My Cart
                  </Text>
                </View>

                {cartItems.length === 0 ? (
                  <View style={styles.emptyStateCenter}>
                    <ShoppingBag size={52} color={darkMode ? '#475569' : '#D1D5DB'} />
                    <Text style={[styles.emptyTitle, { color: D.text }]}>Your Cart is Empty</Text>
                    <Text style={[styles.emptySubtitle, { color: D.textSub }]}>Explore top restaurants and add delicious items to your cart.</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1, position: 'relative' }}>
                    <ScrollView
                      ref={cartScrollRef}
                      style={{ flex: 1 }}
                      contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
                      onScroll={handleCartScroll}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                    >
                      {/* CART ITEMS LIST */}
                      {getGroupedCartItems(cartItems).map((item, idx) => (
                        <View
                          key={item.cartItemId}
                          style={{
                            backgroundColor: D.card,
                            borderColor: D.cardBorder,
                            borderWidth: 1,
                            borderRadius: 16,
                            padding: 12,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <TouchableOpacity onPress={() => { openProductDetails({ id: item.itemId, ...item }, null); }}>
                            <Image 
                              source={{ uri: resolveProductImage(item.image, resolvedBackendUrl) }} 
                              style={{ width: 80, height: 80, borderRadius: 16, marginRight: 12, backgroundColor: D.chipBg }} 
                            />
                          </TouchableOpacity>
                          
                          <View style={{ flex: 1 }}>
                            <TouchableOpacity onPress={() => { openProductDetails({ id: item.itemId, ...item }, null); }}>
                              <Text style={{ color: D.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                            
                            {item.spice || (item.addons && item.addons.length > 0) ? (
                              <Text style={{ fontSize: 12, color: D.textSub, marginBottom: 8 }} numberOfLines={1}>
                                {[item.spice, ...(item.addons || [])].filter(Boolean).join(', ')}
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 12, color: D.textSub, marginBottom: 8 }}>Standard</Text>
                            )}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 16, fontWeight: '850', color: D.text }}>
                                ₹{item.price * item.quantity}
                              </Text>

                              {/* Quantity Pill */}
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: darkMode ? '#334155' : '#F3F4F6',
                                borderRadius: 15,
                                paddingHorizontal: 10,
                                paddingVertical: 4
                              }}>
                                <TouchableOpacity onPress={() => updateCartQuantity(item.cartItemId, -1)} style={{ padding: 2 }}>
                                  {item.quantity === 1
                                    ? <Trash2 size={12} color="#EF4444" />
                                    : <Minus size={12} color={darkMode ? '#D1D5DB' : '#374151'} />
                                  }
                                </TouchableOpacity>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: D.text, marginHorizontal: 8 }}>
                                  {item.quantity}
                                </Text>
                                <TouchableOpacity onPress={() => updateCartQuantity(item.cartItemId, 1)} style={{ padding: 2 }}>
                                  <Plus size={12} color={darkMode ? '#D1D5DB' : '#374151'} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Action Pills removed */}

                      {/* SAVINGS CORNER CARD */}
                      <View style={[{ backgroundColor: D.card, borderColor: D.cardBorder, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: D.textSub, letterSpacing: 0.5, marginBottom: 10 }}>
                          SAVINGS CORNER
                        </Text>

                        <TouchableOpacity
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}
                          onPress={() => setIsCouponModalOpen(true)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#FF6B00', padding: 6, borderRadius: 8 }}>
                              <Tag size={14} color="#ffffff" />
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: D.text, marginLeft: 10 }}>Apply Coupon</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {appliedPromo && (
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginRight: 8 }}>
                                {appliedPromo.code} Applied
                              </Text>
                            )}
                            <ChevronRight size={18} color={D.textSub} />
                          </View>
                        </TouchableOpacity>
                      </View>

                      {/* Offers & Coupons Section */}
                      <View style={{
                        backgroundColor: D.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: D.cardBorder,
                        padding: 16,
                        marginTop: 10,
                        marginBottom: 10,
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: D.heading, marginBottom: 12 }}>
                          Offers & Coupons
                        </Text>

                        {/* Apply manually typed coupon code input */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: D.chipBg, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 12 }}>
                          <TextInput 
                            style={{ flex: 1, color: D.text, fontSize: 14, fontWeight: '700' }}
                            placeholder="Enter coupon code"
                            placeholderTextColor={D.textSub}
                            value={promoInput}
                            onChangeText={setPromoInput}
                            autoCapitalize="characters"
                          />
                          <TouchableOpacity
                            onPress={() => applyPromo()}
                            style={{ paddingHorizontal: 16, height: 48, justifyContent: 'center' }}>
                            <Text style={{ color: promoInput ? '#EA580C' : D.textSub, fontWeight: '800', fontSize: 14 }}>APPLY</Text>
                          </TouchableOpacity>
                        </View>

                        {promoError ? (
                          <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '750', marginBottom: 12, paddingHorizontal: 4 }}>{promoError}</Text>
                        ) : null}

                        {/* If coupon is already applied, show the Applied Coupon card */}
                        {appliedPromo ? (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: darkMode ? '#1F2E28' : '#ecfdf5',
                            borderWidth: 1,
                            borderColor: darkMode ? '#065f46' : '#a7f3d0',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 16
                          }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginBottom: 2 }}>Offer Applied</Text>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: D.text }}>{appliedPromo.code}</Text>
                              <Text style={{ fontSize: 11, color: D.textSub, marginTop: 2 }}>You saved Rs. {discountAmount}</Text>
                            </View>
                            <TouchableOpacity 
                              onPress={() => {
                                setAppliedPromo(null);
                                setPromoError('');
                              }}
                              style={{ backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                            >
                              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800' }}>REMOVE</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {/* Available Offers List */}
                        <Text style={{ fontSize: 13, fontWeight: '800', color: D.textSub, marginBottom: 8 }}>Available Offers</Text>
                        {backendCoupons.length === 0 ? (
                          <Text style={{ fontSize: 12, color: D.textSub, fontWeight: '600', paddingHorizontal: 4 }}>No offers available for this order</Text>
                        ) : (
                          backendCoupons.map((coupon, idx) => {
                            let discountLabel = '';
                            if (coupon.discountType === 'percentage') {
                              discountLabel = `${coupon.discountValue}% OFF up to Rs. ${coupon.maxDiscount || 100}`;
                            } else if (coupon.discountType === 'flat') {
                              discountLabel = `Rs. ${coupon.discountValue} OFF`;
                            } else if (coupon.discountType === 'free_delivery') {
                              discountLabel = 'FREE DELIVERY';
                            } else {
                              discountLabel = 'SPECIAL OFFER';
                            }

                            const isCurrentApplied = appliedPromo && appliedPromo.code === coupon.code;

                            return (
                              <View 
                                key={`avail-${idx}`} 
                                style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between', 
                                  paddingVertical: 10, 
                                  borderBottomWidth: idx === backendCoupons.length - 1 ? 0 : 1, 
                                  borderBottomColor: D.divider 
                                }}
                              >
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: D.text }}>{discountLabel}</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#FF5252', marginTop: 2 }}>Use {coupon.code}</Text>
                                  {coupon.minimumOrderValue > 0 && (
                                    <Text style={{ fontSize: 10, color: D.textSub, marginTop: 2 }}>Minimum order Rs. {coupon.minimumOrderValue}</Text>
                                  )}
                                </View>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (isCurrentApplied) {
                                      setAppliedPromo(null);
                                    } else {
                                      applyPromo(coupon.code);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: isCurrentApplied ? D.chipBg : '#FF5252',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8
                                  }}
                                >
                                  <Text style={{ color: isCurrentApplied ? D.textSub : '#ffffff', fontSize: 12, fontWeight: '800' }}>
                                    {isCurrentApplied ? 'APPLIED' : 'APPLY'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* BILL SUMMARY CARD */}
                      <View style={[styles.billCard, { 
                        backgroundColor: D.card, 
                        borderColor: D.cardBorder, 
                        borderRadius: 16, 
                        padding: 16,
                        marginVertical: 12
                      }]}>
                        <Text style={{ 
                          fontSize: 18, 
                          fontWeight: '800', 
                          color: D.heading, 
                          marginBottom: 12 
                        }}>Summary</Text>
                        
                        <View style={styles.billRow}>
                          <Text style={{ fontSize: 14, color: D.textSub }}>Subtotal</Text>
                          <Text style={{ fontSize: 14, fontWeight: '750', color: D.text }}>₹{subtotal}</Text>
                        </View>

                        {discountAmount > 0 && (
                          <View style={styles.billRow}>
                            <Text style={{ fontSize: 14, color: '#059669', fontWeight: '600' }}>Discount</Text>
                            <Text style={{ fontSize: 14, fontWeight: '750', color: '#059669' }}>-₹{discountAmount}</Text>
                          </View>
                        )}

                        <View style={styles.billRow}>
                          <Text style={{ fontSize: 14, color: D.textSub }}>Delivery Fee</Text>
                          <Text style={{ fontSize: 14, fontWeight: '750', color: D.text }}>₹{finalDeliveryFee}</Text>
                        </View>

                        <View style={styles.billRow}>
                          <Text style={{ fontSize: 14, color: D.textSub }}>Taxes & Fees</Text>
                          <Text style={{ fontSize: 14, fontWeight: '750', color: D.text }}>₹{taxesAndFees}</Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: D.divider, marginVertical: 12 }} />

                        <View style={styles.billRow}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: D.text }}>Total</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: D.text }}>₹{grandTotal}</Text>
                        </View>
                      </View>
                    </ScrollView>

                    {/* STICKY BOTTOM BAR */}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: D.headerBg,
                      borderTopWidth: 1,
                      borderTopColor: D.navBorder,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -3 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6
                    }}>
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: D.text }}>₹{grandTotal}</Text>
                        <TouchableOpacity onPress={() => cartScrollRef.current?.scrollToEnd({ animated: true })}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF5252', marginTop: 2 }}>
                            View Detailed Bill ↓
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={{
                          backgroundColor: '#FF5252',
                          paddingHorizontal: 28,
                          paddingVertical: 16,
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onPress={() => {
                          setIsCartOpen(false);
                          setTimeout(() => {
                            setIsCheckoutOpen(true);
                          }, 150);
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800', marginRight: 8 }}>Place Order</Text>
                        <Truck size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>

          {/* APPLY COUPON MODAL */}
          <Modal visible={isCouponModalOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setIsCouponModalOpen(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: D.background }}>
              <View style={[styles.modalHeader, { backgroundColor: D.headerBg, borderBottomColor: D.navBorder, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 10 }]}>
                <TouchableOpacity onPress={() => setIsCouponModalOpen(false)} style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}>
                  <ArrowLeft size={20} color={D.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modalHeaderTitle, { color: D.text, fontSize: 16 }]} numberOfLines={1}>APPLY COUPON</Text>
                  <Text style={{ fontSize: 12, color: D.textSub, marginTop: 2 }}>Your cart: ₹{subtotal}</Text>
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.cardBorder, overflow: 'hidden', marginBottom: 16 }}>
                  <TextInput
                    style={{ flex: 1, paddingHorizontal: 16, height: 48, color: D.text, fontSize: 14 }}
                    placeholder="Enter Coupon Code"
                    placeholderTextColor={D.textSub}
                    value={promoInput}
                    onChangeText={setPromoInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (!promoInput.trim()) return;
                      applyPromo();
                      setIsCouponModalOpen(false);
                    }}
                    style={{ paddingHorizontal: 16, height: 48, justifyContent: 'center' }}>
                    <Text style={{ color: promoInput ? '#EA580C' : '#9CA3AF', fontWeight: '800', fontSize: 14 }}>APPLY</Text>
                  </TouchableOpacity>
                </View>

                {promoError ? (
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '750', marginBottom: 16, paddingHorizontal: 4 }}>{promoError}</Text>
                ) : null}

                <Text style={{ fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 12 }}>More offers</Text>

                {backendCoupons.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.cardBorder }}>
                    <Text style={{ color: D.textSub, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>No promotional offers available at this restaurant right now.</Text>
                  </View>
                ) : (
                  backendCoupons.map((coupon, idx) => {
                    let discountLabel = '';
                    if (coupon.discountType === 'percentage') discountLabel = `${coupon.discountValue}% OFF`;
                    else if (coupon.discountType === 'flat') discountLabel = `Rs. ${coupon.discountValue} OFF`;
                    else discountLabel = 'FREE';

                    return (
                      <View key={`coupon-${idx}`} style={{ flexDirection: 'row', backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.cardBorder, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                        <View style={{ width: 44, backgroundColor: '#EA580C', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center' }}>{discountLabel}</Text>
                        </View>

                        <View style={{ flex: 1, padding: 14 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#EA580C', width: 20, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', fontStyle: 'italic' }}>%</Text>
                              </View>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: D.text }}>{coupon.code}</Text>
                            </View>
                            <TouchableOpacity onPress={() => {
                              applyPromo(coupon.code);
                              setIsCouponModalOpen(false);
                            }}>
                              <Text style={{ color: '#EA580C', fontWeight: '800', fontSize: 14 }}>APPLY</Text>
                            </TouchableOpacity>
                          </View>

                          <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>{coupon.name}</Text>
                          {coupon.description ? (
                            <Text style={{ color: D.textSub, fontSize: 12, fontWeight: '500', marginBottom: 8 }}>{coupon.description}</Text>
                          ) : null}

                          <View style={{ borderTopWidth: 1, borderTopColor: D.divider, borderStyle: 'dashed', paddingTop: 10, marginTop: 4 }}>
                            <Text style={{ color: D.textSub, fontSize: 11, fontWeight: '600' }}>
                              Min Order: Rs. {coupon.minimumOrderValue} 
                              {coupon.maxDiscount ? ` | Max Discount: Rs. ${coupon.maxDiscount}` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
          {/* 99 STORE MODAL */}
          <Modal visible={isStore99ModalOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setIsStore99ModalOpen(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#1E293B' : '#F0F9FF' }}>
              <View style={[styles.modalHeader, { backgroundColor: darkMode ? '#1E293B' : '#F0F9FF', borderBottomColor: darkMode ? '#334155' : '#BAE6FD', paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 10 }]}>
                <TouchableOpacity onPress={() => setIsStore99ModalOpen(false)} style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}>
                  <ArrowLeft size={20} color={D.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modalHeaderTitle, { color: D.text, fontSize: 16 }]} numberOfLines={1}>99 STORE - ALL ITEMS</Text>
                  <Text style={{ fontSize: 12, color: D.textSub, marginTop: 2 }}>Meals at ₹99 + Free Delivery</Text>
                </View>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {allDishes.filter(d => d.price <= 200).map((item, idx) => {
                  const discountedPrice = Math.min(item.price, 99);
                  const originalPrice = Math.max(item.price, 120);
                  const inCart = cartItems.some(c => c.id === item.id);
                  return (
                    <TouchableOpacity
                      key={`store-99-full-${idx}`}
                      style={[styles.store99ItemCard, { backgroundColor: D.card, borderColor: D.cardBorder, width: '48%', marginBottom: 12, marginRight: 0 }]}
                      onPress={() => { setIsStore99ModalOpen(false); openProductDetails({ ...item, price: discountedPrice, originalPrice, is99StoreItem: true }, item.restaurant); }}
                    >
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: item.image }} style={[styles.store99ItemImg, { width: '100%', height: 120 }]} />
                        <TouchableOpacity
                          style={[styles.store99AddBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                          onPress={() => openCustomizer({ ...item, price: discountedPrice, originalPrice, is99StoreItem: true }, item.restaurant)}
                        >
                          <Text style={[styles.store99AddBtnText, inCart && { color: '#ffffff' }]}>{inCart ? 'ADDED ✓' : 'ADD +'}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ padding: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <View style={[styles.vegBadgeIcon, { borderColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                            <View style={[styles.vegBadgeDot, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]} />
                          </View>
                          <Text style={[styles.store99ItemTitle, { color: D.text, flex: 1 }]} numberOfLines={2}>{item.name}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, textDecorationLine: 'line-through', color: D.textSub, marginRight: 6 }}>₹{originalPrice}</Text>
                          <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#854D0E' }}>₹{discountedPrice}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Star size={10} color="#D97706" fill="#D97706" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: D.textSub, marginLeft: 2 }}>4.5 (50+)</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Modal>
          {/* CHECKOUT & PAYMENT MODAL */}
          <Modal visible={isCheckoutOpen} animationType="slide" statusBarTranslucent onRequestClose={() => { if (!isProcessingCheckout) { setIsCheckoutOpen(false); setTimeout(() => setIsCartOpen(true), 150); } }} onShow={() => { setTimeout(() => setCheckoutLayoutKey(k => k + 1), 60); }}>
            <View key={checkoutLayoutKey} style={{ flex: 1, backgroundColor: '#F5F7FA', paddingTop: STATUSBAR_HEIGHT }}>

                {/* ── COMPACT HEADER ── */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  paddingTop: 6,
                  paddingBottom: 10,
                  backgroundColor: '#FFFFFF',
                  position: 'relative',
                }}>
                  <TouchableOpacity 
                    onPress={() => { if (!isProcessingCheckout) { setIsCheckoutOpen(false); setTimeout(() => setIsCartOpen(true), 150); } }} 
                    style={{ position: 'absolute', left: 16, zIndex: 10, padding: 4 }}
                    disabled={isProcessingCheckout}
                  >
                    <ArrowLeft size={22} color="#059669" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#1E293B' }}>Checkout</Text>
                </View>
                {/* Green accent line */}
                <View style={{ height: 2.5, backgroundColor: '#059669' }} />

                {/* ── SCROLLABLE CONTENT ── */}
                <ScrollView 
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >

                    {/* ── DELIVERY CARD ── */}
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <MapPin size={16} color="#059669" />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                          Delivering to {currentUser?.name || 'Customer'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
                          {selectedAddress.address || selectedAddress.label}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => setIsAddressModalOpen(true)}
                        disabled={isProcessingCheckout}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#059669' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    {/* ── ORDER SUMMARY ── */}
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>Order Summary</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>{cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}</Text>
                      </View>
                      <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}>
                        {cartItems.map((item, idx) => (
                          <View key={item.cartItemId || idx} style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            paddingVertical: 9,
                            borderBottomWidth: idx === cartItems.length - 1 ? 0 : 1,
                            borderBottomColor: '#F1F5F9',
                          }}>
                            <View style={{
                              width: 14, height: 14, borderWidth: 1.5, borderRadius: 2,
                              borderColor: item.isVeg ? '#16A34A' : '#EF4444',
                              alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2,
                            }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.isVeg ? '#16A34A' : '#EF4444' }} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{item.name}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                                Qty: {item.quantity} × Rs. {item.price}
                              </Text>
                              {item.customizations && item.customizations.length > 0 && (
                                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }} numberOfLines={1}>
                                  {item.customizations.map(c => c.name).join(', ')}
                                </Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginLeft: 8 }}>
                              Rs. {Math.round(Number(item.price) * Number(item.quantity))}
                            </Text>
                          </View>
                        ))}

                        {/* Applied Offer Row */}
                        {appliedPromo && discountAmount > 0 && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 13, marginRight: 6 }}>🏷️</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                                {appliedPromo.code} Applied
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>- Rs. {discountAmount}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* ── BILL DETAILS ── */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>Bill Details</Text>
                      <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        padding: 14,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: '#64748B' }}>Item Total</Text>
                          <Text style={{ fontSize: 13, color: '#334155' }}>Rs. {subtotal}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: '#64748B' }}>Delivery Fee</Text>
                          <Text style={{ fontSize: 13, color: '#334155' }}>Rs. {finalDeliveryFee}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: '#64748B' }}>Taxes & Platform Fees</Text>
                          <Text style={{ fontSize: 13, color: '#334155' }}>Rs. {taxesAndFees}</Text>
                        </View>
                        {discountAmount > 0 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>Discount</Text>
                            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>- Rs. {discountAmount}</Text>
                          </View>
                        )}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>Total Payable</Text>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>Rs. {grandTotal}</Text>
                        </View>
                      </View>
                    </View>

                    {/* ── PAYMENT METHOD ── */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>Payment Method</Text>

                      {/* Pay Online */}
                      <TouchableOpacity
                        onPress={() => setPaymentMethod('online')}
                        activeOpacity={0.7}
                        disabled={isProcessingCheckout}
                        style={{
                          backgroundColor: paymentMethod === 'online' ? '#F0FDF9' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: paymentMethod === 'online' ? '#059669' : '#E2E8F0',
                          borderRadius: 12,
                          padding: 14,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              <Text style={{ fontSize: 18 }}>💳</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Pay Online</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>UPI, Cards, Netbanking & Wallets</Text>
                            </View>
                          </View>
                          {/* Radio */}
                          <View style={{
                            width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                            borderColor: paymentMethod === 'online' ? '#059669' : '#CBD5E1',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {paymentMethod === 'online' && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669' }} />
                            )}
                          </View>
                        </View>
                        {/* Chips row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 44 }}>
                          <View style={{ backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>UPI</Text>
                          </View>
                          <View style={{ backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>CARDS</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>Razorpay</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Cash on Delivery */}
                      <TouchableOpacity
                        onPress={() => setPaymentMethod('cod')}
                        activeOpacity={0.7}
                        disabled={isProcessingCheckout}
                        style={{
                          backgroundColor: paymentMethod === 'cod' ? '#F0FDF9' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: paymentMethod === 'cod' ? '#059669' : '#E2E8F0',
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEF9C3', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              <Text style={{ fontSize: 18 }}>💵</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Cash on Delivery</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Pay when your order arrives</Text>
                            </View>
                          </View>
                          {/* Radio */}
                          <View style={{
                            width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                            borderColor: paymentMethod === 'cod' ? '#059669' : '#CBD5E1',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {paymentMethod === 'cod' && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669' }} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* ── FIXED BOTTOM BAR (normal flex child, always visible) ── */}
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderTopWidth: 1,
                  borderTopColor: '#E2E8F0',
                  paddingHorizontal: 20,
                  paddingTop: 10,
                  paddingBottom: Math.max(14, bottomInset + 6),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  elevation: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -3 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                }}>
                  <View>
                    <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500' }}>Total</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#1E293B' }}>Rs. {grandTotal}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handlePlaceOrder}
                    disabled={isProcessingCheckout}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#059669',
                      borderRadius: 12,
                      paddingHorizontal: 26,
                      paddingVertical: 13,
                      minWidth: 140,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      elevation: 3,
                      shadowColor: '#059669',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    {isProcessingCheckout ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                          {checkoutLoadingText || 'Please wait...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                        {paymentMethod === 'cod' ? 'Place Order →' : 'Pay Now →'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

            </View>
          </Modal>


          {/* PAYMENT FAILED MODAL */}
          <Modal
            visible={paymentFailedModal.visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setPaymentFailedModal(prev => ({ ...prev, visible: false }))}
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 28,
            }}>
              <View style={{
                backgroundColor: D.card,
                borderRadius: 24,
                padding: 28,
                width: '100%',
                maxWidth: 360,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 24,
                elevation: 16,
                borderWidth: 1,
                borderColor: D.cardBorder,
              }}>

                {/* Red Fail Icon */}
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <View style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 26, color: '#ffffff', fontWeight: '900', lineHeight: 30 }}>✕</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: D.heading,
                  marginBottom: 10,
                  textAlign: 'center',
                }}>
                  {paymentFailedModal.title}
                </Text>

                {/* Message */}
                <Text style={{
                  fontSize: 14,
                  color: D.textSub,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 28,
                  paddingHorizontal: 4,
                }}>
                  {paymentFailedModal.message}
                </Text>

                {/* Try Again Button */}
                <TouchableOpacity
                  onPress={() => setPaymentFailedModal(prev => ({ ...prev, visible: false }))}
                  style={{
                    backgroundColor: '#059669',
                    borderRadius: 14,
                    paddingVertical: 14,
                    width: '100%',
                    alignItems: 'center',
                    marginBottom: 12,
                    shadowColor: '#059669',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>Try Again</Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  onPress={() => setPaymentFailedModal(prev => ({ ...prev, visible: false }))}
                  style={{ paddingVertical: 10, paddingHorizontal: 20 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: D.textSub }}>Cancel</Text>
                </TouchableOpacity>

              </View>
            </View>
          </Modal>

          {/* ADDRESS MANAGER MODAL WITH LIVE GPS DETECTOR */}
          <Modal visible={isAddressModalOpen} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setIsAddressModalOpen(false)}>
            <View style={[styles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0 }]}>
              <View style={[styles.customizerCard, { backgroundColor: D.card, borderColor: D.cardBorder, paddingBottom: 60, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, mb: 0 }]}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.customizerTitle, { color: D.heading }]}>Select Delivery Address</Text>
                  <TouchableOpacity onPress={() => setIsAddressModalOpen(false)}>
                    <X size={20} color={D.textSub} />
                  </TouchableOpacity>
                </View>

                {/* Search Address Input Box */}
                <View style={[styles.locationSearchBox, { backgroundColor: D.inputBg, borderColor: D.inputBorder }]}>
                  <Search size={16} color="#FF7A00" />
                  <TextInput
                    style={[styles.locationSearchInput, { color: D.text }]}
                    placeholder="Search city, area (e.g. Kozhikode, Palayam)..."
                    placeholderTextColor={darkMode ? '#64748B' : '#9CA3AF'}
                    value={addressSearchQuery}
                    onChangeText={setAddressSearchQuery}
                  />
                  {addressSearchQuery ? (
                    <TouchableOpacity onPress={() => setAddressSearchQuery('')} style={{ padding: 4 }}>
                      <X size={16} color={D.textSub} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* GPS Location Button */}
                <TouchableOpacity
                  style={[styles.gpsDetectBtn, { backgroundColor: D.chipBg, borderColor: D.cardBorder, marginVertical: 6 }]}
                  onPress={getCurrentLiveLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator color="#FF5252" size="small" />
                  ) : (
                    <LocateFixed size={18} color="#FF5252" />
                  )}
                  <Text style={[styles.gpsDetectBtnText, { color: D.text }]}>
                    {isGettingLocation ? 'Detecting GPS Location...' : 'Use Current Live GPS Location'}
                  </Text>
                </TouchableOpacity>

                {locationError ? (
                  <Text style={styles.errorTextSmall}>{locationError}</Text>
                ) : null}

                <Text style={[styles.customSectionTitle, { color: D.heading, marginTop: 10 }]}>
                  {addressSearchQuery ? `Nearby Places for "${addressSearchQuery}"` : 'Saved Locations'}
                </Text>

                <ScrollView style={{ maxHeight: 290 }} showsVerticalScrollIndicator={false}>
                  {isSearchingLocation ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator color="#FF5252" size="small" />
                      <Text style={{ fontSize: 12, color: D.textSub, marginTop: 6 }}>Searching nearby places...</Text>
                    </View>
                  ) : null}

                  {/* 1. Primary Direct Deliver Option */}
                  {addressSearchQuery.trim().length > 1 && (
                    <TouchableOpacity
                      style={[
                        styles.addressItemRow,
                        { backgroundColor: darkMode ? '#2E1A14' : '#FFF7ED', borderColor: '#FF7A00', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 }
                      ]}
                      onPress={async () => {
                        const newAddress = await addAddressToBackend(addressSearchQuery.trim(), addressSearchQuery.trim(), addressSearchQuery.trim().split(',')[0]);
                        if (newAddress) {
                          setAddressesList(prev => [newAddress, ...prev]);
                          setSelectedAddress(newAddress);
                        } else {
                          const newLoc = {
                            id: `custom-${Date.now()}`,
                            label: addressSearchQuery.trim(),
                            city: `${addressSearchQuery.trim()}, Kerala`,
                            address: `${addressSearchQuery.trim()}, Kerala`
                          };
                          setAddressesList(prev => [newLoc, ...prev]);
                          setSelectedAddress(newLoc);
                        }
                        setAddressSearchQuery('');
                        setIsAddressModalOpen(false);
                        triggerToastNotification(`📍 Location updated to ${addressSearchQuery.trim()}`);
                      }}
                    >
                      <MapPin size={18} color="#FF7A00" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FF7A00' }}>Deliver to "{addressSearchQuery}"</Text>
                        <Text style={{ fontSize: 11, color: D.textSub }}>Tap to set as active delivery location</Text>
                      </View>
                      <Plus size={18} color="#FF7A00" />
                    </TouchableOpacity>
                  )}

                  {/* 2. Live API & Geocoded 5 Nearby Places */}
                  {addressSearchQuery.trim().length > 1 && liveApiSuggestions.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      style={[
                        styles.addressItemRow,
                        { backgroundColor: D.card, borderBottomColor: D.divider, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, marginVertical: 4 }
                      ]}
                      onPress={async () => {
                        const newAddress = await addAddressToBackend(place.label, place.address, place.city || place.label.split(',')[0]);
                        if (newAddress) {
                          setAddressesList(prev => [newAddress, ...prev.filter(a => a.id !== place.id)]);
                          setSelectedAddress(newAddress);
                        } else {
                          const newLoc = {
                            id: place.id,
                            label: place.label,
                            city: place.city,
                            address: place.address
                          };
                          setAddressesList(prev => [newLoc, ...prev.filter(a => a.id !== place.id)]);
                          setSelectedAddress(newLoc);
                        }
                        setAddressSearchQuery('');
                        setIsAddressModalOpen(false);
                        triggerToastNotification(`📍 Location set to ${place.label}`);
                      }}
                    >
                      <MapPin size={18} color="#FF5252" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.addressLabel, { color: D.text }]}>{place.label}</Text>
                        <Text style={[styles.addressCity, { color: D.textSub }]}>{place.address}</Text>
                      </View>
                      <Check size={16} color="#FF5252" />
                    </TouchableOpacity>
                  ))}

                  {/* 3. Saved Locations when query is empty */}
                  {!addressSearchQuery.trim() && addressesList.map(addr => {
                    const isSelected = selectedAddress.id === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[
                          styles.addressItemRow,
                          {
                            backgroundColor: isSelected ? (darkMode ? '#2A181D' : '#FEF2F2') : D.card,
                            borderBottomColor: D.divider,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 12,
                            marginVertical: 4
                          }
                        ]}
                        onPress={() => { setSelectedAddress(addr); setAddressSearchQuery(''); setIsAddressModalOpen(false); }}
                      >
                        <MapPin size={18} color={isSelected ? '#FF5252' : (darkMode ? '#94A3B8' : '#6B7280')} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.addressLabel, { color: D.text }]}>{addr.label}</Text>
                          <Text style={[styles.addressCity, { color: D.textSub }]}>{addr.address}</Text>
                        </View>
                        {isSelected && <Check size={16} color="#FF5252" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* ORDER PLACED CELEBRATION SUCCESS MODAL */}
          <Modal visible={isOrderSuccessModalOpen} transparent animationType="fade" statusBarTranslucent>
            <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 24, paddingBottom: bottomInset }]}>
              <Animated.View style={[
                styles.customizerCard,
                { backgroundColor: D.card, borderColor: D.cardBorder, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, borderRadius: 24, transform: [{ scale: successScaleAnim }] }
              ]}>
                
                {/* Success Icon */}
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Check size={44} color="#ffffff" />
                </View>

                {/* Title */}
                <Text style={{ fontSize: 22, fontWeight: '900', color: D.heading, textAlign: 'center' }}>Order Confirmed!</Text>
                
                {/* Description */}
                <Text style={{ fontSize: 13, color: D.textSub, textAlign: 'center', marginTop: 6, marginBottom: 20, paddingHorizontal: 12 }}>
                  🎉 Your order has been successfully placed and sent to the kitchen.
                </Text>

                {/* Details Card */}
                {lastPlacedOrder && (
                  <View style={{
                    width: '100%',
                    backgroundColor: D.chipBg,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: D.cardBorder,
                    marginBottom: 24,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: D.textSub }}>Order Number</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: D.text }}>#{lastPlacedOrder.orderNumber || lastPlacedOrder.orderId}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: D.textSub }}>Total Amount</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: D.text }}>Rs. {lastPlacedOrder.total}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: D.textSub }}>Payment Method</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: D.text }}>{lastPlacedOrder.paymentMethod}</Text>
                    </View>
                    <View style={{ borderTopWidth: 1, borderTopColor: D.divider, paddingTop: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: D.textSub, marginBottom: 2 }}>Delivering to</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: D.text }} numberOfLines={2}>
                        {lastPlacedOrder.address?.address || lastPlacedOrder.address?.label}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsOrderSuccessModalOpen(false);
                      setActiveTab('orders');
                      if (lastPlacedOrder) {
                        setSelectedOrderForDetail(lastPlacedOrder);
                      }
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#059669',
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                      shadowColor: '#059669',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Track Order</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsOrderSuccessModalOpen(false);
                      setActiveTab('home');
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: D.chipBg,
                      borderWidth: 1,
                      borderColor: D.cardBorder,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: D.text }}>Back to Home</Text>
                  </TouchableOpacity>
                </View>

              </Animated.View>
            </View>
          </Modal>

          {/* FULL ORDER TRACKING DETAILS MODAL (TRIGGERED ON CLICKING ROW CARD) */}
          <Modal visible={!!selectedOrderForDetail} animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedOrderForDetail(null)}>
            {selectedOrderForDetail && (
              <SafeAreaView style={{ flex: 1, backgroundColor: D.modalBg }}>
                <View style={[styles.modalHeader, { backgroundColor: D.headerBg, borderBottomColor: D.navBorder, paddingTop: STATUSBAR_HEIGHT + 4 }]}>
                  <TouchableOpacity onPress={() => setSelectedOrderForDetail(null)} style={[styles.closeCircleBtn, { backgroundColor: D.chipBg }]}>
                    <ArrowLeft size={20} color={D.text} />
                  </TouchableOpacity>
                  {(() => {
                    const firstItem = activeOrderDetail?.items?.[0] || selectedOrderForDetail?.items?.[0];
                    const foodName = firstItem ? (firstItem.foodName || firstItem.name) : 'Meal';
                    const extraCount = (activeOrderDetail?.items || selectedOrderForDetail?.items || []).length > 1 
                      ? ` + ${(activeOrderDetail?.items || selectedOrderForDetail?.items || []).length - 1} more` 
                      : '';
                    const orderId = activeOrderDetail?.id || selectedOrderForDetail.orderId;
                    return (
                      <Text style={[styles.modalHeaderTitle, { color: D.heading, fontSize: 14 }]} numberOfLines={1}>
                        {foodName}{extraCount} • #{orderId}
                      </Text>
                    );
                  })()}
                  <View style={{ width: 20 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  <View style={[styles.orderTrackerCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}>
                    <View style={styles.orderHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        {(() => {
                          const firstItem = activeOrderDetail?.items?.[0] || selectedOrderForDetail?.items?.[0];
                          const foodName = firstItem ? (firstItem.foodName || firstItem.name) : 'Meal';
                          const extraCount = (activeOrderDetail?.items || selectedOrderForDetail?.items || []).length > 1 
                            ? ` + ${(activeOrderDetail?.items || selectedOrderForDetail?.items || []).length - 1} more` 
                            : '';
                          const orderId = activeOrderDetail?.id || selectedOrderForDetail.orderId;
                          return (
                            <Text style={[styles.orderIdText, { color: D.heading }]}>
                              {foodName}{extraCount} • #{orderId}
                            </Text>
                          );
                        })()}
                        <Text style={[styles.orderTimeText, { color: D.textSub }]} numberOfLines={2}>
                          {activeOrderDetail?.createdAt 
                            ? `Placed at ${new Date(activeOrderDetail.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : `Placed at ${selectedOrderForDetail.placedAt}`}
                          {' • '}
                          {activeOrderDetail?.deliveryAddress 
                            ? `${activeOrderDetail.deliveryAddress.addressLine1}, ${activeOrderDetail.deliveryAddress.city}` 
                            : (selectedOrderForDetail.address?.address || selectedOrderForDetail.address?.label)}
                        </Text>
                      </View>
                      <View style={[styles.liveBadge, (activeOrderDetail?.orderStatus === 'delivered' || activeOrderDetail?.orderStatus === 'cancelled' || activeOrderDetail?.orderStatus === 'rejected') && { backgroundColor: D.chipBg }]}>
                        <Text style={[styles.liveBadgeText, (activeOrderDetail?.orderStatus === 'delivered' || activeOrderDetail?.orderStatus === 'cancelled' || activeOrderDetail?.orderStatus === 'rejected') && { color: D.textSub }]}>
                          {activeOrderDetail?.orderStatus ? activeOrderDetail.orderStatus.toUpperCase() : 'LIVE'}
                        </Text>
                      </View>
                    </View>

                    {/* Timeline Steps / Cancellation Banner */}
                    {mapStatusToStep(activeOrderDetail?.orderStatus || 'placed') === -1 ? (
                      <View style={{
                        backgroundColor: darkMode ? '#311F24' : '#FEF2F2',
                        borderColor: '#EF4444',
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 16,
                        marginVertical: 12,
                        alignItems: 'center'
                      }}>
                        <X size={32} color="#EF4444" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#EF4444', marginBottom: 4 }}>Order Cancelled</Text>
                        <Text style={{ fontSize: 13, color: D.textSub, textAlign: 'center' }}>
                          This order was {activeOrderDetail?.orderStatus || 'cancelled/rejected'}. If you have already paid, your refund will be processed shortly.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.timeline}>
                        {[
                          { step: 1, label: 'Order Placed', sub: 'We have received your order' },
                          { step: 2, label: 'Order Accepted', sub: 'Restaurant is preparing your food' },
                          { 
                            step: 3, 
                            label: activeOrderDetail?.orderStatus === 'ready_for_pickup' ? 'Food Prepared & Ready' : (activeOrderDetail?.orderStatus === 'picked_up' ? 'Food Picked Up' : 'Preparing Food'), 
                            sub: activeOrderDetail?.orderStatus === 'ready_for_pickup' ? 'Waiting for delivery partner pickup' : (activeOrderDetail?.orderStatus === 'picked_up' ? 'Rider has picked up food' : 'Chef is cooking your dish') 
                          },
                          { step: 4, label: 'Out for Delivery', sub: 'Rider is on the way' },
                          { step: 5, label: 'Delivered', sub: 'Enjoy your meal!' }
                        ].map((s) => {
                          const currentStep = mapStatusToStep(activeOrderDetail?.orderStatus || 'placed');
                          const isDone = currentStep >= s.step;
                          return (
                            <View key={s.step} style={styles.timelineRow}>
                              <View style={[styles.timelineDot, isDone && styles.timelineDotDone]}>
                                {isDone ? <Check size={12} color="#ffffff" /> : <Text style={styles.timelineNum}>{s.step}</Text>}
                              </View>
                              <View style={styles.timelineContent}>
                                <Text style={[styles.timelineLabel, { color: isDone ? (darkMode ? '#10B981' : '#059669') : D.textSub }]}>{s.label}</Text>
                                <Text style={[styles.timelineSub, { color: D.textSub }]}>{s.sub}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Driver Profile Card */}
                    {activeOrderDetail?.activeAssignment?.deliveryPartner && (
                      <View style={[styles.driverCard, { backgroundColor: D.chipBg }]}>
                        <Image 
                          source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' }} 
                          style={styles.driverAvatar} 
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.driverName, { color: D.text }]}>
                            {activeOrderDetail.activeAssignment.deliveryPartner.user?.name || 'Rider'}
                          </Text>
                          <Text style={[styles.driverVehicle, { color: D.textSub }]}>
                            {activeOrderDetail.activeAssignment.deliveryPartner.vehicleType?.toUpperCase() || 'Bike'} • {activeOrderDetail.activeAssignment.deliveryPartner.vehicleNumber || ''}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.callDriverBtn} 
                          onPress={() => Alert.alert('Calling Driver', `Dialing ${activeOrderDetail.activeAssignment.deliveryPartner.phoneNumber}...`)}
                        >
                          <Phone size={18} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ── LIVE TRACKING CARD (only when out_for_delivery) ── */}
                    {activeOrderDetail?.orderStatus === 'out_for_delivery' && (
                      <View style={{
                        backgroundColor: darkMode ? '#0D2B1F' : '#F0FDF4',
                        borderWidth: 1,
                        borderColor: darkMode ? '#065F46' : '#6EE7B7',
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 12,
                        marginBottom: 4,
                      }}>
                        {/* Header row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          {/* Animated live pulse */}
                          <View style={{
                            width: 10, height: 10, borderRadius: 5,
                            backgroundColor: '#10B981',
                            marginRight: 8,
                          }} />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669', letterSpacing: 0.5 }}>
                            LIVE TRACKING
                          </Text>
                        </View>

                        {(() => {
                          const partner = activeOrderDetail?.activeAssignment?.deliveryPartner;
                          const riderLat = partner?.currentLatitude;
                          const riderLng = partner?.currentLongitude;
                          const updatedAt = partner?.locationUpdatedAt;
                          const custLat = activeOrderDetail?.deliveryAddress?.latitude;
                          const custLng = activeOrderDetail?.deliveryAddress?.longitude;

                          const openMaps = () => {
                            if (riderLat && riderLng) {
                              const label = encodeURIComponent('Delivery Partner');
                              const url = Platform.OS === 'ios'
                                ? `maps://?q=${label}&ll=${riderLat},${riderLng}`
                                : `geo:${riderLat},${riderLng}?q=${riderLat},${riderLng}(${label})`;
                              Linking.openURL(url).catch(() =>
                                Linking.openURL(`https://www.google.com/maps?q=${riderLat},${riderLng}`)
                              );
                            }
                          };

                          return (
                            <View>
                              {riderLat && riderLng ? (
                                <View>
                                  {/* Rider location row */}
                                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <View style={{
                                      width: 32, height: 32, borderRadius: 16,
                                      backgroundColor: '#059669',
                                      alignItems: 'center', justifyContent: 'center',
                                      marginRight: 10, marginTop: 2,
                                    }}>
                                      <Text style={{ fontSize: 14 }}>🛵</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '700', color: D.text }}>
                                        {partner?.user?.name || 'Delivery Partner'}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: D.textSub, marginTop: 2 }}>
                                        Lat: {riderLat.toFixed(5)}, Lng: {riderLng.toFixed(5)}
                                      </Text>
                                      {updatedAt && (
                                        <Text style={{ fontSize: 10, color: D.textSub, marginTop: 1 }}>
                                          Updated: {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  {/* Customer destination row */}
                                  {custLat && custLng && (
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                                      <View style={{
                                        width: 32, height: 32, borderRadius: 16,
                                        backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                                        alignItems: 'center', justifyContent: 'center',
                                        marginRight: 10, marginTop: 2,
                                      }}>
                                        <Text style={{ fontSize: 14 }}>📍</Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: D.text }}>Your Location</Text>
                                        <Text style={{ fontSize: 11, color: D.textSub, marginTop: 2 }}>
                                          {activeOrderDetail.deliveryAddress.addressLine1}, {activeOrderDetail.deliveryAddress.city}
                                        </Text>
                                      </View>
                                    </View>
                                  )}

                                  {/* Open in Maps button */}
                                  <TouchableOpacity
                                    onPress={openMaps}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: '#059669',
                                      borderRadius: 12,
                                      paddingVertical: 11,
                                      paddingHorizontal: 16,
                                    }}
                                  >
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginRight: 6 }}>📍</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>Open Rider Location in Maps</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                // No coordinates yet
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                                  <ActivityIndicator size="small" color="#059669" style={{ marginRight: 10 }} />
                                  <Text style={{ fontSize: 13, color: D.textSub, flex: 1 }}>
                                    Waiting for delivery partner location…
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    )}

                    {/* Order Items & Pricing Details */}
                    <View style={[styles.orderSummaryBox, { backgroundColor: D.chipBg }]}>
                      <Text style={[styles.summaryBoxTitle, { color: D.text }]}>
                        Order Summary ({(activeOrderDetail?.items || selectedOrderForDetail.items || []).length} items)
                      </Text>
                      {(activeOrderDetail?.items || selectedOrderForDetail.items || []).map((item, i) => {
                        const name = item.foodName || item.name;
                        const price = item.finalUnitPrice || item.price;
                        const qty = item.quantity;
                        const customizations = item.customizations || [];
                        return (
                          <View key={i} style={{ marginBottom: 10 }}>
                            <View style={styles.summaryItemRow}>
                              <Text style={[styles.summaryItemName, { color: D.textSub }]}>{qty}x {name}</Text>
                              <Text style={[styles.summaryItemPrice, { color: D.text }]}>Rs. {price * qty}</Text>
                            </View>
                            {customizations.length > 0 && (
                              <View style={{ marginLeft: 16, marginTop: 2 }}>
                                {customizations.map((cust, cIdx) => (
                                  <Text key={cIdx} style={{ fontSize: 11, color: D.textSub, fontStyle: 'italic' }}>
                                    + {cust.choiceName} ({cust.groupName}) {cust.additionalPrice > 0 ? `(+Rs. ${cust.additionalPrice})` : ''}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })}
                      
                      <View style={[styles.divider, { backgroundColor: D.divider, marginVertical: 8 }]} />
                      
                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, color: D.textSub }}>Subtotal</Text>
                          <Text style={{ fontSize: 13, color: D.text }}>
                            Rs. {activeOrderDetail?.subtotal || selectedOrderForDetail?.subtotal || (selectedOrderForDetail.total - (selectedOrderForDetail.deliveryFee || 0))}
                          </Text>
                        </View>
                        
                        {((activeOrderDetail?.deliveryFee || selectedOrderForDetail?.deliveryFee) >= 0) && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: D.textSub }}>Delivery Fee</Text>
                            <Text style={{ fontSize: 13, color: D.text }}>
                              Rs. {activeOrderDetail?.deliveryFee ?? selectedOrderForDetail?.deliveryFee ?? 0}
                            </Text>
                          </View>
                        )}
                        
                        {((activeOrderDetail?.taxAmount || selectedOrderForDetail?.taxAmount) >= 0) && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: D.textSub }}>Taxes & Platform Fees</Text>
                            <Text style={{ fontSize: 13, color: D.text }}>
                              Rs. {activeOrderDetail?.taxAmount ?? selectedOrderForDetail?.taxAmount ?? 0}
                            </Text>
                          </View>
                        )}
                        
                        {((activeOrderDetail?.discountAmount || selectedOrderForDetail?.discountAmount) > 0) && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>Discount</Text>
                            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
                              - Rs. {activeOrderDetail?.discountAmount || selectedOrderForDetail?.discountAmount}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={[styles.divider, { backgroundColor: D.divider, marginVertical: 8 }]} />
                      
                      <View style={styles.summaryTotalRow}>
                        <Text style={[styles.summaryTotalLabel, { color: D.text }]}>
                          Total Paid ({activeOrderDetail?.paymentMethod || selectedOrderForDetail.paymentMethod})
                        </Text>
                        <Text style={styles.summaryTotalPrice}>
                          Rs. {activeOrderDetail?.totalAmount || selectedOrderForDetail.total}
                        </Text>
                      </View>
                    </View>

                    {/* Cancel Order Button (Only allowed before out_for_delivery / delivered / cancelled / rejected) */}
                    {(() => {
                      const status = (activeOrderDetail?.orderStatus || selectedOrderForDetail?.orderStatus || 'placed').toLowerCase();
                      const canCancel = ['placed', 'accepted', 'preparing', 'ready_for_pickup'].includes(status);
                      
                      if (!canCancel) return null;
                      
                      return (
                        <TouchableOpacity
                          onPress={handleCancelOrder}
                          style={{
                            backgroundColor: '#EF4444',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 16,
                            marginBottom: 8
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                            Cancel Order
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </ScrollView>
              </SafeAreaView>
            )}
          </Modal>

          {/* CATEGORY DISHES COLLECTION MODAL */}
          <Modal
            visible={selectedCategoryModal !== null}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setSelectedCategoryModal(null)}
          >
            {selectedCategoryModal && (
              <SafeAreaView style={[styles.safeArea, { backgroundColor: D.bg }]}>
                <View style={[styles.modalHeader, { backgroundColor: D.card, borderBottomColor: D.cardBorder, justifyContent: 'center', position: 'relative', height: 56, paddingVertical: 0 }]}>
                  <TouchableOpacity
                    style={[styles.closeCircleBtn, { position: 'absolute', left: 16 }]}
                    onPress={() => setSelectedCategoryModal(null)}
                  >
                    <ArrowLeft size={20} color={D.text} />
                  </TouchableOpacity>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '70%' }}>
                    {selectedCategoryModal.icon ? <Text style={{ fontSize: 20, marginRight: 6 }}>{selectedCategoryModal.icon}</Text> : null}
                    <Text style={[styles.modalHeaderTitle, { color: D.heading, textAlign: 'center', flex: 0 }]} numberOfLines={1}>
                      {selectedCategoryModal.name} Collection
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.cartIconBtnModal, { position: 'absolute', right: 16 }]}
                    onPress={() => { setSelectedCategoryModal(null); setIsCartOpen(true); }}
                  >
                    <ShoppingBag size={18} color={D.text} />
                    {cartItems.length > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: D.textSub }}>
                      Top {selectedCategoryModal.name} specials across all restaurants
                    </Text>
                  </View>

                  {(() => {
                    const catId = selectedCategoryModal.id;
                    const catName = selectedCategoryModal.name.toLowerCase();
                    const categoryDishes = allDishes.filter(item => {
                      if (onlyVeg && !item.isVeg) return false;
                      const itemName = item.name.toLowerCase();
                      const itemCatName = (item.categoryName || '').toLowerCase();
                      const restCat = (item.restaurant?.category || '').toLowerCase();

                      if (catId === 'burger') return itemName.includes('burger') || restCat === 'burger' || itemCatName.includes('burger');
                      if (catId === 'indian') return itemName.includes('biryani') || itemName.includes('masala') || itemName.includes('curry') || restCat === 'indian' || itemCatName.includes('biryani');
                      if (catId === 'pizza') return itemName.includes('pizza') || itemName.includes('pasta') || restCat === 'pizza' || itemCatName.includes('pizza');
                      if (catId === 'middle_eastern') return itemName.includes('shawarma') || itemName.includes('kebab') || itemName.includes('wrap') || itemName.includes('grill') || restCat === 'middle_eastern';
                      if (catId === 'seafood') return itemName.includes('fish') || itemName.includes('prawn') || itemName.includes('seafood') || itemName.includes('crab') || itemName.includes('squid') || restCat === 'seafood';
                      if (catId === 'healthy') return itemName.includes('bowl') || itemName.includes('salad') || itemName.includes('smoothie') || restCat === 'healthy';
                      if (catId === 'desserts') return itemName.includes('cake') || itemName.includes('ice cream') || itemName.includes('shake') || itemName.includes('sweet') || itemName.includes('dessert') || itemName.includes('payasam') || restCat === 'desserts';
                      return restCat === catId || itemCatName.includes(catName);
                    });

                    if (categoryDishes.length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <Utensils size={48} color="#9CA3AF" />
                          <Text style={[styles.emptyTitle, { color: D.heading }]}>No dishes found</Text>
                          <Text style={[styles.emptySubtitle, { color: D.textSub }]}>Try clearing filters to see options</Text>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.gridContainer}>
                        {categoryDishes.map((item, idx) => {
                          const inCart = cartItems.some(c => c.id === item.id);
                          return (
                            <TouchableOpacity
                              key={`cat-dish-${idx}-${item.id}`}
                              style={[styles.gridCard, { backgroundColor: D.card, borderColor: D.cardBorder }]}
                              activeOpacity={0.85}
                              onPress={() => {
                                openProductDetails(item, item.restaurant);
                              }}
                            >
                              <View style={{ position: 'relative' }}>
                                <Image source={{ uri: item.image }} style={styles.gridCardImg} />
                                <TouchableOpacity
                                  style={[styles.store99AddBtn, inCart && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                  onPress={() => openCustomizer(item, item.restaurant)}
                                >
                                  <Text style={[styles.store99AddBtnText, inCart && { color: '#ffffff' }]}>{inCart ? 'ADDED ✓' : 'ADD +'}</Text>
                                </TouchableOpacity>
                              </View>
                              <View style={styles.gridCardBody}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                  <View style={[styles.vegBadgeIcon, { borderColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                                    <View style={[styles.vegBadgeDot, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]} />
                                  </View>
                                  <Text style={[styles.gridCardTitle, { color: D.text, marginLeft: 4 }]} numberOfLines={1}>{item.name}</Text>
                                </View>
                                <Text style={[styles.gridCardSub, { color: D.textSub }]} numberOfLines={1}>by {item.restaurant?.name || 'QuickBite'}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  <Text style={styles.gridCardPrice}>₹{item.price}</Text>
                                  <View style={styles.itemRatingChip}>
                                    <Star size={9} color="#B45309" fill="#B45309" />
                                    <Text style={styles.itemRatingText}>{calculateAverageRating(item)}</Text>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })()}
                </ScrollView>
                {renderFloatingCartBar(70)}
              </SafeAreaView>
            )}
          </Modal>

        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  tabContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 26 : 24,
    paddingBottom: 110
  },
  fullScreenBg: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  authBgImage: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  authOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)'
  },
  authContainer: {
    padding: 24,
    justifyContent: 'center',
    minHeight: height - 50
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandEmoji: {
    fontSize: 52,
    marginBottom: 6
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#F3F4F6',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 4
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 1
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  tabBtnTextActive: {
    color: '#FF5252'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingRight: 12
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827'
  },
  eyeBtn: {
    padding: 4
  },
  primaryBtn: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  demoLoginBtn: {
    alignItems: 'center',
    marginTop: 12
  },
  demoLoginText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center'
  },
  swiggyTopTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },
  swiggyTopTabActive: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FF5252'
  },
  swiggyTopTabText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  swiggyTopTabTextActive: {
    color: '#FF5252'
  },
  swiggySectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 4
  },
  swiggyAvatarOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  swiggyCircularAvatarBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  swiggyCircularAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32
  },
  swiggyCircularAvatarLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  swiggyGreenCartBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#059669',
    borderRadius: 16,
    elevation: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 99999
  },
  swiggyGreenCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  swiggyGreenCartLeftText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  swiggyGreenCartRightText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  floatingCartCheckoutBar: {
    position: 'absolute',
    bottom: 70,
    left: 14,
    right: 14,
    zIndex: 99999
  },
  headerBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1
  },
  headerBrandIcon: {
    fontSize: 15,
    marginRight: 3
  },
  headerBrandText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2
  },
  skeletonCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden'
  },
  skeletonImg: {
    width: '100%',
    height: 140
  },
  skeletonLine: {
    borderRadius: 6
  },
  foodLoaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36
  },
  offerFoodGridCard: {
    width: '47%',
    margin: '1.5%',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1
  },
  offerFoodImg: {
    width: '100%',
    height: 100,
    borderRadius: 12
  },
  heroDualSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 3,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6
  },
  heroDualTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 13
  },
  heroDualTabActiveFood: {
    backgroundColor: '#FF5252'
  },
  heroDualTabActiveInsta: {
    backgroundColor: '#0284C7'
  },
  heroDualTabInactive: {
    backgroundColor: 'transparent'
  },
  heroDualIcon: {
    fontSize: 16,
    marginRight: 6
  },
  heroDualText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8'
  },
  heroDualTextActive: {
    color: '#ffffff'
  },
  instamartBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6
  },
  instamartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900'
  },
  swiggySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginVertical: 10
  },
  swiggySearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 8
  },
  swiggySearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8
  },
  swiggyVegToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1
  },
  swiggyVegToggleActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  swiggyVegToggleText: {
    fontSize: 12,
    fontWeight: '900'
  },
  birthdayBashCard: {
    backgroundColor: '#FF4500',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6
  },
  bashHeaderBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  bashHeaderBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900'
  },
  birthdayBashTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  birthdayBashSub: {
    color: '#FEF2F2',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 10
  },
  birthdayBashBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  birthdayBashBtnText: {
    color: '#FF4500',
    fontSize: 11,
    fontWeight: '900'
  },
  scallopedDealCard: {
    width: 100,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  scallopedImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6
  },
  scallopedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4
  },
  scallopedTag: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  scallopedTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900'
  },
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1
  },
  weatherText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15
  },
  quickPillFilter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6
  },
  quickPillActive: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252'
  },
  quickPillText: {
    fontSize: 10,
    fontWeight: '900'
  },
  cardStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    elevation: 3
  },
  cardStepperContainerSmall: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  cardStepperBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardStepperQtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    marginHorizontal: 6
  },
  swiggyEmojiBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  khaoGullyBanner: {
    width: '100%',
    height: 125,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  khaoGullyOverlay: {
    backgroundColor: 'rgba(185, 28, 28, 0.85)',
    flex: 1,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center'
  },
  khaoGullyTitle: {
    color: '#FEF08A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1
  },
  khaoGullySubtitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  khaoGullyBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  khaoGullyBtnText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '900'
  },
  store99Card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  store99ItemCard: {
    width: 125,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    overflow: 'hidden'
  },
  store99ItemImg: {
    width: '100%',
    height: 90,
    backgroundColor: '#E2E8F0'
  },
  store99AddBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    elevation: 3
  },
  store99AddBtnText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '900'
  },
  store99ItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4
  },
  vegBadgeIcon: {
    width: 10,
    height: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2
  },
  vegBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2
  },
  swiggyFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8
  },
  swiggyFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  addressCity: {
    fontSize: 12,
    color: '#6B7280'
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cartIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  cartIconBtnModal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginHorizontal: 10
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  toastBannerRight: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 99999,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: width * 0.85
  },
  toastBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827'
  },
  vegFilterBtn: {
    marginLeft: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center'
  },
  vegFilterActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  vegFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151'
  },
  vegFilterTextActive: {
    color: '#059669'
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  categoryChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8
  },
  categoryChipActive: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252'
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151'
  },
  categoryChipTextActive: {
    color: '#ffffff'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  gridCardImg: {
    width: '100%',
    height: 110
  },
  gridCardBody: {
    padding: 10
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  gridCardSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  gridCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 4
  },
  dishSearchCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  dishSearchImg: {
    width: '100%',
    height: 90
  },
  dishSearchBody: {
    padding: 8
  },
  dishSearchName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827'
  },
  dishSearchRest: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2
  },
  dishSearchPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  sectionCount: {
    fontSize: 13,
    color: '#6B7280'
  },
  restaurantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2
  },
  restaurantImg: {
    width: '100%',
    height: 160
  },
  offerBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#FF5252',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  offerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  favFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContent: {
    padding: 14
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  restaurantTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3
  },
  restaurantDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerInfoText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: '#D1D5DB'
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 90
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyStateCenter: {
    flex: 1,
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20
  },
  errorContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  orderCompactRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  orderCompactImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6'
  },
  orderCompactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  orderCompactSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  orderCompactPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 4
  },
  orderStatusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  orderStatusBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '800'
  },
  orderTrackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827'
  },
  orderTimeText: {
    fontSize: 12,
    color: '#6B7280'
  },
  liveBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  liveBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800'
  },
  timeline: {
    marginVertical: 12
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  timelineDotDone: {
    backgroundColor: '#10B981'
  },
  timelineNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280'
  },
  timelineContent: {
    marginLeft: 12
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  timelineLabelDone: {
    color: '#111827',
    fontWeight: '700'
  },
  timelineSub: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  driverVehicle: {
    fontSize: 12,
    color: '#6B7280'
  },
  callDriverBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderSummaryBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },
  summaryBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  summaryItemName: {
    fontSize: 13,
    color: '#4B5563'
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827'
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827'
  },
  summaryTotalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5252'
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  profileAvatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  profilePhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  adminCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  adminRestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827'
  },
  adminRestCat: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2
  },
  navLabelActive: {
    color: '#FF5252'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center'
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverImg: {
    width: '100%',
    height: 200
  },
  restDetailBody: {
    padding: 16
  },
  restDetailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827'
  },
  restDetailAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  restDetailDesc: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 8
  },
  menuHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827'
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 2
  },
  itemDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  itemThumb: {
    width: 80,
    height: 80,
    borderRadius: 10
  },
  addBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: -10
  },
  addBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800'
  },
  productDetailHeroImg: {
    width: '100%',
    height: 240
  },
  vegBadgeTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    elevation: 2
  },
  productBody: {
    padding: 16
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827'
  },
  productPriceText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF5252',
    marginTop: 4
  },
  productRestName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2
  },
  productDescText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    lineHeight: 20
  },
  detailSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 10
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  ingredientChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 4
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  ratingBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  ratingBadgeLargeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 4
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827'
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  starsRow: {
    flexDirection: 'row'
  },
  reviewComment: {
    fontSize: 13,
    color: '#374151',
    marginTop: 6,
    lineHeight: 18
  },
  productBottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  customizerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  customizerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  customizerSub: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 2
  },
  customSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
    marginBottom: 8
  },
  optionRow: {
    flexDirection: 'row'
  },
  optionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8
  },
  optionChipActive: {
    backgroundColor: '#FF5252'
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151'
  },
  optionChipTextActive: {
    color: '#ffffff'
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  addonName: {
    fontSize: 13,
    color: '#374151'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252'
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  qtyText: {
    marginHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827'
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  cartItemImg: {
    width: 60,
    height: 60,
    borderRadius: 8
  },
  cartItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  cartItemRest: {
    fontSize: 12,
    color: '#6B7280'
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF5252',
    marginTop: 2
  },
  qtyBoxSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  qtyTextSmall: {
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827'
  },
  promoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6
  },
  promoInputRow: {
    flexDirection: 'row'
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    color: '#111827'
  },
  applyBtn: {
    marginLeft: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  errorTextSmall: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 4
  },
  successTextSmall: {
    color: '#059669',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600'
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 8
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  billLabel: {
    fontSize: 13,
    color: '#6B7280'
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827'
  },
  billLabelGreen: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600'
  },
  billValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669'
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827'
  },
  billTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5252'
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8
  },
  checkoutAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  paymentRowSelected: {
    borderColor: '#FF5252',
    backgroundColor: '#FFF5F5'
  },
  paymentLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB'
  },
  radioSelected: {
    borderColor: '#FF5252',
    backgroundColor: '#FF5252'
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10
  },
  gpsDetectBtnText: {
    marginLeft: 8,
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700'
  },
  locationSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginVertical: 8
  },
  locationSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827'
  },
  addressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  addressItemActive: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8
  },
  addReviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  addReviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8
  },
  starSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  starScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 10
  },
  reviewTextInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 65,
    marginBottom: 10
  },
  submitReviewBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  submitReviewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  itemRatingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8
  },
  itemRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 3
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginBottom: 12
  },
  profileAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FF5252'
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF5252',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12
  },
  editProfileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  },
  profileEditCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  avatarOptionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative'
  },
  avatarOptionCircleSelected: {
    borderColor: '#FF5252'
  },
  avatarOptionImg: {
    width: '100%',
    height: '100%',
    borderRadius: 23
  },
  avatarCheckBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5252',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelProfileBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelProfileBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600'
  },
  // Redesigned Restaurant Details modal styles
  rdFixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000
  },
  rdHeaderTitleText: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  rdStickyContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    borderBottomWidth: 1
  },
  rdSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44
  },
  rdSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    marginRight: 8
  },
  rdFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  rdFilterChipText: {
    fontSize: 12,
    fontWeight: '600'
  },
  rdRestaurantCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  rdTopLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  rdTopLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  rdRestaurantName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6
  },
  rdRestaurantMeta: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  rdRestaurantDesc: {
    fontSize: 12,
    lineHeight: 16
  },
  rdRatingBox: {
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 70
  },
  rdRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  rdRatingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  rdRatingCountText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center'
  },
  rdOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 160
  },
  rdOfferTitle: {
    fontSize: 12,
    fontWeight: '700'
  },
  rdOfferSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1
  },
  rdMenuHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1
  },
  rdMenuHeadingText: {
    fontSize: 16,
    fontWeight: '800'
  },
  rdFoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  rdFoodCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  rdFoodImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative'
  },
  rdFoodImage: {
    width: '100%',
    height: '100%'
  },
  rdFoodFavBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  rdVegBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10
  },
  rdVegBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  rdBestsellerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10
  },
  rdBestsellerText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  rdFoodCardBody: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between'
  },
  rdFoodName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    height: 32
  },
  rdFoodMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  rdFoodMetaText: {
    fontSize: 10,
    fontWeight: '705'
  },
  rdFoodFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  rdFoodPrice: {
    fontSize: 13,
    fontWeight: '800'
  },
  rdAddBtn: {
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  rdAddBtnText: {
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '800'
  },
  // Redesigned Food details modal styles
  rdFoodDetailsImageWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    position: 'relative',
    borderWidth: 0,
    padding: 0
  },
  rdFoodDetailsHeroImg: {
    width: width - 32,
    height: 220,
    resizeMode: 'cover',
    borderRadius: 16
  },
  rdFoodDetailsFavBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  rdCarouselDotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  rdCarouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3
  },
  rdCarouselDotActive: {
    width: 14,
    backgroundColor: '#FF5252'
  },
  rdFoodDetailsBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    zIndex: 9999
  },
  rdFoodDetailsBottomBarBtn: {
    backgroundColor: '#FF5252',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  rdFoodDetailsBottomBarBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  }
});
