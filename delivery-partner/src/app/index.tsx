import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Image, 
  Dimensions, 
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  BackHandler,
  Modal,
  Alert,
  Animated,
  PanResponder,
  useColorScheme,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Map as MapView, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { api, getAuthToken, setAuthToken, resolveApiUrl } from '../services/api';
import { startBaseUrlDetection } from '../services/apiResolver';
import { routingService } from '../services/routingService';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';

const BACKGROUND_LOCATION_TASK_NAME = 'QUICKBITE_BACKGROUND_DELIVERY_LOCATION';
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('[PUSH] expo-notifications native module not available:', error);
}
import Constants from 'expo-constants';

let appName = 'QuickBite Partner';
try {
  const branding = require('../../branding.generated.json');
  if (branding && branding.appName) {
    appName = branding.appName;
  }
} catch (e) {
  console.warn('[App] Could not read branding.generated.json, using default name.');
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[BACKGROUND WATCHER] Task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latestLoc = locations[locations.length - 1];
    const { latitude, longitude, accuracy, heading, speed } = latestLoc.coords;

    // Range check coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude) || Math.abs(latitude) < 0.0001 || Math.abs(longitude) < 0.0001) {
      console.warn('[BACKGROUND WATCHER] Invalid location ignored:', latitude, longitude);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('deliveryPartnerAccessToken');
      if (!token) return;

      const orderIdStr = await SecureStore.getItemAsync('deliveryPartnerActiveOrderId');
      if (!orderIdStr) return;

      const orderId = parseInt(orderIdStr, 10);
      if (isNaN(orderId)) return;

      await fetch(resolveApiUrl('/delivery-partners/me/active-delivery/location'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          heading: heading || undefined,
          speed: speed !== null && speed >= 0 ? speed : undefined,
          capturedAt: new Date(latestLoc.timestamp).toISOString(),
        }),
      });
    } catch (err: any) {
      console.warn('[BACKGROUND WATCHER] Update call failed:', err.message || err);
    }
  }
});

// Import Reusable Components
import Header from '../components/header';
import BottomNavigation from '../components/bottom-navigation';
import { 
  HomeStatsCard, 
  LargeEarningsCard, 
  PeriodStatsCard, 
  EarningsBreakdown 
} from '../components/summary-card';
import DeliveryCard from '../components/delivery-card';
import ProgressTimeline from '../components/progress-timeline';
import MapPlaceholder from '../components/map-placeholder';
import MenuRow from '../components/menu-row';
import OnlineStatus from '../components/online-status';

// Import Auth Components
import { 
  AuthHeader, 
  AuthInput, 
  PasswordInput, 
  PrimaryAuthButton 
} from '../components/auth-components';

const { width } = Dimensions.get('window');

// Initial mock completed orders data for history tab
const initialMockCompletedOrders = [
  {
    orderId: 'Order #QB1023',
    date: '20 Aug · 8:15 PM',
    filterGroup: ['today', 'week', 'month'],
    status: 'Delivered',
    restaurantName: 'Khao Gully',
    dropArea: 'Panampilly Nagar',
    distance: '4.6 km',
    paymentMode: 'Prepaid',
    earnings: 58
  },
  {
    orderId: 'Order #QB1021',
    date: '20 Aug · 6:40 PM',
    filterGroup: ['today', 'week', 'month'],
    status: 'Delivered',
    restaurantName: 'Burger Hub',
    dropArea: 'Kadavanthra',
    distance: '3.2 km',
    paymentMode: 'COD',
    codAmount: 280,
    earnings: 52
  },
  {
    orderId: 'Order #QB1018',
    date: '20 Aug · 2:20 PM',
    filterGroup: ['today', 'week', 'month'],
    status: 'Delivered',
    restaurantName: 'Food Corner',
    dropArea: 'Vyttila',
    distance: '5.1 km',
    paymentMode: 'Prepaid',
    earnings: 72
  },
  {
    orderId: 'Order #QB1015',
    date: '19 Aug · 9:10 PM',
    filterGroup: ['week', 'month'],
    status: 'Delivered',
    restaurantName: 'Pizza Hut',
    dropArea: 'Kaloor',
    distance: '6.5 km',
    paymentMode: 'Prepaid',
    earnings: 85
  },
  {
    orderId: 'Order #QB1012',
    date: '18 Aug · 7:30 PM',
    filterGroup: ['week', 'month'],
    status: 'Delivered',
    restaurantName: 'Khao Gully',
    dropArea: 'Edappally',
    distance: '8.2 km',
    paymentMode: 'COD',
    codAmount: 450,
    earnings: 110
  },
  {
    orderId: 'Order #QB1005',
    date: '10 Aug · 8:15 PM',
    filterGroup: ['month'],
    status: 'Delivered',
    restaurantName: 'Cafe Canopy',
    dropArea: 'Fort Kochi',
    distance: '12.0 km',
    paymentMode: 'Prepaid',
    earnings: 150
  }
];

function calculateDistance(
  lat1: number | null | undefined, 
  lon1: number | null | undefined, 
  lat2: number | null | undefined, 
  lon2: number | null | undefined
): number {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return 0;
  }
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

