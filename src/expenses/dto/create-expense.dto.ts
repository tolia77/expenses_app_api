import { IsNotEmpty, IsString, IsUUID, IsOptional, IsObject, IsNumber } from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  category_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  unit_type?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsObject()
  other_details?: object;
}
