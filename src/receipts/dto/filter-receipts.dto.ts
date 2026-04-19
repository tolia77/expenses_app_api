import { IsOptional, IsDateString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FilterReceiptsDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
