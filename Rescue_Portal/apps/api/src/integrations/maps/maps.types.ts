import type { LatLng } from '../../common/utils/distance.util';

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  source: string;
  estimated: boolean;
  polyline?: string | null;
}

export interface MapsProvider {
  readonly name: string;
  readonly isMock: boolean;
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>;
  getRoutes(origin: LatLng, destinations: LatLng[]): Promise<RouteResult[]>;
}

export class MapsProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly retryable = true,
  ) {
    super(message);
    this.name = 'MapsProviderError';
  }
}
