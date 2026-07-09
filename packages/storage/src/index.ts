import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IStorageProvider {
  /**
   * Uploads a file buffer and returns the unique storage key
   */
  upload(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<string>;
  
  /**
   * Retrieves a file buffer by its storage key
   */
  download(storageKey: string): Promise<Buffer>;
  
  /**
   * Deletes a file by its storage key
   */
  delete(storageKey: string): Promise<void>;
  
  /**
   * Returns a temporary signed URL if supported (e.g. S3).
   * For LocalStorage, this may return a direct gateway download URL.
   */
  getSignedUrl(storageKey: string): Promise<string>;
}

export class LocalDiskProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir: string = '/tmp/enterprise-ai-storage') {
    this.baseDir = baseDir;
    // Ensure directory exists asynchronously (fire and forget for constructor)
    fs.mkdir(this.baseDir, { recursive: true }).catch(console.error);
  }

  async upload(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<string> {
    const ext = path.extname(originalFilename);
    const key = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    const filePath = path.join(this.baseDir, key);
    
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(filePath, fileBuffer);
    
    return key;
  }

  async download(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, storageKey);
    return fs.readFile(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.baseDir, storageKey);
    await fs.unlink(filePath);
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    // In a local environment, the Gateway will proxy requests to /v1/storage/:key
    return `/v1/storage/${storageKey}`;
  }
}

// Factory export
export const StorageFactory = {
  createProvider: (type: 'LOCAL' | 'S3' | 'MINIO' | 'AZURE'): IStorageProvider => {
    switch (type) {
      case 'LOCAL':
        return new LocalDiskProvider(process.env.STORAGE_LOCAL_DIR || '/tmp/enterprise-ai-storage');
      default:
        throw new Error(`Storage provider type ${type} is not yet implemented.`);
    }
  }
};
