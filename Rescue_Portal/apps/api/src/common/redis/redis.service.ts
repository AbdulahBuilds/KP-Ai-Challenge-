import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Redis is used for caching and rate limiting. If Redis is unavailable the
 * service degrades to a bounded in-process fallback so that emergency
 * operations are not blocked. This does not provide distributed coordination.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.config.get<string>('REDIS_ENABLED', 'true') === 'true';
    const url = this.config.get<string>('REDIS_URL');
    if (!enabled || !url) {
      this.logger.warn('Redis disabled - using in-process cache/rate-limit fallback');
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
    this.client.on('error', (err) => {
      if (this.available) this.logger.warn(`Redis error: ${err.message}`);
      this.available = false;
    });
    this.client.on('ready', () => {
      this.available = true;
      this.logger.log('Redis connection established');
    });
    try {
      await this.client.connect();
      this.available = true;
    } catch (error) {
      this.logger.warn(`Redis unavailable, fallback active: ${(error as Error).message}`);
      this.available = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }

  async ping(): Promise<boolean> {
    if (!this.client || !this.available) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.available) {
      try {
        return await this.client.get(key);
      } catch {
        /* fall through */
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client && this.available) {
      try {
        if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
        else await this.client.set(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    this.pruneMemory();
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 24 * 3600 * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.available) {
      try {
        await this.client.del(key);
      } catch {
        /* ignore */
      }
    }
    this.memory.delete(key);
  }

  /**
   * Atomic increment used for rate limiting. Returns the current count.
   */
  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (this.client && this.available) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) await this.client.expire(key, ttlSeconds);
        return count;
      } catch {
        /* fall through */
      }
    }
    const entry = this.memory.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      this.memory.set(key, { value: '1', expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    const next = Number(entry.value) + 1;
    entry.value = String(next);
    return next;
  }

  private pruneMemory(): void {
    if (this.memory.size < 5000) return;
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(key);
    }
  }
}
