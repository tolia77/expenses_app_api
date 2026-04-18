import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Receipt } from './entities/receipt.entity';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { FilterReceiptsDto } from './dto/filter-receipts.dto';
import { MerchantsService } from '../merchants/merchants.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    private merchantsService: MerchantsService,
    private storageService: StorageService,
  ) {}

  async create(userId: string, createReceiptDto: CreateReceiptDto) {
    const { merchant_id, ...rest } = createReceiptDto;
    if (merchant_id) {
      await this.merchantsService.findOne(merchant_id, userId);
    }
    const receipt = this.receiptRepository.create({
      ...rest,
      userId,
      merchant: merchant_id ? ({ id: merchant_id } as any) : null,
    });
    const saved = await this.receiptRepository.save(receipt);
    return this.toResponse(saved);
  }

  async findAll(userId: string, filter?: FilterReceiptsDto) {
    const where: any = { userId };
    if (filter?.from && filter?.to) {
      where.purchased_at = Between(
        new Date(filter.from + 'T00:00:00.000Z'),
        new Date(filter.to + 'T23:59:59.999Z'),
      );
    } else if (filter?.from) {
      where.purchased_at = MoreThanOrEqual(
        new Date(filter.from + 'T00:00:00.000Z'),
      );
    } else if (filter?.to) {
      where.purchased_at = LessThanOrEqual(
        new Date(filter.to + 'T23:59:59.999Z'),
      );
    }
    const receipts = await this.receiptRepository.find({ where });
    return Promise.all(receipts.map((r) => this.toResponse(r)));
  }

  async findOne(id: string, userId: string) {
    const receipt = await this.findOneEntity(id, userId);
    return this.toResponse(receipt);
  }

  async update(
    id: string,
    userId: string,
    updateReceiptDto: UpdateReceiptDto,
  ) {
    const receipt = await this.findOneEntity(id, userId);
    const { merchant_id, ...rest } = updateReceiptDto;
    if (merchant_id !== undefined) {
      await this.merchantsService.findOne(merchant_id, userId);
      receipt.merchant = { id: merchant_id } as any;
    }
    Object.assign(receipt, rest);
    const saved = await this.receiptRepository.save(receipt);
    return this.toResponse(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId },
    });
    if (!receipt) {
      throw new NotFoundException();
    }
    if (receipt.photo_key) {
      await this.storageService.delete(receipt.photo_key);
    }
    await this.receiptRepository.delete({ id: receipt.id });
  }

  async uploadPhoto(
    id: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ photo_url: string }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('photo file is required');
    }

    // 1) Ownership check (throws 404 before touching S3)
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId },
    });
    if (!receipt) {
      throw new NotFoundException();
    }

    // 2) Magic-byte MIME validation (throws 400 before touching S3)
    const ext = await this.validateImageMime(file.buffer);
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // 3) Build key and upload NEW object first
    const newKey = `receipts/${userId}/${id}/${randomUUID()}.${ext}`;
    await this.storageService.upload(newKey, file.buffer, contentType);

    // 4) Capture old key BEFORE overwriting, save new key
    const oldKey = receipt.photo_key;
    receipt.photo_key = newKey;
    await this.receiptRepository.save(receipt);

    // 5) Delete old object if it existed (non-fatal on failure — receipt
    //    already points to the valid new key; worst case is an orphan.
    //    RESEARCH.md Pattern 5 explicitly classifies this as acceptable
    //    tech debt per user decision.)
    if (oldKey) {
      try {
        await this.storageService.delete(oldKey);
      } catch {
        // orphaned old object — acceptable per Phase 7 scope
      }
    }

    const photo_url = await this.storageService.getSignedUrl(newKey);
    return { photo_url };
  }

  async removePhoto(id: string, userId: string): Promise<void> {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId },
    });
    if (!receipt) {
      throw new NotFoundException();
    }
    if (!receipt.photo_key) {
      throw new NotFoundException('Receipt has no photo');
    }
    // S3 first, then DB — per Locked Decision
    await this.storageService.delete(receipt.photo_key);
    receipt.photo_key = null as unknown as string;
    await this.receiptRepository.save(receipt);
  }

  private async validateImageMime(buffer: Buffer): Promise<string> {
    const { fileTypeFromBuffer } = await import('file-type');
    const result = await fileTypeFromBuffer(buffer);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!result || !allowed.includes(result.mime)) {
      throw new BadRequestException('File must be a JPEG, PNG, or WebP image');
    }
    return result.ext; // 'jpg' | 'png' | 'webp'
  }

  private async findOneEntity(id: string, userId: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId },
      relations: ['expenses'],
    });
    if (!receipt) {
      throw new NotFoundException();
    }
    return receipt;
  }

  private async toResponse(receipt: Receipt) {
    const photo_url = receipt.photo_key
      ? await this.storageService.getSignedUrl(receipt.photo_key)
      : null;
    const { photo_key: _photo_key, ...rest } = receipt;
    return { ...rest, photo_url };
  }
}
