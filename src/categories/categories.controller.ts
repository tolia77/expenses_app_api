import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.categoriesService.findAll(pagination);
  }
}
