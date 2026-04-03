import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/categories/category.entity';
import { AppConfigModule } from 'src/config/config.module';
import AppDataSource from 'src/config/typeorm.config';

@Module({
  imports: [AppConfigModule, TypeOrmModule.forRootAsync(AppDataSource)],
})
export class DatabaseModule {}
