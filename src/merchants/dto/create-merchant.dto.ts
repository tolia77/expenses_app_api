import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  other_details?: object;
}
