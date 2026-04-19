import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';
import { AppException } from '../common/exceptions/app.exception';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated } from '../common/dto/paginated-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [data, total] = await this.categoryRepository.findAndCount({
      where: { user_id: userId },
      skip: (page - 1) * limit,
      take: limit,
    });
    const klass = Paginated(Category);
    return Object.assign(new klass(), {
      data,
      meta: { total, page, limit },
    });
  }

  async create(
    userId: string,
    categoryCreateDto: CategoryCreateDto,
  ): Promise<Category> {
    const category = this.categoryRepository.create({
      ...categoryCreateDto,
      user_id: userId,
    });
    return this.categoryRepository.save(category);
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({
      id,
      user_id: userId,
    });
    if (!category) {
      throw new AppException(
        'CATEGORY_NOT_FOUND',
        'Category not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }

  async update(
    id: string,
    userId: string,
    categoryUpdateDto: CategoryUpdateDto,
  ): Promise<Category> {
    await this.findOne(id, userId);
    await this.categoryRepository.update(id, categoryUpdateDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.categoryRepository.delete({
      id,
      user_id: userId,
    });
    if (result.affected === 0) {
      throw new AppException(
        'CATEGORY_NOT_FOUND',
        'Category not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
