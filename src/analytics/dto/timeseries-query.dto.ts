import { IsOptional, IsIn } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TimeseriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  granularity?: 'hour' | 'day' | 'week' | 'month';
}
