import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>
    ) {}

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.find();
    }

    async create(categoryCreateDto: CategoryCreateDto): Promise<Category> {
        const category = this.categoryRepository.create(categoryCreateDto);
        return this.categoryRepository.save(category);
    }

    async findOne(id: number): Promise<Category | null> {
        return this.categoryRepository.findOneBy({ id });
    }

    async update(id: number, categoryUpdateDto: CategoryUpdateDto) : Promise<Category | null> {
        await this.categoryRepository.update(id, categoryUpdateDto);
        return this.categoryRepository.findOneBy({ id });
    }

    async delete(id: number): Promise<void> {
        await this.categoryRepository.delete(id);
    }
}
