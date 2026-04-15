import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expenses.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ReceiptsModule } from '../receipts/receipts.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    ReceiptsModule,
    CategoriesModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
