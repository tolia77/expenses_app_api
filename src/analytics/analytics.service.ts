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
      .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
      .addSelect('COUNT(*)', 'expense_count')
      .addSelect('MAX(receipt.purchased_at)', 'last_purchased_at')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    const mapped = rows.map((r) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      total: parseFloat(r.total ?? '0') || 0,
      receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
      expense_count: parseInt(r.expense_count ?? '0', 10) || 0,
      last_purchased_at: r.last_purchased_at
        ? new Date(r.last_purchased_at).toISOString()
        : null,
    }));

    const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

    return mapped.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      total: round2(row.total),
      receipt_count: row.receipt_count,
      expense_count: row.expense_count,
      avg_expense: row.expense_count
        ? round2(row.total / row.expense_count)
        : 0,
      share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
      last_purchased_at: row.last_purchased_at,
    }));
  }

  async byMerchant(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = getPeriodBounds(dto);
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .leftJoin('receipt.merchant', 'merchant')
      .select('merchant.id', 'merchant_id')
      .addSelect('merchant.name', 'merchant_name')
      .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
      .addSelect('MAX(receipt.purchased_at)', 'last_purchased_at')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .groupBy('merchant.id')
      .addGroupBy('merchant.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    const mapped = rows.map((r) => ({
      merchant_id: r.merchant_id ?? null,
      merchant_name: r.merchant_name ?? 'Unknown',
      total: parseFloat(r.total ?? '0') || 0,
      receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
      last_purchased_at: r.last_purchased_at
        ? new Date(r.last_purchased_at).toISOString()
        : null,
    }));

    const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

    return mapped.map((row) => ({
      merchant_id: row.merchant_id,
      merchant_name: row.merchant_name,
      total: round2(row.total),
      receipt_count: row.receipt_count,
      share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
      last_purchased_at: row.last_purchased_at,
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
