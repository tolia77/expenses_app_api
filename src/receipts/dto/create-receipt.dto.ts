import {
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
  IsUUID,
} from 'class-validator';

export class CreateReceiptDto {
  @IsOptional()
  @IsUUID()
  merchant_id?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsDateString()
  purchased_at?: string;

  @IsOptional()
  @IsObject()
  other_details?: object;
}
