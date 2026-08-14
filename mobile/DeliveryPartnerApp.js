import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert
} from 'react-native';
import { Package, CheckCircle, MapPin, Phone, ArrowRight, User } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function DeliveryPartnerApp({ currentUser, onLogout, API_BASE_URL }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-partners/me/orders`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to load your assigned deliveries.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 10000); // Polling every 10s for new assignments without flashing loading state
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setProcessingId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-partners/me/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Update failed');
      }
      
      Alert.alert('Success', `Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to update order status');
    } finally {
      setProcessingId(null);
    }
  };

  const renderOrderCard = (order) => {
    // Only process active assignment
    if (!order.activeAssignment || !order.activeAssignment.isActive) return null;
    
    return (
      <View key={order.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, 
            order.orderStatus === 'ready_for_pickup' ? { backgroundColor: '#FEF3C7' } :
            order.orderStatus === 'out_for_delivery' ? { backgroundColor: '#DBEAFE' } : { backgroundColor: '#E0E7FF' }
          ]}>
            <Text style={[styles.statusText,
              order.orderStatus === 'ready_for_pickup' ? { color: '#B45309' } :
              order.orderStatus === 'out_for_delivery' ? { color: '#1D4ED8' } : { color: '#4338CA' }
            ]}>
              {order.orderStatus.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.locations}>
          <View style={styles.locationRow}>
            <View style={styles.iconContainer}><Package size={16} color="#FF5252" /></View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>Pickup: {order.hotel?.name}</Text>
              <Text style={styles.locationSub}>{order.hotel?.address}</Text>
            </View>
          </View>
          <View style={styles.locationConnector} />
          <View style={styles.locationRow}>
            <View style={styles.iconContainer}><MapPin size={16} color="#10B981" /></View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>Dropoff: {order.deliveryRecipientName}</Text>
              <Text style={styles.locationSub}>{order.deliveryAddressLine1}, {order.deliveryArea}</Text>
            </View>
            <TouchableOpacity style={styles.phoneBtn} onPress={() => Alert.alert('Call Customer', `Dialing ${order.deliveryPhoneNumber}...`)}>
              <Phone size={14} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionContainer}>
          {order.orderStatus === 'ready_for_pickup' && (
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => handleUpdateStatus(order.id, 'out_for_delivery')}
              disabled={processingId === order.id}
            >
              {processingId === order.id ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>Confirm Pickup</Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}

          {order.orderStatus === 'out_for_delivery' && (
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: '#10B981' }]} 
              onPress={() => handleUpdateStatus(order.id, 'delivered')}
              disabled={processingId === order.id}
            >
              {processingId === order.id ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>Mark as Delivered</Text>
                  <CheckCircle size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Delivery Partner</Text>
          <Text style={styles.headerSub}>Welcome back, {currentUser.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <User size={18} color="#FF5252" />
        </TouchableOpacity>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Loading assigned deliveries...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {orders.filter(o => o.orderStatus !== 'delivered').length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Package size={40} color="#FFB8B8" />
              </View>
              <Text style={styles.emptyTitle}>No Active Deliveries</Text>
              <Text style={styles.emptySub}>You have no pending assignments right now. We will notify you when a new order is assigned.</Text>
            </View>
          ) : (
            orders.filter(o => o.orderStatus !== 'delivered').map(renderOrderCard)
          )}
        </ScrollView>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    backgroundColor: '#fff', padding: 20, paddingTop: 50, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontWeight: '600' },
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  orderNumber: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800' },
  
  locations: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconContainer: { width: 24, alignItems: 'center', marginTop: 2 },
  locationDetails: { flex: 1, marginLeft: 8 },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  locationSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  locationConnector: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginLeft: 11, marginVertical: 4 },
  phoneBtn: { padding: 8, backgroundColor: '#ECFDF5', borderRadius: 8 },
  
  actionContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  primaryBtn: { backgroundColor: '#FF5252', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
