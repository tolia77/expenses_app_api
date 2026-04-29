import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtUser } from 'src/auth/decorators/current-user.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  create(
    @Body() createMerchantDto: CreateMerchantDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.merchantsService.create(user.sub, createMerchantDto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() pagination: PaginationDto) {
    return this.merchantsService.findAll(user.sub, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.merchantsService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMerchantDto: UpdateMerchantDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.merchantsService.update(id, user.sub, updateMerchantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.merchantsService.remove(id, user.sub);
  }
}
