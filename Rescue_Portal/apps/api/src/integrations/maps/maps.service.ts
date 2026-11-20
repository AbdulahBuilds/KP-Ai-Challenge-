import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng } from '../../common/utils/distance.util';
import { HaversineMapsAdapter } from './haversine-maps.adapter';
import { GoogleMapsAdapter } from './google-maps.adapter';
import { OsrmMapsAdapter } from './osrm-maps.adapter';
import type { MapsProvider, RouteResult } from './maps.types';

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly provider: MapsProvider;
  private readonly fallback: HaversineMapsAdapter;
  private readonly selected: string;

  constructor(
    private readonly config: ConfigService,
    haversine: HaversineMapsAdapter,
    google: GoogleMapsAdapter,
    osrm: OsrmMapsAdapter,
  ) {
    this.fallback = haversine;
    this.selected = (config.get<string>('MAPS_ADAPTER') ?? 'mock-haversine').toLowerCase();
    this.provider =
      this.selected === 'google' ? google : this.selected === 'osrm' ? osrm : haversine;
    this.logger.log(`Maps provider: ${this.provider.name}${this.provider.isMock ? ' (estimated)' : ''}`);
  }

  get status() {
    const configured = this.selected === 'google' || this.selected === 'osrm';
    return {
      provider: this.provider.name,
      configured,
      isMock: this.provider.isMock || !configured,
      mode: this.provider.isMock || !configured ? 'estimated' : 'live',
      notice:
        this.provider.isMock || !configured
          ? 'Live routing is not configured. Distance and ETA are estimated and must not be treated as actual travel time.'
          : 'Distance and ETA are provided by the configured routing provider.',
    };
  }

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    if (this.provider.isMock) return this.provider.getRoute(origin, destination);
    try {
      return await this.provider.getRoute(origin, destination);
    } catch (error) {
      this.logger.warn(`Maps provider failed, using deterministic estimate: ${(error as Error).message}`);
      const result = await this.fallback.getRoute(origin, destination);
      return { ...result, source: 'fallback-estimate', estimated: true };
    }
  }

  async getRoutesWithFallback(origin: LatLng, destinations: LatLng[]): Promise<RouteResult[]> {
    if (destinations.length === 0) return [];
    if (this.provider.isMock) return this.provider.getRoutes(origin, destinations);
    const settled = await Promise.allSettled(destinations.map((d) => this.provider.getRoute(origin, d)));
    return Promise.all(
      settled.map(async (result, index) => {
        if (result.status === 'fulfilled') return result.value;
        const fallback = await this.fallback.getRoute(origin, destinations[index]);
        return { ...fallback, source: 'fallback-estimate', estimated: true };
      }),
    );
  }
}
