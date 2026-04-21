import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from './entities/receipt.entity';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { MerchantsModule } from '../merchants/merchants.module';
import { StorageModule } from '../storage/storage.module';
import { ReceiptParseModule } from '../receipt-parse/receipt-parse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt]),
    MerchantsModule,
    StorageModule,
    ReceiptParseModule, // re-exports Repository<ReceiptParse> + Queue('receipt-parse')
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
