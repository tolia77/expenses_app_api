import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AppConfigModule } from './config/config.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ReceiptParseModule } from './receipt-parse/receipt-parse.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WhitelistSerializerInterceptor } from './common/interceptors/whitelist-serializer.interceptor';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          maxRetriesPerRequest: null, // REQUIRED by BullMQ workers — without this, blocking commands throw
        },
      }),
    }),
    AnalyticsModule,
    CategoriesModule,
    ExpensesModule,
    MerchantsModule,
    ReceiptParseModule,
    ReceiptsModule,
    StorageModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new WhitelistSerializerInterceptor(reflector, {
          strategy: 'excludeAll',
          excludeExtraneousValues: true,
        }),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
