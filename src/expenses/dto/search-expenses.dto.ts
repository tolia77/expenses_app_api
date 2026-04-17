import { IsOptional, IsString } from 'class-validator';

export class SearchExpensesDto {
  @IsOptional()
  @IsString()
  search?: string;
}
