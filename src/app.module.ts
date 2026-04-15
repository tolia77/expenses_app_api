import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AppConfigModule } from './config/config.module';
import { CategoriesModule } from './categories/categories.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, CategoriesModule, MerchantsModule, ReceiptsModule, UsersModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
