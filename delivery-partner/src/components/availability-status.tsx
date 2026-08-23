import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AvailabilityStatusProps {
  isAvailable: boolean;
}

export default function AvailabilityStatus({ isAvailable }: AvailabilityStatusProps) {
  return (
    <View style={[
      styles.container,
      isAvailable ? styles.availableBg : styles.unavailableBg
    ]}>
      <View style={[
        styles.dot,
        isAvailable ? styles.availableDot : styles.unavailableDot
      ]} />
      <Text style={[
        styles.text,
        isAvailable ? styles.availableText : styles.unavailableText
      ]}>
        {isAvailable ? 'Available' : 'Unavailable'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  availableBg: {
    backgroundColor: '#E8F0FE',
    borderColor: '#D2E3FC',
  },
  unavailableBg: {
    backgroundColor: '#FDF2F2',
    borderColor: '#FDE8E8',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availableDot: {
    backgroundColor: '#1A73E8',
  },
  unavailableDot: {
    backgroundColor: '#E11D48',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  availableText: {
    color: '#1A73E8',
  },
  unavailableText: {
    color: '#E11D48',
  },
});
