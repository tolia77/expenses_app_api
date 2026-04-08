import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AppConfigModule } from './config/config.module';
import { CategoriesModule } from './categories/categories.module';
import { MerchantsModule } from './merchants/merchants.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, CategoriesModule, MerchantsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
