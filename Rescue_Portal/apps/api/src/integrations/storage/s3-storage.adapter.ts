import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StorageError, type StorageProvider, type StoredObject } from './storage.types';

/** S3-compatible private object storage (AWS S3, MinIO, etc.). */
@Injectable()
export class S3StorageAdapter implements StorageProvider {
  readonly name = 's3';
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'rescue-attachments');
    this.client = new S3Client({
      region: config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: config.get<string>('S3_ENDPOINT') || undefined,
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ServerSideEncryption: 'AES256',
        }),
      );
      return { key, sizeBytes: body.byteLength, contentType };
    } catch (error) {
      this.logger.error(`S3 upload failed: ${(error as Error).message}`);
      throw new StorageError('Could not upload attachment to object storage', this.name);
    }
  }

  async getObject(key: string): Promise<{ body: Buffer; contentType: string | null }> {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!response.Body) throw new Error('Empty object body');
      const bytes = await response.Body.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: response.ContentType ?? null };
    } catch (error) {
      this.logger.error(`S3 download failed: ${(error as Error).message}`);
      throw new StorageError('Attachment content not found', this.name);
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      throw new StorageError(`Could not delete attachment from object storage: ${(error as Error).message}`, this.name);
    }
  }
}
