import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { FilterReceiptsDto } from './dto/filter-receipts.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  create(@CurrentUser() user, @Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.create(user.sub, createReceiptDto);
  }

  @Get()
  findAll(@CurrentUser() user, @Query() filter: FilterReceiptsDto) {
    return this.receiptsService.findAll(user.sub, filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.receiptsService.findOne(id, user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, user.sub, updateReceiptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.receiptsService.remove(id, user.sub);
  }
}
