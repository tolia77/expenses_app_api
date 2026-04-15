import { IsNotEmpty, IsString } from 'class-validator';

export class CategoryCreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
