import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import type { StorageProvider } from './storage.types';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  constructor(
    config: ConfigService,
    local: LocalStorageAdapter,
    s3: S3StorageAdapter,
  ) {
    this.provider = (config.get<string>('STORAGE_DRIVER') ?? 'local').toLowerCase() === 's3' ? s3 : local;
    this.logger.log(`Attachment storage driver: ${this.provider.name}`);
  }

  get name(): string {
    return this.provider.name;
  }

  putObject(key: string, body: Buffer, contentType: string) {
    return this.provider.putObject(key, body, contentType);
  }

  getObject(key: string) {
    return this.provider.getObject(key);
  }

  deleteObject(key: string) {
    return this.provider.deleteObject(key);
  }
}
