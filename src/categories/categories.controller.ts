import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    async findAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    async create(@Body() categoryCreateDto: CategoryCreateDto) {
        return this.categoriesService.create(categoryCreateDto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() categoryUpdateDto: CategoryUpdateDto) {
        return this.categoriesService.update(id, categoryUpdateDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
