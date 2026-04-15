import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
  ) {}

  async create(createReceiptDto: CreateReceiptDto): Promise<Receipt> {
    const { merchant_id, ...rest } = createReceiptDto;
    const receipt = this.receiptRepository.create({
      ...rest,
      merchant: merchant_id ? ({ id: merchant_id } as any) : null,
    });
    return this.receiptRepository.save(receipt);
  }

  async findAll(): Promise<Receipt[]> {
    return this.receiptRepository.find();
  }

  async findOne(id: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findOneBy({ id });
    if (!receipt) {
      throw new NotFoundException();
    }
    return receipt;
  }

  async update(
    id: string,
    updateReceiptDto: UpdateReceiptDto,
  ): Promise<Receipt> {
    const { merchant_id, ...rest } = updateReceiptDto;
    const updateData: any = { ...rest };
    if (merchant_id !== undefined) {
      updateData.merchant = { id: merchant_id };
    }
    await this.receiptRepository.update(id, updateData);
    const receipt = await this.receiptRepository.findOneBy({ id });
    if (!receipt) {
      throw new NotFoundException();
    }
    return receipt;
  }

  async remove(id: string): Promise<void> {
    const result = await this.receiptRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException();
    }
  }
}
