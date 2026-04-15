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

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async create(categoryCreateDto: CategoryCreateDto): Promise<Category> {
    const category = this.categoryRepository.create(categoryCreateDto);
    return this.categoryRepository.save(category);
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  async update(
    id: string,
    categoryUpdateDto: CategoryUpdateDto,
  ): Promise<Category> {
    await this.categoryRepository.update(id, categoryUpdateDto);
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException();
    }
  }
}
