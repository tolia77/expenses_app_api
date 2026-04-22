import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptParse } from './receipt-parse.entity';
import { ReceiptParseWorkerProcessor } from './receipt-parse-worker.processor';
import { ReceiptParserModule } from '../receipt-parser/receipt-parser.module';
import { StorageModule } from '../storage/storage.module';
import { Category } from '../categories/category.entity';
import { Receipt } from '../receipts/entities/receipt.entity';

@Module({
  imports: [
    // forFeature([ReceiptParse, Category, Receipt]):
    //   - ReceiptParse — existing, processor uses it for idempotency guard + terminal update
    //   - Category     — processor loads all categories once per job (EXTRACT-03 fallback lookup)
    //   - Receipt      — processor loads the Receipt to get photo_key (FLOW-03 — Open Question #1 in RESEARCH.md)
    TypeOrmModule.forFeature([ReceiptParse, Category, Receipt]),
    BullModule.registerQueue({
      name: 'receipt-parse',
      // Single source of truth — do NOT duplicate these on per-.add() calls.
      defaultJobOptions: {
        attempts: 3, // 1 initial + 2 retries (BullMQ counts initial attempt)
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 7 * 24 * 3600 }, // age in seconds = 7 days
      },
    }),
    ReceiptParserModule, // Phase 10 — provides ReceiptParser abstract-class DI token
    StorageModule, // provides StorageService (for photo_key download in Phase 11)
  ],
  providers: [ReceiptParseWorkerProcessor],
  exports: [TypeOrmModule, BullModule],
})
export class ReceiptParseWorkerModule {}
