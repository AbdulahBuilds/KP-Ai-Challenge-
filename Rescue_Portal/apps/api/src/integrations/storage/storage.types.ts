export interface StoredObject {
  key: string;
  sizeBytes: number;
  contentType: string;
}

export interface StorageProvider {
  readonly name: string;
  putObject(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  getObject(key: string): Promise<{ body: Buffer; contentType: string | null }>;
  deleteObject(key: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
