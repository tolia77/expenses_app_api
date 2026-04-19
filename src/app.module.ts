import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AppConfigModule } from './config/config.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AnalyticsModule,
    CategoriesModule,
    ExpensesModule,
    MerchantsModule,
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
        new ClassSerializerInterceptor(reflector, {
          strategy: 'excludeAll',
          excludeExtraneousValues: true,
        }),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
