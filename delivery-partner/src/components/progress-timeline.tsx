import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface ProgressTimelineProps {
  currentStep: 'reach-restaurant' | 'pickup' | 'start-delivery';
  restaurantName?: string;
  itemCount?: number;
  deliveryAddress?: string;
}

export default function ProgressTimeline({ 
  currentStep, 
  restaurantName, 
  itemCount, 
  deliveryAddress 
}: ProgressTimelineProps) {
  const steps = [
    {
      id: 'accepted',
      title: 'Order Accepted',
      subtitle: '',
      icon: 'checkmark-circle',
      iconType: 'ionicons' as const,
    },
    {
      id: 'reach-restaurant',
      title: 'Reach Restaurant',
      subtitle: restaurantName || 'Khao Gully',
      icon: 'storefront',
      iconType: 'ionicons' as const,
    },
    {
      id: 'pickup',
      title: 'Pickup Items',
      subtitle: itemCount !== undefined ? `${itemCount} Items` : 'Items',
      icon: 'bag-handle',
      iconType: 'ionicons' as const,
    },
    {
      id: 'start-delivery',
      title: 'Out for Delivery',
      subtitle: deliveryAddress || 'Delivery Address',
      icon: 'bicycle',
      iconType: 'ionicons' as const,
    },
    {
      id: 'delivered',
      title: 'Delivered',
      subtitle: '',
      icon: 'home',
      iconType: 'ionicons' as const,
    },
  ];

  // Helper to determine the state of each step
  const getStepState = (stepId: string): 'completed' | 'active' | 'future' => {
    if (currentStep === 'reach-restaurant') {
      if (stepId === 'accepted') return 'completed';
      if (stepId === 'reach-restaurant') return 'active';
      return 'future';
    }
    if (currentStep === 'pickup') {
      if (stepId === 'accepted' || stepId === 'reach-restaurant') return 'completed';
      if (stepId === 'pickup') return 'active';
      return 'future';
    }
    if (currentStep === 'start-delivery') {
      if (stepId === 'accepted' || stepId === 'reach-restaurant' || stepId === 'pickup') return 'completed';
      if (stepId === 'start-delivery') return 'active';
      return 'future';
    }
    return 'future';
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const state = getStepState(step.id);
        const isLast = index === steps.length - 1;

        // Colors based on state
        let iconBgColor = '#F1F5F9';
        let iconColor = '#94A3B8';
        let titleColor = '#64748B';
        let showCheck = false;

        if (state === 'completed') {
          iconBgColor = '#D1FAE5';
          iconColor = '#10B981';
          titleColor = '#94A3B8'; // completed items are slightly muted as per screen 2
          showCheck = true;
        } else if (state === 'active') {
          iconBgColor = '#FFEFD6';
          iconColor = '#F97316';
          titleColor = '#38220F';
        }

        return (
          <View key={step.id} style={styles.stepRow}>
            {/* Left side: dot & line */}
            <View style={styles.indicatorContainer}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }, state === 'active' && styles.activeIconBorder]}>
                {showCheck ? (
                  <Ionicons name="checkmark-sharp" size={16} color="#10B981" />
                ) : (
                  <Ionicons name={step.icon as any} size={15} color={iconColor} />
                )}
              </View>
              
              {!isLast && (
                <View style={[
                  styles.connectorLine,
                  state === 'completed' ? styles.completedLine : styles.futureLine
                ]} />
              )}
            </View>

            {/* Right side: Title & subtitle info */}
            <View style={styles.contentContainer}>
              <Text style={[
                styles.title,
                { color: titleColor },
                state === 'completed' && styles.completedTitleText,
                state === 'active' && styles.activeTitleText
              ]}>
                {step.title}
              </Text>
              
              {step.subtitle && state !== 'completed' && (
                <Text style={styles.subtitle}>
                  {step.subtitle}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 3,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  indicatorContainer: {
    alignItems: 'center',
    marginRight: 14,
    width: 28,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeIconBorder: {
    borderWidth: 2,
    borderColor: '#F97316',
  },
  connectorLine: {
    width: 2,
    position: 'absolute',
    top: 28,
    bottom: -28,
    zIndex: 1,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  futureLine: {
    backgroundColor: '#E2E8F0',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  completedTitleText: {
    textDecorationLine: 'line-through', // Strike-through completed steps as seen in reference image
    fontWeight: '500',
  },
  activeTitleText: {
    fontWeight: '800',
    fontSize: 15,
  },
  subtitle: {
    fontSize: 11,
    color: '#8A7A6E',
    marginTop: 2,
    fontWeight: '600',
  },
});