export default function AppIndex() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  };

  const insets = useSafeAreaInsets();
  const bottomNavHeight = 60 + Math.max(0, insets.bottom - 10);

  // Error deduplication refs and helpers for polling
  const lastLoggedErrorsRef = useRef<Record<string, string>>({});

  const logUniqueError = useCallback((category: string, errorMsg: string, level: 'error' | 'warn' = 'error') => {
    if (lastLoggedErrorsRef.current[category] !== errorMsg) {
      if (level === 'warn') {
        console.warn(errorMsg);
      } else {
        console.error(errorMsg);
      }
      lastLoggedErrorsRef.current[category] = errorMsg;
    }
  }, []);

  const clearUniqueError = useCallback((category: string) => {
    delete lastLoggedErrorsRef.current[category];
  }, []);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'earnings' | 'profile'>('home');

  // Delivery PIN Verification States (Phase 7)
  const [partnerPinInput, setPartnerPinInput] = useState('');
  const [partnerPinError, setPartnerPinError] = useState('');
  const [isVerifyingPartnerPin, setIsVerifyingPartnerPin] = useState(false);
  const partnerPinInputRef = useRef<TextInput>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const activeDeliveryScrollRef = useRef<ScrollView>(null);
  const [liveOnlineSeconds, setLiveOnlineSeconds] = useState(0);
  const [currentIstDateKey, setCurrentIstDateKey] = useState('');
  const [activeProfileSubScreen, setActiveProfileSubScreen] = useState<'main' | 'personal' | 'vehicle' | 'bank' | 'documents' | 'preferences'>('main');
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [personalUpdateError, setPersonalUpdateError] = useState('');
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      setDashboardStats(stats);
      setLiveOnlineSeconds(stats.onlineSeconds || 0);
      const dateKey = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
      setCurrentIstDateKey(dateKey);
      clearUniqueError('dashboard');
    } catch (err: any) {
      logUniqueError('dashboard', `[Dashboard] Fetch stats failed: ${err.message || err}`);
    }
  }, [clearUniqueError, logUniqueError]);
  
  // Unified Delivery State Machine:
  // - 'none': No active delivery, standard Available Deliveries Home screen.
  // - 'incoming-request': Displaying incoming delivery popup request with circular timer countdown.
  // - 'active-restaurant': Accepted request, step 1 (Reach Restaurant).
  // - 'active-pickup': Accepted request, step 2 (Confirm Pickup).
  // - 'active-start-delivery': Accepted request, step 3 (Start Delivery).
  // - 'active-delivery': Out for delivery, Customer Delivery screen.
  // - 'delivery-completed': Order completed success screen.
  const [deliveryState, setDeliveryState] = useState<'none' | 'incoming-request' | 'active-restaurant' | 'active-pickup' | 'active-start-delivery' | 'active-delivery' | 'delivery-completed'>('none');
  
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isMutatingOnline, setIsMutatingOnline] = useState(false);
  const [isCashCollected, setIsCashCollected] = useState(false);
  const [countdown, setCountdown] = useState(23);
  const [ordersSubTab, setOrdersSubTab] = useState<'available' | 'current' | 'completed'>('available');
  const [viewingActiveOrder, setViewingActiveOrder] = useState(false);
  const [justCompletedOrder, setJustCompletedOrder] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    todayEarnings: number;
    todayDeliveries: number;
    weeklyEarnings: number;
    weeklyDeliveries: number;
    monthlyEarnings: number;
    monthlyDeliveries: number;
    weeklyChart: Array<{
      day: string;
      value: number;
      height: number;
      selected?: boolean;
    }>;
    onlineMinutes: number;
    onlineSeconds?: number;
  }>({
    todayEarnings: 0,
    todayDeliveries: 0,
    weeklyEarnings: 0,
    weeklyDeliveries: 0,
    monthlyEarnings: 0,
    monthlyDeliveries: 0,
    weeklyChart: [
      { day: 'M', value: 0, height: 5 },
      { day: 'T', value: 0, height: 5 },
      { day: 'W', value: 0, height: 5 },
      { day: 'T', value: 0, height: 5 },
      { day: 'F', value: 0, height: 5 },
      { day: 'S', value: 0, height: 5 },
      { day: 'S', value: 0, height: 5 }
    ],
    onlineMinutes: 0,
    onlineSeconds: 0,
  });
  const [completedFilter, setCompletedFilter] = useState<'today' | 'week' | 'month' | 'all' | 'delivered' | 'cancelled_rejected'>('today');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showFullChartModal, setShowFullChartModal] = useState(false);
  const [isNavigationModalOpen, setIsNavigationModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedChartDayIdx, setSelectedChartDayIdx] = useState<number | null>(null);

  // Phase 5 assignment states
  const [incomingAssignment, setIncomingAssignment] = useState<any>(null);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [isAcceptingDeclining, setIsAcceptingDeclining] = useState(false);

  // Authentication local mock states -> now real states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'APPROVED' | 'PENDING' | 'ACTION_REQUIRED' | 'SUSPENDED'>('APPROVED');
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot-password' | 'verify-otp' | 'create-password' | 'password-updated'>('login');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPartner, setCurrentPartner] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isBackgroundTrackingActive, setIsBackgroundTrackingActive] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const isRequestingRef = useRef(false);
  const isFirstActiveRef = useRef(true);

  // Draggable Bottom Sheet States & Coordinate calculation for Incoming Request UI
  const [sheetState, setSheetState] = useState<'expanded' | 'collapsed'>('expanded');
  const [sheetHeight, setSheetHeight] = useState(600); // Measured height default
  const [riderCoords, setRiderCoords] = useState<{ latitude: number, longitude: number, heading?: number | null } | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const navCameraRef = useRef<any>(null);
  const [navRouteCoords, setNavRouteCoords] = useState<[number, number][]>([]);
  const [navDistanceKm, setNavDistanceKm] = useState<string | null>(null);
  const [isNavigatingLive, setIsNavigatingLive] = useState(false);
  const [navRouteSteps, setNavRouteSteps] = useState<any[]>([]);
  const [hasReachedCustomer, setHasReachedCustomer] = useState(false);
  const hasReachedCustomerRef = useRef(false);
  const alertShownRef = useRef(false);
  const bypassDetailsRef = useRef<{
    latitude: number;
    longitude: number;
    distance: number;
    timestamp: string;
  } | null>(null);
  const lastRiderCoordsRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const lastNavRouteFetchTimeRef = useRef<number>(0);
  const lastNavRouteFetchCoordsRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const [calculatedBearing, setCalculatedBearing] = useState(0);
  const deviceHeadingRef = useRef<number | null>(null);

  const updateHasReachedCustomer = (val: boolean) => {
    setHasReachedCustomer(val);
    hasReachedCustomerRef.current = val;
  };

  useEffect(() => {
    if (deliveryState !== 'active-delivery') {
      updateHasReachedCustomer(false);
      alertShownRef.current = false;
      bypassDetailsRef.current = null;
    }
  }, [deliveryState]);

  const handleVerifyDeliveryPress = () => {
    const riderLat = riderCoords?.latitude || 11.8744;
    const riderLng = riderCoords?.longitude || 75.3704;
    const order = activeAssignment?.order || {};
    let destLat = order.deliveryLatitude;
    let destLng = order.deliveryLongitude;
    if (!destLat || destLat === 0) {
      destLat = 11.8722;
    }
    if (!destLng || destLng === 0) {
      destLng = 75.3740;
    }

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const dist = getDistance(riderLat, riderLng, destLat, destLng);
    if (dist <= 100) {
      alertShownRef.current = true;
      updateHasReachedCustomer(true);
      setIsNavigationModalOpen(false);
      setIsNavigatingLive(false);
      Alert.alert(
        "Arrival",
        "You have reached the delivery location.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Warning",
        "Customer is at a different location. Do you want to verify delivery here?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              bypassDetailsRef.current = {
                latitude: riderLat,
                longitude: riderLng,
                distance: parseFloat((dist / 1000).toFixed(3)), // distance in km
                timestamp: new Date().toISOString()
              };
              updateHasReachedCustomer(true);
              setIsNavigationModalOpen(false);
              setIsNavigatingLive(false);
            }
          }
        ]
      );
    }
  };

  useEffect(() => {
    if (isNavigationModalOpen) {
      const order = activeAssignment?.order || {};
      let isPickup = deliveryState === 'active-restaurant' || 
                     deliveryState === 'active-pickup' || 
                     deliveryState === 'active-start-delivery';
      if (order && order.orderStatus) {
        const status = order.orderStatus.toLowerCase();
        if (status === 'accepted' || status === 'ready_for_pickup' || status === 'picked_up') {
          isPickup = true;
        } else if (status === 'out_for_delivery') {
          isPickup = false;
        }
      }
      let destLat = isPickup ? order.restaurantLatitude : order.deliveryLatitude;
      let destLng = isPickup ? order.restaurantLongitude : order.deliveryLongitude;
      if (!destLat || destLat === 0) {
        destLat = isPickup ? 11.8744 : 11.8722;
      }
      if (!destLng || destLng === 0) {
        destLng = isPickup ? 75.3704 : 75.3740;
      }

      const riderLat = (riderCoords && riderCoords.latitude) ? riderCoords.latitude : 11.8744;
      const riderLng = (riderCoords && riderCoords.longitude) ? riderCoords.longitude : 75.3704;

      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // meters
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const distMoved = lastNavRouteFetchCoordsRef.current
        ? getDistance(riderLat, riderLng, lastNavRouteFetchCoordsRef.current.latitude, lastNavRouteFetchCoordsRef.current.longitude)
        : Infinity;
      const timeSinceLastFetch = Date.now() - lastNavRouteFetchTimeRef.current;

      const shouldFetch = lastNavRouteFetchTimeRef.current === 0 || distMoved > 30 || timeSinceLastFetch > 15000;

      if (!shouldFetch) {
        return;
      }

      routingService.getRoute({
        originLatitude: riderLat,
        originLongitude: riderLng,
        destinationLatitude: destLat,
        destinationLongitude: destLng,
      }).then(res => {
        if (res.coordinates && res.coordinates.length > 0) {
          setNavRouteCoords(res.coordinates);
          setNavRouteSteps(res.steps || []);
          
          if (res.distanceMeters !== undefined && res.distanceMeters !== null) {
            const km = res.distanceMeters / 1000;
            setNavDistanceKm(km.toFixed(1) + ' km');
          } else {
            setNavDistanceKm(null);
          }

          let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
          for (const [lng, lat] of res.coordinates) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }

          if (!isNavigatingLive) {
            navCameraRef.current?.setStop({
              bounds: [minLng, minLat, maxLng, maxLat],
              padding: { left: 60, right: 60, top: 60, bottom: 60 },
              duration: 0,
            });
          }

          lastNavRouteFetchTimeRef.current = Date.now();
          lastNavRouteFetchCoordsRef.current = { latitude: riderLat, longitude: riderLng };
        }
      }).catch(err => {
        console.warn('[Navigate Routing] Failed to load route:', err);
        navCameraRef.current?.setStop({
          center: [riderLng, riderLat],
          zoom: 15,
          duration: 0,
        });
      });
    } else {
      setNavRouteCoords([]);
      setNavDistanceKm(null);
      setNavRouteSteps([]);
      setIsNavigatingLive(false);
      lastNavRouteFetchTimeRef.current = 0;
      lastNavRouteFetchCoordsRef.current = null;
    }
  }, [isNavigationModalOpen, deliveryState, activeAssignment, riderCoords, isNavigatingLive]);

  useEffect(() => {
    const riderLat = (riderCoords && riderCoords.latitude) ? riderCoords.latitude : 11.8744;
    const riderLng = (riderCoords && riderCoords.longitude) ? riderCoords.longitude : 75.3704;

    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const getCoordsBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      const brng = Math.atan2(y, x) * 180 / Math.PI;
      return (brng + 360) % 360;
    };

    if (isNavigatingLive && navRouteCoords && navRouteCoords.length > 1) {
      let targetPt = navRouteCoords[1];
      for (let i = 1; i < navRouteCoords.length; i++) {
        const pt = navRouteCoords[i];
        if (getDistanceMeters(riderLat, riderLng, pt[1], pt[0]) > 15) {
          targetPt = pt;
          break;
        }
      }
      const routeBrng = getCoordsBearing(riderLat, riderLng, targetPt[1], targetPt[0]);
      setCalculatedBearing(routeBrng);
    } else if (riderCoords) {
      if (riderCoords.heading !== undefined && riderCoords.heading !== null && riderCoords.heading !== 0) {
        setCalculatedBearing(riderCoords.heading);
      } else if (lastRiderCoordsRef.current) {
        const prev = lastRiderCoordsRef.current;
        const dist = getDistanceMeters(prev.latitude, prev.longitude, riderCoords.latitude, riderCoords.longitude);
        if (dist > 1.5) {
          const deltaBrng = getCoordsBearing(prev.latitude, prev.longitude, riderCoords.latitude, riderCoords.longitude);
          setCalculatedBearing(deltaBrng);
        }
      }
    }

    if (riderCoords) {
      lastRiderCoordsRef.current = { latitude: riderCoords.latitude, longitude: riderCoords.longitude };
    }
  }, [riderCoords, isNavigatingLive, navRouteCoords]);

  useEffect(() => {
    let headingSubscription: any = null;
    let lastHeading = 0;
    
    const startHeadingWatcher = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        headingSubscription = await Location.watchHeadingAsync((data) => {
          const headingVal = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          if (Math.abs(headingVal - lastHeading) > 1.0) {
            lastHeading = headingVal;
            deviceHeadingRef.current = headingVal;
            
            // Perform direct imperative MapLibre camera rotation update on the native thread
            if (navCameraRef.current && isNavigatingLive) {
              const rCoords = lastRiderCoordsRef.current;
              const riderLat = rCoords ? rCoords.latitude : 11.8744;
              const riderLng = rCoords ? rCoords.longitude : 75.3704;
              navCameraRef.current.setStop({
                center: [riderLng, riderLat],
                zoom: 17,
                pitch: 60,
                bearing: headingVal,
                padding: { top: 0, bottom: 220, left: 0, right: 0 },
                duration: 200, // Butter-smooth high-frequency native updates
              });
            }
          }
        });
      } catch (err) {
        console.warn('[Heading Watcher] Failed to watch heading:', err);
      }
    };

    if (isNavigationModalOpen && isNavigatingLive) {
      startHeadingWatcher();
    } else {
      deviceHeadingRef.current = null;
    }

    return () => {
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, [isNavigationModalOpen, isNavigatingLive]);

  useEffect(() => {
    if (isNavigationModalOpen && isNavigatingLive) {
      const riderLat = (riderCoords && riderCoords.latitude) ? riderCoords.latitude : 11.8744;
      const riderLng = (riderCoords && riderCoords.longitude) ? riderCoords.longitude : 75.3704;
      const targetBearing = deviceHeadingRef.current !== null ? deviceHeadingRef.current : calculatedBearing;
      navCameraRef.current?.setStop({
        center: [riderLng, riderLat],
        zoom: 17,
        pitch: 60,
        bearing: targetBearing,
        padding: { top: 0, bottom: 220, left: 0, right: 0 },
        duration: 500, // Smooth position panning interpolation
      });
    }
  }, [riderCoords, isNavigatingLive, isNavigationModalOpen, calculatedBearing]);

  const COLLAPSED_HEIGHT = 140; // Preview height
  const panY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const handleScroll = (event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  const animateToState = (state: 'expanded' | 'collapsed') => {
    const targetY = state === 'collapsed' ? (sheetHeight - COLLAPSED_HEIGHT) : 0;
    Animated.spring(panY, {
      toValue: targetY,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      setSheetState(state);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isCollapsed = sheetState === 'collapsed';
        if (isCollapsed) {
          return gestureState.dy < -5;
        }

        const touchYOnSheet = evt.nativeEvent.locationY;
        const isHeaderTouch = touchYOnSheet < 140;
        if (isHeaderTouch) {
          return Math.abs(gestureState.dy) > 5;
        }

        const isDraggingDown = gestureState.dy > 5;
        if (isDraggingDown && scrollY.current <= 0) {
          return true;
        }

        return false;
      },
      onPanResponderMove: (evt, gestureState) => {
        let newPanY = gestureState.dy;
        if (sheetState === 'collapsed') {
          newPanY = (sheetHeight - COLLAPSED_HEIGHT) + gestureState.dy;
        }

        const maxTranslate = sheetHeight - COLLAPSED_HEIGHT;
        if (newPanY < 0) {
          newPanY = 0;
        } else if (newPanY > maxTranslate) {
          newPanY = maxTranslate;
        }

        panY.setValue(newPanY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const maxTranslate = sheetHeight - COLLAPSED_HEIGHT;
        const currentPanY = sheetState === 'collapsed'
          ? maxTranslate + gestureState.dy
          : gestureState.dy;

        const threshold = maxTranslate / 2;
        const shouldCollapse = gestureState.vy > 0.5 || currentPanY > threshold;

        if (shouldCollapse) {
          animateToState('collapsed');
        } else {
          animateToState('expanded');
        }
      },
    })
  ).current;

  useEffect(() => {
    if (deliveryState !== 'incoming-request') {
      panY.setValue(0);
      setSheetState('expanded');
    }
  }, [deliveryState]);

  useEffect(() => {
    if (deliveryState === 'incoming-request' && incomingAssignment) {
      const getRiderLocation = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            let loc = await Location.getLastKnownPositionAsync();
            const isFresh = loc && (Date.now() - loc.timestamp < 60000); // 60s freshness check
            
            if (!loc || !isFresh) {
              const positionPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
              loc = await Promise.race([positionPromise, timeoutPromise]);
            }
            
            if (loc && loc.coords) {
              setRiderCoords({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
              });
            }
          }
        } catch (err) {
          console.warn('[Location] Failed to get rider location for incoming request:', err);
        }
      };
      getRiderLocation();
    } else {
      setRiderCoords(null);
    }
  }, [deliveryState, incomingAssignment]);

  const startTrackingCoordinator = async (orderId: number, useBackground: boolean) => {
    try {
      if (useBackground) {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
        if (isRegistered && isBackgroundTrackingActive) {
          console.log('[TRACKING COORDINATOR] Background location updates already active, skipping restart.');
          return;
        }
      }

      await stopTrackingCoordinator();

      // Persist tracking-enabled state and activeOrderId to SecureStore
      await SecureStore.setItemAsync('deliveryPartnerActiveOrderId', orderId.toString());
      await SecureStore.setItemAsync('deliveryPartnerTrackingEnabled', 'true');

      if (useBackground) {
        console.log('[TRACKING COORDINATOR] Starting background-capable location tracking...');
        setIsBackgroundTrackingActive(true);
        
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 15, // 15 meters
          foregroundService: {
            notificationTitle: 'QuickBite delivery in progress',
            notificationBody: 'Live location is being shared for your active delivery.',
            notificationColor: '#F97316',
          },
          pausesUpdatesAutomatically: false,
        });
      } else {
        console.log('[TRACKING COORDINATOR] Starting foreground location tracking fallback...');
        setIsBackgroundTrackingActive(false);
      }
    } catch (err) {
      console.warn('[TRACKING COORDINATOR] Error starting location tracking:', err);
    }
  };

  const stopTrackingCoordinator = async () => {
    try {
      console.log('[TRACKING COORDINATOR] Stopping location tracking...');
      
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
      }
      setIsBackgroundTrackingActive(false);

      await SecureStore.deleteItemAsync('deliveryPartnerActiveOrderId');
      await SecureStore.setItemAsync('deliveryPartnerTrackingEnabled', 'false');
    } catch (err) {
      console.warn('[TRACKING COORDINATOR] Error stopping location tracking:', err);
    }
  };

  const handleLogout = async (forceLocalOnly = false) => {
    // Clean up background location tracking on logout
    await stopTrackingCoordinator();

    if (!forceLocalOnly) {
      try {
        await api.updateOnlineStatus(false);
      } catch (err) {
        console.warn('Logout offline request failed (non-blocking):', err);
      }
    }
    await setAuthToken(null);
    setAuthTokenState(null);
    setActiveProfileSubScreen('main');
    setCurrentUser(null);
    setCurrentPartner(null);
    setIsOnline(false);
    setIsAvailable(false);
    setIsAuthenticated(false);
    setDeliveryState('none');
    setIncomingAssignment(null);
    setActiveAssignment(null);
    setAvailableOrders([]);
    setOrdersSubTab('current');
    setActiveTab('home');
    changeAuthScreen('login');
  };

  // Login Form states
  const [loginEmailMobile, setLoginEmailMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginEmailMobileError, setLoginEmailMobileError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  const [loginFormError, setLoginFormError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot Password flow states
  const [resetMobile, setResetMobile] = useState('');
  const [resetMobileError, setResetMobileError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(30);
  const otpResendIntervalRef = useRef<any>(null);

  // Create Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const countdownIntervalRef = useRef<any>(null);

  // Rahul Profile Image Mock (using a high-quality free headshot)
  const profileImageUri = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop';

  // Manage Countdown Timer for Incoming Requests derived from expiresAt
  const startIncomingRequestTimer = (expiresAt: string) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const updateCountdown = () => {
      const expiresAtTime = new Date(expiresAt).getTime();
      const nowTime = Date.now();
      const remainingSec = Math.max(0, Math.floor((expiresAtTime - nowTime) / 1000));
      setCountdown(remainingSec);

      if (remainingSec <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setDeliveryState('none');
        setIncomingAssignment(null);
      }
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);
  };

  const changeDeliveryState = (newState: typeof deliveryState, expiresAt?: string) => {
    setDeliveryState(newState);
    if (newState === 'incoming-request' && expiresAt) {
      startIncomingRequestTimer(expiresAt);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  };

  const syncActiveDeliveryState = async () => {
    try {
      const deliveryData = await api.getActiveDelivery();
      if (deliveryData && deliveryData.assignment) {
        setActiveAssignment(deliveryData.assignment);
        setViewingActiveOrder(true);
        const status = deliveryData.assignment.order?.orderStatus;
        if (status === 'picked_up') {
          setDeliveryState('active-start-delivery');
          await stopTrackingCoordinator();
        } else if (status === 'out_for_delivery') {
          setDeliveryState('active-delivery');
          const restoreTracking = async () => {
            const { status: fgCheck } = await Location.getForegroundPermissionsAsync();
            const { status: bgCheck } = await Location.getBackgroundPermissionsAsync();
            
            if (fgCheck === 'granted') {
              const useBackground = bgCheck === 'granted';
              await startTrackingCoordinator(deliveryData.assignment.order.id, useBackground);
            } else {
              await stopTrackingCoordinator();
            }
          };
          restoreTracking();
        } else if (status === 'ready_for_pickup') {
          setDeliveryState(prev => (prev === 'active-pickup' ? 'active-pickup' : 'active-restaurant'));
          await stopTrackingCoordinator();
        } else if (status === 'preparing' || status === 'accepted') {
          setDeliveryState('active-restaurant');
          await stopTrackingCoordinator();
        } else {
          setDeliveryState('none');
          setActiveAssignment(null);
          setViewingActiveOrder(false);
          await stopTrackingCoordinator();
        }
        setIsAvailable(false);
        if (deliveryData.assignment.order && deliveryData.assignment.order.cashCollectedAt) {
          setIsCashCollected(true);
        } else {
          setIsCashCollected(false);
        }
      } else {
        setDeliveryState(prev => (prev !== 'incoming-request' && prev !== 'delivery-completed') ? 'none' : prev);
        setActiveAssignment(null);
        setViewingActiveOrder(false);
        await stopTrackingCoordinator();
      }
    } catch (activeErr) {
      console.error('Failed to sync active delivery:', activeErr);
    }
  };

  const completeActiveOrder = async () => {
    if (!activeAssignment || !activeAssignment.order || isAcceptingDeclining) return;
    setIsAcceptingDeclining(true);
    try {
      const result = await api.updateDeliveryOrderStatus(activeAssignment.order.id, 'delivered');
      await stopTrackingCoordinator();
      
      const order = activeAssignment.order;
      const earningsAmount = result.financials?.totalEarned !== undefined ? result.financials.totalEarned : 65;
      
      // 1. Store authoritative completion response and enter success screen state immediately
      if (order && order.items && result) {
        if (!result.order) {
          result.order = {};
        }
        result.order.items = order.items;
      }
      setJustCompletedOrder(result);
      setViewingActiveOrder(false);
      changeDeliveryState('delivery-completed');

      // 2. Perform active delivery cleanup
      setIncomingAssignment(null);
      setActiveAssignment(null);
      setIsCashCollected(false);

      // 3. Perform background refreshes
      try {
        const profile = await api.getMe();
        setCurrentUser(profile.partner.user);
        setCurrentPartner(profile.partner);
        setAccountStatus(profile.partner.accountStatus);
        setIsOnline(profile.partner.isOnline);
        setIsAvailable(profile.partner.isAvailable);
      } catch (meErr) {
        console.error('Failed to refresh profile:', meErr);
      }
      
      await fetchDashboardStats();
      await fetchCompletedOrders();
      
      // 4. Update local state to show completed order with exact backend earnings
      const newCompletedOrder = {
        orderId: `Order ${order.orderNumber || ''}`,
        date: new Date().toLocaleString(),
        filterGroup: ['today', 'week', 'month'],
        status: 'Delivered',
        restaurantName: order.restaurantName || 'QuickBite Kitchen',
        dropArea: order.deliveryAddress || 'Drop Location',
        distance: result.delivery?.totalDistance ? `${result.delivery.totalDistance} km` : '—',
        paymentMode: order.paymentMethod?.toUpperCase() === 'COD' ? 'COD' : 'Prepaid',
        codAmount: order.paymentMethod?.toUpperCase() === 'COD' ? order.amount : undefined,
        earnings: earningsAmount
      };
      setCompletedOrders(prev => [newCompletedOrder, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Failed to complete delivery');
    } finally {
      setIsAcceptingDeclining(false);
    }
  };

  useEffect(() => {
    if (lockoutCountdown <= 0) return;
    const interval = setInterval(() => {
      setLockoutCountdown(prev => {
        if (prev <= 1) {
          setPartnerPinError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutCountdown]);

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPartnerPinInput(digits);
    if (partnerPinError) setPartnerPinError('');
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      activeDeliveryScrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handlePartnerVerifyPin = async () => {
    if (!partnerPinInput || partnerPinInput.length !== 4) {
      setPartnerPinError('Please enter a 4-digit PIN.');
      return;
    }
    setPartnerPinError('');
    setIsVerifyingPartnerPin(true);
    try {
      const res = await api.verifyActiveDeliveryPin(
        partnerPinInput,
        bypassDetailsRef.current?.latitude,
        bypassDetailsRef.current?.longitude,
        bypassDetailsRef.current?.distance,
        bypassDetailsRef.current?.timestamp
      );
      if (res.verified) {
        // Update local activeAssignment state to mark it verified
        setActiveAssignment((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            order: {
              ...prev.order,
              deliveryPinVerified: true,
            }
          };
        });
        setPartnerPinInput('');
        // Dismiss keyboard
        partnerPinInputRef.current?.blur();
      }
    } catch (err: any) {
      const errMsg = err.message || 'Incorrect delivery PIN. Please check with the customer.';
      setPartnerPinError(errMsg);
      setPartnerPinInput('');
      
      if (errMsg.includes('Too many attempts') || errMsg.includes('wait a moment')) {
        setLockoutCountdown(60);
      } else {
        // Re-focus TextInput for retry
        setTimeout(() => {
          partnerPinInputRef.current?.focus();
        }, 100);
      }
    } finally {
      setIsVerifyingPartnerPin(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAuthToken();
        setAuthTokenState(token);
        if (token) {
          const data = await api.getMe();
          setCurrentUser(data.partner.user);
          setCurrentPartner(data.partner);
          setAccountStatus(data.partner.accountStatus);
          setIsOnline(data.partner.isOnline);
          setIsAvailable(data.partner.isAvailable);
          setIsAuthenticated(true);

          if (data.partner.accountStatus === 'APPROVED') {
            await syncActiveDeliveryState();
          }
        }
      } catch (err) {
        const error = err as any;
        console.error('Session restoration failed:', error);
        await setAuthToken(null);
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!selectedPreviewDoc || !authToken) {
      setPreviewImageUri(null);
      setPreviewError('');
      return;
    }

    const loadDocImage = async () => {
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewImageUri(null);
      try {
        const url = resolveApiUrl(selectedPreviewDoc.previewUrl);
        console.log('[Preview] Fetching:', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!res.ok) {
          throw new Error(`Failed to load document (Status: ${res.status})`);
        }

        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImageUri(reader.result as string);
          setPreviewLoading(false);
        };
        reader.onerror = () => {
          throw new Error('Failed to read document image data');
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.error('[Preview] Load error:', err);
        setPreviewError(err.message || 'Could not load document preview.');
        setPreviewLoading(false);
      }
    };

    loadDocImage();
  }, [selectedPreviewDoc, authToken]);

  const formatOnlineDuration = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}hr ${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  };

  const getISTDayStart = (date: Date) => {
    const year = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const month = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' });
    const day = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });
    const pad = (n: string) => String(n).padStart(2, '0');
    return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00+05:30`);
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      if (nextAppState === 'active' && isAuthenticated) {
        // App returned to foreground, check if date has changed
        const now = new Date();
        const dateKey = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
        setCurrentIstDateKey(prev => {
          if (prev && dateKey !== prev) {
            fetchDashboardStats();
            return dateKey;
          }
          return prev || dateKey;
        });
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchDashboardStats]);

  // Live Online Time Ticker (Phase 7)
  useEffect(() => {
    let interval: any = null;
    if (isOnline && isAuthenticated) {
      interval = setInterval(() => {
        // Midnight detection check
        const now = new Date();
        const dateKey = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
        
        setCurrentIstDateKey(prev => {
          if (prev && dateKey !== prev) {
            // Midnight reached! Fetch fresh stats and reset
            fetchDashboardStats();
            return dateKey;
          }
          return prev || dateKey;
        });

        setLiveOnlineSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setLiveOnlineSeconds(dashboardStats.onlineSeconds || 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, isAuthenticated, dashboardStats.onlineSeconds, fetchDashboardStats]);

  // Heartbeat sender (authenticated & online)
  useEffect(() => {
    let intervalId: any = null;

    const sendHeartbeat = async () => {
      try {
        const response = await api.heartbeat();
        // If the backend has marked the partner offline (due to stale heartbeat)
        if (response && response.isOnline === false) {
          console.log('[Heartbeat] Backend marked partner offline.');
          setIsOnline(false);
          setIsAvailable(false);
          await fetchDashboardStats();
        }
        clearUniqueError('heartbeat');
      } catch (err: any) {
        logUniqueError('heartbeat', `[Heartbeat] Failed to send heartbeat: ${err.message || err}`, 'warn');
      }
    };

    if (isOnline && isAuthenticated) {
      // Send immediately on going online
      sendHeartbeat();

      // Set interval to send every 25 seconds
      intervalId = setInterval(sendHeartbeat, 25000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOnline, isAuthenticated, fetchDashboardStats, logUniqueError, clearUniqueError]);

  // Automatically sync active delivery state from backend when app state resumes, tab changes, or active order screen opens
  useEffect(() => {
    if (isAuthenticated) {
      syncActiveDeliveryState();
    }
  }, [appState, activeTab, viewingActiveOrder, isAuthenticated]);

  // ─── PUSH NOTIFICATIONS REGISTRATION ──────────────────────────────────────
  const registerForPushNotificationsAsync = async () => {
    if (!Notifications) {
      console.log('[PUSH] Notifications module is not available (native module missing)');
      return null;
    }
    let token;
    
    // Expo Go vs Dev Client check
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
      console.warn('[PUSH] WARNING: Running in Expo Go! Custom EAS Project push notifications will not work correctly in Expo Go. You must use the custom Development Build (Dev Client).');
    } else {
      console.log('[PUSH] Running in custom Development Build (Dev Client) - OK!');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('quickbite-alerts-v5', {
        name: 'QuickBite Alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'quickbite_alert.wav',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#FF231F7C',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[PUSH] Failed to get push token: permission not granted');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || 'babb9a3e-3f0e-4387-ab2b-2da011752f04';
      console.log('[PUSH] Using EAS Project ID for push token registration:', projectId);
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[PUSH] Expo token generated:', token);
    } catch (error) {
      console.warn('[PUSH] Failed to retrieve Expo push token:', error);
    }

    return token;
  };

  const registerPushTokenForPartner = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (!pushToken) return;

      const token = await getAuthToken();
      if (!token) return;

      const endpointBase = await startBaseUrlDetection();
      const endpoint = `${endpointBase}/users/push-token`;

      console.log('[PUSH] Registering token');
      console.log(`[PUSH] User/Partner ID: ${currentPartner?.id || currentPartner?.userId}`);
      console.log(`[PUSH] Token: ${pushToken}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pushToken }),
      });
      if (res.ok) {
        console.log('[PUSH] Push token successfully registered on backend');
      } else {
        console.warn('[PUSH] Failed to register push token on backend:', res.status);
      }
    } catch (error) {
      console.warn('[PUSH] Error during push token registration:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      registerPushTokenForPartner();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!Notifications) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      const orderId = data?.orderId;
      if (orderId) {
        console.log('[PUSH] Tapped notification. Opening Navigate/Active Delivery screen for order:', orderId);
        setViewingActiveOrder(true);
        syncActiveDeliveryState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  const locationWatcherRef = useRef<any>(null);

  // Single unified foreground location watcher: updates UI coords always, updates backend API only if background tracking is inactive
  useEffect(() => {
    let active = true;

    const startWatcher = async () => {
      if (locationWatcherRef.current) {
        try {
          locationWatcherRef.current.remove();
        } catch (e) {}
        locationWatcherRef.current = null;
      }

      const isApproved = accountStatus === 'APPROVED' || currentPartner?.accountStatus === 'APPROVED';
      const hasActiveDelivery =
        deliveryState === 'active-restaurant' ||
        deliveryState === 'active-pickup' ||
        deliveryState === 'active-start-delivery' ||
        deliveryState === 'active-delivery';

      if (!isAuthenticated || !isApproved || !hasActiveDelivery || appState !== 'active') {
        return;
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[WATCHER] Location permission not granted, skipping watcher.');
        return;
      }

      // 1. Get initial position immediately to populate rider marker
      try {
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc && lastLoc.coords && active) {
          setRiderCoords({
            latitude: lastLoc.coords.latitude,
            longitude: lastLoc.coords.longitude,
            heading: lastLoc.coords.heading,
          });
        }
      } catch (e) {}

      console.log('[WATCHER] Starting foreground location watcher...');
      try {
        locationWatcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10, // UI updates every 10 meters
            timeInterval: 5000,   // Or every 5 seconds
          },
          async (loc) => {
            if (!active) return;

            // 1. Update UI coordinates locally only if moved meaningfully (> 2 meters or > 5 degrees heading change)
            setRiderCoords((prev) => {
              if (prev) {
                const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
                  const R = 6371e3; // meters
                  const phi1 = (lat1 * Math.PI) / 180;
                  const phi2 = (lat2 * Math.PI) / 180;
                  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
                  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
                  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                            Math.cos(phi1) * Math.cos(phi2) *
                            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  return R * c;
                };
                const dist = getDistance(prev.latitude, prev.longitude, loc.coords.latitude, loc.coords.longitude);
                const headingDiff = Math.abs((loc.coords.heading || 0) - (prev.heading || 0));
                if (dist < 2.0 && headingDiff < 5.0) {
                  return prev; // No state change, skips re-render!
                }
              }
              return {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                heading: loc.coords.heading,
              };
            });

            // 2. Check for customer arrival (30 meters radius) if out for delivery
            if (active && deliveryState === 'active-delivery' && !hasReachedCustomerRef.current) {
              const order = activeAssignment?.order || {};
              let destLat = order.deliveryLatitude;
              let destLng = order.deliveryLongitude;
              if (!destLat || destLat === 0) {
                destLat = 11.8722;
              }
              if (!destLng || destLng === 0) {
                destLng = 75.3740;
              }

              const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
                const R = 6371e3; // meters
                const phi1 = (lat1 * Math.PI) / 180;
                const phi2 = (lat2 * Math.PI) / 180;
                const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
                const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                          Math.cos(phi1) * Math.cos(phi2) *
                          Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
              };

              const dist = getDistance(loc.coords.latitude, loc.coords.longitude, destLat, destLng);
              if (dist <= 100 && !alertShownRef.current) {
                alertShownRef.current = true;
                updateHasReachedCustomer(true);
                setIsNavigationModalOpen(false);
                setIsNavigatingLive(false);
                Alert.alert(
                  "Arrival",
                  "You have reached the delivery location.",
                  [
                    {
                      text: "OK",
                      onPress: () => {}
                    }
                  ]
                );
              }
            }

            // 2. Only send location updates to backend if background task (Phase 6B) is inactive
            if (!isBackgroundTrackingActive) {
              try {
                console.log('[WATCHER] Sending location update to backend:', loc.coords.latitude, loc.coords.longitude);
                await api.updateActiveDeliveryLocation({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  accuracy: loc.coords.accuracy || undefined,
                  heading: loc.coords.heading || undefined,
                  speed: loc.coords.speed !== null && loc.coords.speed >= 0 ? loc.coords.speed : undefined,
                  capturedAt: new Date(loc.timestamp).toISOString(),
                });
              } catch (err: any) {
                console.warn('[WATCHER] Failed to send location update:', err.message || err);
              }
            }
          }
        );
      } catch (err) {
        console.error('[WATCHER] Failed to start watchPositionAsync:', err);
      }
    };

    startWatcher();

    return () => {
      active = false;
      if (locationWatcherRef.current) {
        try {
          locationWatcherRef.current.remove();
        } catch (e) {}
        locationWatcherRef.current = null;
        console.log('[WATCHER] Stopped foreground location watcher.');
      }
    };
  }, [isAuthenticated, accountStatus, currentPartner?.accountStatus, deliveryState, appState, isBackgroundTrackingActive]);

  useEffect(() => {
    let intervalId: any = null;

    const fetchStatus = async () => {
      if (isRequestingRef.current) return;

      const token = await getAuthToken();
      if (!token) return;

      isRequestingRef.current = true;
      try {
        const data = await api.getMe();
        setCurrentUser(data.partner.user);
        setCurrentPartner(data.partner);
        setAccountStatus(data.partner.accountStatus);
        
        // If the backend marked the partner offline, but the app still thinks it's online
        if (isOnline && !data.partner.isOnline) {
          setIsOnline(false);
          setIsAvailable(false);
          await fetchDashboardStats();
        } else {
          setIsOnline(data.partner.isOnline);
          setIsAvailable(data.partner.isAvailable);
        }
        clearUniqueError('status');
      } catch (err) {
        const error = err as any;
        const errMsg = error.message || 'Unknown error';
        logUniqueError('status', `[Polling] Status refresh failed: ${errMsg}`);
        if (errMsg === 'Unauthorized' || errMsg === 'Forbidden resource') {
          await handleLogout(true);
        }
      } finally {
        isRequestingRef.current = false;
      }
    };

    if (isAuthenticated && appState === 'active') {
      if (isFirstActiveRef.current) {
        isFirstActiveRef.current = false;
      } else {
        fetchStatus();
      }
      intervalId = setInterval(fetchStatus, 10000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, appState, isOnline, fetchDashboardStats, logUniqueError, clearUniqueError]);

  const checkIncomingAssignment = useCallback(async () => {
    try {
      const data = await api.getIncomingAssignment();
      if (data && data.assignment) {
        setIncomingAssignment(data.assignment);
        changeDeliveryState('incoming-request', data.assignment.expiresAt);
      } else {
        if (deliveryState === 'incoming-request') {
          changeDeliveryState('none');
          setIncomingAssignment(null);
        }
      }
      clearUniqueError('incoming');
    } catch (err: any) {
      logUniqueError('incoming', `[Polling] Fetch incoming assignment failed: ${err.message || err}`);
    }
  }, [deliveryState, clearUniqueError, logUniqueError]);

  const fetchCompletedOrders = useCallback(async () => {
    try {
      const data = await api.getCompletedOrders();
      const now = new Date();
      
      // Calculate start and end of current week (Monday-Sunday) in local time
      const currentDay = now.getDay();
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysSinceMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const mapped = data.map((order: any) => {
        const orderDate = new Date(order.deliveredAt || order.assignedAt);
        
        const filterGroup = ['all'];
        
        // Today check (calendar day comparison)
        const isToday = orderDate.getDate() === now.getDate() &&
                        orderDate.getMonth() === now.getMonth() &&
                        orderDate.getFullYear() === now.getFullYear();
        if (isToday) filterGroup.push('today');
        
        // This Week check (Monday-Sunday calendar week comparison)
        const isThisWeek = orderDate >= startOfWeek && orderDate <= endOfWeek;
        if (isThisWeek) filterGroup.push('week');
        
        // This Month check
        const isThisMonth = orderDate.getMonth() === now.getMonth() &&
                            orderDate.getFullYear() === now.getFullYear();
        if (isThisMonth) filterGroup.push('month');
        
        const status = order.orderStatus || 'Delivered';
        const normalizedStatus = status.toLowerCase();
        if (normalizedStatus === 'delivered') {
          filterGroup.push('delivered');
        } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected') {
          filterGroup.push('cancelled_rejected');
        }
        
        let displayStatus = 'Delivered';
        if (normalizedStatus === 'cancelled') displayStatus = 'Cancelled';
        else if (normalizedStatus === 'rejected') displayStatus = 'Rejected';
        else if (normalizedStatus === 'picked_up') displayStatus = 'Picked Up';
        else if (normalizedStatus === 'out_for_delivery') displayStatus = 'Out For Delivery';

        return {
          orderId: `Order #${order.orderNumber || order.orderId}`,
          date: orderDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          filterGroup,
          status: displayStatus,
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          dropArea: order.deliveryAddress?.area || order.deliveryAddress?.addressLine1 || 'Drop Location',
          distance: '—',
          paymentMode: order.paymentMethod?.toUpperCase() === 'COD' ? 'COD' : 'Prepaid',
          codAmount: order.paymentMethod?.toUpperCase() === 'COD' ? order.totalAmount : undefined,
          earnings: order.partnerEarning !== undefined ? order.partnerEarning : (order.earning !== undefined ? order.earning : 0),
        };
      });
      
      // Deduplicate completed orders to prevent duplicates
      const uniqueMapped = [];
      const seenIds = new Set();
      for (const item of mapped) {
        if (!seenIds.has(item.orderId)) {
          seenIds.add(item.orderId);
          uniqueMapped.push(item);
        }
      }

      setCompletedOrders(uniqueMapped);
      clearUniqueError('completed-orders');
    } catch (err: any) {
      logUniqueError('completed-orders', `[Orders] Fetch completed orders failed: ${err.message || err}`);
    }
  }, [clearUniqueError, logUniqueError]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getPartnerNotifications();
      setNotifications(data || []);
      clearUniqueError('notifications');
    } catch (err: any) {
      logUniqueError('notifications', `[Notifications] Fetch failed: ${err.message || err}`);
    }
  }, [clearUniqueError, logUniqueError]);

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const data = await api.getAvailableOrders();
      setAvailableOrders(data || []);
      clearUniqueError('available-orders');
    } catch (err: any) {
      logUniqueError('available-orders', `[Orders] Fetch available orders failed: ${err.message || err}`);
    }
  }, [clearUniqueError, logUniqueError]);

  const handleClaimAvailableOrder = async (orderId: number) => {
    setIsAcceptingDeclining(true);
    try {
      await api.claimAvailableOrder(orderId);
      await fetchAvailableOrders();
      const data = await api.getIncomingAssignment();
      if (data && data.assignment) {
        setActiveAssignment(data.assignment);
        setIsAvailable(false);
        setIsCashCollected(false);
        changeDeliveryState('active-restaurant');
        setViewingActiveOrder(true);
      } else {
        const activeData = await api.getActiveDelivery();
        if (activeData && activeData.assignment) {
          setActiveAssignment(activeData.assignment);
          setIsAvailable(false);
          setIsCashCollected(false);
          changeDeliveryState('active-restaurant');
          setViewingActiveOrder(true);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to claim order. It might have been accepted by another rider.');
      await fetchAvailableOrders();
    } finally {
      setIsAcceptingDeclining(false);
    }
  };

  const handleCollectCod = async () => {
    if (!activeAssignment || !activeAssignment.order || isAcceptingDeclining) return;
    setIsAcceptingDeclining(true);
    try {
      await api.collectCodCash(activeAssignment.order.id);
      setIsCashCollected(true);
    } catch (err: any) {
      alert(err.message || 'Failed to record cash collection');
    } finally {
      setIsAcceptingDeclining(false);
    }
  };



  const handleManualRefresh = useCallback(async () => {
    await checkIncomingAssignment();
    if (isOnline) {
      await fetchDashboardStats();
      await fetchNotifications();
    }
  }, [checkIncomingAssignment, fetchDashboardStats, fetchNotifications, isOnline]);

  // Polling incoming assignments
  useEffect(() => {
    let intervalId: any = null;
    let isPolling = false;

    const poll = async () => {
      if (isPolling) return;
      isPolling = true;
      await checkIncomingAssignment();
      isPolling = false;
    };

    const shouldPoll = 
      isAuthenticated && 
      accountStatus === 'APPROVED' && 
      isOnline && 
      isAvailable && 
      appState === 'active';

    if (shouldPoll) {
      poll();
      intervalId = setInterval(poll, 4000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, accountStatus, isOnline, isAvailable, appState, checkIncomingAssignment]);

  // Poll Dashboard Stats & Notifications
  useEffect(() => {
    let intervalId: any = null;

    const shouldPollStats = 
      isAuthenticated && 
      accountStatus === 'APPROVED' && 
      appState === 'active';

    if (shouldPollStats) {
      fetchDashboardStats();
      fetchNotifications();
      intervalId = setInterval(() => {
        fetchDashboardStats();
        fetchNotifications();
      }, 15000); // 15 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, accountStatus, appState, activeTab, isOnline, fetchDashboardStats, fetchNotifications]);

  // Fetch completed orders/notifications when active tab changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      if (activeTab === 'orders' || activeTab === 'earnings') {
        fetchCompletedOrders();
      }
    }
  }, [isAuthenticated, activeTab, fetchCompletedOrders, fetchNotifications]);

  // Handle Android back button when viewing active order or success screen
  useEffect(() => {
    const handleBackButton = () => {
      if (deliveryState === 'delivery-completed') {
        setJustCompletedOrder(null);
        setViewingActiveOrder(false);
        changeDeliveryState('none');
        setIsOnline(true);
        setIsAvailable(true);
        return true; // Intercept press
      }
      if (viewingActiveOrder) {
        setViewingActiveOrder(false);
        return true; // Intercept press
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      subscription.remove();
    };
  }, [viewingActiveOrder, deliveryState]);

  // Poll Available Orders
  useEffect(() => {
    let intervalId: any = null;

    const shouldPollAvailable = 
      isAuthenticated && 
      isOnline && 
      isAvailable && 
      appState === 'active';

    if (shouldPollAvailable) {
      fetchAvailableOrders();
      intervalId = setInterval(fetchAvailableOrders, 5000); // 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, isOnline, isAvailable, appState, fetchAvailableOrders]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (otpResendIntervalRef.current) {
        clearInterval(otpResendIntervalRef.current);
      }
    };
  }, []);

  const handleAcceptAssignment = async () => {
    if (!incomingAssignment || isAcceptingDeclining) return;
    setIsAcceptingDeclining(true);
    try {
      await api.acceptAssignment(incomingAssignment.id);
      setActiveAssignment(incomingAssignment);
      setIncomingAssignment(null);
      setIsAvailable(false);
      setIsCashCollected(false);
      changeDeliveryState('active-restaurant');
      setViewingActiveOrder(true);
    } catch (err) {
      const error = err as any;
      alert(error.message || 'Failed to accept assignment.');
      changeDeliveryState('none');
      setIncomingAssignment(null);
    } finally {
      setIsAcceptingDeclining(false);
    }
  };

  const handleDeclineAssignment = async () => {
    if (!incomingAssignment || isAcceptingDeclining) return;
    setIsAcceptingDeclining(true);
    try {
      await api.declineAssignment(incomingAssignment.id);
      changeDeliveryState('none');
      setIncomingAssignment(null);
      setIsAvailable(true);
    } catch (err) {
      const error = err as any;
      alert(error.message || 'Failed to decline assignment.');
      changeDeliveryState('none');
      setIncomingAssignment(null);
    } finally {
      setIsAcceptingDeclining(false);
    }
  };

  // Toggle Online Status
  const handleOnlineToggle = async () => {
    if (isMutatingOnline) return;

    const targetOnline = !isOnline;
    setIsMutatingOnline(true);
    try {
      const data = await api.updateOnlineStatus(targetOnline);
      setIsOnline(data.isOnline);
      setIsAvailable(data.isAvailable);
      if (!data.isOnline) {
        setIncomingAssignment(null);
        setAvailableOrders([]);
        if (deliveryState === 'incoming-request') {
          changeDeliveryState('none');
        }
      }
    } catch (err) {
      const error = err as any;
      if (error.message && (error.message.includes('active delivery') || error.message.includes('Complete or resolve'))) {
        alert('Complete your active delivery before going offline.');
      } else if (error.message === 'Unauthorized' || error.message === 'Forbidden resource') {
        console.error('Failed to toggle online status:', error.message);
        await handleLogout(true);
      } else {
        console.error('Failed to toggle online status:', error.message);
        alert(error.message || 'Unable to change status. Please try again.');
      }
      try {
        const profile = await api.getMe();
        setAccountStatus(profile.partner.accountStatus);
        setIsOnline(profile.partner.isOnline);
        setIsAvailable(profile.partner.isAvailable);
      } catch (meErr) {
        // ignore
      }
    } finally {
      setIsMutatingOnline(false);
    }
  };

  const renderNavigationModal = () => {
    const order = activeAssignment?.order || {};
    let isPickup = deliveryState === 'active-restaurant' || 
                   deliveryState === 'active-pickup' || 
                   deliveryState === 'active-start-delivery';
    if (order && order.orderStatus) {
      const status = order.orderStatus.toLowerCase();
      if (status === 'accepted' || status === 'ready_for_pickup' || status === 'picked_up') {
        isPickup = true;
      } else if (status === 'out_for_delivery') {
        isPickup = false;
      }
    }
    let destLat = isPickup ? order.restaurantLatitude : order.deliveryLatitude;
    let destLng = isPickup ? order.restaurantLongitude : order.deliveryLongitude;
    if (!destLat || destLat === 0) {
      destLat = isPickup ? 11.8744 : 11.8722;
    }
    if (!destLng || destLng === 0) {
      destLng = isPickup ? 75.3704 : 75.3740;
    }
    const destName = isPickup ? (order.restaurantName || 'Restaurant') : (order.customerName || 'Customer');
    const destAddress = isPickup ? (order.restaurantAddress || '') : (order.deliveryAddress || '');

    const riderLat = (riderCoords && riderCoords.latitude) ? riderCoords.latitude : 11.8744;
    const riderLng = (riderCoords && riderCoords.longitude) ? riderCoords.longitude : 75.3704;

    const hasValidCoords = true;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let activeStep: any = null;
    let upcomingTurnStep: any = null;
    let distanceToTurn: number | null = null;
    if (isNavigatingLive && navRouteSteps && navRouteSteps.length > 0) {
      let minDistance = Infinity;
      let closestIndex = 0;
      navRouteSteps.forEach((step, idx) => {
        const [lng, lat] = step.location;
        const dist = getDistance(riderLat, riderLng, lat, lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = idx;
        }
      });
      activeStep = navRouteSteps[closestIndex];

      for (let i = closestIndex + 1; i < navRouteSteps.length; i++) {
        const step = navRouteSteps[i];
        const type = step.maneuverType?.toLowerCase() || '';
        const modifier = step.maneuverModifier?.toLowerCase() || '';
        if (type.includes('turn') || modifier.includes('left') || modifier.includes('right')) {
          upcomingTurnStep = step;
          const [turnLng, turnLat] = step.location;
          distanceToTurn = getDistance(riderLat, riderLng, turnLat, turnLng);
          break;
        }
      }
    }

    const getStepInstructionText = (step: any, fallbackName: string) => {
      if (!step) return `Head towards ${fallbackName}`;
      const type = step.maneuverType?.toLowerCase() || '';
      const modifier = step.maneuverModifier?.toLowerCase() || '';
      const roadName = step.name || '';

      if (type === 'depart') {
        return `Head towards ${fallbackName}${roadName ? ' on ' + roadName : ''}`;
      }
      if (type === 'arrive') {
        return `You have arrived at ${fallbackName}!`;
      }
      
      let turnDir = '';
      if (modifier.includes('left')) turnDir = 'left';
      else if (modifier.includes('right')) turnDir = 'right';
      else if (modifier === 'uturn') turnDir = 'around (U-Turn)';
      else turnDir = 'straight';

      if (turnDir === 'straight') {
        return `Continue straight${roadName ? ' onto ' + roadName : ''}`;
      }
      return `Turn ${turnDir}${roadName ? ' onto ' + roadName : ''}`;
    };

    const getStepIcon = (step: any) => {
      if (!step) return 'arrow-up';
      const type = step.maneuverType?.toLowerCase() || '';
      const modifier = step.maneuverModifier?.toLowerCase() || '';
      if (type === 'arrive') return 'flag';
      
      if (modifier.includes('left')) return 'arrow-back';
      if (modifier.includes('right')) return 'arrow-forward';
      if (modifier === 'uturn') return 'refresh';
      return 'arrow-up';
    };

    return (
      <Modal
        visible={isNavigationModalOpen}
        animationType="slide"
        onRequestClose={() => setIsNavigationModalOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Header */}
          {isNavigatingLive ? (
            <View style={{
              backgroundColor: '#065F46',
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              elevation: 6,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons 
                  name={getStepIcon(activeStep) as any} 
                  size={22} 
                  color="#065F46" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#A7F3D0', letterSpacing: 0.5 }}>
                  {activeStep?.distance ? `IN ${(activeStep.distance).toFixed(0)}m` : 'NAVIGATING'}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                  {getStepInstructionText(activeStep, destName)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              backgroundColor: '#FFFFFF',
            }}>
              <TouchableOpacity onPress={() => setIsNavigationModalOpen(false)}>
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Location Pin
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B' }} numberOfLines={1}>
                  {destName}
                </Text>
              </View>
            </View>
          )}

          {/* Map or Fallback */}
          {hasValidCoords ? (
            <View style={{ flex: 1, position: 'relative' }}>
              <MapView
                style={{ width: '100%', height: '100%' }}
                mapStyle="https://tiles.openfreemap.org/styles/liberty"
                logo={false}
                attribution={false}
              >
                <Camera
                  ref={navCameraRef}
                  initialViewState={{
                    center: [riderLng, riderLat],
                    zoom: 15,
                  }}
                />
                
                {navRouteCoords && navRouteCoords.length > 0 && (
                  <GeoJSONSource
                    id="navRouteSource"
                    data={{
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'LineString',
                        coordinates: navRouteCoords,
                      },
                    }}
                  >
                    <Layer
                      id="navRouteLayer"
                      type="line"
                      style={{
                        lineColor: '#2563EB',
                        lineWidth: 5,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </GeoJSONSource>
                )}

                <Marker id="destPin" lngLat={[destLng, destLat]}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isPickup ? '#EA580C' : '#F97316',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}>
                    <Ionicons name={isPickup ? "business" : "home"} size={16} color="#FFFFFF" />
                  </View>
                </Marker>
                
                <Marker id="riderPin" lngLat={[riderLng, riderLat]}>
                   <View style={{
                     width: 28,
                     height: 28,
                     borderRadius: 14,
                     backgroundColor: '#10B981',
                     alignItems: 'center',
                     justifyContent: 'center',
                     borderWidth: 2,
                     borderColor: '#FFFFFF',
                   }}>
                     <FontAwesome5 name="motorcycle" size={12} color="#FFFFFF" />
                   </View>
                </Marker>
              </MapView>

              {/* Turn Proximity Popup (within 100 meters of upcoming turn) */}
              {upcomingTurnStep && distanceToTurn !== null && distanceToTurn <= 100 && (
                <View style={{
                  position: 'absolute',
                  top: 24,
                  alignSelf: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  elevation: 6,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                }}>
                  <Ionicons 
                    name={getStepIcon(upcomingTurnStep) as any} 
                    size={16} 
                    color="#2563EB" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    Turn {upcomingTurnStep.maneuverModifier?.charAt(0).toUpperCase() + upcomingTurnStep.maneuverModifier?.slice(1)} in {distanceToTurn.toFixed(0)}m
                  </Text>
                </View>
              )}

              {/* Address or Navigation Floating Card */}
              {isNavigatingLive ? (
                <View style={{
                  position: 'absolute',
                  bottom: 24,
                  left: 16,
                  right: 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  elevation: 6,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#059669' }}>
                        {navDistanceKm || '—'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                        Remaining to {isPickup ? 'hotel' : 'customer'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {!isPickup && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleVerifyDeliveryPress}
                          style={{
                            backgroundColor: '#EA580C',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 10,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                            Verify Delivery
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setIsNavigatingLive(false)}
                        style={{
                          backgroundColor: '#EF4444',
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                          Exit
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{
                  position: 'absolute',
                  bottom: 24,
                  left: 16,
                  right: 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  elevation: 4,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 }} numberOfLines={1}>
                      {destName}
                    </Text>
                    {navDistanceKm && (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#F97316' }}>
                        {navDistanceKm}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                    {destAddress || 'No address provided'}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setIsNavigatingLive(true);
                        navCameraRef.current?.setStop({
                          center: [riderLng, riderLat],
                          zoom: 17,
                          pitch: 60,
                          bearing: riderCoords?.heading || 0,
                          padding: { top: 0, bottom: 220, left: 0, right: 0 },
                          duration: 1000,
                        });
                      }}
                      style={{
                        backgroundColor: '#F97316',
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="navigate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                        Start Navigation
                      </Text>
                    </TouchableOpacity>

                    {!isPickup && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleVerifyDeliveryPress}
                        style={{
                          backgroundColor: '#EA580C',
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 12,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                          Verify Delivery
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Ionicons name="map-outline" size={48} color="#CBD5E1" />
              <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '700', color: '#64748B', textAlign: 'center' }}>
                Coordinates unavailable for this location
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  const renderItemsModal = () => {
    const order = activeAssignment?.order || {};
    const items = order.items || [];

    return (
      <Modal
        visible={isItemsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsItemsModalOpen(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setIsItemsModalOpen(false)}
        >
          <View style={{ 
            width: '85%', 
            backgroundColor: '#FFFFFF', 
            borderRadius: 16, 
            padding: 20, 
            borderWidth: 1,
            borderColor: '#E2E8F0',
            maxHeight: '70%',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 }}>
              Order Items
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {items.length > 0 ? (
                items.map((item: any, idx: number) => (
                  <View 
                    key={item.id || idx} 
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      paddingVertical: 12,
                      borderBottomWidth: idx === items.length - 1 ? 0 : 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
                        {item.foodName || 'Unknown Item'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#F97316' }}>
                      x{item.quantity || 1}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', paddingVertical: 16 }}>
                  No items found for this order
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity 
              onPress={() => setIsItemsModalOpen(false)}
              style={{
                marginTop: 20,
                backgroundColor: '#F97316',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Helper to render the appropriate screen inside the active tab
  const renderTabContent = () => {
    // Only incoming offered requests take global precedence.
    if (deliveryState === 'incoming-request') {
      return renderHomeTab();
    }

    // Capture success completion screen with render priority before other tabs
    if (deliveryState === 'delivery-completed' && justCompletedOrder) {
      return renderDeliveryCompletedScreen();
    }

    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'orders':
        return renderOrdersTab();
      case 'earnings':
        return renderEarningsTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderHomeTab();
    }
  };

  // 1. HOME TAB ROUTER
  const renderHomeTab = () => {
    if (deliveryState === 'incoming-request') {
      return renderIncomingRequestScreen();
    }

    if (viewingActiveOrder) {
      switch (deliveryState) {
        case 'active-restaurant':
          return renderActiveDeliveryScreen('reach-restaurant');
        case 'active-pickup':
          return renderActiveDeliveryScreen('pickup');
        case 'active-start-delivery':
          return renderActiveDeliveryScreen('start-delivery');
        case 'active-delivery':
          return renderCustomerDeliveryScreen();
        default:
          return renderHomeScreen();
      }
    }

    switch (deliveryState) {
      case 'delivery-completed':
        return renderDeliveryCompletedScreen();
      default:
        return renderHomeScreen();
    }
  };

  // SCREEN 1: AVAILABLE DELIVERIES LIST (Home Screen - Supports Online & Offline States)
  const renderHomeScreen = () => {
    return (
      <View style={styles.tabContentContainer}>
        <Header 
          title={appName} 
          isOnline={isOnline} 
          isAvailable={isAvailable}
          profileImage={profileImageUri}
        />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          style={styles.screenBg}
        >
          {/* Welcome User Row */}
          <View style={styles.welcomeRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.riderNameText}>{currentUser?.name?.split(' ')[0] || 'Partner'}</Text>
            </View>
            <View style={styles.rightActionsRow}>
              <TouchableOpacity 
                style={styles.bellButton} 
                activeOpacity={0.7}
                onPress={() => {
                  fetchNotifications();
                  setShowNotificationsModal(true);
                }}
              >
                <Ionicons name="notifications" size={20} color="#38220F" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <View style={styles.notificationDot} />
                )}
              </TouchableOpacity>
              
              {/* Custom Toggle Switch */}
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handleOnlineToggle}
                style={[
                  styles.customSwitchContainer,
                  isOnline ? styles.customSwitchOn : styles.customSwitchOff
                ]}
              >
                <View style={[
                  styles.customSwitchThumb,
                  isOnline ? styles.customSwitchThumbOn : styles.customSwitchThumbOff
                ]}>
                  {isOnline && (
                    <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Earnings Aggregated card (Always visible on Home screen) */}
          <View style={styles.offlineEarningsCard}>
            <View style={styles.offlineEarningsHeader}>
              <Text style={styles.offlineEarningsTitle}>Today's Earnings</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A7A6E" />
            </View>
            <Text style={styles.offlineEarningsAmount}>₹{dashboardStats.todayEarnings}</Text>
            <Text style={styles.offlineEarningsCount}>
              {dashboardStats.todayDeliveries} {dashboardStats.todayDeliveries === 1 ? 'delivery' : 'deliveries'} completed
            </Text>
          </View>

          {!isOnline ? (
            // Offline Main Content
            <View style={styles.offlineMainContainer}>
              <View style={styles.powerIconContainer}>
                <Ionicons name="power" size={32} color="#8A7A6E" />
              </View>
              <Text style={styles.offlineMainTitle}>You’re Offline</Text>
              <Text style={styles.offlineMainSub}>Go online to start receiving delivery requests.</Text>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleOnlineToggle}
                disabled={isMutatingOnline}
                style={styles.offlineGoOnlineBtn}
              >
                <Text style={styles.offlineGoOnlineBtnText}>
                  {isMutatingOnline ? 'Connecting...' : 'Go Online'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Online stats summary card
            <HomeStatsCard 
              earnings={dashboardStats.todayEarnings} 
              deliveries={dashboardStats.todayDeliveries} 
              onlineTime={formatOnlineDuration(liveOnlineSeconds)} 
            />
          )}

          {/* Active Delivery / Current Order Card */}
          {activeAssignment && activeAssignment.order && (
            <View style={[styles.currentOrderCard, { marginTop: 16, marginBottom: 8 }]}>
              <View style={styles.currentOrderCardHeader}>
                <Text style={styles.currentOrderCardTitle}>ACTIVE DELIVERY</Text>
                <View style={[styles.currentOrderStatusBadge, { backgroundColor: '#FFF7ED', borderColor: '#FF7A00', borderWidth: 1 }]}>
                  <Ionicons name="bicycle" size={12} color="#FF7A00" style={{ marginRight: 4 }} />
                  <Text style={[styles.currentOrderStatusText, { color: '#FF7A00' }]}>In Progress</Text>
                </View>
              </View>

              <View style={styles.currentOrderRouteContainer}>
                <View style={styles.currentOrderRouteRow}>
                  <View style={[styles.routeDotMini, styles.pickupDotColor]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.currentOrderRouteTitle}>{activeAssignment.order.restaurantName || 'QuickBite Kitchen'}</Text>
                    <Text style={styles.currentOrderRouteSubtitle}>Pickup • {activeAssignment.order.pickupAddress || 'Restaurant Address'}</Text>
                  </View>
                </View>
                
                <View style={styles.currentOrderRouteConnector} />

                <View style={styles.currentOrderRouteRow}>
                  <View style={[styles.routeDotMini, styles.dropDotColor]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.currentOrderRouteTitle}>{activeAssignment.order.customerName || 'Customer'}</Text>
                    <Text style={styles.currentOrderRouteSubtitle}>Dropoff • {activeAssignment.order.deliveryAddress || 'Drop Location'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setViewingActiveOrder(true)}
                style={styles.continueDeliveryBtn}
              >
                <Text style={styles.continueDeliveryBtnText}>View Active Delivery / Track Order →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Deliveries</Text>
            {isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={styles.refreshButton} 
                  activeOpacity={0.7}
                  onPress={handleManualRefresh}
                >
                  <Ionicons name="refresh-sharp" size={13} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isOnline ? (
            /* Go online to receive deliveries offline message card, but for online status */
            <View style={styles.offlineDeliveriesCard}>
              <View style={[styles.offlineDeliveriesIconContainer, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="bicycle" size={24} color="#0D9488" />
              </View>
              <Text style={styles.offlineDeliveriesTitle}>Waiting for delivery requests...</Text>
              <Text style={styles.offlineDeliveriesSub}>
                You are online and ready. Incoming delivery requests will pop up automatically.
              </Text>
            </View>
          ) : (
            /* Go online to receive deliveries offline message card */
            <View style={styles.offlineDeliveriesCard}>
              <View style={styles.offlineDeliveriesIconContainer}>
                <Ionicons name="images-outline" size={24} color="#94A3B8" />
              </View>
              <Text style={styles.offlineDeliveriesTitle}>Go online to receive deliveries</Text>
              <Text style={styles.offlineDeliveriesSub}>
                New delivery requests will appear here once you’re online.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // SCREEN 1.5: INCOMING DELIVERY REQUEST SCREEN (Floating Bottom Sheet Overlay)
  // SCREEN 1.5: INCOMING DELIVERY REQUEST SCREEN (Floating Bottom Sheet Overlay)
  const renderIncomingRequestScreen = () => {
    const order = incomingAssignment?.order || {};
    const items = order.items || [];
    
    // Distance Calculations using Haversine
    const riderToRestaurantDistance = (riderCoords && order.restaurantLatitude && order.restaurantLongitude)
      ? calculateDistance(riderCoords.latitude, riderCoords.longitude, order.restaurantLatitude, order.restaurantLongitude)
      : 0;

    const restaurantToCustomerDistance = (order.restaurantLatitude && order.restaurantLongitude && order.deliveryLatitude && order.deliveryLongitude)
      ? calculateDistance(order.restaurantLatitude, order.restaurantLongitude, order.deliveryLatitude, order.deliveryLongitude)
      : 0;

    const totalDistance = Math.round((riderToRestaurantDistance + restaurantToCustomerDistance) * 10) / 10;

    // Estimated Partner Earning
    const estEarning = order.estimatedPartnerEarning ? Number(order.estimatedPartnerEarning).toFixed(0) : '0';

    // Total quantity of items
    const totalItemQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

    // Filter items to show first 2 if collapsed/not expanded, or all
    const itemsToShow = itemsExpanded ? items : items.slice(0, 2);
    const hasMoreItems = items.length > 2;
    const hiddenItemsCount = items.length - 2;

    const screenHeight = Dimensions.get('window').height;

    return (
      <View style={styles.incomingRequestContainer}>
        {/* Map Background */}
        <View style={styles.incomingMapWrapper}>
          <MapPlaceholder eta="—" etaPosition="top-left" destinationName={order.restaurantName} />
          <View style={styles.incomingMapOverlay} />
        </View>

        {/* Semi-transparent Dark overlay */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)' }} />

        {/* Floating Headers */}
        <View style={styles.incomingFloatingHeader}>
          <TouchableOpacity style={styles.incomingMenuBtn} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#38220F" />
          </TouchableOpacity>
          <OnlineStatus isOnline={isOnline} />
        </View>

        {/* Draggable Bottom Sheet */}
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.incomingRequestSheet,
            {
              transform: [{ translateY: panY }],
              paddingBottom: Math.max(16, insets.bottom + 12),
              maxHeight: screenHeight - 100
            }
          ]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          {/* Drag Handle */}
          <View style={styles.incomingSheetHandle} />

          {/* Header row */}
          <View style={styles.incomingHeaderRow}>
            {/* Circular Timer Ring */}
            <View style={styles.circularTimerRing}>
              <Text style={styles.circularTimerText}>{countdown}s</Text>
            </View>
            
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.incomingNewRequestTitle}>NEW REQUEST</Text>
              <Text style={styles.incomingOrderIdText} numberOfLines={1}>
                Order #{order.orderNumber || 'QB-000000'}
              </Text>
            </View>
            
            <View style={styles.incomingEarningsCol}>
              <Text style={styles.incomingEarningsLabel}>EST. EARNING</Text>
              <Text style={styles.incomingEarningsAmount}>₹{estEarning}</Text>
            </View>
          </View>

          {/* Expanded Content ScrollView */}
          {sheetState === 'expanded' ? (
            <>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {/* Three Information Cards */}
                <View style={styles.incomingQuickInfoRow}>
                  {/* Card 1: To Pickup */}
                  <View style={styles.incomingInfoCard}>
                    <View style={styles.cardIconCircle}>
                      <Ionicons name="bicycle" size={20} color="#F97316" />
                    </View>
                    <Text style={styles.cardValue}>
                      {riderToRestaurantDistance > 0 ? `${riderToRestaurantDistance} km` : '—'}
                    </Text>
                    <Text style={styles.cardLabel}>To Pickup</Text>
                  </View>

                  {/* Card 2: To Drop */}
                  <View style={styles.incomingInfoCard}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="git-commit-outline" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.cardValue}>
                      {restaurantToCustomerDistance > 0 ? `${restaurantToCustomerDistance} km` : '—'}
                    </Text>
                    <Text style={styles.cardLabel}>To Drop</Text>
                  </View>

                  {/* Card 3: Payment */}
                  <View style={styles.incomingInfoCard}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="card" size={20} color="#10B981" />
                    </View>
                    <Text style={[styles.cardValue, { color: '#10B981', fontWeight: '900' }]}>
                      {order.paymentMethod === 'COD' ? 'COD' : 'ONLINE'}
                    </Text>
                    <Text style={styles.cardSubValue}>
                      {order.paymentMethod === 'COD' ? `₹${order.amount || 0}` : 'Paid'}
                    </Text>
                  </View>
                </View>

                {/* Total Distance & ETA Row */}
                <View style={styles.distanceEtaRow}>
                  <Text style={styles.distanceEtaText}>
                    TOTAL DIST: {totalDistance > 0 ? `${totalDistance} KM` : '—'}
                  </Text>
                  <Text style={styles.distanceEtaText}>ETA: —</Text>
                </View>

                {/* Route Timeline Section */}
                <View style={styles.routeTimelineContainer}>
                  {/* Pickup restaurant */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineIconWrapper}>
                      <View style={[styles.timelineDot, { backgroundColor: '#F97316' }]} />
                      <View style={styles.timelineConnector} />
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeaderRow}>
                        <Text style={styles.timelineStepLabel}>PICKUP</Text>
                        {riderToRestaurantDistance > 0 && (
                          <View style={styles.pickupDistanceBadge}>
                            <Text style={styles.pickupDistanceBadgeText}>
                              {riderToRestaurantDistance} km away
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineTitle}>{order.restaurantName}</Text>
                      <Text style={styles.timelineSubtitle}>{order.pickupAddress}</Text>
                    </View>
                  </View>

                  {/* Dropoff customer */}
                  <View style={[styles.timelineRow, { marginTop: 12 }]}>
                    <View style={styles.timelineIconWrapper}>
                      <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeaderRow}>
                        <Text style={[styles.timelineStepLabel, { color: '#10B981' }]}>DROP-OFF</Text>
                        {restaurantToCustomerDistance > 0 && (
                          <View style={styles.dropDistanceBadge}>
                            <Text style={styles.dropDistanceBadgeText}>
                              {restaurantToCustomerDistance} km from restaurant
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineTitle}>{order.customerName}</Text>
                      <Text style={styles.timelineSubtitle}>
                        {order.deliveryAddressLine1}
                        {order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ''}
                        {`, ${order.deliveryCity}`}
                        {order.deliveryPincode ? ` - ${order.deliveryPincode}` : ''}
                      </Text>
                      
                      {/* Landmark info pill */}
                      {order.deliveryLandmark && (
                        <View style={styles.landmarkPill}>
                          <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.landmarkPillText}>{order.deliveryLandmark}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Order Items section */}
                <View style={styles.itemsSectionContainer}>
                  <Text style={styles.itemsSectionHeading}>ORDER ITEMS ({totalItemQty})</Text>
                  
                  {itemsToShow.map((item: any, idx: number) => {
                    const custText = item.customizations && item.customizations.length > 0
                      ? item.customizations.map((c: any) => `• ${c.choiceName}`).join(' ')
                      : null;
                    
                    return (
                      <View key={item.id || idx} style={styles.itemRow}>
                        <View style={styles.itemQuantityBox}>
                          <Text style={styles.itemQuantityText}>{item.quantity}x</Text>
                        </View>
                        
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.itemNameText}>{item.foodName}</Text>
                          {custText && <Text style={styles.itemCustomizationsText}>{custText}</Text>}
                        </View>

                        <Text style={styles.itemPriceText}>₹{item.lineTotal || 0}</Text>
                      </View>
                    );
                  })}

                  {/* View more items button */}
                  {hasMoreItems && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setItemsExpanded(!itemsExpanded)}
                      style={styles.viewMoreItemsBtn}
                    >
                      <Text style={styles.viewMoreItemsBtnText}>
                        {itemsExpanded ? 'Show less items' : `View ${hiddenItemsCount} more items`}
                      </Text>
                      <Ionicons 
                        name={itemsExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={14} 
                        color="#F97316" 
                        style={{ marginLeft: 4 }} 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

              {/* Sticky Bottom Actions inside the expanded sheet */}
              <View style={[styles.incomingActionsRow, { marginTop: 12 }]}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled={isAcceptingDeclining}
                  onPress={handleDeclineAssignment}
                  style={[styles.incomingDeclineBtn, isAcceptingDeclining && { opacity: 0.5 }]}
                >
                  <Text style={styles.incomingDeclineBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  disabled={isAcceptingDeclining}
                  onPress={handleAcceptAssignment}
                  style={[styles.incomingAcceptBtn, isAcceptingDeclining && { opacity: 0.5 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isAcceptingDeclining ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.incomingAcceptBtnText}>Accept Delivery</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ height: 10 }} />
          )}
        </Animated.View>
      </View>
    );
  };

  // SCREEN 2: ACTIVE DELIVERY DETAILS (Reach Restaurant -> Pickup -> Out for Delivery)
  const renderActiveDeliveryScreen = (currentStep: 'reach-restaurant' | 'pickup' | 'start-delivery') => {
    const order = activeAssignment?.order || {};
    let currentCtaText = 'Reached Restaurant →';
    if (currentStep === 'pickup') {
      currentCtaText = 'Confirm Pickup →';
    } else if (currentStep === 'start-delivery') {
      currentCtaText = 'Start Delivery →';
    }

    const handleStepCtaPress = async () => {
      if (!activeAssignment || !activeAssignment.order || isAcceptingDeclining) return;
      setIsAcceptingDeclining(true);
      try {
        // Fetch fresh status from backend to verify current state before executing actions
        const latestData = await api.getActiveDelivery();
        if (latestData && latestData.assignment) {
          setActiveAssignment(latestData.assignment);
          const currentBackendStatus = latestData.assignment.order?.orderStatus;

          // Idempotency: check if backend is already at or past the target state
          if (currentStep === 'pickup' && (currentBackendStatus === 'picked_up' || currentBackendStatus === 'out_for_delivery')) {
            if (currentBackendStatus === 'out_for_delivery') {
              changeDeliveryState('active-delivery');
            } else {
              changeDeliveryState('active-start-delivery');
            }
            setIsAcceptingDeclining(false);
            return;
          }
          if (currentStep === 'start-delivery' && currentBackendStatus === 'out_for_delivery') {
            changeDeliveryState('active-delivery');
            setIsAcceptingDeclining(false);
            return;
          }
        }

        if (currentStep === 'reach-restaurant') {
          changeDeliveryState('active-pickup');
        } else if (currentStep === 'pickup') {
          const result = await api.updateDeliveryOrderStatus(activeAssignment.order.id, 'picked_up');
          setActiveAssignment((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              order: { ...prev.order, orderStatus: result.orderStatus || 'picked_up' }
            };
          });
          changeDeliveryState('active-start-delivery');
        } else if (currentStep === 'start-delivery') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            alert('Location access is required to start live delivery tracking.');
            return;
          }

          let firstLoc;
          try {
            const positionPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
            firstLoc = await Promise.race([positionPromise, timeoutPromise]);
          } catch (locErr) {
            console.warn('[Start Delivery] getCurrentPositionAsync failed or timed out, trying last known position:', locErr);
            try {
              firstLoc = await Location.getLastKnownPositionAsync();
            } catch (lastErr) {
              console.warn('[Start Delivery] getLastKnownPositionAsync failed:', lastErr);
            }
          }

          if (!firstLoc || !firstLoc.coords) {
            firstLoc = {
              coords: {
                latitude: 11.2588,
                longitude: 75.7804,
                accuracy: 10,
                altitude: 0,
                heading: 0,
                speed: 0,
              },
              timestamp: Date.now()
            };
          }

          let useBackground = false;
          try {
            const { status: bgCheck } = await Location.getBackgroundPermissionsAsync();
            if (bgCheck === 'granted') {
              useBackground = true;
            } else {
              const userChoice = await new Promise<'settings' | 'foreground'>((resolve) => {
                Alert.alert(
                  'Background Location Sharing',
                  'To share your live delivery progress with customers when the app is minimized or the screen is locked, please enable "Allow all the time" in the next screen.',
                  [
                    { text: 'Go to Settings', onPress: () => resolve('settings') },
                    { text: 'Foreground Only', style: 'cancel', onPress: () => resolve('foreground') }
                  ],
                  { cancelable: false }
                );
              });

              if (userChoice === 'settings') {
                const { status: bgReq } = await Location.requestBackgroundPermissionsAsync();
                if (bgReq === 'granted') {
                  useBackground = true;
                } else {
                  Alert.alert(
                    'Foreground Only Enabled',
                    'Background location sharing was not granted. Live tracking will only update while the app is active in the foreground.'
                  );
                }
              } else {
                Alert.alert(
                  'Foreground Only Enabled',
                  'Live tracking will only update while the app is active in the foreground.'
                );
              }
            }
          } catch (err) {
            console.warn('Error checking background location permissions:', err);
          }

          try {
            await api.updateActiveDeliveryLocation({
              latitude: firstLoc.coords.latitude,
              longitude: firstLoc.coords.longitude,
              accuracy: firstLoc.coords.accuracy || undefined,
              heading: firstLoc.coords.heading || undefined,
              speed: firstLoc.coords.speed !== null && firstLoc.coords.speed >= 0 ? firstLoc.coords.speed : undefined,
              capturedAt: new Date(firstLoc.timestamp).toISOString(),
            });
          } catch (updateErr) {
            console.warn('First location update call failed, continuing status change:', updateErr);
          }

           const result = await api.updateDeliveryOrderStatus(activeAssignment.order.id, 'out_for_delivery');
          await startTrackingCoordinator(activeAssignment.order.id, useBackground);
          
          setActiveAssignment((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              order: { ...prev.order, orderStatus: result.orderStatus || 'out_for_delivery' }
            };
          });
          setIsNavigationModalOpen(true);
          setIsNavigatingLive(true);
          changeDeliveryState('active-delivery');
        }
      } catch (err: any) {
        alert(err.message || 'Failed to update order status');
      } finally {
        setIsAcceptingDeclining(false);
      }
    };

    return (
      <View style={styles.tabContentContainer}>
        <Header 
          title={appName} 
          isOnline={isOnline} 
          isAvailable={isAvailable}
          showBack={true}
          onBackPress={() => setViewingActiveOrder(false)}
        />

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPaddingActive}
          style={styles.screenBg}
        >
          {/* Order Details Header */}
          <View style={styles.activeOrderHeader}>
            <Text style={styles.activeOrderTitle}>{order.orderNumber || 'Order'}</Text>
            <View style={styles.codIndicatorBadge}>
              <Ionicons name="cash-outline" size={12} color="#B91C1C" style={{ marginRight: 4 }} />
              <Text style={styles.codIndicatorText}>{order.paymentMethod || 'Prepaid'} ₹{order.amount || 0}</Text>
            </View>
          </View>

          {/* Map Preview */}
          <MapPlaceholder 
            eta="N/A" 
            etaPosition="top-left" 
            destinationName={order.restaurantName} 
            order={order}
            riderCoords={riderCoords}
            deliveryState={deliveryState}
            onPress={() => setIsNavigationModalOpen(true)}
          />

          {/* Progress Timeline */}
          <ProgressTimeline 
            currentStep={currentStep} 
            restaurantName={order.restaurantName}
            itemCount={order.itemCount}
            deliveryAddress={order.deliveryAddress}
          />

          {/* Pickup Details Card */}
          <View style={styles.pickupCard}>
            <View style={styles.pickupCardHeader}>
              <View>
                <Text style={styles.pickupCardSub}>PICKUP FROM</Text>
                <Text style={styles.pickupCardTitle}>{order.restaurantName || 'QuickBite Kitchen'}</Text>
                <Text style={styles.pickupCardDesc}>{order.pickupAddress || 'Restaurant Pickup'}</Text>
              </View>
              <View style={styles.distanceBadge}>
                <Ionicons name="walk" size={12} color="#8A7A6E" style={{ marginRight: 3 }} />
                <Text style={styles.distanceText}>N/A</Text>
              </View>
            </View>

            {/* Nav & Call action buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                activeOpacity={0.7}
                onPress={() => setIsNavigationModalOpen(true)}
              >
                <Ionicons name="navigate-circle-outline" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Navigate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionBtn} 
                activeOpacity={0.7}
                onPress={() => {
                  const phone = order.restaurantPhoneNumber;
                  if (phone) {
                    Linking.openURL(`tel:${phone}`);
                  } else {
                    Alert.alert('Phone Number Unavailable', 'No phone number stored for this restaurant.');
                  }
                }}
              >
                <Ionicons name="call-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items Row */}
          <View style={styles.itemsCardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bag-handle" size={16} color="#F97316" style={{ marginRight: 8 }} />
              <Text style={styles.itemsCardText}>
                {order.items ? order.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 0} Items
              </Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setIsItemsModalOpen(true)}
            >
              <Text style={styles.viewItemsText}>View Items &gt;</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Reached Restaurant / Next CTA Button (Fixed bottom block) */}
        <View style={[styles.stickyFooterContainer, { bottom: bottomNavHeight + 14 }]}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleStepCtaPress}
            disabled={isAcceptingDeclining}
            style={[styles.stickyFooterButton, isAcceptingDeclining && { opacity: 0.7 }]}
          >
            {isAcceptingDeclining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.stickyFooterButtonText}>{currentCtaText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // SCREEN 3: CUSTOMER DELIVERY (Customer details, cash collection, delivered cta)
  const renderCustomerDeliveryScreen = () => {
    const order = activeAssignment?.order || {};
    const themedBoxBg = isDark ? '#1E293B' : '#FFFFFF';
    const themedBoxBorder = isDark ? '#334155' : '#FAF6F0';
    const themedTextSub = isDark ? '#94A3B8' : '#8A7A6E';
    const themedPinBoxBg = isDark ? '#0F172A' : '#F8FAFC';
    const themedPinBoxBorder = isDark ? '#334155' : '#E2E8F0';
    const themedPinBoxFocusBg = isDark ? '#2E1A05' : '#FFF8F2';
    const themedPinBoxFocusBorder = '#FF6F00';
    const themedPinBoxText = isDark ? '#F8FAFC' : '#0F172A';

    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.tabContentContainer}>
          <Header 
            title={appName} 
            isOnline={isOnline} 
            isAvailable={isAvailable}
            showBack={true}
            onBackPress={() => setViewingActiveOrder(false)}
          />

          <ScrollView 
            ref={activeDeliveryScrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollPaddingActive}
            style={styles.screenBg}
          >
            {/* Deliver To Card */}
            <View style={styles.customerCard}>
              <View style={styles.customerCardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerCardLabel}>Deliver To</Text>
                  <Text style={styles.customerCardTitle}>{order.customerName || 'Customer'}</Text>
                  <Text style={styles.customerCardSub}>{order.deliveryAddress || 'Drop Area'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.customerCallBtn} 
                  activeOpacity={0.7}
                  onPress={() => {
                    const phone = order.customerPhoneNumber;
                    if (phone) {
                      Linking.openURL(`tel:${phone}`);
                    } else {
                      Alert.alert('Phone Number Unavailable', 'No phone number stored for this customer.');
                    }
                  }}
                >
                  <Ionicons name="call" size={18} color="#7C2D12" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Map Preview */}
            <MapPlaceholder 
              eta="N/A" 
              etaPosition="bottom-right" 
              destinationName={order.customerName} 
              order={order}
              riderCoords={riderCoords}
              deliveryState={deliveryState}
              onPress={() => setIsNavigationModalOpen(true)}
            />

            {/* Customer Instructions */}
            <View style={styles.instructionCard}>
              <View style={styles.instructionHeader}>
                <Ionicons name="information-circle" size={18} color="#F97316" style={{ marginRight: 8 }} />
                <Text style={styles.instructionTitle}>Customer Instructions</Text>
              </View>
              <Text style={styles.instructionText}>
                “Call when you reach the gate. Do not ring the bell.”
              </Text>
            </View>

            {/* CASH ON DELIVERY COLLECTED STATUS */}
            <View style={[
              styles.codBox,
              (isCashCollected || order.paymentMethod?.toUpperCase() !== 'COD') && styles.codBoxSuccess
            ]}>
              <View style={styles.codBoxHeader}>
                <Ionicons 
                  name="cash" 
                  size={18} 
                  color={(isCashCollected || order.paymentMethod?.toUpperCase() !== 'COD') ? '#137333' : '#B91C1C'} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={[
                  styles.codBoxTitle,
                  (isCashCollected || order.paymentMethod?.toUpperCase() !== 'COD') && styles.codBoxTitleSuccess
                ]}>
                  {order.paymentMethod?.toUpperCase() === 'COD' ? 'CASH ON DELIVERY' : 'ONLINE PREPAID'}
                </Text>
              </View>
              
              <View style={styles.codDetailsRow}>
                <View>
                  {order.paymentMethod?.toUpperCase() !== 'COD' ? (
                    <View style={styles.confirmedCashBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.confirmedCashText}>Prepaid Order ✓</Text>
                    </View>
                  ) : !isCashCollected ? (
                    <Text style={styles.codBoxSub}>Collect exact amount from customer.</Text>
                  ) : (
                    <View style={styles.confirmedCashBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.confirmedCashText}>₹{order.amount || 0} Cash Collected ✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.codAmountText,
                  (isCashCollected || order.paymentMethod?.toUpperCase() !== 'COD') && styles.codAmountTextSuccess
                ]}>
                  ₹{order.amount || 0}
                </Text>
              </View>
            </View>

            {/* CUSTOMER PIN VERIFICATION BOX */}
            {hasReachedCustomer && order.deliveryPinRequired && (
              <View style={[
                styles.pinVerificationBox,
                { backgroundColor: themedBoxBg, borderColor: themedBoxBorder },
                order.deliveryPinVerified && styles.pinVerificationBoxSuccess
              ]}>
                <View style={styles.pinVerificationBoxHeader}>
                  <Ionicons 
                    name={order.deliveryPinVerified ? "checkmark-circle" : "shield-outline"} 
                    size={18} 
                    color={order.deliveryPinVerified ? '#137333' : '#FF7A00'} 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={[
                    styles.pinVerificationBoxTitle,
                    { color: order.deliveryPinVerified ? '#137333' : '#FF7A00' }
                  ]}>
                    {order.deliveryPinVerified ? 'CUSTOMER VERIFIED ✓' : 'VERIFY CUSTOMER'}
                  </Text>
                </View>

                {order.deliveryPinVerified ? (
                  <View style={styles.confirmedPinBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.confirmedPinText}>Delivery PIN Verified ✓</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.pinVerificationBoxSub, { color: themedTextSub }]}>
                      Ask the customer for the 4-digit Delivery PIN shown on their screen.
                    </Text>
                    
                    {/* PIN Input Container */}
                    <View style={styles.pinInputContainer}>
                      <TextInput
                        ref={partnerPinInputRef}
                        value={partnerPinInput}
                        onChangeText={handlePinChange}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        maxLength={4}
                        caretHidden
                        contextMenuHidden
                        autoCorrect={false}
                        autoCapitalize="none"
                        style={styles.pinRealInput}
                        editable={!isVerifyingPartnerPin && lockoutCountdown === 0}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          if (partnerPinInput.length === 4) {
                            handlePartnerVerifyPin();
                          }
                        }}
                        onFocus={handleInputFocus}
                      />

                      <View pointerEvents="none" style={styles.partnerPinBoxesRow}>
                        {[0, 1, 2, 3].map((idx) => {
                          const char = partnerPinInput[idx] || '';
                          const isFocused = partnerPinInput.length === idx && lockoutCountdown === 0;
                          return (
                            <View 
                              key={idx} 
                              style={[
                                styles.partnerPinBox,
                                { 
                                  backgroundColor: isFocused ? themedPinBoxFocusBg : themedPinBoxBg,
                                  borderColor: isFocused ? themedPinBoxFocusBorder : themedPinBoxBorder
                                },
                                lockoutCountdown > 0 && { opacity: 0.5, backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }
                              ]}
                            >
                              <Text style={[styles.partnerPinBoxText, { color: themedPinBoxText }]}>{char}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {partnerPinError ? (
                      <Text style={styles.partnerPinErrorText}>
                        {partnerPinError} {lockoutCountdown > 0 ? `(${lockoutCountdown}s)` : ''}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isVerifyingPartnerPin || partnerPinInput.length !== 4 || lockoutCountdown > 0}
                      onPress={handlePartnerVerifyPin}
                      style={[
                        styles.partnerVerifyPinBtn,
                        (isVerifyingPartnerPin || partnerPinInput.length !== 4 || lockoutCountdown > 0) && { opacity: 0.6 }
                      ]}
                    >
                      {isVerifyingPartnerPin ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.partnerVerifyPinBtnText}>Verify PIN</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Sticky Action Button Container */}
          <View style={[styles.stickyFooterContainer, { bottom: bottomNavHeight + 14 }]}>
            {!hasReachedCustomer ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  setIsNavigationModalOpen(true);
                  setIsNavigatingLive(true);
                }}
                style={styles.stickyFooterButton}
              >
                <Text style={styles.stickyFooterButtonText}>Navigate to Customer</Text>
              </TouchableOpacity>
            ) : order.paymentMethod?.toUpperCase() === 'COD' && !isCashCollected ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleCollectCod}
                disabled={isAcceptingDeclining}
                style={[styles.stickyFooterButton, isAcceptingDeclining && { opacity: 0.7 }]}
              >
                {isAcceptingDeclining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.stickyFooterButtonText}>Confirm ₹{order.amount || 0} Cash Collected</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  if (order.deliveryPinRequired && !order.deliveryPinVerified) {
                    alert("Please verify the customer's PIN first.");
                  } else {
                    completeActiveOrder();
                  }
                }}
                disabled={isAcceptingDeclining || (order.deliveryPinRequired && !order.deliveryPinVerified)}
                style={[
                  styles.stickyFooterButton, 
                  styles.successButton, 
                  (isAcceptingDeclining || (order.deliveryPinRequired && !order.deliveryPinVerified)) && { opacity: 0.5 }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {isAcceptingDeclining ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.stickyFooterButtonText}>
                        {order.deliveryPinRequired && !order.deliveryPinVerified ? 'Verify PIN to Deliver' : 'Mark as Delivered'}
                      </Text>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // SCREEN 3.5: DELIVERY COMPLETED SUCCESS SCREEN
  const renderDeliveryCompletedScreen = () => {
    const res = justCompletedOrder || {};
    const orderData = res.order || {};
    const financials = res.financials || {};
    const delivery = res.delivery || {};

    const orderNumber = orderData.orderNumber || 'QB-XXXXXXXX-XXXXXX';
    const items = orderData.items || [];
    const foodItemsText = items.map((item: any) => `${item.quantity}x ${item.foodName}`).join(', ');

    const totalEarned = financials.totalEarned !== undefined ? financials.totalEarned : 65;
    const deliveryFee = financials.earningComponents?.deliveryFee !== undefined 
      ? financials.earningComponents.deliveryFee 
      : totalEarned;
    const bonus = financials.earningComponents?.bonus !== undefined 
      ? financials.earningComponents.bonus 
      : 0;

    // Formatting timestamps
    const formatTime = (ts: string | null) => {
      if (!ts) return '—';
      try {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '—';
      }
    };

    return (
      <View style={styles.completedScreenContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.completedScrollContent}
        >
          {/* Centered green check icon */}
          <View style={styles.completedSuccessCircle}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.completedTitle}>DELIVERY{"\n"}COMPLETED</Text>
          <Text style={styles.completedSubtitle}>Great job! The order was delivered successfully.</Text>
          <Text style={styles.completedOrderText}>{foodItemsText || `#${orderNumber}`}</Text>

          {/* Earning Card */}
          <View style={styles.completedEarningCard}>
            <Text style={styles.completedEarningLabel}>YOU EARNED</Text>
            <Text style={styles.completedEarningValue}>₹{totalEarned}</Text>
            
            <View style={styles.addedToEarningsPill}>
              <Ionicons name="wallet-outline" size={14} color="#EA580C" style={{ marginRight: 6 }} />
              <Text style={styles.addedToEarningsText}>Added to your QuickBite earnings</Text>
            </View>
          </View>

          {/* Delivery Summary Card */}
          <View style={styles.completedCard}>
            <Text style={styles.completedCardTitle}>Delivery Summary</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="business-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.summaryLabel}>Restaurant</Text>
              </View>
              <Text style={styles.summaryValue} numberOfLines={1}>{orderData.restaurantName || 'QuickBite Kitchen'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="person-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.summaryLabel}>Customer</Text>
              </View>
              <Text style={styles.summaryValue} numberOfLines={1}>{orderData.customerName || 'Customer'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="map-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.summaryLabel}>Total Distance</Text>
              </View>
              <Text style={styles.summaryValue}>{delivery.totalDistance ? `${delivery.totalDistance} km` : '—'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="time-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.summaryLabel}>Delivery Time</Text>
              </View>
              <Text style={styles.summaryValue}>{delivery.durationMinutes ? `${delivery.durationMinutes} mins` : '—'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelContainer}>
                <Ionicons name="card-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.summaryLabel}>Payment</Text>
              </View>
              {orderData.paymentMethod?.toUpperCase() === 'COD' ? (
                <View style={styles.paymentBadgeCod}>
                  <Text style={styles.paymentBadgeCodText}>COD Collected: ₹{orderData.totalAmount || 0} ✓</Text>
                </View>
              ) : (
                <View style={styles.paymentBadgePaid}>
                  <Text style={styles.paymentBadgePaidText}>Online Paid ✓</Text>
                </View>
              )}
            </View>
          </View>

          {/* Earnings Breakdown Card */}
          <View style={styles.completedCard}>
            <Text style={styles.completedCardTitle}>Earnings Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Delivery Earning</Text>
              <Text style={styles.breakdownValue}>₹{deliveryFee}</Text>
            </View>

            {bonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Bonus</Text>
                <Text style={[styles.breakdownValue, { color: '#10B981' }]}>+₹{bonus}</Text>
              </View>
            )}

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total Earned</Text>
              <Text style={styles.breakdownTotalValue}>₹{totalEarned}</Text>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={[styles.completedCard, { marginBottom: 32 }]}>
            <Text style={styles.completedCardTitle}>Status Timeline</Text>
            
            <View style={styles.timelineContainer}>
              <View style={styles.completedTimelineRow}>
                <View style={styles.timelineIndicatorContainer}>
                  <View style={styles.timelineDotActive}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.completedTimelineContent}>
                  <Text style={styles.completedTimelineTitle}>Order Accepted</Text>
                  <Text style={styles.completedTimelineTime}>{formatTime(orderData.acceptedAt)}</Text>
                </View>
              </View>

              <View style={styles.completedTimelineRow}>
                <View style={styles.timelineIndicatorContainer}>
                  <View style={styles.timelineDotActive}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.completedTimelineContent}>
                  <Text style={styles.completedTimelineTitle}>Picked Up</Text>
                  <Text style={styles.completedTimelineTime}>{formatTime(orderData.pickedUpAt)}</Text>
                </View>
              </View>

              <View style={styles.completedTimelineRow}>
                <View style={styles.timelineIndicatorContainer}>
                  <View style={styles.timelineDotActive}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.completedTimelineContent}>
                  <Text style={styles.completedTimelineTitle}>Out for Delivery</Text>
                  <Text style={styles.completedTimelineTime}>{formatTime(orderData.outForDeliveryAt)}</Text>
                </View>
              </View>

              <View style={[styles.completedTimelineRow, { marginBottom: 0 }]}>
                <View style={styles.timelineIndicatorContainer}>
                  <View style={styles.timelineDotActive}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.completedTimelineContent}>
                  <Text style={styles.completedTimelineTitle}>Delivered</Text>
                  <Text style={styles.completedTimelineTime}>{formatTime(orderData.deliveredAt)}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={[styles.completedStickyFooter, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              setJustCompletedOrder(null);
              setViewingActiveOrder(false);
              changeDeliveryState('none');
              setIsOnline(true);
              setIsAvailable(true);
            }}
            style={styles.completedBackHomeBtn}
          >
            <Text style={styles.completedBackHomeBtnText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              setJustCompletedOrder(null);
              setViewingActiveOrder(false);
              changeDeliveryState('none');
              setActiveTab('earnings');
              setIsOnline(true);
              setIsAvailable(true);
            }}
            style={styles.completedViewEarningsBtn}
          >
            <Text style={styles.completedViewEarningsText}>View Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 2. ORDERS TAB (Orders tab with Current & Completed lists)
  const renderOrdersTab = () => {
    const isOrderActive = activeAssignment && activeAssignment.order && 
      ['accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(activeAssignment.order.orderStatus);
    
    let orderStatusText = 'Reach Restaurant';
    if (activeAssignment?.order?.orderStatus === 'picked_up') {
      orderStatusText = 'Start Delivery';
    } else if (activeAssignment?.order?.orderStatus === 'out_for_delivery') {
      orderStatusText = 'Out for Delivery';
    } else if (activeAssignment?.order?.orderStatus === 'ready_for_pickup') {
      if (deliveryState === 'active-pickup') {
        orderStatusText = 'Confirm Pickup';
      } else {
        orderStatusText = 'Reach Restaurant';
      }
    } else if (activeAssignment?.order?.orderStatus === 'preparing' || activeAssignment?.order?.orderStatus === 'accepted') {
      orderStatusText = 'Reach Restaurant';
    }

    const handleContinueDelivery = () => {
      setViewingActiveOrder(true);
      setActiveTab('home');
    };

    // Filter the completed orders locally
    const filteredCompletedOrders = completedOrders.filter(order => 
      order.filterGroup.includes(completedFilter)
    );

    return (
      <View style={styles.tabContentContainer}>
        {/* Header - Always titled "Orders" for completed states */}
        <Header 
          title="Orders" 
          isOnline={isOnline} 
          isAvailable={isAvailable}
        />
        
        {/* Custom Tab selector row with filter icon */}
        <View style={styles.ordersTabsRow}>
          <View style={styles.ordersSubTabsContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setOrdersSubTab('available')}
              style={[
                styles.ordersSubTab,
                ordersSubTab === 'available' && styles.ordersSubTabActive
              ]}
            >
              <Text style={[
                styles.ordersSubTabText,
                ordersSubTab === 'available' && styles.ordersSubTabTextActive
              ]}>Available</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setOrdersSubTab('current')}
              style={[
                styles.ordersSubTab,
                ordersSubTab === 'current' && styles.ordersSubTabActive
              ]}
            >
              <Text style={[
                styles.ordersSubTabText,
                ordersSubTab === 'current' && styles.ordersSubTabTextActive
              ]}>Current</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setOrdersSubTab('completed')}
              style={[
                styles.ordersSubTab,
                ordersSubTab === 'completed' && styles.ordersSubTabActive
              ]}
            >
              <Text style={[
                styles.ordersSubTabText,
                ordersSubTab === 'completed' && styles.ordersSubTabTextActive
              ]}>Completed</Text>
            </TouchableOpacity>
          </View>

          {/* Filter icon button */}
          <TouchableOpacity 
            style={styles.ordersFilterButton} 
            activeOpacity={0.7}
            onPress={() => setShowFilterPicker(!showFilterPicker)}
          >
            <Ionicons name="options-outline" size={18} color="#38220F" />
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown menu overlay */}
        {showFilterPicker && (
          <View style={styles.filterDropdownCard}>
            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('today');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'today' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'today' && styles.filterDropdownItemTextActive
              ]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('week');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'week' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'week' && styles.filterDropdownItemTextActive
              ]}>This Week</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('month');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'month' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'month' && styles.filterDropdownItemTextActive
              ]}>This Month</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('all');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'all' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'all' && styles.filterDropdownItemTextActive
              ]}>All Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('delivered');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'delivered' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'delivered' && styles.filterDropdownItemTextActive
              ]}>Delivered Only</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setCompletedFilter('cancelled_rejected');
                setShowFilterPicker(false);
              }}
              style={[
                styles.filterDropdownItem,
                completedFilter === 'cancelled_rejected' && styles.filterDropdownItemActive
              ]}
            >
              <Text style={[
                styles.filterDropdownItemText,
                completedFilter === 'cancelled_rejected' && styles.filterDropdownItemTextActive
              ]}>Cancelled / Rejected</Text>
            </TouchableOpacity>
          </View>
        )}

        {ordersSubTab === 'available' ? (
          // Available orders tab content
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            {availableOrders.length > 0 ? (
              availableOrders.map((order) => (
                <View key={order.id} style={styles.currentOrderCard}>
                  <View style={styles.currentOrderCardHeader}>
                    <Text style={styles.currentOrderCardTitle}>ORDER #{order.orderNumber}</Text>
                    <View style={styles.currentOrderStatusBadge}>
                      <Ionicons name="gift-outline" size={12} color="#F97316" style={{ marginRight: 4 }} />
                      <Text style={styles.currentOrderStatusText}>Available</Text>
                    </View>
                  </View>

                  <View style={styles.currentOrderRouteContainer}>
                    <View style={styles.currentOrderRouteRow}>
                      <View style={[styles.routeDotMini, styles.pickupDotColor]} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.currentOrderRouteTitle}>{order.restaurantName}</Text>
                        <Text style={styles.currentOrderRouteSubtitle}>Pickup • {order.pickupAddress}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.currentOrderRouteConnector} />

                    <View style={styles.currentOrderRouteRow}>
                      <View style={[styles.routeDotMini, styles.dropDotColor]} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.currentOrderRouteTitle}>Delivery Destination</Text>
                        <Text style={styles.currentOrderRouteSubtitle}>Dropoff • {order.deliveryAddress}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.currentOrderSummaryBox}>
                    <View style={styles.currentOrderSummaryCol}>
                      <Text style={styles.currentOrderSummaryLabel}>Payment Method</Text>
                      <View style={styles.currentOrderSummaryValueRow}>
                        <View style={styles.ordersCodMiniBadge}>
                          <Text style={styles.ordersCodMiniBadgeText}>{order.paymentMethod}</Text>
                        </View>
                        <Text style={styles.ordersCodAmountText}>₹{order.amount}</Text>
                      </View>
                    </View>
                    <View style={styles.currentOrderSummaryDivider} />
                    <View style={styles.currentOrderSummaryCol}>
                      <Text style={styles.currentOrderSummaryLabel}>Est. Earnings</Text>
                      <Text style={styles.ordersEarningsText}>₹65</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => handleClaimAvailableOrder(order.id)}
                    disabled={isAcceptingDeclining}
                    style={[styles.continueDeliveryBtn, isAcceptingDeclining && { opacity: 0.7 }]}
                  >
                    {isAcceptingDeclining ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.continueDeliveryBtnText}>Claim Order ✓</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="document-text-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyStateTitle}>No available orders</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Waiting for new ready orders in your zone...
                </Text>
              </View>
            )}
          </ScrollView>
        ) : ordersSubTab === 'current' ? (
          // Current orders tab content
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            {isOrderActive && activeAssignment ? (
              // Active Order Card
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handleContinueDelivery}
                style={styles.currentOrderCard}
              >
                <View style={styles.currentOrderCardHeader}>
                  <Text style={styles.currentOrderCardTitle}>ORDER #{activeAssignment.order?.orderNumber || activeAssignment.order?.id}</Text>
                  <View style={styles.currentOrderStatusBadge}>
                    <Ionicons name="bicycle" size={12} color="#F97316" style={{ marginRight: 4 }} />
                    <Text style={styles.currentOrderStatusText}>{orderStatusText}</Text>
                  </View>
                </View>

                {/* Route detail rows */}
                <View style={styles.currentOrderRouteContainer}>
                  <View style={styles.currentOrderRouteRow}>
                    <View style={[styles.routeDotMini, styles.pickupDotColor]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.currentOrderRouteTitle}>{activeAssignment.order?.restaurantName || 'QuickBite Kitchen'}</Text>
                      <Text style={styles.currentOrderRouteSubtitle}>Pickup • {activeAssignment.order?.pickupAddress || 'Restaurant Address'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.currentOrderRouteConnector} />

                  <View style={styles.currentOrderRouteRow}>
                    <View style={[styles.routeDotMini, styles.dropDotColor]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.currentOrderRouteTitle}>{activeAssignment.order?.customerName || 'Customer'}</Text>
                      <Text style={styles.currentOrderRouteSubtitle}>Dropoff • {activeAssignment.order?.deliveryAddress || 'Drop Location'}</Text>
                    </View>
                  </View>
                </View>

                {/* Payment & Earnings Summary Box */}
                <View style={styles.currentOrderSummaryBox}>
                  <View style={styles.currentOrderSummaryCol}>
                    <Text style={styles.currentOrderSummaryLabel}>Payment Method</Text>
                    <View style={styles.currentOrderSummaryValueRow}>
                      <View style={styles.ordersCodMiniBadge}>
                        <Text style={styles.ordersCodMiniBadgeText}>{activeAssignment.order?.paymentMethod || 'Prepaid'}</Text>
                      </View>
                      <Text style={styles.ordersCodAmountText}>₹{activeAssignment.order?.amount || 0}</Text>
                    </View>
                  </View>
                  <View style={styles.currentOrderSummaryDivider} />
                  <View style={styles.currentOrderSummaryCol}>
                    <Text style={styles.currentOrderSummaryLabel}>Est. Earnings</Text>
                    <Text style={styles.ordersEarningsText}>₹65</Text>
                  </View>
                </View>

                {/* Continue Delivery CTA */}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleContinueDelivery}
                  style={styles.continueDeliveryBtn}
                >
                  <Text style={styles.continueDeliveryBtnText}>Continue Delivery →</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              // Empty State
              <View style={styles.emptyStateContainer}>
                <Ionicons name="document-text-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyStateTitle}>No active deliveries</Text>
                <Text style={styles.emptyStateSubtitle}>
                  You don’t have any active deliveries right now.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          // Completed tab content
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            {filteredCompletedOrders.length > 0 ? (
              <View>
                {/* Date Group header section */}
                <View style={styles.completedSectionHeader}>
                  <Text style={styles.completedSectionHeaderTitle}>
                    {completedFilter === 'today' ? 'TODAY' : completedFilter === 'week' ? 'THIS WEEK' : 'THIS MONTH'}
                  </Text>
                  
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={fetchCompletedOrders}
                  >
                    <Text style={styles.completedSectionHeaderCount}>
                      {filteredCompletedOrders.length} {filteredCompletedOrders.length === 1 ? 'Order' : 'Orders'} 🔄
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Completed cards list */}
                {filteredCompletedOrders.map((order, idx) => (
                  <View key={idx} style={styles.completedOrderCard}>
                    {/* Header row */}
                    <View style={styles.completedOrderCardHeader}>
                      <View>
                        <Text style={styles.completedOrderCardTitle}>{order.orderId}</Text>
                        <Text style={styles.completedOrderCardDate}>{order.date}</Text>
                      </View>
                      <View style={styles.completedOrderCardStatusBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.completedOrderCardStatusText}>Delivered</Text>
                      </View>
                    </View>

                    {/* Route details */}
                    <View style={styles.completedOrderRouteContainer}>
                      <View style={styles.completedOrderRouteRow}>
                        <View style={[styles.routeDotMini, styles.pickupDotColor]} />
                        <Text style={styles.completedOrderRouteText}>{order.restaurantName}</Text>
                      </View>
                      
                      <View style={styles.completedOrderRouteConnector} />

                      <View style={styles.completedOrderRouteRow}>
                        <View style={[styles.routeDotMini, styles.dropDotColor]} />
                        <Text style={styles.completedOrderRouteText}>{order.dropArea}</Text>
                      </View>
                    </View>

                    {/* Footer row */}
                    <View style={styles.completedOrderCardFooter}>
                      <View style={styles.completedOrderCardPillsRow}>
                        <View style={styles.completedOrderCardMiniBadge}>
                          <Ionicons name="walk-outline" size={10} color="#8A7A6E" style={{ marginRight: 3 }} />
                          <Text style={styles.completedOrderCardMiniBadgeText}>{order.distance}</Text>
                        </View>
                        
                        {order.paymentMode === 'Prepaid' ? (
                          <View style={styles.completedOrderCardMiniBadge}>
                            <Text style={styles.completedOrderCardMiniBadgeText}>Prepaid</Text>
                          </View>
                        ) : (
                          <View style={[styles.completedOrderCardMiniBadge, styles.completedOrderCodBadge]}>
                            <Text style={styles.completedOrderCodBadgeText}>COD ₹{order.codAmount}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.completedOrderCardEarningsCol}>
                        <Text style={styles.completedOrderCardEarningsLabel}>Earned</Text>
                        <Text style={styles.completedOrderCardEarningsValue}>₹{order.earnings}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              // Empty State
              <View style={styles.completedEmptyStateContainer}>
                <View style={styles.completedEmptyIconCircle}>
                  <Ionicons name="time-outline" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.completedEmptyStateTitle}>No completed deliveries yet</Text>
                <Text style={styles.completedEmptyStateSubtitle}>
                  Your successfully completed orders will appear here.
                </Text>
                
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={fetchCompletedOrders}
                  style={styles.completedEmptyRestoreBtn}
                >
                  <Text style={styles.completedEmptyRestoreBtnText}>Refresh History 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  // 3. EARNINGS TAB (Earnings screen, charts, transactions)
  const renderEarningsTab = () => {
    // Find the max daily earnings in the week to scale the chart bars dynamically
    const maxEarnings = Math.max(...(dashboardStats.weeklyChart?.map(d => d.value) || [0]));
    
    const chartDays = (dashboardStats.weeklyChart || []).map(dayItem => {
      let height = 5;
      if (dayItem.value > 0) {
        // Scale proportionally between 5 and 80 based on the maximum daily value in the week
        height = maxEarnings > 0 ? Math.max(5, Math.floor((dayItem.value / maxEarnings) * 80)) : 5;
      }
      return {
        ...dayItem,
        height
      };
    });

    return (
      <View style={styles.tabContentContainer}>
        <Header title="Earnings" isOnline={isOnline} isAvailable={isAvailable} />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          style={styles.screenBg}
        >
          {/* Today's Earnings large card */}
          <LargeEarningsCard title="Today's Earnings" amount={dashboardStats.todayEarnings} />

          {/* Period totals side-by-side cards */}
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard label="THIS WEEK" amount={`₹${dashboardStats.weeklyEarnings}`} />
            <PeriodStatsCard label="THIS MONTH" amount={`₹${dashboardStats.monthlyEarnings}`} />
          </View>

          {/* Earnings breakdown details card */}
          <EarningsBreakdown orderEarnings={dashboardStats.todayEarnings} incentives={0} tips={0} />

          {/* Daily Trend simple bar chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Daily Trend</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowFullChartModal(true)}>
                <Text style={styles.viewChartText}>View Full Chart</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartCard}>
              {/* Chart Bars */}
              <View style={styles.barsContainer}>
                {chartDays.map((dayItem, index) => {
                  const isSelected = selectedChartDayIdx !== null ? (selectedChartDayIdx === index) : dayItem.selected;
                  return (
                    <TouchableOpacity 
                      key={index} 
                      activeOpacity={0.8}
                      onPress={() => setSelectedChartDayIdx(index)}
                      style={styles.barColumn}
                    >
                      {isSelected && (
                        <View style={styles.selectedDayBubble}>
                          <Text style={styles.selectedDayBubbleText}>₹{dayItem.value}</Text>
                        </View>
                      )}
                      <View style={[
                        styles.chartBar,
                        { height: dayItem.height },
                        isSelected ? styles.selectedChartBar : styles.defaultChartBar
                      ]} />
                      <Text style={[
                        styles.barLabel,
                        isSelected && styles.selectedBarLabel
                      ]}>
                        {dayItem.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Recent Transactions List */}
          <View style={styles.transactionsContainer}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            
            <View style={styles.transactionsListCard}>
              {completedOrders.length > 0 ? (
                completedOrders.slice(0, 5).map((order, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.transactionRow,
                      idx < Math.min(completedOrders.length, 5) - 1 && styles.transactionRowDivider
                    ]}
                  >
                    <View style={styles.transactionLeft}>
                      <View style={styles.iconCircleBg}>
                        <Ionicons name="bicycle" size={16} color="#8A7A6E" />
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.transactionItemTitle}>{order.orderId}</Text>
                        <Text style={styles.transactionItemSub}>Completed • {order.date}</Text>
                      </View>
                    </View>
                    <Text style={styles.transactionAmountText}>+₹{order.earnings}</Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#8A7A6E', fontWeight: '500' }}>No recent transactions</Text>
                </View>
              )}
            </View>

            {completedOrders.length > 5 && (
              <TouchableOpacity 
                style={styles.viewAllButton} 
                activeOpacity={0.7}
                onPress={() => {
                  setActiveTab('orders');
                  setOrdersSubTab('completed');
                }}
              >
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // 4. PROFILE TAB (Profile info, documents list with action flags)
  // 4. PROFILE TAB (Profile info, documents list with action flags)
  const getDocumentName = (type: string) => {
    switch (type) {
      case 'PROFILE_PHOTO': return 'Profile Photo';
      case 'DRIVERS_LICENSE': return 'Driving Licence';
      case 'VEHICLE_RC': return 'Vehicle RC';
      case 'VEHICLE_INSURANCE': return 'Vehicle Insurance';
      default: return type.replace(/_/g, ' ');
    }
  };

  const renderDocumentPreviewModal = () => {
    if (!selectedPreviewDoc) return null;
    const docName = getDocumentName(selectedPreviewDoc.type);

    return (
      <Modal
        visible={!!selectedPreviewDoc}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedPreviewDoc(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272A' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{docName}</Text>
            <TouchableOpacity onPress={() => setSelectedPreviewDoc(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            {previewLoading ? (
              <ActivityIndicator size="large" color="#F97316" />
            ) : previewError ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{previewError}</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#F97316', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
                  onPress={() => {
                    // Force refresh by copying state
                    setSelectedPreviewDoc({ ...selectedPreviewDoc });
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : previewImageUri ? (
              <Image 
                source={{ uri: previewImageUri }} 
                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
              />
            ) : (
              <ActivityIndicator size="large" color="#F97316" />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const formatJoinedDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return '—';
    }
  };

  const renderPersonalDetailsScreen = () => {
    const bgCol = '#FAF9F6';
    const cardBg = '#FFFFFF';
    const cardBorder = '#FAF6F0';
    const textTitle = '#38220F';
    const textSub = '#8A7A6E';
    const inputBg = '#F8FAFC';
    const inputBorder = '#E2E8F0';
    const inputText = '#0F172A';

    const handleSave = async () => {
      if (!editName.trim()) {
        setPersonalUpdateError('Name cannot be empty');
        return;
      }
      setIsUpdatingPersonal(true);
      setPersonalUpdateError('');
      try {
        const profile = await api.updateProfile(editName.trim(), editEmail.trim());
        setCurrentUser(profile.partner.user);
        setCurrentPartner(profile.partner);
        setIsEditingPersonal(false);
      } catch (err: any) {
        setPersonalUpdateError(err.message || 'Failed to update profile');
      } finally {
        setIsUpdatingPersonal(false);
      }
    };

    const toggleEdit = () => {
      if (!isEditingPersonal) {
        setEditName(currentUser?.name || '');
        setEditEmail(currentUser?.email || '');
        setPersonalUpdateError('');
      }
      setIsEditingPersonal(!isEditingPersonal);
    };

    return (
      <View style={{ flex: 1, backgroundColor: bgCol }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            onPress={() => {
              setIsEditingPersonal(false);
              setActiveProfileSubScreen('main');
            }}
            style={styles.subHeaderBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={textTitle} />
            <Text style={[styles.subHeaderBackText, { color: textTitle }]}>Personal Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={toggleEdit}
            style={styles.subHeaderEditBtn}
          >
            <Text style={styles.subHeaderEditBtnText}>
              {isEditingPersonal ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {personalUpdateError ? (
            <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600' }}>{personalUpdateError}</Text>
            </View>
          ) : null}

          {/* Profile Identity Card */}
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={styles.profileAvatarWrapper}>
              <Image source={{ uri: profileImageUri }} style={styles.profileAvatar} />
            </View>
            <View style={styles.profileDetailsWrapper}>
              <Text style={[styles.profileNameText, { color: textTitle, fontSize: 16 }]}>{currentUser?.name || 'Partner'}</Text>
              
              {currentPartner?.isVerified && (
                <View style={styles.profileVerifiedBadge}>
                  <Ionicons name="checkmark-circle" size={11} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.profileVerifiedText}>Verified Partner</Text>
                </View>
              )}
            </View>
          </View>

          {/* Personal Information Section */}
          <Text style={[styles.profileSectionTitle, { color: textSub }]}>PERSONAL INFORMATION</Text>
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Full Name */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSub }]}>Full Name</Text>
              {isEditingPersonal ? (
                <TextInput
                  style={[styles.detailInput, { backgroundColor: inputBg, borderColor: inputBorder, color: inputText }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              ) : (
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentUser?.name || 'Not provided'}</Text>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSub }]}>Email Address</Text>
              {isEditingPersonal ? (
                <TextInput
                  style={[styles.detailInput, { backgroundColor: inputBg, borderColor: inputBorder, color: inputText }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94A3B8"
                />
              ) : (
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentUser?.email || 'Not provided'}</Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={[styles.detailRow, { marginBottom: 0 }]}>
              <Text style={[styles.detailLabel, { color: textSub }]}>Mobile Number</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentUser?.mobileNumber || 'Not provided'}</Text>
                {currentUser?.mobileNumber && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 }}>
                    <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#059669' }}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Account Details Section */}
          <Text style={[styles.profileSectionTitle, { color: textSub }]}>ACCOUNT DETAILS</Text>
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Account Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.detailLabel, { color: textSub, marginBottom: 0 }]}>Account Status</Text>
              <View style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>{currentPartner?.accountStatus || 'Active'}</Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            {/* Verification Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.detailLabel, { color: textSub, marginBottom: 0 }]}>Verification Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>Verified</Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            {/* Joined Date */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.detailLabel, { color: textSub, marginBottom: 0 }]}>Joined Date</Text>
              <Text style={[styles.detailValue, { color: textTitle }]}>{formatJoinedDate(currentPartner?.createdAt)}</Text>
            </View>
          </View>

          {isEditingPersonal && (
            <View style={{ marginTop: 12, gap: 12 }}>
              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={isUpdatingPersonal}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>
                  {isUpdatingPersonal ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#E2E8F0' }]}
                onPress={toggleEdit}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveBtnText, { color: '#38220F' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderVehicleDetailsScreen = () => {
    const bgCol = '#FAF9F6';
    const cardBg = '#FFFFFF';
    const cardBorder = '#FAF6F0';
    const textTitle = '#38220F';
    const textSub = '#8A7A6E';

    return (
      <View style={{ flex: 1, backgroundColor: bgCol }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            onPress={() => setActiveProfileSubScreen('main')}
            style={styles.subHeaderBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={textTitle} />
            <Text style={[styles.subHeaderBackText, { color: textTitle }]}>Vehicle Details</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Top Vehicle Identity Card */}
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={styles.zoneIconContainer}>
              <Ionicons name="bicycle" size={24} color="#F97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: textTitle }}>Delivery Vehicle</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 3 }} />
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#059669' }}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Vehicle Fields Card */}
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>Vehicle Type</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentPartner?.vehicleType || 'Motorcycle'}</Text>
              </View>
              <Ionicons name="bicycle" size={20} color="#8A7A6E" />
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>Vehicle Number</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentPartner?.vehicleNumber || 'Not provided'}</Text>
              </View>
              <Ionicons name="card" size={20} color="#8A7A6E" />
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>Driving Licence</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{currentPartner?.licenseNumber || 'Not provided'}</Text>
              </View>
              <Ionicons name="document-text" size={20} color="#8A7A6E" />
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.detailLabel, { color: textSub, marginBottom: 0 }]}>Vehicle Verification</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Info notice box */}
          <View style={[styles.infoNoticeBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#F97316" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={[styles.infoNoticeText, { color: '#78350F', flex: 1 }]}>
              Vehicle details are verified by QuickBite. Contact support if you need to change your registered vehicle.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderBankDetailsScreen = () => {
    const bgCol = '#FAF9F6';
    const cardBg = '#FFFFFF';
    const cardBorder = '#FAF6F0';
    const textTitle = '#38220F';
    const textSub = '#8A7A6E';

    const bank = currentPartner?.bank;

    return (
      <View style={{ flex: 1, backgroundColor: bgCol }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            onPress={() => setActiveProfileSubScreen('main')}
            style={styles.subHeaderBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={textTitle} />
            <Text style={[styles.subHeaderBackText, { color: textTitle }]}>Bank Details</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Top Bank Identity Card */}
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={styles.zoneIconContainer}>
              <Ionicons name="business" size={24} color="#F97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: textTitle }}>Bank Account</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 3 }} />
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#059669' }}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Bank Fields Card */}
          <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>Account Holder</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{bank?.accountHolderName || 'Not provided'}</Text>
              </View>
              <Ionicons name="person" size={20} color="#8A7A6E" />
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>Account Number</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{bank?.maskedAccountNumber || 'Not provided'}</Text>
              </View>
              <Ionicons name="card" size={20} color="#8A7A6E" />
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.detailLabel, { color: textSub }]}>IFSC Code</Text>
                <Text style={[styles.detailValue, { color: textTitle }]}>{bank?.ifscCode || 'Not provided'}</Text>
              </View>
              <Ionicons name="code-working" size={20} color="#8A7A6E" />
            </View>

            {bank?.upiId ? (
              <>
                <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder, marginVertical: 12 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[styles.detailLabel, { color: textSub }]}>UPI ID</Text>
                    <Text style={[styles.detailValue, { color: textTitle }]}>{bank.upiId}</Text>
                  </View>
                  <Ionicons name="send" size={20} color="#8A7A6E" />
                </View>
              </>
            ) : null}
          </View>

          {/* Info notice box */}
          <View style={[styles.infoNoticeBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="lock-closed" size={20} color="#F97316" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={[styles.infoNoticeText, { color: '#78350F', flex: 1 }]}>
              Your bank details are securely stored and used for partner payouts. To update these details, please contact partner support.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderDocumentsScreen = () => {
    const bgCol = '#FAF9F6';
    const cardBg = '#FFFFFF';
    const cardBorder = '#FAF6F0';
    const textTitle = '#38220F';
    const textSub = '#8A7A6E';

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'VERIFIED': return '#059669';
        case 'REJECTED': return '#EF4444';
        default: return '#D97706';
      }
    };

    const getStatusBg = (status: string) => {
      switch (status) {
        case 'VERIFIED': return '#ECFDF5';
        case 'REJECTED': return '#FEF2F2';
        default: return '#FFFBEB';
      }
    };

    const getStatusBorder = (status: string) => {
      switch (status) {
        case 'VERIFIED': return '#A7F3D0';
        case 'REJECTED': return '#FCA5A5';
        default: return '#FDE68A';
      }
    };

    const documents = currentPartner?.documents || [];

    const verifiedCount = documents.filter((d: any) => d.status === 'VERIFIED').length;
    const pendingCount = documents.filter((d: any) => d.status === 'PENDING').length;
    const rejectedCount = documents.filter((d: any) => d.status === 'REJECTED').length;
    const actionCount = pendingCount + rejectedCount;

    return (
      <View style={{ flex: 1, backgroundColor: bgCol }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            onPress={() => setActiveProfileSubScreen('main')}
            style={styles.subHeaderBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={textTitle} />
            <Text style={[styles.subHeaderBackText, { color: textTitle }]}>Account</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Main Title Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: textTitle, marginBottom: 6 }}>Documents</Text>
            <Text style={{ fontSize: 13, color: textSub, fontWeight: '600', lineHeight: 18 }}>
              Manage your Verification Documents to maintain active partner status.
            </Text>
          </View>

          {/* Counts Row */}
          <View style={styles.docSummaryRow}>
            <View style={[styles.docSummaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.docSummaryBadgeSuccess}>
                <Text style={styles.docSummaryBadgeTextSuccess}>VERIFIED</Text>
              </View>
              <Text style={[styles.docSummaryNumber, { color: textTitle }]}>{verifiedCount}</Text>
              <Text style={[styles.docSummaryLabel, { color: textSub }]}>Verified Documents</Text>
            </View>

            <View style={[styles.docSummaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.docSummaryBadgeWarning}>
                <Text style={styles.docSummaryBadgeTextWarning}>ACTION</Text>
              </View>
              <Text style={[styles.docSummaryNumber, { color: textTitle }]}>{actionCount}</Text>
              <Text style={[styles.docSummaryLabel, { color: textSub }]}>Pending Review</Text>
            </View>
          </View>

          {/* Documents Cards List */}
          {documents.length > 0 ? (
            documents.map((doc: any, idx: number) => (
              <View 
                key={idx} 
                style={[styles.documentCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              >
                <View style={styles.documentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.documentName, { color: textTitle }]}>{getDocumentName(doc.type)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: getStatusBg(doc.status), borderColor: getStatusBorder(doc.status), borderWidth: 1, marginLeft: 8 }]}>
                        <Text style={[styles.statusPillText, { color: getStatusColor(doc.status) }]}>{doc.status}</Text>
                      </View>
                    </View>
                    
                    {doc.type === 'DRIVERS_LICENSE' && currentPartner?.licenseNumber ? (
                      <Text style={[styles.documentSubtext, { color: textSub }]}>License: {currentPartner.licenseNumber}</Text>
                    ) : null}
                    {doc.type === 'VEHICLE_RC' && currentPartner?.vehicleNumber ? (
                      <Text style={[styles.documentSubtext, { color: textSub }]}>Plate: {currentPartner.vehicleNumber}</Text>
                    ) : null}
                  </View>
                </View>

                {doc.status === 'REJECTED' && doc.rejectionReason ? (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                    <Text style={styles.rejectionReasonValue}>{doc.rejectionReason}</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: 12 }}>
                  {doc.status === 'REJECTED' ? (
                    <TouchableOpacity 
                      style={styles.contactSupportBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.contactSupportBtnText}>Contact Support</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.viewDocBtnOutline}
                      onPress={() => setSelectedPreviewDoc(doc)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDocBtnOutlineText}>
                        {doc.status === 'PENDING' ? 'View Details' : 'View Document'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: textSub, fontSize: 14 }}>No documents uploaded</Text>
            </View>
          )}
        </ScrollView>

        {/* Preview Modal */}
        {selectedPreviewDoc && renderDocumentPreviewModal()}
      </View>
    );
  };

  const renderDeliveryPreferencesScreen = () => {
    const bgCol = '#FAF9F6';
    const cardBg = '#FFFFFF';
    const cardBorder = '#FAF6F0';
    const textTitle = '#38220F';
    const textSub = '#8A7A6E';

    return (
      <View style={{ flex: 1, backgroundColor: bgCol }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            onPress={() => setActiveProfileSubScreen('main')}
            style={styles.subHeaderBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={textTitle} />
            <Text style={[styles.subHeaderBackText, { color: textTitle }]}>Delivery Preferences</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={[styles.profileSectionTitle, { color: textSub }]}>YOUR DELIVERY AREA</Text>
          
          {/* Primary Operating Zone */}
          <View style={[styles.zoneCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.zoneIconContainer}>
              <Ionicons name="location" size={24} color="#F97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.zoneTitle, { color: textTitle }]}>{currentPartner?.preferences?.deliveryZone || currentPartner?.preferredZone || 'Not provided'}</Text>
                <View style={styles.activeZoneBadge}>
                  <Text style={styles.activeZoneBadgeText}>Active Zone</Text>
                </View>
              </View>
              <Text style={[styles.zoneSubtitle, { color: textSub }]}>Primary Operating Zone</Text>
            </View>
          </View>

          {/* Secondary Operating Zone */}
          <View style={[styles.zoneCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.zoneIconContainer, { backgroundColor: '#FAF6F0' }]}>
              <Ionicons name="business" size={24} color="#8A7A6E" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.zoneTitle, { color: textTitle }]}>{currentPartner?.preferences?.secondaryZone || currentPartner?.secondaryZone || 'None'}</Text>
              <Text style={[styles.zoneSubtitle, { color: textSub }]}>Secondary Operating Zone</Text>
            </View>
          </View>

          {/* Info notice box */}
          <View style={[styles.infoNoticeBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#F97316" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={[styles.infoNoticeText, { color: '#78350F', flex: 1 }]}>
              Zones managed by QuickBite. Edits require approval.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderProfileTab = () => {
    if (activeProfileSubScreen === 'personal') {
      return renderPersonalDetailsScreen();
    }
    if (activeProfileSubScreen === 'vehicle') {
      return renderVehicleDetailsScreen();
    }
    if (activeProfileSubScreen === 'bank') {
      return renderBankDetailsScreen();
    }
    if (activeProfileSubScreen === 'documents') {
      return renderDocumentsScreen();
    }
    if (activeProfileSubScreen === 'preferences') {
      return renderDeliveryPreferencesScreen();
    }

    const hasPendingOrRejectedDoc = (currentPartner?.documents || []).some((d: any) => d.status !== 'VERIFIED');

    return (
      <View style={styles.tabContentContainer}>
        <Header title={appName} isOnline={isOnline} isAvailable={isAvailable} />

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          style={styles.screenBg}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarWrapper}>
              <Image source={{ uri: profileImageUri }} style={styles.profileAvatar} />
              <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.7}>
                <Ionicons name="pencil" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileNameText}>{currentUser?.name || 'Partner'}</Text>
            
            <View style={styles.profileMetaRow}>
              <View style={styles.profileMetaBadge}>
                <Text style={styles.profileMetaLabel}>ID: P{currentPartner?.id || '—'}</Text>
              </View>
              <View style={[styles.profileMetaBadge, styles.starRatingBadge]}>
                <Ionicons name="star" size={11} color="#D97706" style={{ marginRight: 2 }} />
                <Text style={styles.starRatingText}>4.8</Text>
              </View>
            </View>
          </View>

          {/* Profile Menu rows */}
          <MenuRow 
            title="Personal Details" 
            subtitle={currentUser ? `${currentUser.mobileNumber} • ${currentUser.email}` : "Contact info, Emergency"} 
            icon="person" 
            onPress={() => setActiveProfileSubScreen('personal')}
          />

          <MenuRow 
            title="Vehicle Details" 
            subtitle={currentPartner ? `${currentPartner.vehicleType} • ${currentPartner.vehicleNumber || 'No Plate'}` : "Bike • KL-07-2024"} 
            icon="bicycle" 
            onPress={() => setActiveProfileSubScreen('vehicle')}
          />

          <MenuRow 
            title="Bank Details" 
            subtitle="Payout accounts, UPI" 
            icon="card" 
            onPress={() => setActiveProfileSubScreen('bank')}
          />

          {/* Action Needed Documents Row */}
          <MenuRow 
            title="Documents" 
            subtitle="License, RC, Insurance" 
            icon="document-text"
            actionNeeded={hasPendingOrRejectedDoc}
            actionText="ACTION NEEDED"
            onPress={() => setActiveProfileSubScreen('documents')}
          />

          <MenuRow 
            title="Delivery Preferences" 
            subtitle="Zones, Auto-accept" 
            icon="options" 
            onPress={() => setActiveProfileSubScreen('preferences')}
          />

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity 
              style={styles.logoutButton}
              activeOpacity={0.7}
              onPress={() => handleLogout()}
            >
              <Ionicons name="log-out-outline" size={18} color="#B91C1C" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // 5. AUTHENTICATION & STATUS SCREEN RENDERERS
  const startOtpCountdownTimer = () => {
    if (otpResendIntervalRef.current) {
      clearInterval(otpResendIntervalRef.current);
    }
    setOtpResendCountdown(30);
    otpResendIntervalRef.current = setInterval(() => {
      setOtpResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(otpResendIntervalRef.current!);
          otpResendIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const changeAuthScreen = (screen: typeof authScreen) => {
    setAuthScreen(screen);
    // Clear validation states
    setLoginEmailMobileError('');
    setLoginPasswordError('');
    setLoginFormError('');
    setResetMobileError('');
    setOtpError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setOtpValue('');
    setNewPassword('');
    setConfirmPassword('');
    
    if (screen === 'verify-otp') {
      startOtpCountdownTimer();
    } else {
      if (otpResendIntervalRef.current) {
        clearInterval(otpResendIntervalRef.current);
        otpResendIntervalRef.current = null;
      }
    }
  };

  const handleLoginPress = () => {
    setLoginEmailMobileError('');
    setLoginPasswordError('');
    setLoginFormError('');

    let hasError = false;
    if (!loginEmailMobile.trim()) {
      setLoginEmailMobileError('Please enter your mobile number/email');
      hasError = true;
    }
    if (!loginPassword) {
      setLoginPasswordError('Please enter your password');
      hasError = true;
    }
    if (hasError) return;

    setIsLoggingIn(true);
    api.login({
      identifier: loginEmailMobile.trim(),
      password: loginPassword
    })
    .then(async data => {
      setIsLoggingIn(false);
      const token = await getAuthToken();
      setAuthTokenState(token);
      setCurrentUser(data.user);
      setCurrentPartner(data.partner);
      setAccountStatus(data.partner.accountStatus);
      setIsOnline(data.partner.isOnline);
      setIsAvailable(data.partner.isAvailable);
      if (data.partner.accountStatus === 'APPROVED') {
        setActiveTab('home');
      }
      setIsAuthenticated(true);
      
      setLoginEmailMobile('');
      setLoginPassword('');
    })
    .catch((err: any) => {
      setIsLoggingIn(false);
      setLoginFormError(err.message || 'Invalid email/mobile or password.');
    });
  };

  const handleSendOtpPress = () => {
    setResetMobileError('');
    if (!resetMobile.trim()) {
      setResetMobileError('Please enter your mobile number');
      return;
    }
    changeAuthScreen('verify-otp');
  };

  const handleVerifyOtpPress = () => {
    setOtpError('');
    if (otpValue.length < 6) {
      setOtpError('Please enter the 6-digit OTP code');
      return;
    }
    changeAuthScreen('create-password');
  };

  const handleUpdatePasswordPress = () => {
    setNewPasswordError('');
    setConfirmPasswordError('');

    let hasError = false;
    if (newPassword.length < 8) {
      setNewPasswordError('Minimum 8 characters required');
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }
    if (hasError) return;

    changeAuthScreen('password-updated');
  };

  // RENDER MAIN LOGIN SCREEN
  const renderLoginScreen = () => {
    return (
      <View style={styles.authContainer}>
        <View style={styles.loginCard}>
          <View style={styles.loginCardContent}>
            {/* Logo container */}
            <View style={styles.logoCircleContainer}>
              <View style={styles.logoCircle}>
                <Text style={[styles.logoTextOrange, { fontSize: 22, textAlign: 'center' }]} numberOfLines={2}>{appName}</Text>
              </View>
            </View>

            <Text style={styles.authTitle}>Welcome Back</Text>
            <Text style={styles.authSubtitle}>Login to start delivering.</Text>

            {/* Error Message banner */}
            {loginFormError ? (
              <View style={styles.formErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.formErrorText}>{loginFormError}</Text>
              </View>
            ) : null}

            {/* Input 1 */}
            <AuthInput 
              icon="person-outline"
              placeholder="Mobile Number or Email"
              value={loginEmailMobile}
              onChangeText={setLoginEmailMobile}
              error={loginEmailMobileError}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Input 2 */}
            <PasswordInput 
              placeholder="Password"
              value={loginPassword}
              onChangeText={setLoginPassword}
              error={loginPasswordError}
            />

            {/* Forgot Password link */}
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => changeAuthScreen('forgot-password')}
              style={styles.forgotPassLinkRow}
            >
              <Text style={styles.forgotPassLinkText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <PrimaryAuthButton 
              title="Login"
              onPress={handleLoginPress}
              loading={isLoggingIn}
            />
          </View>

          {/* Card footer block */}
          <View style={styles.loginCardFooter}>
            <Ionicons name="help-circle-outline" size={16} color="#64748B" />
            <Text style={styles.loginCardFooterText}>Need help? Contact Support</Text>
          </View>
        </View>
      </View>
    );
  };

  // RENDER FORGOT PASSWORD SCREEN
  const renderForgotPasswordScreen = () => {
    return (
      <View style={styles.authContainer}>
        <AuthHeader onBackPress={() => changeAuthScreen('login')} />
        <View style={styles.authCard}>
          <Text style={styles.authTitleLeft}>Forgot Password?</Text>
          <Text style={styles.authSubtitleLeft}>
            Enter your registered mobile number to reset your password.
          </Text>

          <AuthInput 
            icon="call-outline"
            placeholder="Mobile Number"
            value={resetMobile}
            onChangeText={setResetMobile}
            error={resetMobileError}
            keyboardType="phone-pad"
          />

          <PrimaryAuthButton 
            title="Send OTP"
            onPress={handleSendOtpPress}
          />
        </View>
      </View>
    );
  };

  // RENDER VERIFY OTP SCREEN
  const renderVerifyOtpScreen = () => {
    const hiddenPhoneText = resetMobile.length > 5 
      ? `+91 ${resetMobile.slice(0, 2)}••• ••${resetMobile.slice(-3)}`
      : `+91 98••• ••210`;

    return (
      <View style={styles.authContainer}>
        <AuthHeader onBackPress={() => changeAuthScreen('forgot-password')} />
        <View style={styles.authCard}>
          <Text style={styles.authTitleLeft}>Verify OTP</Text>
          <Text style={styles.authSubtitleLeft}>
            Enter the 6-digit code sent to {hiddenPhoneText}
          </Text>

          {/* OTP Digit Blocks */}
          <View style={{ position: 'relative', alignItems: 'center' }}>
            <TextInput
              style={styles.hiddenOtpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otpValue}
              onChangeText={(val: string) => setOtpValue(val.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => {}}
              style={styles.otpBoxesRow}
            >
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = otpValue[idx] || '';
                const isFocused = otpValue.length === idx;
                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFocused
                    ]}
                  >
                    <Text style={styles.otpBoxText}>{char}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>
          </View>
          {otpError ? <Text style={styles.otpInlineError}>{otpError}</Text> : null}

          {/* Resend OTP text & link */}
          <View style={{ marginTop: 6, marginBottom: 12 }}>
            {otpResendCountdown > 0 ? (
              <Text style={styles.otpResendText}>
                Resend OTP in <Text style={{ fontWeight: '800' }}>{otpResendCountdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={startOtpCountdownTimer}>
                <Text style={[styles.otpResendText, styles.otpResendLink]}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          <PrimaryAuthButton 
            title="Verify OTP"
            onPress={handleVerifyOtpPress}
          />

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => changeAuthScreen('forgot-password')}
            style={styles.otpChangeMobileBtn}
          >
            <Text style={styles.otpChangeMobileText}>Change Mobile Number</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // RENDER CREATE NEW PASSWORD SCREEN
  const renderCreatePasswordScreen = () => {
    return (
      <View style={styles.authContainer}>
        <AuthHeader onBackPress={() => changeAuthScreen('verify-otp')} />
        <View style={styles.authCard}>
          <Text style={styles.authTitleLeft}>Create New Password</Text>
          <Text style={styles.authSubtitleLeft}>
            Choose a strong password for your QuickBite Partner account.
          </Text>

          <PasswordInput 
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            error={newPasswordError}
          />

          <PasswordInput 
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPasswordError}
          />

          <View style={styles.passwordRequirementRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.passwordRequirementText}>Minimum 8 characters</Text>
          </View>

          <PrimaryAuthButton 
            title="Update Password"
            onPress={handleUpdatePasswordPress}
          />
        </View>
      </View>
    );
  };

  // RENDER PASSWORD UPDATED SUCCESS SCREEN
  const renderPasswordUpdatedScreen = () => {
    return (
      <View style={styles.authContainer}>
        <View style={styles.successCard}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.authTitle}>Password Updated</Text>
          <Text style={styles.authSubtitle}>
            Your password has been changed successfully.
          </Text>

          <PrimaryAuthButton 
            title="Back to Login"
            onPress={() => changeAuthScreen('login')}
          />
        </View>
      </View>
    );
  };

  // RENDER ACCOUNT STATUS: PENDING (Account Under Review)
  const renderAccountUnderReviewScreen = () => {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF7' }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.statusScreenContainer}>
          <View style={styles.statusContentContainer}>
            <View style={styles.statusIconCirclePending}>
              <Ionicons name="hourglass-outline" size={32} color="#F97316" />
            </View>
            <Text style={styles.statusTitle}>Account Under Review</Text>
            <Text style={styles.statusSubtitle}>
              Your QuickBite Partner account is currently being verified by our team.
            </Text>

            {/* Checklist Card */}
            <View style={styles.statusChecklistCard}>
              <View style={styles.statusChecklistHeader}>
                <Text style={styles.statusChecklistHeaderTitle}>Verification Status</Text>
                <View style={styles.pendingBadgePill}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>

              {/* Rows */}
              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.checklistRowText}>Personal Details</Text>
              </View>
              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.checklistRowText}>Vehicle Details</Text>
              </View>
              <View style={styles.checklistRow}>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>UNDER REVIEW</Text>
                </View>
                <Text style={styles.checklistRowTextMuted}>Documents</Text>
              </View>
              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.checklistRowText}>Bank Details</Text>
              </View>
            </View>
          </View>

          <View style={styles.statusFooterContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {}} // mock refresh status
              style={styles.statusRefreshBtn}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.statusRefreshBtnText}>Refresh Status</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.helpRow}>
              <Text style={styles.helpText}>Need help? Contact Support</Text>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleLogout()}
                style={{ marginLeft: 12 }}
              >
                <Text style={styles.devLogoutLink}>Logout 🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  // RENDER ACCOUNT STATUS: ACTION REQUIRED
  const renderActionRequiredScreen = () => {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF7' }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.statusScreenContainer}>
          {/* Top close icon to go back to Login for testing */}
          <TouchableOpacity 
            style={styles.closeStatusBtn}
            activeOpacity={0.7}
            onPress={() => handleLogout()}
          >
            <Ionicons name="close" size={24} color="#38220F" />
          </TouchableOpacity>

          <View style={styles.statusContentContainer}>
            <View style={styles.statusIconCircleWarning}>
              <Ionicons name="alert-outline" size={32} color="#D97706" />
            </View>
            <Text style={styles.statusTitle}>Action Required</Text>
            <Text style={styles.statusSubtitle}>
              Some information needs to be updated before your account can be approved.
            </Text>

            {/* Reason Box */}
            <View style={styles.statusReasonCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="warning" size={18} color="#D97706" style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reasonCardTitle}>Action Required Reason</Text>
                  <Text style={styles.reasonCardText}>
                    {currentPartner?.statusReason || 'Some information needs to be updated before your account can be approved.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statusFooterContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {}}
              style={styles.statusRefreshBtn}
            >
              <Text style={styles.statusRefreshBtnText}>View Required Documents →</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {}}
              style={styles.statusSecondaryBtn}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.statusSecondaryBtnText}>Contact Support</Text>
                <Ionicons name="call-outline" size={14} color="#8A7A6E" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  // RENDER ACCOUNT STATUS: SUSPENDED (Account Temporarily Unavailable)
  const renderSuspendedScreen = () => {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF7' }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.statusScreenContainer}>
          <View style={styles.statusContentContainer}>
            <View style={styles.statusIconCircleSuspended}>
              <Ionicons name="ban-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.statusTitle}>Account Temporarily Unavailable</Text>
            <Text style={styles.statusSubtitle}>
              {currentPartner?.statusReason || 'Your delivery partner account is currently restricted. Please contact QuickBite Support for more information.'}
            </Text>
          </View>

          <View style={styles.statusFooterContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {}}
              style={styles.statusRefreshBtn}
            >
              <Text style={styles.statusRefreshBtnText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => handleLogout()}
              style={styles.statusSecondaryBtn}
            >
              <Text style={styles.statusSecondaryBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  const renderAuthScreen = () => {
    switch (authScreen) {
      case 'forgot-password':
        return renderForgotPasswordScreen();
      case 'verify-otp':
        return renderVerifyOtpScreen();
      case 'create-password':
        return renderCreatePasswordScreen();
      case 'password-updated':
        return renderPasswordUpdatedScreen();
      default:
        return renderLoginScreen();
    }
  };

  // Gated Auth rendering check on top-level launch
  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FCFAF7', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#8A7A6E', fontWeight: '600' }}>Loading session...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, backgroundColor: '#FCFAF7' }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
          <StatusBar style="dark" />
          <ScrollView 
            contentContainerStyle={styles.authScrollPadding} 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
          >
            {renderAuthScreen()}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Gated Account Status rendering check
  if (accountStatus === 'PENDING') {
    return renderAccountUnderReviewScreen();
  }
  if (accountStatus === 'ACTION_REQUIRED') {
    return renderActionRequiredScreen();
  }
  if (accountStatus === 'SUSPENDED') {
    return renderSuspendedScreen();
  }

  const handleNotificationPress = async (item: any) => {
    if (!item.isRead) {
      try {
        await api.markPartnerNotificationAsRead(item.id);
        fetchNotifications();
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.clearAllPartnerNotifications();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear all:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllPartnerNotificationsAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const renderNotificationsModal = () => {
    const unreadList = notifications.filter(n => !n.isRead);
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showNotificationsModal}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <SafeAreaView style={[styles.container, styles.screenBg, { flex: 1 }]}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderColor: '#E2E8F0',
          }}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setShowNotificationsModal(false)}
              style={{ padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color="#38220F" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#38220F' }}>Notifications</Text>
            {notifications.length > 0 ? (
              <TouchableOpacity activeOpacity={0.7} onPress={handleClearAllNotifications} style={{ padding: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Clear All</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {unreadList.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFBEB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#B45309' }}>You have {unreadList.length} unread alerts</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={handleMarkAllNotificationsRead}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>Mark all read</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            {notifications.length > 0 ? (
              notifications.map((item, idx) => {
                const date = new Date(item.createdAt);
                const formattedDate = date.toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                return (
                  <TouchableOpacity 
                    key={item.id || idx}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(item)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: item.isRead ? '#F1F5F9' : '#FDE68A',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      shadowColor: '#38220F',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{
                      backgroundColor: item.isRead ? '#F1F5F9' : '#FEF3C7',
                      borderRadius: 10,
                      padding: 8,
                      marginRight: 12,
                    }}>
                      <Ionicons 
                        name={item.type === 'earnings_credited' ? "wallet-outline" : "notifications-outline"} 
                        size={18} 
                        color={item.isRead ? "#8A7A6E" : "#D97706"} 
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#38220F', flex: 1, marginRight: 8 }}>{item.title}</Text>
                        {!item.isRead && (
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D97706' }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 13, color: '#8A7A6E', lineHeight: 18, marginBottom: 8 }}>{item.message}</Text>
                      <Text style={{ fontSize: 11, color: '#A1A1AA', fontWeight: '500' }}>{formattedDate}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ paddingVertical: 100, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="notifications-off-outline" size={48} color="#A1A1AA" />
                <Text style={{ marginTop: 12, fontSize: 14, color: '#8A7A6E', fontWeight: '600' }}>No notifications yet</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#A1A1AA' }}>We'll notify you about active orders and earnings.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderFullChartModal = () => {
    const chartDays = dashboardStats.weeklyChart || [];
    const maxVal = Math.max(...chartDays.map(d => Number(d.value) || 0), 100);
    const scaledChartDays = chartDays.map(dayItem => {
      const val = Number(dayItem.value) || 0;
      const height = 10 + (val / maxVal) * 140;
      return {
        ...dayItem,
        height,
      };
    });

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showFullChartModal}
        onRequestClose={() => setShowFullChartModal(false)}
      >
        <SafeAreaView style={[styles.container, styles.screenBg, { flex: 1 }]}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderColor: '#E2E8F0',
          }}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setShowFullChartModal(false)}
              style={{ padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color="#38220F" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#38220F' }}>Weekly Earnings Details</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            <View style={{ padding: 16 }}>
              <View style={styles.offlineEarningsCard}>
                <Text style={styles.offlineEarningsTitle}>This Week's Earnings</Text>
                <Text style={styles.offlineEarningsAmount}>₹{dashboardStats.weeklyEarnings}</Text>
                <Text style={styles.offlineEarningsCount}>
                  {dashboardStats.weeklyDeliveries} completed deliveries
                </Text>
              </View>
              
              <View style={[styles.periodCardsRow, { marginTop: 12 }]}>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginRight: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#8A7A6E', marginBottom: 4 }}>AVERAGE DAILY</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#38220F' }}>₹{(dashboardStats.weeklyEarnings / 7).toFixed(0)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginLeft: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#8A7A6E', marginBottom: 4 }}>THIS MONTH</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#38220F' }}>₹{dashboardStats.monthlyEarnings}</Text>
                </View>
              </View>

              <View style={[styles.chartContainer, { marginTop: 24 }]}>
                <Text style={styles.chartTitle}>Weekly Trend</Text>
                <View style={[styles.chartCard, { height: 260, justifyContent: 'flex-end', paddingTop: 40 }]}>
                  <View style={styles.barsContainer}>
                    {scaledChartDays.map((dayItem, index) => {
                      const isSelected = selectedChartDayIdx !== null ? (selectedChartDayIdx === index) : dayItem.selected;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={() => setSelectedChartDayIdx(index)}
                          style={[styles.barColumn, { height: 220, justifyContent: 'flex-end' }]}
                        >
                          {isSelected && (
                            <View style={[styles.selectedDayBubble, { bottom: dayItem.height + 25 }]}>
                              <Text style={styles.selectedDayBubbleText}>₹{dayItem.value}</Text>
                            </View>
                          )}
                          <View style={[
                            styles.chartBar,
                            { height: dayItem.height },
                            isSelected ? styles.selectedChartBar : styles.defaultChartBar
                          ]} />
                          <Text style={[
                            styles.barLabel,
                            isSelected && styles.selectedBarLabel
                          ]}>
                            {dayItem.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 28 }}>
                <Text style={styles.transactionsTitle}>This Week's Deliveries</Text>
                <View style={[styles.transactionsListCard, { marginTop: 12 }]}>
                  {completedOrders.filter(o => o.filterGroup.includes('week')).length > 0 ? (
                    completedOrders.filter(o => o.filterGroup.includes('week')).map((order, idx) => (
                      <View 
                        key={idx} 
                        style={[
                          styles.transactionRow,
                          idx < completedOrders.filter(o => o.filterGroup.includes('week')).length - 1 && styles.transactionRowDivider
                        ]}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={styles.iconCircleBg}>
                            <Ionicons name="bicycle" size={16} color="#8A7A6E" />
                          </View>
                          <View style={{ marginLeft: 12 }}>
                            <Text style={styles.transactionItemTitle}>{order.orderId}</Text>
                            <Text style={styles.transactionItemSub}>{order.restaurantName} • {order.date}</Text>
                          </View>
                        </View>
                        <Text style={styles.transactionAmountText}>+₹{order.earnings}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#8A7A6E', fontWeight: '500' }}>No deliveries this week</Text>
                    </View>
                  )}
                </View>
              </View>

            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Content wrapper */}
      <View style={styles.contentBody}>
        {renderTabContent()}
      </View>

      {/* Render bottom navigation bar ONLY if the incoming request screen is NOT active */}
      {deliveryState !== 'incoming-request' && deliveryState !== 'delivery-completed' && (
        <BottomNavigation 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
          }} 
          unreadOrdersCount={
            availableOrders.filter(
              ao => !incomingAssignment || !incomingAssignment.order || ao.id !== incomingAssignment.order.id
            ).length + (incomingAssignment ? 1 : 0)
          }
        />
      )}

      {renderNotificationsModal()}
      {renderFullChartModal()}
      {renderNavigationModal()}
      {renderItemsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentBody: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FCFAF7', // Soft warm cream background
  },
  scrollPadding: {
    paddingTop: 8,
    paddingBottom: 110, // Sufficient bottom padding to avoid overlapping the bottom tab bar
  },
  scrollPaddingActive: {
    paddingTop: 8,
    paddingBottom: 170, // Extra padding to avoid overlapping both the fixed bottom button and tab bar
  },

  // 1. HOME SCREEN SPECIFIC STYLES
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A7A6E',
  },
  riderNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 2,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  customSwitchContainer: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  customSwitchOn: {
    backgroundColor: '#F97316', // Orange
  },
  customSwitchOff: {
    backgroundColor: '#D1D5DB', // Grey
  },
  customSwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  customSwitchThumbOn: {
    transform: [{ translateX: 24 }],
    backgroundColor: '#3B82F6', // Blue thumb check as seen in toggle screenshot
  },
  customSwitchThumbOff: {
    transform: [{ translateX: 0 }],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38220F',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '800',
  },

  // 1.5 INCOMING REQUEST SCREEN STYLES
  incomingRequestContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  incomingMapWrapper: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  incomingMapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  incomingFloatingHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  incomingMenuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incomingRequestSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  incomingSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  incomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  circularTimerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },
  circularTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F97316',
  },
  incomingNewRequestTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  incomingOrderIdText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  incomingEarningsCol: {
    alignItems: 'flex-end',
  },
  incomingEarningsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  incomingEarningsAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 1,
  },
  incomingQuickInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  incomingInfoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardSubValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  distanceEtaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  distanceEtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  routeTimelineContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIconWrapper: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: -16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  timelineStepLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  pickupDistanceBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pickupDistanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
  },
  dropDistanceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dropDistanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
  landmarkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  landmarkPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  itemsSectionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 4,
  },
  itemsSectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemQuantityBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 26,
    alignItems: 'center',
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCustomizationsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewMoreItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  viewMoreItemsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },
  incomingActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  incomingDeclineBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingDeclineBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  incomingAcceptBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#F97316',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingAcceptBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 2. ACTIVE DELIVERY SPECIFIC STYLES
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeOrderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38220F',
  },
  codIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  pickupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  pickupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
    paddingBottom: 12,
  },
  pickupCardSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
  },
  pickupCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 2,
  },
  pickupCardDesc: {
    fontSize: 12,
    color: '#8A7A6E',
    marginTop: 2,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7A6E',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  itemsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  itemsCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38220F',
  },
  viewItemsText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '800',
  },
  stickyFooterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    zIndex: 900,
  },
  stickyFooterButton: {
    height: 48,
    backgroundColor: '#F97316', // Primary Orange
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stickyFooterButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // 3. CUSTOMER DELIVERY SPECIFIC STYLES
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  customerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  customerCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 2,
  },
  customerCardSub: {
    fontSize: 12,
    color: '#8A7A6E',
    marginTop: 2,
    fontWeight: '600',
  },
  customerCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFECD6', // Cream round button matching reference screen 3
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38220F',
  },
  instructionText: {
    fontSize: 13,
    color: '#8A7A6E',
    fontWeight: '600',
    lineHeight: 18,
  },
  codBox: {
    backgroundColor: '#FEE2E2', // Light red box for Cash On Delivery as per reference
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  codBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  codBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  codDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codBoxSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  confirmedCashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmedCashText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  codAmountText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#991B1B',
    marginTop: -4,
  },
  successButton: {
    backgroundColor: '#F97316', // Active Orange CTA as seen in customer delivery screenshot
  },

  // 3.5 DELIVERY COMPLETED SCREEN STYLES
  completedScreenContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Warm cream background
  },
  completedScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 180, // Generous padding to prevent overlapping with sticky footer
  },
  completedSuccessCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981', // Solid emerald green check background
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 32,
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  completedOrderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  completedEarningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 4,
    borderTopColor: '#F97316', // Orange top border accent
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  completedEarningLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  completedEarningValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#10B981', // Premium green
    marginVertical: 4,
  },
  addedToEarningsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED', // Warm peach pill
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  addedToEarningsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  completedCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    maxWidth: '50%',
  },
  paymentBadgeCod: {
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentBadgeCodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#137333',
  },
  paymentBadgePaid: {
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentBadgePaidText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
  },
  timelineContainer: {
    paddingLeft: 8,
    marginTop: 4,
  },
  completedTimelineRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIndicatorContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 20,
  },
  timelineDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 18,
    bottom: -22,
    width: 2,
    backgroundColor: '#A7F3D0',
    zIndex: 1,
  },
  completedTimelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedTimelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  completedTimelineTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  completedStickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  completedBackHomeBtn: {
    height: 48,
    backgroundColor: '#F97316', // Primary Orange action
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  completedBackHomeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completedViewEarningsBtn: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedViewEarningsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
  },

  // OFFLINE HOME STATE ADDITIONAL STYLES
  offlineEarningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  offlineEarningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineEarningsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A6E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offlineEarningsAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 4,
  },
  offlineEarningsCount: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 2,
  },
  offlineMainContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  powerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  offlineMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },
  offlineMainSub: {
    fontSize: 12,
    color: '#8A7A6E',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  offlineGoOnlineBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
  },
  offlineGoOnlineBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  offlineDeliveriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  offlineDeliveriesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  offlineDeliveriesTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#38220F',
  },
  offlineDeliveriesSub: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // 4. ORDERS TAB SPECIFIC STYLES
  ordersTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
  },
  ordersSubTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    flex: 1,
    marginRight: 12,
  },
  ordersSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  ordersSubTabActive: {
    backgroundColor: '#FFFFFF',
  },
  ordersSubTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  ordersSubTabTextActive: {
    color: '#38220F',
    fontWeight: '900',
  },
  ordersFilterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  currentOrderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  currentOrderCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
  },
  currentOrderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentOrderStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F97316',
  },
  currentOrderRouteContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  currentOrderRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  currentOrderRouteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
  },
  currentOrderRouteSubtitle: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 1,
  },
  currentOrderRouteConnector: {
    position: 'absolute',
    left: 4,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#FAF6F0',
  },
  currentOrderSummaryBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF6F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  currentOrderSummaryCol: {
    flex: 1,
  },
  currentOrderSummaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.3,
  },
  currentOrderSummaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ordersCodMiniBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  ordersCodMiniBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B91C1C',
  },
  ordersCodAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#38220F',
  },
  ordersEarningsText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F97316',
    marginTop: 2,
  },
  currentOrderSummaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  continueDeliveryBtn: {
    height: 48,
    backgroundColor: '#F97316',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueDeliveryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#38220F',
  },
  emptyStateSubtitle: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // 3. EARNINGS TAB SPECIFIC STYLES
  periodCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  chartContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
  },
  viewChartText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    padding: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 15,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 28,
  },
  chartBar: {
    width: 14,
    borderRadius: 4,
  },
  defaultChartBar: {
    backgroundColor: '#F1F5F9',
  },
  selectedChartBar: {
    backgroundColor: '#78350F', // Selected Sunday bar
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 8,
  },
  selectedBarLabel: {
    color: '#38220F',
    fontWeight: '900',
  },
  selectedDayBubble: {
    backgroundColor: '#000000',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayBubbleText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  transactionsContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  transactionsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
    marginBottom: 8,
  },
  transactionsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    paddingHorizontal: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  transactionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38220F',
  },
  transactionItemSub: {
    fontSize: 11,
    color: '#8A7A6E',
    marginTop: 2,
    fontWeight: '600',
  },
  transactionAmountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981', // green for positive transaction amounts
  },
  viewAllButton: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0ECE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8A7A6E',
    letterSpacing: 0.5,
  },

  // 5. PROFILE TAB SPECIFIC STYLES
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
    marginBottom: 6,
  },
  profileMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileMetaBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profileMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
  },
  starRatingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
  },
  logoutContainer: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  logoutButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },

  // SUSPENDED SPECIFIC STYLES
  statusIconCircleSuspended: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 6. AUTHENTICATION & GATED STATUS SCREEN STYLES
  authScrollPadding: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  authContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    paddingTop: 24,
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  loginCardContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loginCardFooter: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginCardFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 6,
  },
  logoCircleContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    borderWidth: 6,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  logoTextOrange: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F97316',
  },
  logoTextBrown: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38220F',
    marginTop: -2,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 24,
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginTop: 12,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#38220F',
    textAlign: 'center',
    marginBottom: 4,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#8A7A6E',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  authTitleLeft: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38220F',
    textAlign: 'left',
    marginBottom: 6,
  },
  authSubtitleLeft: {
    fontSize: 13,
    color: '#8A7A6E',
    textAlign: 'left',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 20,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  forgotPassLinkRow: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotPassLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 24,
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  passwordRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A7A6E',
    marginRight: 8,
  },
  passwordRequirementText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A7A6E',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 16,
  },
  otpBox: {
    width: 42,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: '#F97316',
  },
  otpBoxText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },
  otpInlineError: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 12,
  },
  otpResendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A7A6E',
    textAlign: 'center',
  },
  otpResendLink: {
    color: '#F97316',
    fontWeight: '800',
  },
  otpChangeMobileBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0ECE6',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  otpChangeMobileText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8A7A6E',
  },

  // STATUS SCREENS COMMON STYLES
  statusScreenContainer: {
    flex: 1,
    backgroundColor: '#FCFAF7',
    padding: 24,
    justifyContent: 'space-between',
  },
  statusContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38220F',
    textAlign: 'center',
    marginTop: 20,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#8A7A6E',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  statusFooterContainer: {
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  statusRefreshBtn: {
    height: 48,
    backgroundColor: '#F97316',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRefreshBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statusSecondaryBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0ECE6',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statusSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8A7A6E',
  },
  closeStatusBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },

  // REVIEW STATE SPECIFIC STYLES
  statusIconCirclePending: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5EB',
    borderColor: '#FFE2C6',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChecklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    width: '100%',
    marginTop: 24,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statusChecklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  statusChecklistHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A7A6E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingBadgePill: {
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F97316',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38220F',
    marginLeft: 10,
  },
  checklistRowTextMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 10,
  },
  reviewBadge: {
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A7A6E',
  },
  devLogoutLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },

  // ACTION REQUIRED SPECIFIC STYLES
  statusIconCircleWarning: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusReasonCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginTop: 24,
  },
  reasonCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  reasonCardText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },

  // Centered Tab Placeholder (Completed Orders)
  centeredPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FCFAF7',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
    marginBottom: 6,
  },
  placeholderSubtitle: {
    fontSize: 12,
    color: '#8A7A6E',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },

  // COMPLETED ORDERS HISTORY STYLES
  completedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  completedSectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
  },
  completedSectionHeaderCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  completedOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  completedOrderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  completedOrderCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#38220F',
  },
  completedOrderCardDate: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 2,
  },
  completedOrderCardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedOrderCardStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#137333',
  },
  completedOrderRouteContainer: {
    position: 'relative',
    marginBottom: 12,
    paddingLeft: 4,
  },
  completedOrderRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  completedOrderRouteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38220F',
    marginLeft: 10,
  },
  completedOrderRouteConnector: {
    position: 'absolute',
    left: 8,
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: '#F0ECE6',
  },
  completedOrderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FAF6F0',
    paddingTop: 10,
  },
  completedOrderCardPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  completedOrderCardMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedOrderCardMiniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  completedOrderCodBadge: {
    backgroundColor: '#FEE2E2',
  },
  completedOrderCodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  completedOrderCardEarningsCol: {
    alignItems: 'flex-end',
  },
  completedOrderCardEarningsLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  completedOrderCardEarningsValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
  },

  // FILTER DROPDOWN STYLES
  filterDropdownCard: {
    position: 'absolute',
    top: 100, // Positions directly below the subtabs bar
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 6,
    width: 130,
    zIndex: 1000,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  filterDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterDropdownItemActive: {
    backgroundColor: '#FFF5EB',
  },
  filterDropdownItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterDropdownItemTextActive: {
    color: '#F97316',
    fontWeight: '900',
  },

  // COMPLETED EMPTY STATE STYLES
  completedEmptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 32,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  completedEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  completedEmptyStateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
    textAlign: 'center',
  },
  completedEmptyStateSubtitle: {
    fontSize: 12,
    color: '#8A7A6E',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  completedEmptyRestoreBtn: {
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  completedEmptyRestoreBtnText: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '800',
  },

  // DELIVERY PIN VERIFICATION STYLES (Phase 7)
  pinVerificationBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  pinVerificationBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#6EE7B7',
  },
  pinVerificationBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinVerificationBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinVerificationBoxSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  confirmedPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  confirmedPinText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  pinInputContainer: {
    position: 'relative',
    height: 52,
    marginVertical: 12,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  pinRealInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  partnerPinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  partnerPinBox: {
    width: 48,
    height: 52,
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerPinBoxText: {
    fontSize: 20,
    fontWeight: '700',
  },
  partnerPinErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  partnerVerifyPinBtn: {
    backgroundColor: '#FF6F00',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  partnerVerifyPinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  subHeaderBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  subHeaderBackText: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },
  subHeaderEditBtn: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeaderEditBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F97316',
  },
  profileDetailsWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  profilePhoneText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  profileVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  profileVerifiedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.3,
  },
  profileSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#F97316',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoNoticeBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginHorizontal: 16,
  },
  infoNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  docSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  docSummaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  docSummaryBadgeSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  docSummaryBadgeTextSuccess: {
    fontSize: 8,
    fontWeight: '900',
    color: '#059669',
  },
  docSummaryBadgeWarning: {
    backgroundColor: '#FFF5EB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  docSummaryBadgeTextWarning: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F97316',
  },
  docSummaryNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  docSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  documentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  documentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  documentSubtext: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  viewDocBtnOutline: {
    borderColor: '#F97316',
    borderWidth: 1.5,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDocBtnOutlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },
  contactSupportBtn: {
    backgroundColor: '#8A7A6E',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSupportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rejectionReasonBox: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  rejectionReasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 2,
  },
  rejectionReasonValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  zoneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  zoneSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeZoneBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeZoneBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#059669',
  },
}) as any;
