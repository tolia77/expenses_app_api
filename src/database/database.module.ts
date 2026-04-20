import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/categories/category.entity';
import { AppConfigModule } from 'src/config/config.module';
import AppDataSource from 'src/config/typeorm.config';
import { Expense } from 'src/expenses/expenses.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { ReceiptParse } from 'src/receipt-parse/receipt-parse.entity';
import { User } from 'src/users/user.entity';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [Category, Expense, Merchant, Receipt, ReceiptParse, User],
        synchronize: false,
        // Pool size headroom: worker concurrency (1) + HTTP path + future bumps.
        // Must stay >= (BullMQ worker concurrency + 2) — QUEUE-06. Bump in lockstep
        // if the @Processor concurrency arg is increased in ReceiptParseProcessor.
        extra: { max: 20 },
      }),
    }),
  ],
})
export class DatabaseModule {}
