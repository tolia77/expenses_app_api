import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  address: string;

  @IsOptional()
  other_details: object;
}
