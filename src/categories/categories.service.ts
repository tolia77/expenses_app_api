import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CategoryNotFoundError } from '../common/exceptions/domain.errors';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/dto/paginated-response.dto';
import { FALLBACK_CATEGORY_NAME } from './categories.constants';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(pagination: PaginationDto) {
    return paginate(pagination, Category, (skip, take) =>
      this.categoryRepository
        .createQueryBuilder('c')
        .orderBy('CASE WHEN c.name = :fallback THEN 1 ELSE 0 END', 'ASC')
        .addOrderBy('c.name', 'ASC')
        .setParameter('fallback', FALLBACK_CATEGORY_NAME)
        .skip(skip)
        .take(take)
        .getManyAndCount(),
    );
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return category;
  }
}
