import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuRowProps {
  title: string;
  subtitle: string;
  icon: string;
  actionNeeded?: boolean;
  actionText?: string;
  badgeType?: 'success' | 'danger';
  onPress?: () => void;
}

export default function MenuRow({
  title,
  subtitle,
  icon,
  actionNeeded = false,
  actionText = 'ACTION NEEDED',
  badgeType = 'danger',
  onPress
}: MenuRowProps) {
  const isSuccess = badgeType === 'success';
  const badgeBg = isSuccess ? '#ECFDF5' : '#FEE2E2';
  const badgeTextColor = isSuccess ? '#059669' : '#B91C1C';

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress} 
      style={styles.card}
    >
      <View style={styles.leftContainer}>
        {/* Rounded Icon Background */}
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color="#8A7A6E" />
        </View>
        
        {/* Text Details */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Right side container: Warning Badge or Chevron */}
      <View style={styles.rightContainer}>
        {actionNeeded && (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>{actionText}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38220F',
  },
  subtitle: {
    fontSize: 11,
    color: '#8A7A6E',
    marginTop: 2,
    fontWeight: '600',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
