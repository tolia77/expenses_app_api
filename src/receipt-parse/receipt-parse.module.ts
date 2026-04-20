import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptParse } from './receipt-parse.entity';
import { ReceiptParseProcessor } from './receipt-parse.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceiptParse]),
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
  ],
  providers: [ReceiptParseProcessor],
  exports: [TypeOrmModule, BullModule],
})
export class ReceiptParseModule {}
