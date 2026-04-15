import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('receipts/:receiptId/expenses')
  create(
    @Param('receiptId') receiptId: string,
    @CurrentUser() user,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(receiptId, user.sub, createExpenseDto);
  }

  @Get('expenses/:id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.expensesService.findOne(id, user.sub);
  }

  @Put('expenses/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.sub, updateExpenseDto);
  }

  @Delete('expenses/:id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.expensesService.remove(id, user.sub);
  }
}
