import { OmitType } from '@nestjs/swagger';
import { CreateQuotationDto } from './create-quotation.dto';

/**
 * Full replacement of a quotation's customer snapshot — the same fields
 * (and rules) as when it was created. See QuotationsService.updateCustomer().
 */
export class UpdateQuotationCustomerDto extends OmitType(CreateQuotationDto, [
  'items',
  'notes',
] as const) {}
