import { Injectable } from '@nestjs/common';
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
    const category = this.merchantRepository.create(createMerchantDto);
    return this.merchantRepository.save(category);
  }

  async findAll() {
    return this.merchantRepository.find();
  }

  async findOne(id: number) {
    return this.merchantRepository.findOneBy({ id });
  }

  async update(id: number, updateMerchantDto: UpdateMerchantDto) {
    await this.merchantRepository.update(id, updateMerchantDto);
    return this.merchantRepository.findOneBy({ id });
  }

  async remove(id: number) {
    await this.merchantRepository.delete(id);
  }
}
