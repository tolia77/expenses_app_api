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

  async create(createMerchantDto: CreateMerchantDto) {
    const merchant = this.merchantRepository.create(createMerchantDto);
    return this.merchantRepository.save(merchant);
  }

  async findAll() {
    return this.merchantRepository.find();
  }

  async findOne(id: string) {
    const merchant = await this.merchantRepository.findOneBy({ id });
    if (!merchant) {
      throw new NotFoundException();
    }
    return merchant;
  }

  async update(id: string, updateMerchantDto: UpdateMerchantDto) {
    await this.merchantRepository.update(id, updateMerchantDto);
    const merchant = await this.merchantRepository.findOneBy({ id });
    if (!merchant) {
      throw new NotFoundException();
    }
    return merchant;
  }

  async remove(id: string) {
    const result = await this.merchantRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException();
    }
  }
}
