import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

interface BottomNavigationProps {
  activeTab: 'home' | 'orders' | 'earnings' | 'profile';
  setActiveTab: (tab: 'home' | 'orders' | 'earnings' | 'profile') => void;
  unreadOrdersCount?: number;
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
  unreadOrdersCount = 0
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  const tabs = [
    {
      id: 'home' as const,
      label: 'Home',
      iconLight: 'home' as const,
      iconFocused: 'home' as const,
      iconType: 'ionicons' as const,
    },
    {
      id: 'orders' as const,
      label: 'Orders',
      iconLight: 'bicycle' as const,
      iconFocused: 'bicycle' as const,
      iconType: 'ionicons' as const,
      badge: unreadOrdersCount,
    },
    {
      id: 'earnings' as const,
      label: 'Earnings',
      iconLight: 'wallet-outline' as const,
      iconFocused: 'wallet' as const,
      iconType: 'ionicons' as const,
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      iconLight: 'person-outline' as const,
      iconFocused: 'person' as const,
      iconType: 'ionicons' as const,
    },
  ];

  return (
    <View style={[
      styles.container,
      { paddingBottom: Math.max(10, insets.bottom) }
    ]}>
      <View style={styles.navRow}>
        {tabs.map(tab => {
          const isFocused = activeTab === tab.id;

          const renderIcon = (color: string) => {
            const iconName = isFocused ? tab.iconFocused : tab.iconLight;
            return <Ionicons name={iconName} size={20} color={color} />;
          };

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabButton}
            >
              {isFocused ? (
                <View style={styles.focusedTab}>
                  {renderIcon('#FFFFFF')}
                  <Text style={styles.focusedLabel}>{tab.label}</Text>
                  {tab.badge && tab.badge > 0 ? (
                    <View style={styles.focusedBadge}>
                      <Text style={styles.focusedBadgeText}>{tab.badge}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.unfocusedTab}>
                  <View style={styles.iconContainer}>
                    {renderIcon('#475569')}
                    {tab.badge && tab.badge > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tab.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.unfocusedLabel}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    zIndex: 1000,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusedTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316', // Orange background matching screenshot
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  focusedLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  focusedBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  focusedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  unfocusedTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  unfocusedLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
});
