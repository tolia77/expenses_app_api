import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: S3Client;
  private bucket: string;
  private presignTtl: number;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('storage.bucket')!;
    this.presignTtl = this.config.get<number>('storage.presignTtl')!;
    const endpoint = this.config.get<string>('storage.endpoint');
    const region = this.config.get<string>('storage.region')!;
    const accessKeyId = this.config.get<string>('storage.accessKey')!;
    const secretAccessKey = this.config.get<string>('storage.secret')!;

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    await this.ensureBucket();
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    return presignUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.presignTtl },
    );
  }
}
