import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OnlineStatusProps {
  isOnline: boolean;
}

export default function OnlineStatus({ isOnline }: OnlineStatusProps) {
  return (
    <View style={[
      styles.container,
      isOnline ? styles.onlineBg : styles.offlineBg
    ]}>
      <View style={[
        styles.dot,
        isOnline ? styles.onlineDot : styles.offlineDot
      ]} />
      <Text style={[
        styles.text,
        isOnline ? styles.onlineText : styles.offlineText
      ]}>
        {isOnline ? 'Online' : 'Offline'}
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
  onlineBg: {
    backgroundColor: '#E6F4EA',
    borderColor: '#CEEAD6',
  },
  offlineBg: {
    backgroundColor: '#F1F3F4',
    borderColor: '#DADCE0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: '#137333',
  },
  offlineDot: {
    backgroundColor: '#5F6368',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  onlineText: {
    color: '#137333',
  },
  offlineText: {
    color: '#5F6368',
  },
});
