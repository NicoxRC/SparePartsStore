import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** See QuotationsService.merge(). */
export class MergeQuotationsDto {
  @ApiProperty({
    type: [String],
    description:
      'Every open quotation to join, all of the same customer. They are folded into the oldest one.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('all', { each: true })
  quotationIds: string[];
}
