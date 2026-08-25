export interface RouteResponse {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org';

export const routingService = {
  getRoute: async (params: {
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }): Promise<RouteResponse> => {
    const baseUrl = process.env.EXPO_PUBLIC_ROUTING_BASE_URL || DEFAULT_OSRM_URL;
    
    // OSRM coordinates are in longitude,latitude order
    const url = `${baseUrl}/route/v1/driving/${params.originLongitude},${params.originLatitude};${params.destinationLongitude},${params.destinationLatitude}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Routing failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates, // [[longitude, latitude], ...]
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
    };
  },
};
