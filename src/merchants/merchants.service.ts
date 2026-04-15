import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async create(userId: string, createMerchantDto: CreateMerchantDto): Promise<Merchant> {
    const merchant = this.merchantRepository.create({ ...createMerchantDto, userId });
    return this.merchantRepository.save(merchant);
  }

  async findAll(userId: string): Promise<Merchant[]> {
    return this.merchantRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOneBy({ id, userId });
    if (!merchant) {
      throw new NotFoundException();
    }
    return merchant;
  }

  async update(id: string, userId: string, updateMerchantDto: UpdateMerchantDto): Promise<Merchant> {
    await this.findOne(id, userId);
    await this.merchantRepository.update(id, updateMerchantDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.merchantRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException();
    }
  }
}
