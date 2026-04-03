import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    async getAllCategories() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    async getCategory(@Param('id') id: number) {
        return this.categoriesService.findOne(id)
    }

    @Post()
    async createCategory(@Body() categoryCreateDto: CategoryCreateDto) {
        return this.categoriesService.create(categoryCreateDto);
    }

    @Put(':id')
    async updateCategory(@Param('id') id: number, @Body() categoryUpdateDto: CategoryUpdateDto) {
        this.categoriesService.update(id, categoryUpdateDto)
        return this.categoriesService.findOne(id)
    }

    @Delete('id')
    async deleteCategory(@Param('id') id: number) {
        this.categoriesService.delete(id)
    }
}
