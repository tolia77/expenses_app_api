import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptParse } from './receipt-parse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReceiptParse])],
  exports: [TypeOrmModule],
})
export class ReceiptParseModule {}
