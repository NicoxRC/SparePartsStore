import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateQuotationNoteDto {
  @ApiProperty({ example: 'Se hizo un abono de $50.000 en efectivo' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Escribe la nota.' })
  @MaxLength(1000)
  text: string;
}
