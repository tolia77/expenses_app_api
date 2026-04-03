import { IsOptional } from "class-validator";

export class CategoryUpdateDto {
    @IsOptional()
    name: string;
}