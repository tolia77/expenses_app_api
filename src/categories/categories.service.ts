import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(userId: string): Promise<Category[]> {
    return this.categoryRepository.find({ where: { user_id: userId } });
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
      throw new NotFoundException();
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
      throw new NotFoundException();
    }
  }
}
