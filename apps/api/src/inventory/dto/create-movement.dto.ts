import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class CreateMovementDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @NotEquals(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes?: string;
}
