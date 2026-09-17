import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditNote } from '../invoicing/credit-notes/entities/credit-note.entity';
import { DebitNote } from '../invoicing/debit-notes/entities/debit-note.entity';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashMovement } from './entities/cash-movement.entity';
import { CashRegister } from './entities/cash-register.entity';

/**
 * Local bookkeeping, not a Dataico integration — sits at the top level
 * alongside `customers/`, not under `invoicing/`, same reasoning as that
 * module (see docs/ARCHITECTURE.md). Also imports `Invoice`/`Quotation`/
 * `DebitNote`/`CreditNote` directly (not their own modules) purely to
 * read the daily-total aggregates and the day's issued notes — see the
 * notes in `cash-register.service.ts`. `DebitNotesModule`/
 * `CreditNotesModule` both import `CashRegisterModule` for the
 * open-register gate, so going the other way (importing their modules
 * here) would be circular.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashRegister,
      CashMovement,
      Invoice,
      Quotation,
      DebitNote,
      CreditNote,
    ]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
