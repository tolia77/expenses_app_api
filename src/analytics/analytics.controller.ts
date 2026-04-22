import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { TopExpensesQueryDto } from './dto/top-expenses-query.dto';
import { TimeseriesQueryDto } from './dto/timeseries-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('by-category')
  byCategory(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
    return this.analyticsService.byCategory(user.sub, dto);
  }

  @Get('by-merchant')
  byMerchant(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
    return this.analyticsService.byMerchant(user.sub, dto);
  }

  @Get('by-payment-method')
  byPaymentMethod(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
    return this.analyticsService.byPaymentMethod(user.sub, dto);
  }

  @Get('total')
  total(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
    return this.analyticsService.total(user.sub, dto);
  }

  @Get('top-expenses')
  topExpenses(@CurrentUser() user, @Query() dto: TopExpensesQueryDto) {
    return this.analyticsService.topExpenses(user.sub, dto);
  }

  @Get('timeseries')
  timeseries(@CurrentUser() user, @Query() dto: TimeseriesQueryDto) {
    return this.analyticsService.timeseries(user.sub, dto);
  }

  @Get('summary')
  summary(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
    return this.analyticsService.summary(user.sub, dto);
  }
}
