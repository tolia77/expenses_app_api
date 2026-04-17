import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@CurrentUser() user) {
    return this.categoriesService.findAll(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.categoriesService.findOne(id, user.sub);
  }

  @Post()
  async create(
    @Body() categoryCreateDto: CategoryCreateDto,
    @CurrentUser() user,
  ) {
    return this.categoriesService.create(user.sub, categoryCreateDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() categoryUpdateDto: CategoryUpdateDto,
    @CurrentUser() user,
  ) {
    return this.categoriesService.update(id, user.sub, categoryUpdateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user) {
    return this.categoriesService.remove(id, user.sub);
  }
}
