import { StorageService } from '../../../src/storage/storage.service';

/**
 * Test double for StorageService. Records uploads/deletes in memory so tests
 * can assert on side effects. Method names match StorageService 1:1:
 * upload, download, delete, getSignedUrl, ensureBucket.
 */
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

// Compile-time check: if StorageService's public surface changes in a way that
// breaks this fake, this line fails to type-check. Turns silent drift into a
// build error.
const _storageSurfaceCheck: Pick<
  StorageService,
  'upload' | 'download' | 'delete' | 'getSignedUrl' | 'ensureBucket'
> = new FakeStorage();
void _storageSurfaceCheck;
