import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../expenses/expenses.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { getPeriodBounds } from './util/period-bounds';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async byCategory(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = getPeriodBounds(dto);
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .innerJoin('expense.category', 'category')
      .select('category.id', 'category_id')
      .addSelect('category.name', 'category_name')
      .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    return rows.map((r) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      total: parseFloat(r.total ?? '0') || 0,
    }));
  }

  async total(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = getPeriodBounds(dto);
    const row = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .select('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return { total: parseFloat(row?.total ?? '0') || 0 };
  }
}
