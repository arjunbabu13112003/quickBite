import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Map as MapView, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { routingService } from '../services/routingService';

interface MapPlaceholderProps {
  eta: string;
  etaPosition?: 'top-left' | 'bottom-right';
  destinationName?: string;
  order?: any;
  riderCoords?: { latitude: number; longitude: number; heading?: number | null } | null;
  deliveryState?: string;
  onPress?: () => void;
}

// Helper: Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper: check if rider is off-route
function isRiderOffRoute(riderLat: number, riderLng: number, routeCoordinates: [number, number][]): boolean {
  if (!routeCoordinates || routeCoordinates.length === 0) return false;
  
  let minDistance = Infinity;
  for (const coord of routeCoordinates) {
    const [lng, lat] = coord;
    const dist = getDistance(riderLat, riderLng, lat, lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  
  return minDistance > 50; // deviating > 50 meters
}

export default function MapPlaceholder({
  eta = '8 mins',
  etaPosition = 'top-left',
  destinationName,
  order,
  riderCoords,
  deliveryState,
  onPress
}: MapPlaceholderProps) {
  // Determine lifecycle stage & coordinates
  const isPickupStage = useMemo(() => {
    // If backend status is available, use it as the authoritative source
    if (order && order.orderStatus) {
      const status = order.orderStatus.toLowerCase();
      if (status === 'accepted' || status === 'ready_for_pickup' || status === 'picked_up') {
        return true;
      }
      if (status === 'out_for_delivery') {
        return false;
      }
    }

    // Fallback to deliveryState client representation
    return (
      deliveryState === 'active-restaurant' ||
      deliveryState === 'active-pickup' ||
      deliveryState === 'active-start-delivery'
    );
  }, [order?.orderStatus, deliveryState]);

  const destLat = useMemo(() => {
    if (!order) return null;
    const val = isPickupStage ? order.restaurantLatitude : order.deliveryLatitude;
    if (val && val !== 0) return val;
    return isPickupStage ? 11.8744 : 11.8722;
  }, [order, isPickupStage]);

  const destLng = useMemo(() => {
    if (!order) return null;
    const val = isPickupStage ? order.restaurantLongitude : order.deliveryLongitude;
    if (val && val !== 0) return val;
    return isPickupStage ? 75.3704 : 75.3740;
  }, [order, isPickupStage]);

  const destType = isPickupStage ? 'pickup' : 'dropoff';

  const hasValidRiderCoords = !!(riderCoords && riderCoords.latitude && riderCoords.longitude);
  const hasValidDestCoords = !!(destLat && destLng && destLat !== 0 && destLng !== 0);
  const shouldRenderMap = hasValidRiderCoords && hasValidDestCoords;

  // Routing states
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Camera tracking states
  const [isCameraFollowing, setIsCameraFollowing] = useState<boolean>(true);
  const cameraRef = useRef<any>(null);

  const lastFetchCoordsRef = useRef<{ riderLat: number; riderLng: number; destLat: number; destLng: number } | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const activeRequestKeyRef = useRef<string>('');
  const [hasFitInitialBounds, setHasFitInitialBounds] = useState<boolean>(false);

  // Reset initial zoom fit when destination changes
  useEffect(() => {
    setHasFitInitialBounds(false);
    lastFetchCoordsRef.current = null;
    lastFetchTimeRef.current = 0;
  }, [destLat, destLng]);

  // Route calculation hook
  useEffect(() => {
    if (!shouldRenderMap) {
      setRouteCoordinates([]);
      setDistanceMeters(null);
      setDurationSeconds(null);
      setRoutingError(null);
      return;
    }

    const riderLat = riderCoords!.latitude;
    const riderLng = riderCoords!.longitude;
    const requestKey = `${riderLat},${riderLng}->${destLat},${destLng}`;

    const distMoved = lastFetchCoordsRef.current
      ? getDistance(riderLat, riderLng, lastFetchCoordsRef.current.riderLat, lastFetchCoordsRef.current.riderLng)
      : Infinity;

    const isDestChanged = lastFetchCoordsRef.current
      ? (lastFetchCoordsRef.current.destLat !== destLat || lastFetchCoordsRef.current.destLng !== destLng)
      : true;

    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    const isRiderOff = routeCoordinates.length > 0 && isRiderOffRoute(riderLat, riderLng, routeCoordinates);

    const shouldFetch =
      isDestChanged ||
      distMoved > 35 ||
      isRiderOff ||
      (timeSinceLastFetch > 30000);

    const isThrottled = timeSinceLastFetch < 15000 && !isDestChanged && !isRiderOff;

    if (!shouldFetch || isThrottled) {
      return;
    }

    let active = true;
    activeRequestKeyRef.current = requestKey;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await routingService.getRoute({
          originLatitude: riderLat,
          originLongitude: riderLng,
          destinationLatitude: destLat!,
          destinationLongitude: destLng!,
        });

        if (!active || activeRequestKeyRef.current !== requestKey) {
          return;
        }

        setRouteCoordinates(res.coordinates);
        setDistanceMeters(res.distanceMeters);
        setDurationSeconds(res.durationSeconds);
        setRoutingError(null);

        lastFetchCoordsRef.current = { riderLat, riderLng, destLat: destLat!, destLng: destLng! };
        lastFetchTimeRef.current = Date.now();
      } catch (err: any) {
        console.warn('[Routing] Failed to fetch route:', err.message || err);
        if (active && activeRequestKeyRef.current === requestKey) {
          setRoutingError('Route temporarily unavailable');
        }
      } finally {
        if (active && activeRequestKeyRef.current === requestKey) {
          setLoadingRoute(false);
        }
      }
    };

    fetchRoute();

    return () => {
      active = false;
    };
  }, [shouldRenderMap, riderCoords?.latitude, riderCoords?.longitude, destLat, destLng]);

  // Route bounds fit helper
  const routeBounds = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length === 0) return null;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of routeCoordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return {
      ne: [maxLng, maxLat],
      sw: [minLng, minLat],
    };
  }, [routeCoordinates]);

  // Camera follow / fit updates
  useEffect(() => {
    if (!shouldRenderMap || !cameraRef.current) return;

    if (!hasFitInitialBounds && routeBounds) {
      cameraRef.current.setStop({
        bounds: [routeBounds.sw[0], routeBounds.sw[1], routeBounds.ne[0], routeBounds.ne[1]],
        padding: {
          left: 40,
          right: 40,
          top: 40,
          bottom: 40,
        },
        duration: 1500,
      });
      setHasFitInitialBounds(true);
    } else if (isCameraFollowing) {
      cameraRef.current.setStop({
        center: [riderCoords!.longitude, riderCoords!.latitude],
        zoom: 15.5,
        bearing: riderCoords!.heading || 0,
        pitch: 45,
        duration: 1000,
      });
    }
  }, [riderCoords?.latitude, riderCoords?.longitude, isCameraFollowing, routeBounds, hasFitInitialBounds]);

  const distanceText = useMemo(() => {
    if (distanceMeters === null) return '—';
    const km = distanceMeters / 1000;
    return `${km.toFixed(1)} km`;
  }, [distanceMeters]);

  const durationText = useMemo(() => {
    if (durationSeconds === null) return '—';
    const mins = Math.round(durationSeconds / 60);
    return `~${mins} min`;
  }, [durationSeconds]);

  // Render MapLibre Live Navigation Map
  if (shouldRenderMap) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
        <MapView
          style={styles.map}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          logo={false}
          attribution={false}
          onRegionWillChange={(event: any) => {
            if (event.properties?.isUserGesture) {
              setIsCameraFollowing(false);
            }
          }}
        >
          <Camera ref={cameraRef} />

          {/* Render Route Polyline */}
          {routeCoordinates.length > 0 && (
            <GeoJSONSource
              id="routeSource"
              data={{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoordinates,
                },
                properties: {},
              }}
            >
              <Layer
                id="routeLayer"
                type="line"
                style={{
                  lineColor: '#F97316',
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </GeoJSONSource>
          )}

          {/* Destination Marker */}
          <Marker
            id="destinationMarker"
            lngLat={[destLng!, destLat!]}
          >
            <View style={styles.liveDestPin}>
              {destType === 'pickup' ? (
                <Ionicons name="business" size={14} color="#FFFFFF" />
              ) : (
                <Ionicons name="home" size={14} color="#FFFFFF" />
              )}
            </View>
          </Marker>

          {/* Rider Marker */}
          <Marker
            id="riderMarker"
            lngLat={[riderCoords!.longitude, riderCoords!.latitude]}
          >
            <View style={[
              styles.liveRiderPin,
              riderCoords!.heading ? { transform: [{ rotate: `${riderCoords!.heading}deg` }] } : {}
            ]}>
              <FontAwesome5 name="motorcycle" size={13} color="#FFFFFF" />
            </View>
          </Marker>
        </MapView>

        {/* Floating Recenter Control */}
        {!isCameraFollowing && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsCameraFollowing(true)}
            style={styles.recenterBtn}
          >
            <Ionicons name="navigate" size={12} color="#FFFFFF" />
            <Text style={styles.recenterBtnText}>Recenter</Text>
          </TouchableOpacity>
        )}

        {/* HUD Info Badge */}
        <View style={[styles.etaBadge, styles.etaTopLeft]}>
          <Text style={styles.etaTitle}>
            {destType === 'pickup' ? 'TO PICKUP' : 'TO CUSTOMER'}
          </Text>
          <Text style={styles.etaValue}>{distanceText}</Text>
          <Text style={styles.etaDuration}>{durationText}</Text>
        </View>

        {/* Status Recalculation overlay */}
        {(loadingRoute || routingError) && (
          <View style={styles.routeStatusBadge}>
            {loadingRoute ? (
              <>
                <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 6 }} />
                <Text style={styles.routeStatusText}>Recalculating route…</Text>
              </>
            ) : (
              <>
                <Ionicons name="warning" size={12} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.routeStatusText, { color: '#EF4444' }]}>{routingError}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Render original static styled layout fallback if coordinates are missing/loading
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
      <View style={styles.seaBg} />
      <View style={styles.landBg} />

      <View style={[styles.street, styles.streetH1]} />
      <View style={[styles.street, styles.streetH2]} />
      <View style={[styles.street, styles.streetV1]} />
      <View style={[styles.street, styles.streetV2]} />
      <View style={[styles.street, styles.streetDiag]} />

      <View style={styles.routePath} />
      <View style={styles.routePathH} />

      <Text style={[styles.mapLabel, styles.seaLabel]}>Arabian Sea</Text>
      <Text style={[styles.mapLabel, styles.fortKochiLabel]}>Fort Kochi</Text>
      <Text style={[styles.mapLabel, styles.mattancherryLabel]}>Mattancherry</Text>
      <Text style={[styles.mapLabel, styles.eranakulamLabel]}>Ernakulam</Text>

      <View style={[styles.marker, styles.riderMarker]}>
        <View style={styles.riderPin}>
          <FontAwesome5 name="motorcycle" size={12} color="#FFFFFF" />
        </View>
        <View style={styles.markerPulse} />
      </View>

      <View style={[styles.marker, styles.destMarker]}>
        <View style={styles.destPin}>
          <Ionicons name="location" size={16} color="#FF7A00" />
        </View>
        <Text style={styles.destLabel}>
          {isPickupStage ? 'Pickup route unavailable' : 'Delivery route unavailable'}
        </Text>
      </View>

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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: '#E4F1FE',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FAF6F0',
    marginHorizontal: 16,
    marginVertical: 10,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  liveRiderPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EA580C', // Orange theme
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  liveDestPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3B82F6', // Blue theme for destination
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  recenterBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  routeStatusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  routeStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },
  seaBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: '#D6EBF8',
  },
  landBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    backgroundColor: '#F3EFEB',
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
    backgroundColor: '#F97316',
    transform: [{ rotate: '-30deg' }],
    zIndex: 1,
  },
  routePathH: {
    position: 'absolute',
    left: '52%',
    top: 120,
    width: 80,
    height: 4,
    backgroundColor: '#F97316',
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
    fontSize: 8,
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
  etaDuration: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 1,
  },
  etaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
