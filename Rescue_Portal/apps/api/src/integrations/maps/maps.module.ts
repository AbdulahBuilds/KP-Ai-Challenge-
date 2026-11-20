import { Module } from '@nestjs/common';
import { HaversineMapsAdapter } from './haversine-maps.adapter';
import { GoogleMapsAdapter } from './google-maps.adapter';
import { OsrmMapsAdapter } from './osrm-maps.adapter';
import { MapsService } from './maps.service';

@Module({
  providers: [HaversineMapsAdapter, GoogleMapsAdapter, OsrmMapsAdapter, MapsService],
  exports: [MapsService],
})
export class MapsModule {}
