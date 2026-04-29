import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/dto/paginated-response.dto';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async create(
    userId: string,
    createMerchantDto: CreateMerchantDto,
  ): Promise<Merchant> {
    const merchant = this.merchantRepository.create({
      ...createMerchantDto,
      user_id: userId,
    });
    return this.merchantRepository.save(merchant);
  }

  async findAll(userId: string, pagination: PaginationDto) {
    return paginate(pagination, Merchant, (skip, take) =>
      this.merchantRepository.findAndCount({
        where: { user_id: userId },
        skip,
        take,
      }),
    );
  }

  async findOne(id: string, userId: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOneBy({
      id,
      user_id: userId,
    });
    if (!merchant) {
      throw new AppException(
        'MERCHANT_NOT_FOUND',
        'Merchant not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return merchant;
  }

  async update(
    id: string,
    userId: string,
    updateMerchantDto: UpdateMerchantDto,
  ): Promise<Merchant> {
    await this.findOne(id, userId);
    await this.merchantRepository.update(id, updateMerchantDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.merchantRepository.delete({
      id,
      user_id: userId,
    });
    if (result.affected === 0) {
      throw new AppException(
        'MERCHANT_NOT_FOUND',
        'Merchant not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
