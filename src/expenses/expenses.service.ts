import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expenses.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SearchExpensesDto } from './dto/search-expenses.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    private receiptsService: ReceiptsService,
    private categoriesService: CategoriesService,
  ) {}

  async findAll(
    userId: string,
    filter?: SearchExpensesDto,
  ): Promise<Expense[]> {
    const qb = this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .leftJoin('receipt.merchant', 'merchant')
      .innerJoin('expense.category', 'category')
      .where('receipt.userId = :userId', { userId });

    if (filter?.search && filter.search.trim() !== '') {
      qb.andWhere(
        '(expense.name ILIKE :term OR merchant.name ILIKE :term OR category.name ILIKE :term)',
        { term: `%${filter.search}%` },
      );
    }

    return qb.getMany();
  }

  async create(
    receiptId: string,
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<Expense> {
    // Verify receipt ownership (throws 404 if not found/not owned)
    await this.receiptsService.findOne(receiptId, userId);

    // Verify category ownership (throws 404 if not found/not owned)
    const { category_id, ...rest } = createExpenseDto;
    await this.categoriesService.findOne(category_id, userId);

    const expense = this.expenseRepository.create({
      ...rest,
      receiptId,
      category: { id: category_id } as any,
      categoryId: category_id,
    });
    return this.expenseRepository.save(expense);
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['receipt'],
    });
    if (!expense || expense.receipt.userId !== userId) {
      throw new NotFoundException();
    }
    return expense;
  }

  async update(
    id: string,
    userId: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOne(id, userId);
    const { category_id, ...rest } = updateExpenseDto;
    if (category_id !== undefined) {
      await this.categoriesService.findOne(category_id, userId);
      expense.category = { id: category_id } as any;
      expense.categoryId = category_id;
    }
    Object.assign(expense, rest);
    return this.expenseRepository.save(expense);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // throws 404 if not found or not owned
    await this.expenseRepository.delete(id);
  }
}
