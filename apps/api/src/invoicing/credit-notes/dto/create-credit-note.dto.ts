import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateCreditNoteItemDto } from './create-credit-note-item.dto';

export class CreateCreditNoteDto {
  @ApiProperty({
    description:
      'The local invoice this note is issued against — its Dataico uuid/customer/payment data are reused, not re-typed by the caller.',
  })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({
    type: [CreateCreditNoteItemDto],
    description:
      'Every remaining line at its full remaining quantity, on an invoice with no earlier credit note, is sent as an ANULACION; anything less is a DEVOLUCION.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCreditNoteItemDto)
  items: CreateCreditNoteItemDto[];
}
