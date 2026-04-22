import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../expenses/expenses.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { TopExpensesQueryDto } from './dto/top-expenses-query.dto';
import { TimeseriesQueryDto } from './dto/timeseries-query.dto';
import { getPeriodBounds, resolveGranularity } from './util/period-bounds';
import { generateBuckets, fillBuckets } from './util/timeseries-buckets';

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

  async byPaymentMethod(userId: string, dto: AnalyticsQueryDto) {
    const { start, end } = getPeriodBounds(dto);
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .select('receipt.payment_method', 'payment_method')
      .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .groupBy('receipt.payment_method')
      .orderBy('total', 'DESC')
      .getRawMany();

    const mapped = rows.map((r) => ({
      payment_method: r.payment_method ?? null,
      total: parseFloat(r.total ?? '0') || 0,
      receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
    }));

    const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

    return mapped.map((row) => ({
      payment_method: row.payment_method,
      total: round2(row.total),
      receipt_count: row.receipt_count,
      share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
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

  async topExpenses(userId: string, dto: TopExpensesQueryDto) {
    const { start, end } = getPeriodBounds(dto);
    const limit = dto.limit ?? 10;
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .innerJoin('expense.category', 'category')
      .leftJoin('receipt.merchant', 'merchant')
      .select('expense.id', 'expense_id')
      .addSelect('expense.name', 'name')
      .addSelect('expense.price * COALESCE(expense.amount, 1)', 'amount')
      .addSelect('category.name', 'category_name')
      .addSelect('merchant.name', 'merchant_name')
      .addSelect('receipt.purchased_at', 'purchased_at')
      .addSelect('receipt.id', 'receipt_id')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .orderBy('amount', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({
      expense_id: r.expense_id,
      name: r.name,
      amount: round2(parseFloat(r.amount ?? '0') || 0),
      category_name: r.category_name,
      merchant_name: r.merchant_name ?? null,
      purchased_at: r.purchased_at
        ? new Date(r.purchased_at).toISOString()
        : null,
      receipt_id: r.receipt_id,
    }));
  }

  async timeseries(userId: string, dto: TimeseriesQueryDto) {
    const bounds = getPeriodBounds(dto);
    const granularity = resolveGranularity(dto.period, dto.granularity, bounds);

    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .select(`date_trunc('${granularity}', receipt.purchased_at)`, 'bucket')
      .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', {
        start: bounds.start,
        end: bounds.end,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const bucketRows = rows.map((r) => ({
      bucket: new Date(r.bucket),
      total: round2(parseFloat(r.total ?? '0') || 0),
    }));
    const buckets = generateBuckets(bounds.start, bounds.end, granularity);
    const filled = fillBuckets(bucketRows, buckets);

    return {
      period: dto.period,
      granularity,
      buckets: filled,
    };
  }

  private async receiptAndExpenseCounts(
    userId: string,
    dto: AnalyticsQueryDto,
  ) {
    const { start, end } = getPeriodBounds(dto);
    const row = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .select('COUNT(DISTINCT receipt.id)', 'receipt_count')
      .addSelect('COUNT(expense.id)', 'expense_count')
      .where('receipt.user_id = :userId', { userId })
      .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return {
      receipt_count: parseInt(row?.receipt_count ?? '0', 10) || 0,
      expense_count: parseInt(row?.expense_count ?? '0', 10) || 0,
    };
  }

  async summary(userId: string, dto: AnalyticsQueryDto) {
    const [totalRow, counts, categories, merchants] = await Promise.all([
      this.total(userId, dto),
      this.receiptAndExpenseCounts(userId, dto),
      this.byCategory(userId, dto),
      this.byMerchant(userId, dto),
    ]);

    return {
      total: totalRow.total,
      receipt_count: counts.receipt_count,
      expense_count: counts.expense_count,
      avg_receipt_value: counts.receipt_count
        ? round2(totalRow.total / counts.receipt_count)
        : 0,
      top_categories: categories.slice(0, 3).map((c) => ({
        category_id: c.category_id,
        category_name: c.category_name,
        total: c.total,
      })),
      top_merchants: merchants.slice(0, 3).map((m) => ({
        merchant_id: m.merchant_id,
        merchant_name: m.merchant_name,
        total: m.total,
      })),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
