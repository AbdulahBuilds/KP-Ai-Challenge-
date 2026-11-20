import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { haversineDistanceKm, type LatLng } from '../../common/utils/distance.util';
import type { MapsProvider, RouteResult } from './maps.types';

/**
 * Provider-neutral fallback used when no routing provider is configured.
 * Distances are straight-line estimates multiplied by a configurable road
 * factor. Results are explicitly marked as estimated.
 */
@Injectable()
export class HaversineMapsAdapter implements MapsProvider {
  readonly name = 'mock-haversine';
  readonly isMock = true;

  constructor(private readonly config: ConfigService) {}

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    return this.compute(origin, destination);
  }

  async getRoutes(origin: LatLng, destinations: LatLng[]): Promise<RouteResult[]> {
    return destinations.map((destination) => this.compute(origin, destination));
  }

  private compute(origin: LatLng, destination: LatLng): RouteResult {
    const roadFactor = Number(this.config.get<string>('MAPS_ROAD_FACTOR', '1.35'));
    const speed = Number(this.config.get<string>('MAPS_AVERAGE_SPEED_KMH', '42'));
    const distanceKm = haversineDistanceKm(origin, destination) * (Number.isFinite(roadFactor) ? roadFactor : 1.35);
    const durationMinutes = (distanceKm / (Number.isFinite(speed) && speed > 0 ? speed : 42)) * 60;
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.max(1, Math.round(durationMinutes)),
      source: 'mock-haversine',
      estimated: true,
      polyline: null,
    };
  }
}
