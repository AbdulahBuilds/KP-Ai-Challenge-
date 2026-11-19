import { Global, Module } from '@nestjs/common';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [LocalStorageAdapter, S3StorageAdapter, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
