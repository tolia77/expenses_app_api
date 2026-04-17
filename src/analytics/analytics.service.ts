import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../expenses/expenses.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async byCategory(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = this.getPeriodBounds(dto);
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .innerJoin('expense.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .where('receipt.userId = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      total: parseFloat(r.total ?? '0') || 0,
    }));
  }

  async total(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = this.getPeriodBounds(dto);
    const row = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .select('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .where('receipt.userId = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return { total: parseFloat(row?.total ?? '0') || 0 };
  }

  private getPeriodBounds(dto: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    switch (dto.period) {
      case 'day': {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'week': {
        const day = now.getUTCDay(); // 0=Sunday
        const start = new Date(now);
        start.setUTCDate(now.getUTCDate() - day);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 6);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'month': {
        const start = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
        );
        const end = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        );
        return { start, end };
      }
      case 'year': {
        const start = new Date(
          Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0),
        );
        const end = new Date(
          Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
        );
        return { start, end };
      }
      case 'custom': {
        return {
          start: new Date(dto.from + 'T00:00:00.000Z'),
          end: new Date(dto.to + 'T23:59:59.999Z'),
        };
      }
    }
  }
}
