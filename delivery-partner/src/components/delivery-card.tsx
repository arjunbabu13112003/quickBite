import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeliveryCardProps {
  restaurantName?: string;
  orderId?: string;
  earnings?: number;
  itemsCount?: number;
  paymentMode?: 'COD' | 'PREPAID';
  pickupDistance?: string;
  dropDistance?: string;
  onViewDetails?: () => void;
  onAccept?: () => void;
}

export default function DeliveryCard({
  restaurantName = 'Khao Gully',
  orderId = '#QB1024',
  earnings = 65,
  itemsCount = 2,
  paymentMode = 'COD',
  pickupDistance = '1.2km',
  dropDistance = '3.4km',
  onViewDetails,
  onAccept
}: DeliveryCardProps) {
  return (
    <View style={styles.card}>
      {/* Top Border Highlight */}
      <View style={styles.topHighlight} />
      
      <View style={styles.cardContent}>
        {/* Header section */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <Text style={styles.orderId}>Order {orderId}</Text>
          </View>
          <View style={styles.earningContainer}>
            <Text style={styles.earningAmount}>₹{earnings}</Text>
            <Text style={styles.earningLabel}>Earning</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.itemsBadge}>
            <Ionicons name="bag-handle-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.itemsBadgeText}>{itemsCount} Items</Text>
          </View>
          <View style={[
            styles.paymentBadge,
            paymentMode === 'COD' ? styles.codBg : styles.prepaidBg
          ]}>
            <Ionicons name={paymentMode === 'COD' ? "cash-outline" : "card-outline"} size={13} color={paymentMode === 'COD' ? "#B91C1C" : "#047857"} style={{ marginRight: 4 }} />
            <Text style={[
              styles.paymentBadgeText,
              paymentMode === 'COD' ? styles.codText : styles.prepaidText
            ]}>{paymentMode}</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeContainer}>
          <View style={styles.routeStep}>
            <View style={[styles.dot, styles.pickupDot]} />
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue}>{pickupDistance}</Text>
          </View>
          
          {/* Connector Line */}
          <View style={styles.connectorLine} />

          <View style={styles.routeStep}>
            <View style={[styles.dot, styles.dropDot]} />
            <Text style={styles.routeLabel}>Drop</Text>
            <Text style={styles.routeValue}>{dropDistance}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={onViewDetails} 
            style={[styles.btn, styles.secondaryBtn]}
          >
            <Text style={styles.secondaryBtnText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={onAccept} 
            style={[styles.btn, styles.primaryBtn]}
          >
            <Text style={styles.primaryBtnText}>Accept Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  topHighlight: {
    height: 4,
    backgroundColor: '#F97316', // Primary orange strip on top
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38220F',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A7A6E',
    marginTop: 2,
  },
  earningContainer: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },
  earningLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A7A6E',
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codBg: {
    backgroundColor: '#FEE2E2',
  },
  prepaidBg: {
    backgroundColor: '#D1FAE5',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  codText: {
    color: '#B91C1C',
  },
  prepaidText: {
    color: '#065F46',
  },
  routeContainer: {
    marginBottom: 18,
    position: 'relative',
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    zIndex: 2,
  },
  pickupDot: {
    backgroundColor: '#A05A2C', // Brown dot for pickup
  },
  dropDot: {
    backgroundColor: '#10B981', // Green dot for drop
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38220F',
    flex: 1,
  },
  routeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38220F',
  },
  connectorLine: {
    position: 'absolute',
    left: 4,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#F0ECE6',
    zIndex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#F97316',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  secondaryBtnText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '800',
  },
});
