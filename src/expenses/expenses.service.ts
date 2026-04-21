import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expenses.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SearchExpensesDto } from './dto/search-expenses.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { CategoriesService } from '../categories/categories.service';
import { AppException } from '../common/exceptions/app.exception';
import { Paginated } from '../common/dto/paginated-response.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    private receiptsService: ReceiptsService,
    private categoriesService: CategoriesService,
  ) {}

  async findAll(userId: string, filter?: SearchExpensesDto) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const qb = this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.receipt', 'receipt')
      .leftJoin('receipt.merchant', 'merchant')
      .innerJoinAndSelect('expense.category', 'category')
      .where('receipt.user_id = :userId', { userId });

    if (filter?.search && filter.search.trim() !== '') {
      qb.andWhere(
        '(expense.name ILIKE :term OR merchant.name ILIKE :term OR category.name ILIKE :term)',
        { term: `%${filter.search}%` },
      );
    }

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    const klass = Paginated(Expense);
    return Object.assign(new klass(), {
      data,
      meta: { total, page, limit },
    });
  }

  async create(
    receiptId: string,
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<Expense> {
    // Verify receipt ownership (throws 404 if not found/not owned)
    await this.receiptsService.findOne(receiptId, userId);

    // Verify category exists (global categories have no per-user ownership)
    const { category_id, ...rest } = createExpenseDto;
    await this.categoriesService.findById(category_id);

    const expense = this.expenseRepository.create({
      ...rest,
      receipt_id: receiptId,
      category: { id: category_id } as any,
      category_id: category_id,
    });
    return this.expenseRepository.save(expense);
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['receipt', 'category'],
    });
    if (!expense || expense.receipt.user_id !== userId) {
      throw new AppException(
        'EXPENSE_NOT_FOUND',
        'Expense not found',
        HttpStatus.NOT_FOUND,
      );
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
      // Verify category exists (global categories have no per-user ownership)
      await this.categoriesService.findById(category_id);
      expense.category = { id: category_id } as any;
      expense.category_id = category_id;
    }
    Object.assign(expense, rest);
    return this.expenseRepository.save(expense);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // throws 404 if not found or not owned
    await this.expenseRepository.delete(id);
  }
}
