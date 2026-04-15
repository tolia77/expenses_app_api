import { IsOptional, IsDateString } from 'class-validator';

export class FilterReceiptsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
