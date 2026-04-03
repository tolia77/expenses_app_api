import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CategoriesService } from './categories.service';

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
    async createCategory() {
        return this.categoriesService.create('New Category');
    }

    @Put(':id')
    async updateCategory(@Param('id') id: number, @Body() body) {
        this.categoriesService.update(id, body.name)
        return this.categoriesService.findOne(id)
    }

    @Delete('id')
    async deleteCategory(@Param('id') id: number) {
        this.categoriesService.delete(id)
    }
}
