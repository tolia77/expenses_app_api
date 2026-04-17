import { IsIn, IsDateString, IsNotEmpty, ValidateIf } from 'class-validator';

export class AnalyticsQueryDto {
  @IsIn(['day', 'week', 'month', 'year', 'custom'])
  period: 'day' | 'week' | 'month' | 'year' | 'custom';

  @ValidateIf((o) => o.period === 'custom')
  @IsNotEmpty()
  @IsDateString()
  from?: string;

  @ValidateIf((o) => o.period === 'custom')
  @IsNotEmpty()
  @IsDateString()
  to?: string;
}
