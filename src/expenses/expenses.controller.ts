import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SearchExpensesDto } from './dto/search-expenses.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('receipts/:receiptId/expenses')
  create(
    @Param('receiptId') receiptId: string,
    @CurrentUser() user: JwtUser,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(receiptId, user.sub, createExpenseDto);
  }

  @Get('expenses')
  findAll(@CurrentUser() user: JwtUser, @Query() filter: SearchExpensesDto) {
    return this.expensesService.findAll(user.sub, filter);
  }

  @Get('expenses/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.expensesService.findOne(id, user.sub);
  }

  @Put('expenses/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.sub, updateExpenseDto);
  }

  @Delete('expenses/:id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.expensesService.remove(id, user.sub);
  }
}
