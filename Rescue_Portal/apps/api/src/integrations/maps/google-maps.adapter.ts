import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng } from '../../common/utils/distance.util';
import { MapsProviderError, type MapsProvider, type RouteResult } from './maps.types';

interface GoogleRoute {
  distanceMeters?: number;
  duration?: string;
}

interface GoogleRoutesResponse {
  routes?: GoogleRoute[];
}

/**
 * Google Routes API adapter. Not active unless MAPS_ADAPTER=google and a key
 * is configured. Field mask limits the response to distance and duration.
 */
@Injectable()
export class GoogleMapsAdapter implements MapsProvider {
  readonly name = 'google';
  readonly isMock = false;

  constructor(private readonly config: ConfigService) {}

  private apiKey(): string {
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) throw new MapsProviderError('GOOGLE_MAPS_API_KEY is not configured', this.name, false);
    return key;
  }

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const timeoutMs = Number(this.config.get<string>('MAPS_API_TIMEOUT_MS', '8000'));
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey(),
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
          destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          units: 'METRIC',
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new MapsProviderError(`Google Routes request failed: ${(error as Error).message}`, this.name);
    }
    if (!response.ok) {
      throw new MapsProviderError(`Google Routes returned HTTP ${response.status}`, this.name, response.status >= 500 || response.status === 429);
    }
    const payload = (await response.json()) as GoogleRoutesResponse;
    const route = payload.routes?.[0];
    if (!route?.distanceMeters || !route.duration) {
      throw new MapsProviderError('Google Routes returned no usable route', this.name, false);
    }
    const seconds = Number(String(route.duration).replace('s', ''));
    return {
      distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(seconds / 60)),
      source: 'google-routes',
      estimated: false,
      polyline: null,
    };
  }

  async getRoutes(origin: LatLng, destinations: LatLng[]): Promise<RouteResult[]> {
    return Promise.all(destinations.map((destination) => this.getRoute(origin, destination)));
  }
}
