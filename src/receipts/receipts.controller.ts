import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { FilterReceiptsDto } from './dto/filter-receipts.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body() createReceiptDto: CreateReceiptDto,
  ) {
    return this.receiptsService.create(user.sub, createReceiptDto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() filter: FilterReceiptsDto) {
    return this.receiptsService.findAll(user.sub, filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.receiptsService.findOne(id, user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, user.sub, updateReceiptDto);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadPhoto(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.receiptsService.uploadPhoto(id, user.sub, file);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.receiptsService.removePhoto(id, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.receiptsService.remove(id, user.sub);
  }
}
