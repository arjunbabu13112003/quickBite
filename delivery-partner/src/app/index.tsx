import React, { useState, useRef, useEffect } from 'react';
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
  AppStateStatus
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { api, getAuthToken, setAuthToken } from '../services/api';

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

export default function AppIndex() {
  const insets = useSafeAreaInsets();
  const bottomNavHeight = 60 + Math.max(0, insets.bottom - 10);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'earnings' | 'profile'>('home');
  
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
  const [ordersSubTab, setOrdersSubTab] = useState<'current' | 'completed'>('current');
  const [completedOrders, setCompletedOrders] = useState<any[]>(initialMockCompletedOrders);
  const [completedFilter, setCompletedFilter] = useState<'today' | 'week' | 'month'>('today');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

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

  const [appState, setAppState] = useState(AppState.currentState);
  const isRequestingRef = useRef(false);
  const isFirstActiveRef = useRef(true);

  const handleLogout = async (forceLocalOnly = false) => {
    if (!forceLocalOnly) {
      try {
        await api.updateOnlineStatus(false);
      } catch (err) {
        console.warn('Logout offline request failed (non-blocking):', err);
      }
    }
    await setAuthToken(null);
    setCurrentUser(null);
    setCurrentPartner(null);
    setIsOnline(false);
    setIsAvailable(false);
    setIsAuthenticated(false);
    setDeliveryState('none');
    setIncomingAssignment(null);
    setActiveAssignment(null);
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

  const completeActiveOrder = () => {
    const order = activeAssignment?.order || {};
    const newCompletedOrder = {
      orderId: `Order ${order.orderNumber || ''}`,
      date: new Date().toLocaleString(),
      filterGroup: ['today', 'week', 'month'],
      status: 'Delivered',
      restaurantName: order.restaurantName || 'QuickBite Kitchen',
      dropArea: order.deliveryAddress || 'Drop Location',
      distance: '2.5 km',
      paymentMode: order.paymentMethod || 'Prepaid',
      codAmount: order.paymentMethod === 'COD' ? order.amount : undefined,
      earnings: 65
    };
    setCompletedOrders(prev => [newCompletedOrder, ...prev]);
    changeDeliveryState('delivery-completed');
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          const data = await api.getMe();
          setCurrentUser(data.partner.user);
          setCurrentPartner(data.partner);
          setAccountStatus(data.partner.accountStatus);
          setIsOnline(data.partner.isOnline);
          setIsAvailable(data.partner.isAvailable);
          setIsAuthenticated(true);

          if (data.partner.accountStatus === 'APPROVED') {
            try {
              const deliveryData = await api.getActiveDelivery();
              if (deliveryData && deliveryData.assignment) {
                setActiveAssignment(deliveryData.assignment);
                setDeliveryState('active-restaurant');
                setIsAvailable(false);
              }
            } catch (activeErr) {
              console.error('Failed to restore active delivery:', activeErr);
            }
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
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

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
        setIsOnline(data.partner.isOnline);
        setIsAvailable(data.partner.isAvailable);
      } catch (err) {
        const error = err as any;
        console.error('[Polling] Status refresh failed:', error.message);
        if (error.message === 'Unauthorized' || error.message === 'Forbidden resource') {
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
  }, [isAuthenticated, appState]);

  // Polling incoming assignments
  useEffect(() => {
    let intervalId: any = null;
    let isPolling = false;

    const checkIncoming = async () => {
      if (isPolling) return;
      isPolling = true;

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
      } catch (err) {
        console.error('[Polling] Fetch incoming assignment failed:', err);
      } finally {
        isPolling = false;
      }
    };

    const shouldPoll = 
      isAuthenticated && 
      accountStatus === 'APPROVED' && 
      isOnline && 
      isAvailable && 
      deliveryState === 'none' && 
      appState === 'active';

    if (shouldPoll) {
      checkIncoming();
      intervalId = setInterval(checkIncoming, 4000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, accountStatus, isOnline, isAvailable, deliveryState, appState]);

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
      changeDeliveryState('active-restaurant');
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
    } catch (err) {
      const error = err as any;
      console.error('Failed to toggle online status:', error.message);
      if (error.message === 'Unauthorized' || error.message === 'Forbidden resource') {
        await handleLogout(true);
      } else {
        alert(error.message || 'Unable to change status. Please try again.');
        try {
          const profile = await api.getMe();
          setAccountStatus(profile.partner.accountStatus);
          setIsOnline(profile.partner.isOnline);
          setIsAvailable(profile.partner.isAvailable);
        } catch (meErr) {
          // ignore
        }
      }
    } finally {
      setIsMutatingOnline(false);
    }
  };

  // Helper to render the appropriate screen inside the active tab
  const renderTabContent = () => {
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
    switch (deliveryState) {
      case 'incoming-request':
        return renderIncomingRequestScreen();
      case 'active-restaurant':
        return renderActiveDeliveryScreen('reach-restaurant');
      case 'active-pickup':
        return renderActiveDeliveryScreen('pickup');
      case 'active-start-delivery':
        return renderActiveDeliveryScreen('start-delivery');
      case 'active-delivery':
        return renderCustomerDeliveryScreen();
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
          title="QuickBite Partner" 
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
              <Text style={styles.greetingText}>Good Morning,</Text>
              <Text style={styles.riderNameText}>{currentUser?.name?.split(' ')[0] || 'Partner'}</Text>
            </View>
            <View style={styles.rightActionsRow}>
              <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
                <Ionicons name="notifications" size={20} color="#38220F" />
                <View style={styles.notificationDot} />
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
            <Text style={styles.offlineEarningsAmount}>₹850</Text>
            <Text style={styles.offlineEarningsCount}>3 deliveries completed</Text>
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
            <HomeStatsCard earnings={850} deliveries={7} onlineTime="4h 30m" />
          )}

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Deliveries</Text>
            {isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Temporary simulation trigger */}
                <TouchableOpacity 
                  style={[styles.refreshButton, { marginRight: 14 }]} 
                  activeOpacity={0.7}
                  onPress={() => changeDeliveryState('incoming-request')}
                >
                  <Ionicons name="sparkles" size={13} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshText}>Simulate Request</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.refreshButton} activeOpacity={0.7}>
                  <Ionicons name="refresh-sharp" size={13} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isOnline ? (
            /* Available Order Card */
            <DeliveryCard 
              restaurantName="Khao Gully"
              orderId="#QB1024"
              earnings={65}
              itemsCount={2}
              paymentMode="COD"
              pickupDistance="1.2km"
              dropDistance="3.4km"
              onViewDetails={() => {
                changeDeliveryState('active-restaurant');
                setIsCashCollected(false);
              }}
              onAccept={() => {
                changeDeliveryState('active-restaurant');
                setIsCashCollected(false);
              }}
            />
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
  const renderIncomingRequestScreen = () => {
    const order = incomingAssignment?.order || {};
    return (
      <View style={styles.incomingRequestContainer}>
        {/* Muted Map Background */}
        <View style={styles.incomingMapWrapper}>
          <MapPlaceholder eta="8 mins" etaPosition="top-left" />
          <View style={styles.incomingMapOverlay} />
        </View>

        {/* Floating Headers */}
        <View style={styles.incomingFloatingHeader}>
          <TouchableOpacity style={styles.incomingMenuBtn} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#38220F" />
          </TouchableOpacity>
          <OnlineStatus isOnline={isOnline} />
        </View>

        {/* Bottom Request Bottom Sheet/Card */}
        <View style={styles.incomingRequestSheet}>
          <View style={styles.incomingSheetHandle} />
          
          <View style={styles.incomingHeaderRow}>
            {/* Circular Timer countdown */}
            <View style={styles.circularTimer}>
              <Text style={styles.circularTimerText}>{countdown}s</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.incomingNewRequestTitle}>New Request</Text>
              <Text style={styles.incomingOrderIdText}>{order.orderNumber || 'Order'}</Text>
            </View>
            <View style={styles.incomingEarningsCol}>
              <Text style={styles.incomingEarningsLabel}>EST. EARNING</Text>
              <Text style={styles.incomingEarningsAmount}>₹65</Text>
            </View>
          </View>

          {/* Quick info row card */}
          <View style={styles.incomingQuickInfoRow}>
            <View style={styles.incomingQuickInfoCol}>
              <Ionicons name="time" size={16} color="#8A7A6E" />
              <Text style={styles.incomingQuickInfoValue}>22</Text>
              <Text style={styles.incomingQuickInfoLabel}>MINS</Text>
            </View>
            <View style={styles.incomingQuickInfoDivider} />
            <View style={styles.incomingQuickInfoCol}>
              <Ionicons name="git-commit" size={16} color="#8A7A6E" />
              <Text style={styles.incomingQuickInfoValue}>2.5</Text>
              <Text style={styles.incomingQuickInfoLabel}>KM TOTAL</Text>
            </View>
            <View style={styles.incomingQuickInfoDivider} />
            <View style={styles.incomingQuickInfoCol}>
              <Ionicons name="cash" size={16} color="#8A7A6E" />
              <Text style={styles.incomingQuickInfoValue}>{order.paymentMethod || 'Prepaid'}</Text>
              <Text style={styles.incomingQuickInfoLabel}>₹{order.amount || 0}</Text>
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.incomingRouteContainer}>
            <View style={styles.incomingRouteRow}>
              <View style={[styles.routeDot, styles.pickupDotColor]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.incomingRouteTextRow}>
                  <Text style={styles.incomingRouteTitle}>{order.restaurantName || 'QuickBite Kitchen'}</Text>
                  <View style={styles.routeDistanceBadge}>
                    <Text style={styles.routeDistanceText}>1.2 KM</Text>
                  </View>
                </View>
                <Text style={styles.incomingRouteSubtitle}>{order.pickupAddress || 'Restaurant Pickup'}</Text>
              </View>
            </View>

            <View style={styles.incomingRouteLine} />

            <View style={styles.incomingRouteRow}>
              <View style={[styles.routeDot, styles.dropDotColor]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.incomingRouteTextRow}>
                  <Text style={styles.incomingRouteTitle}>{order.customerName || 'Customer'}</Text>
                  <View style={styles.routeDistanceBadge}>
                    <Text style={styles.routeDistanceText}>3.4 KM</Text>
                  </View>
                </View>
                <Text style={styles.incomingRouteSubtitle}>{order.deliveryAddress || 'Drop Location'}</Text>
              </View>
            </View>
          </View>

          {/* COD Warning Card */}
          {order.paymentMethod === 'COD' && (
            <View style={styles.incomingCodBox}>
              <Ionicons name="warning" size={16} color="#B91C1C" style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.incomingCodTitle}>Cash on Delivery</Text>
                <Text style={styles.incomingCodText}>Collect ₹{order.amount || 0} from customer</Text>
              </View>
            </View>
          )}

          {/* Bottom Action buttons */}
          <View style={styles.incomingActionsRow}>
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
        </View>
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

    const handleStepCtaPress = () => {
      if (currentStep === 'reach-restaurant') {
        changeDeliveryState('active-pickup');
      } else if (currentStep === 'pickup') {
        changeDeliveryState('active-start-delivery');
      } else if (currentStep === 'start-delivery') {
        changeDeliveryState('active-delivery');
      }
    };

    return (
      <View style={styles.tabContentContainer}>
        <Header 
          title="QuickBite Partner" 
          isOnline={isOnline} 
          isAvailable={isAvailable}
          showBack={false}
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
          <MapPlaceholder eta="8 mins" etaPosition="top-left" />

          {/* Progress Timeline */}
          <ProgressTimeline currentStep={currentStep} />

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
                <Text style={styles.distanceText}>1.2 km</Text>
              </View>
            </View>

            {/* Nav & Call action buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="navigate-circle-outline" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Navigate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="call-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items Row */}
          <View style={styles.itemsCardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bag-handle" size={16} color="#F97316" style={{ marginRight: 8 }} />
              <Text style={styles.itemsCardText}>{order.itemCount || 0} Items</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewItemsText}>View Items &gt;</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Reached Restaurant / Next CTA Button (Fixed bottom block) */}
        <View style={[styles.stickyFooterContainer, { bottom: bottomNavHeight + 14 }]}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleStepCtaPress}
            style={styles.stickyFooterButton}
          >
            <Text style={styles.stickyFooterButtonText}>{currentCtaText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // SCREEN 3: CUSTOMER DELIVERY (Customer details, cash collection, delivered cta)
  const renderCustomerDeliveryScreen = () => {
    const order = activeAssignment?.order || {};
    return (
      <View style={styles.tabContentContainer}>
        <Header 
          title="QuickBite Partner" 
          isOnline={isOnline} 
          isAvailable={isAvailable}
          showBack={false}
        />

        <ScrollView 
          showsVerticalScrollIndicator={false}
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
              <TouchableOpacity style={styles.customerCallBtn} activeOpacity={0.7}>
                <Ionicons name="call" size={18} color="#7C2D12" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Map Preview */}
          <MapPlaceholder eta="5 mins" etaPosition="bottom-right" />

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
            (isCashCollected || order.paymentMethod !== 'COD') && styles.codBoxSuccess
          ]}>
            <View style={styles.codBoxHeader}>
              <Ionicons 
                name="cash" 
                size={18} 
                color={(isCashCollected || order.paymentMethod !== 'COD') ? '#137333' : '#B91C1C'} 
                style={{ marginRight: 8 }} 
              />
              <Text style={[
                styles.codBoxTitle,
                (isCashCollected || order.paymentMethod !== 'COD') && styles.codBoxTitleSuccess
              ]}>
                {order.paymentMethod === 'COD' ? 'CASH ON DELIVERY' : 'ONLINE PREPAID'}
              </Text>
            </View>
            
            <View style={styles.codDetailsRow}>
              <View>
                {order.paymentMethod !== 'COD' ? (
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
                (isCashCollected || order.paymentMethod !== 'COD') && styles.codAmountTextSuccess
              ]}>
                ₹{order.amount || 0}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Button Container */}
        <View style={[styles.stickyFooterContainer, { bottom: bottomNavHeight + 14 }]}>
          {order.paymentMethod === 'COD' && !isCashCollected ? (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setIsCashCollected(true)}
              style={styles.stickyFooterButton}
            >
              <Text style={styles.stickyFooterButtonText}>Confirm ₹{order.amount || 0} Cash Collected</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={completeActiveOrder}
              style={[styles.stickyFooterButton, styles.successButton]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.stickyFooterButtonText}>Mark as Delivered</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // SCREEN 3.5: DELIVERY COMPLETED SUCCESS SCREEN
  const renderDeliveryCompletedScreen = () => {
    const order = activeAssignment?.order || {};
    return (
      <View style={styles.completedScreenContainer}>
        <View style={styles.completedContentContainer}>
          {/* Centered green check icon */}
          <View style={styles.completedSuccessCircle}>
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.completedTitle}>Delivery Completed!</Text>
          <Text style={styles.completedOrderText}>{order.orderNumber || 'Order'}</Text>

          {/* Earning Card */}
          <View style={styles.completedEarningCard}>
            <Text style={styles.completedEarningSub}>You earned</Text>
            <Text style={styles.completedEarningValue}>₹65</Text>
            
            {/* Split statistics */}
            <View style={styles.completedStatsRow}>
              <View style={styles.completedStatCol}>
                <Ionicons name="time-outline" size={16} color="#8A7A6E" />
                <Text style={styles.completedStatTitle}>Delivery Time</Text>
                <Text style={styles.completedStatValue}>21 mins</Text>
              </View>
              <View style={styles.completedStatDivider} />
              <View style={styles.completedStatCol}>
                <Ionicons name="git-commit-outline" size={16} color="#8A7A6E" />
                <Text style={styles.completedStatTitle}>Distance</Text>
                <Text style={styles.completedStatValue}>2.5 km</Text>
              </View>
            </View>
          </View>

          {/* Cash Collected Confirmation Badge */}
          {order.paymentMethod === 'COD' && (
            <View style={styles.completedCashCollectedCard}>
              <Ionicons name="cash-outline" size={16} color="#78350F" style={{ marginRight: 8 }} />
              <Text style={styles.completedCashCollectedText}>₹{order.amount || 0} collected ✓</Text>
            </View>
          )}
        </View>

        {/* Bottom CTA buttons */}
        <View style={styles.completedActionsContainer}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              changeDeliveryState('none');
              setActiveAssignment(null);
              setIsOnline(true);
              setIsAvailable(true);
            }}
            style={styles.completedPrimaryBtn}
          >
            <Text style={styles.completedPrimaryBtnText}>Find Next Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              changeDeliveryState('none');
              setActiveAssignment(null);
              setIsOnline(true);
              setIsAvailable(true);
            }}
            style={styles.completedSecondaryBtn}
          >
            <Text style={styles.completedSecondaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 2. ORDERS TAB (Orders tab with Current & Completed lists)
  const renderOrdersTab = () => {
    const isOrderActive = deliveryState === 'active-restaurant' || deliveryState === 'active-pickup' || deliveryState === 'active-start-delivery' || deliveryState === 'active-delivery';
    
    let orderStatusText = 'Reach Restaurant';
    if (deliveryState === 'active-pickup') {
      orderStatusText = 'Confirm Pickup';
    } else if (deliveryState === 'active-start-delivery') {
      orderStatusText = 'Start Delivery';
    } else if (deliveryState === 'active-delivery') {
      orderStatusText = 'Out for Delivery';
    }

    const handleContinueDelivery = () => {
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
          </View>
        )}

        {ordersSubTab === 'current' ? (
          // Current orders tab content
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPadding}
            style={styles.screenBg}
          >
            {isOrderActive ? (
              // Active Order Card
              <View style={styles.currentOrderCard}>
                <View style={styles.currentOrderCardHeader}>
                  <Text style={styles.currentOrderCardTitle}>ORDER #QB1024</Text>
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
                      <Text style={styles.currentOrderRouteTitle}>Khao Gully</Text>
                      <Text style={styles.currentOrderRouteSubtitle}>Pickup • 2.4 km away</Text>
                    </View>
                  </View>
                  
                  <View style={styles.currentOrderRouteConnector} />

                  <View style={styles.currentOrderRouteRow}>
                    <View style={[styles.routeDotMini, styles.dropDotColor]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.currentOrderRouteTitle}>Panampilly Nagar</Text>
                      <Text style={styles.currentOrderRouteSubtitle}>Dropoff • Customer: Arjun T.</Text>
                    </View>
                  </View>
                </View>

                {/* Payment & Earnings Summary Box */}
                <View style={styles.currentOrderSummaryBox}>
                  <View style={styles.currentOrderSummaryCol}>
                    <Text style={styles.currentOrderSummaryLabel}>Payment Method</Text>
                    <View style={styles.currentOrderSummaryValueRow}>
                      <View style={styles.ordersCodMiniBadge}>
                        <Text style={styles.ordersCodMiniBadgeText}>COD</Text>
                      </View>
                      <Text style={styles.ordersCodAmountText}>₹320</Text>
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
              </View>
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
                  
                  {/* Subtle testing trigger: tap this to clear/populate history */}
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => {
                      if (completedOrders.length > 0) {
                        setCompletedOrders([]);
                      } else {
                        setCompletedOrders(initialMockCompletedOrders);
                      }
                    }}
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
                
                {/* Subtle trigger to restore state when empty */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => setCompletedOrders(initialMockCompletedOrders)}
                  style={styles.completedEmptyRestoreBtn}
                >
                  <Text style={styles.completedEmptyRestoreBtnText}>Restore Completed Orders 🔄</Text>
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
    // Custom Daily trend chart mock details
    const chartDays = [
      { day: 'M', value: 400, height: 40 },
      { day: 'T', value: 500, height: 50 },
      { day: 'W', value: 300, height: 30 },
      { day: 'T', value: 600, height: 60 },
      { day: 'F', value: 450, height: 45 },
      { day: 'S', value: 700, height: 70 },
      { day: 'S', value: 850, height: 90, selected: true } // Selected day is Sunday matching the reference
    ];

    return (
      <View style={styles.tabContentContainer}>
        <Header title="Earnings" isOnline={isOnline} isAvailable={isAvailable} />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          style={styles.screenBg}
        >
          {/* Today's Earnings large card */}
          <LargeEarningsCard title="Today's Earnings" amount={850} />

          {/* Period totals side-by-side cards */}
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard label="THIS WEEK" amount="₹4,250" />
            <PeriodStatsCard label="THIS MONTH" amount="₹16,800" />
          </View>

          {/* Earnings breakdown details card */}
          <EarningsBreakdown orderEarnings={720} incentives={100} tips={30} />

          {/* Daily Trend simple bar chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Daily Trend</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.viewChartText}>View Full Chart</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartCard}>
              {/* Chart Bars */}
              <View style={styles.barsContainer}>
                {chartDays.map((dayItem, index) => (
                  <View key={index} style={styles.barColumn}>
                    {dayItem.selected && (
                      <View style={styles.selectedDayBubble}>
                        <Text style={styles.selectedDayBubbleText}>₹{dayItem.value}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.chartBar,
                      { height: dayItem.height },
                      dayItem.selected ? styles.selectedChartBar : styles.defaultChartBar
                    ]} />
                    <Text style={[
                      styles.barLabel,
                      dayItem.selected && styles.selectedBarLabel
                    ]}>
                      {dayItem.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Recent Transactions List */}
          <View style={styles.transactionsContainer}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            
            <View style={styles.transactionsListCard}>
              {/* Transaction 1 */}
              <View style={[styles.transactionRow, styles.transactionRowDivider]}>
                <View style={styles.transactionLeft}>
                  <View style={styles.iconCircleBg}>
                    <Ionicons name="bicycle" size={16} color="#8A7A6E" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.transactionItemTitle}>Order #QB1024</Text>
                    <Text style={styles.transactionItemSub}>Completed • 2:30 PM</Text>
                  </View>
                </View>
                <Text style={styles.transactionAmountText}>+₹65</Text>
              </View>

              {/* Transaction 2 */}
              <View style={styles.transactionRow}>
                <View style={styles.transactionLeft}>
                  <View style={styles.iconCircleBg}>
                    <Ionicons name="bicycle" size={16} color="#8A7A6E" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.transactionItemTitle}>Order #QB1023</Text>
                    <Text style={styles.transactionItemSub}>Completed • 1:15 PM</Text>
                  </View>
                </View>
                <Text style={styles.transactionAmountText}>+₹58</Text>
              </View>
            </View>

            {/* VIEW ALL Button */}
            <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // 4. PROFILE TAB (Profile info, documents list with action flags)
  const renderProfileTab = () => {
    return (
      <View style={styles.tabContentContainer}>
        <Header title="QuickBite Partner" isOnline={isOnline} isAvailable={isAvailable} />

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
          />

          <MenuRow 
            title="Vehicle Details" 
            subtitle={currentPartner ? `${currentPartner.vehicleType} • ${currentPartner.vehicleNumber || 'No Plate'}` : "Bike • KL-07-2024"} 
            icon="bicycle" 
          />

          <MenuRow 
            title="Bank Details" 
            subtitle="Payout accounts, UPI" 
            icon="card" 
          />

          {/* Action Needed Documents Row */}
          <MenuRow 
            title="Documents" 
            subtitle="License, RC, Insurance" 
            icon="document-text"
            actionNeeded={true}
            actionText="ACTION NEEDED"
          />

          <MenuRow 
            title="Delivery Preferences" 
            subtitle="Zones, Auto-accept" 
            icon="options" 
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

          {/* Version Text */}
          <Text style={styles.versionText}>App Version 2.4.1 (Build 412)</Text>
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
    .then(data => {
      setIsLoggingIn(false);
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
                <Text style={styles.logoTextOrange}>QuickBite</Text>
                <Text style={styles.logoTextBrown}>Partner</Text>
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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Content wrapper */}
      <View style={styles.contentBody}>
        {renderTabContent()}
      </View>

      {/* Render bottom navigation bar ONLY if the incoming request screen is NOT active */}
      {deliveryState !== 'incoming-request' && (
        <BottomNavigation 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
          }} 
        />
      )}
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
    backgroundColor: '#FCFAF7',
  },
  incomingMapWrapper: {
    height: 200,
    position: 'relative',
    opacity: 0.8,
  },
  incomingMapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(252, 250, 247, 0.45)', // Mutes map details slightly
  },
  incomingFloatingHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  incomingMenuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  incomingRequestSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 16,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  incomingSheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  incomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  circularTimer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  circularTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EF4444',
  },
  incomingNewRequestTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },
  incomingOrderIdText: {
    fontSize: 12,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 1,
  },
  incomingEarningsCol: {
    alignItems: 'flex-end',
  },
  incomingEarningsLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.3,
  },
  incomingEarningsAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 2,
  },
  incomingQuickInfoRow: {
    flexDirection: 'row',
    backgroundColor: '#FCFAF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    paddingVertical: 12,
    marginBottom: 16,
  },
  incomingQuickInfoCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingQuickInfoValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#38220F',
    marginTop: 2,
  },
  incomingQuickInfoLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8A7A6E',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  incomingQuickInfoDivider: {
    width: 1,
    backgroundColor: '#FAF6F0',
  },
  incomingRouteContainer: {
    marginBottom: 14,
    position: 'relative',
    paddingHorizontal: 4,
  },
  incomingRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  routeDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  incomingRouteLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: '#F0ECE6',
    zIndex: 1,
  },
  incomingRouteTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomingRouteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
  },
  incomingRouteSubtitle: {
    fontSize: 11,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 1,
  },
  routeDistanceBadge: {
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  routeDistanceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A7A6E',
  },
  incomingCodBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  incomingCodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  incomingCodText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '700',
    marginTop: 2,
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
    backgroundColor: '#FCFAF7',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  completedContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 32,
  },
  completedSuccessCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38220F',
    textAlign: 'center',
  },
  completedOrderText: {
    fontSize: 13,
    color: '#8A7A6E',
    fontWeight: '600',
    marginTop: 4,
  },
  completedEarningCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  completedEarningSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A6E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  completedEarningValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F97316',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  completedStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#FAF6F0',
    paddingTop: 14,
  },
  completedStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  completedStatTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A7A6E',
    marginTop: 4,
  },
  completedStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38220F',
    marginTop: 2,
  },
  completedStatDivider: {
    width: 1,
    backgroundColor: '#FAF6F0',
  },
  completedCashCollectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderColor: '#FFEAD0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  completedCashCollectedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
  },
  completedActionsContainer: {
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 12,
  },
  completedPrimaryBtn: {
    height: 48,
    backgroundColor: '#F97316',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  completedSecondaryBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8A7A6E',
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
}) as any;
