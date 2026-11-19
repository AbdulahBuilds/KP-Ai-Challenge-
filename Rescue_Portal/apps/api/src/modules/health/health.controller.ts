import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';
import { HospitalsService } from '../hospitals/hospitals.service';
import { MapsService } from '../../integrations/maps/maps.service';
import { AiService } from '../../integrations/ai/ai.service';
import { StorageService } from '../../integrations/storage/storage.service';
import { MessagingService } from '../../integrations/messaging/messaging.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly hospitals: HospitalsService,
    private readonly maps: MapsService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
    private readonly messaging: MessagingService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe (no dependency checks)' })
  live() {
    return {
      status: 'ok',
      service: 'rescue-portal-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe: database is required; Redis and integrations are reported' })
  async ready() {
    let database = false;
    try {
      database = await this.prisma.isHealthy();
    } catch {
      database = false;
    }
    const redis = await this.redis.ping();
    const hospital = this.hospitals.status();
    const payload = {
      status: database ? (redis ? 'ok' : 'degraded') : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database: database ? 'ok' : 'unavailable',
        redis: redis ? 'ok' : 'degraded-fallback',
        storage: this.storage.name,
      },
      integrations: {
        hospital: { adapter: hospital.adapter, isMock: hospital.isMock, dataSource: hospital.dataSource },
        maps: this.maps.status,
        ai: this.ai.status(),
        messaging: this.messaging.status(),
      },
      notes: [
        ...(database ? [] : ['Database connectivity is required for readiness']),
        ...(redis ? [] : ['Redis is unavailable; in-process rate limiting/cache fallback is active']),
      ],
    };
    if (!database) throw new ServiceUnavailableException(payload);
    return payload;
  }
}
