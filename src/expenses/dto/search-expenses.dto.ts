import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class SearchExpensesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
