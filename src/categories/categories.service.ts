import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>
    ) {}

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.find();
    }

    async create(name: string): Promise<Category> {
        const category = this.categoryRepository.create({ name });
        return this.categoryRepository.save(category);
    }

    async findOne(id: number): Promise<Category | null> {
        return this.categoryRepository.findOneBy({ id });
    }

    async update(id: number, name:string) : Promise<Category | null> {
        await this.categoryRepository.update(id, { name} );
        return this.categoryRepository.findOneBy({ id });
    }

    async delete(id: number): Promise<void> {
        await this.categoryRepository.delete(id);
    }
}
