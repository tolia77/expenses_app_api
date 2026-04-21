import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { AppException } from '../common/exceptions/app.exception';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated } from '../common/dto/paginated-response.dto';
import { FALLBACK_CATEGORY_NAME } from './categories.constants';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [data, total] = await this.categoryRepository
      .createQueryBuilder('c')
      .orderBy('CASE WHEN c.name = :fallback THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .setParameter('fallback', FALLBACK_CATEGORY_NAME)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const klass = Paginated(Category);
    return Object.assign(new klass(), {
      data,
      meta: { total, page, limit },
    });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new AppException(
        'CATEGORY_NOT_FOUND',
        'Category not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }
}
