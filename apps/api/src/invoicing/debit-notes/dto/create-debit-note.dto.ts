import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateDebitNoteItemDto } from './create-debit-note-item.dto';

export class CreateDebitNoteDto {
  @ApiProperty({
    description:
      'The local invoice this note corrects — its Dataico uuid/customer data are reused, not re-typed by the caller.',
  })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ type: [CreateDebitNoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDebitNoteItemDto)
  items: CreateDebitNoteItemDto[];
}
