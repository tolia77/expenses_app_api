import { Injectable } from '@nestjs/common';

/**
 * Test double for StorageService. Records uploads/deletes in memory so tests
 * can assert on side effects. Method names match StorageService 1:1:
 * upload, download, delete, getSignedUrl, ensureBucket.
 */
@Injectable()
export class FakeStorage {
  uploads: Array<{ key: string; buffer: Buffer; contentType: string }> = [];
  deletes: string[] = [];
  downloads: Record<string, Buffer> = {};

  async ensureBucket(): Promise<void> {
    // no-op; StorageService calls this in onModuleInit
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    this.uploads.push({ key, buffer, contentType });
    this.downloads[key] = buffer;
  }

  async download(key: string): Promise<Buffer> {
    const buf = this.downloads[key];
    if (!buf) throw new Error(`FakeStorage: no object at key ${key}`);
    return buf;
  }

  async delete(key: string): Promise<void> {
    this.deletes.push(key);
    delete this.downloads[key];
  }

  async getSignedUrl(key: string): Promise<string> {
    return `http://fake-storage/${key}`;
  }

  reset(): void {
    this.uploads = [];
    this.deletes = [];
    this.downloads = {};
  }
}
