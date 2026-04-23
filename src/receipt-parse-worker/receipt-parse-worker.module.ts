import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptParse } from './receipt-parse.entity';
import { ReceiptParseWorkerProcessor } from './receipt-parse-worker.processor';
import { ReceiptParserModule } from '../receipt-parser/receipt-parser.module';
import { StorageModule } from '../storage/storage.module';
import { Category } from '../categories/category.entity';
import { Receipt } from '../receipts/entities/receipt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceiptParse, Category, Receipt]),
    BullModule.registerQueueAsync({
      name: 'receipt-parse',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const chain = config.get<string[]>('ai.modelChain');
        if (!chain || chain.length === 0) {
          throw new Error(
            'ai.modelChain is empty — check AI_MODEL_CHAIN env configuration',
          );
        }
        return {
          // attempts is pinned to chain.length so BullMQ's attemptsMade walks
          // 0..chain.length-1 across the retry sequence — the tier selection
          // in ReceiptParseWorkerProcessor depends on this invariant.
          defaultJobOptions: {
            attempts: chain.length,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500, age: 7 * 24 * 3600 },
          },
        };
      },
    }),
    ReceiptParserModule,
    StorageModule,
  ],
  providers: [ReceiptParseWorkerProcessor],
  exports: [TypeOrmModule, BullModule],
})
export class ReceiptParseWorkerModule {}
