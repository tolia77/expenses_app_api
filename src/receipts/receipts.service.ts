import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    private merchantsService: MerchantsService,
  ) {}

  async create(userId: string, createReceiptDto: CreateReceiptDto): Promise<Receipt> {
    const { merchant_id, ...rest } = createReceiptDto;
    if (merchant_id) {
      await this.merchantsService.findOne(merchant_id, userId);
    }
    const receipt = this.receiptRepository.create({
      ...rest,
      userId,
      merchant: merchant_id ? ({ id: merchant_id } as any) : null,
    });
    return this.receiptRepository.save(receipt);
  }

  async findAll(userId: string): Promise<Receipt[]> {
    return this.receiptRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findOneBy({ id, userId });
    if (!receipt) {
      throw new NotFoundException();
    }
    return receipt;
  }

  async update(
    id: string,
    userId: string,
    updateReceiptDto: UpdateReceiptDto,
  ): Promise<Receipt> {
    await this.findOne(id, userId);
    const { merchant_id, ...rest } = updateReceiptDto;
    if (merchant_id !== undefined) {
      await this.merchantsService.findOne(merchant_id, userId);
    }
    const updateData: any = { ...rest };
    if (merchant_id !== undefined) {
      updateData.merchant = { id: merchant_id };
    }
    await this.receiptRepository.update(id, updateData);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.receiptRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException();
    }
  }
}
