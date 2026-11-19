import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng } from '../../common/utils/distance.util';
import { MapsProviderError, type MapsProvider, type RouteResult } from './maps.types';

interface OsrmResponse {
  code?: string;
  routes?: { distance: number; duration: number; geometry?: string }[];
}

/** OpenStreetMap-based routing via an OSRM server. */
@Injectable()
export class OsrmMapsAdapter implements MapsProvider {
  readonly name = 'osrm';
  readonly isMock = false;

  constructor(private readonly config: ConfigService) {}

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const base = this.config.get<string>('OSRM_BASE_URL', 'https://router.project-osrm.org');
    const timeoutMs = Number(this.config.get<string>('MAPS_API_TIMEOUT_MS', '8000'));
    const url = `${base.replace(/\/$/, '')}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      throw new MapsProviderError(`OSRM request failed: ${(error as Error).message}`, this.name);
    }
    if (!response.ok) throw new MapsProviderError(`OSRM returned HTTP ${response.status}`, this.name, response.status >= 500);
    const payload = (await response.json()) as OsrmResponse;
    const route = payload.routes?.[0];
    if (payload.code !== 'Ok' || !route) {
      throw new MapsProviderError(`OSRM returned ${payload.code ?? 'no route'}`, this.name, false);
    }
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      source: 'osrm',
      estimated: false,
      polyline: route.geometry ?? null,
    };
  }

  async getRoutes(origin: LatLng, destinations: LatLng[]): Promise<RouteResult[]> {
    return Promise.all(destinations.map((destination) => this.getRoute(origin, destination)));
  }
}
