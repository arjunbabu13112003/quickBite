import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1. Home Stats Card (3-column layout)
export function HomeStatsCard({
  earnings = 850,
  deliveries = 7,
  onlineTime = '4h 30m'
}: {
  earnings?: number;
  deliveries?: number;
  onlineTime?: string;
}) {
  return (
    <View style={styles.homeStatsContainer}>
      <View style={styles.statColumn}>
        <Text style={styles.statLabel}>EARNINGS</Text>
        <Text style={styles.statValue}>₹{earnings}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statColumn}>
        <Text style={styles.statLabel}>DELIVERIES</Text>
        <Text style={styles.statValue}>{deliveries}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statColumn}>
        <Text style={styles.statLabel}>ONLINE TIME</Text>
        <Text style={styles.statValue}>{onlineTime}</Text>
      </View>
    </View>
  );
}

// 2. Large Orange Earnings Card
export function LargeEarningsCard({
  title = "Today's Earnings",
  amount = 850
}: {
  title?: string;
  amount?: number;
}) {
  return (
    <View style={styles.largeCardContainer}>
      <Text style={styles.largeCardTitle}>{title}</Text>
      <Text style={styles.largeCardAmount}>₹{amount}</Text>
    </View>
  );
}

// 3. Period Stats Card (This Week / This Month)
export function PeriodStatsCard({
  label,
  amount
}: {
  label: string;
  amount: string;
}) {
  return (
    <View style={styles.periodCard}>
      <Text style={styles.periodLabel}>{label}</Text>
      <Text style={styles.periodAmount}>{amount}</Text>
    </View>
  );
}

// 4. Earnings Breakdown Card
export function EarningsBreakdown({
  orderEarnings = 720,
  incentives = 100,
  tips = 30
}: {
  orderEarnings?: number;
  incentives?: number;
  tips?: number;
}) {
  const items = [
    { label: 'Order Earnings', value: orderEarnings, icon: 'bicycle-outline' },
    { label: 'Incentives', value: incentives, icon: 'gift-outline' },
    { label: 'Tips', value: tips, icon: 'heart-outline' },
  ];

  return (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
      <View style={styles.breakdownCard}>
        {items.map((item, index) => (
          <View 
            key={item.label} 
            style={[
              styles.breakdownRow,
              index < items.length - 1 && styles.breakdownRowDivider
            ]}
          >
            <View style={styles.breakdownLabelGroup}>
              <Ionicons name={item.icon as any} size={18} color="#F97316" style={{ marginRight: 10 }} />
              <Text style={styles.breakdownLabel}>{item.label}</Text>
            </View>
            <Text style={styles.breakdownValue}>₹{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Home Stats Card Styles
  homeStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginHorizontal: 16,
    marginVertical: 14,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0ECE6',
    marginVertical: 4,
  },

  // Large Orange Earnings Card Styles
  largeCardContainer: {
    backgroundColor: '#F97316', // Orange
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  largeCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFDDD6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  largeCardAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Period Stats Card Styles
  periodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  periodLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A7A6E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  periodAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38220F',
  },

  // Breakdown Card Styles
  breakdownContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
    marginBottom: 8,
  },
  breakdownCard: {
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
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  breakdownRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#FAF6F0',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38220F',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
  },
});
