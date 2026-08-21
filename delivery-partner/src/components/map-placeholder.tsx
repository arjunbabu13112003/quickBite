import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

interface MapPlaceholderProps {
  eta: string;
  etaPosition?: 'top-left' | 'bottom-right';
}

export default function MapPlaceholder({
  eta = '8 mins',
  etaPosition = 'top-left'
}: MapPlaceholderProps) {
  return (
    <View style={styles.container}>
      {/* 1. Styled Map Background */}
      {/* Soft blue water background on left, soft beige land on right */}
      <View style={styles.seaBg} />
      <View style={styles.landBg} />

      {/* Styled Grid/Streets */}
      <View style={[styles.street, styles.streetH1]} />
      <View style={[styles.street, styles.streetH2]} />
      <View style={[styles.street, styles.streetV1]} />
      <View style={[styles.street, styles.streetV2]} />
      <View style={[styles.street, styles.streetDiag]} />

      {/* 2. Route Path (dashed or solid colored line representing the path) */}
      <View style={styles.routePath} />
      <View style={styles.routePathH} />

      {/* 3. Map Labels/Names */}
      <Text style={[styles.mapLabel, styles.seaLabel]}>Arabian Sea</Text>
      <Text style={[styles.mapLabel, styles.fortKochiLabel]}>Fort Kochi</Text>
      <Text style={[styles.mapLabel, styles.mattancherryLabel]}>Mattancherry</Text>
      <Text style={[styles.mapLabel, styles.eranakulamLabel]}>Ernakulam</Text>

      {/* 4. Map Markers (Restaurant Pin & Partner Bike Pin) */}
      {/* Partner/Rider Starting point Marker */}
      <View style={[styles.marker, styles.riderMarker]}>
        <View style={styles.riderPin}>
          <FontAwesome5 name="motorcycle" size={12} color="#FFFFFF" />
        </View>
        <View style={styles.markerPulse} />
      </View>

      {/* Restaurant Destination point Marker */}
      <View style={[styles.marker, styles.destMarker]}>
        <View style={styles.destPin}>
          <Ionicons name="location" size={16} color="#FF7A00" />
        </View>
        <Text style={styles.destLabel}>Khao Gully</Text>
      </View>

      {/* 5. Floating Estimated Time Badge */}
      {etaPosition === 'top-left' ? (
        <View style={[styles.etaBadge, styles.etaTopLeft]}>
          <Text style={styles.etaTitle}>Est. Time</Text>
          <Text style={styles.etaValue}>{eta}</Text>
        </View>
      ) : (
        <View style={[styles.etaBadge, styles.etaBottomRight]}>
          <View style={styles.etaBadgeRow}>
            <Ionicons name="warning" size={14} color="#D97706" style={{ marginRight: 4 }} />
            <Text style={styles.etaValue}>{eta}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    backgroundColor: '#E4F1FE', // Fallback water color
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FAF6F0',
    marginHorizontal: 16,
    marginVertical: 10,
    position: 'relative',
  },
  seaBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: '#D6EBF8', // Soft water blue
  },
  landBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    backgroundColor: '#F3EFEB', // Soft warm cream land
  },
  street: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  streetH1: {
    left: '35%',
    right: 0,
    top: 50,
    height: 6,
  },
  streetH2: {
    left: '35%',
    right: 0,
    top: 120,
    height: 6,
  },
  streetV1: {
    left: '50%',
    top: 0,
    bottom: 0,
    width: 6,
  },
  streetV2: {
    left: '75%',
    top: 0,
    bottom: 0,
    width: 6,
  },
  streetDiag: {
    left: '30%',
    top: 10,
    width: 140,
    height: 6,
    transform: [{ rotate: '45deg' }],
  },
  routePath: {
    position: 'absolute',
    left: '42%',
    top: 90,
    width: 60,
    height: 4,
    backgroundColor: '#F97316', // Orange route line
    transform: [{ rotate: '-30deg' }],
    zIndex: 1,
  },
  routePathH: {
    position: 'absolute',
    left: '52%',
    top: 120,
    width: 80,
    height: 4,
    backgroundColor: '#F97316', // Orange route line continues
    zIndex: 1,
  },
  mapLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '800',
    color: '#8A8D93',
  },
  seaLabel: {
    left: 20,
    top: 80,
    color: '#5C8DBC',
    transform: [{ rotate: '-90deg' }],
  },
  fortKochiLabel: {
    left: 55,
    top: 25,
  },
  mattancherryLabel: {
    left: 60,
    top: 145,
  },
  eranakulamLabel: {
    right: 12,
    top: 30,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  riderMarker: {
    left: '38%',
    top: 75,
  },
  riderPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  markerPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    zIndex: -1,
  },
  destMarker: {
    left: '70%',
    top: 100,
  },
  destPin: {
    elevation: 3,
  },
  destLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#38220F',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: -2,
    borderWidth: 0.5,
    borderColor: '#FAF6F0',
  },
  etaBadge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: '#38220F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#FAF6F0',
    alignItems: 'center',
    zIndex: 5,
  },
  etaTopLeft: {
    left: 12,
    top: 12,
  },
  etaBottomRight: {
    right: 12,
    bottom: 12,
  },
  etaTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A7A6E',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  etaValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38220F',
  },
  etaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
