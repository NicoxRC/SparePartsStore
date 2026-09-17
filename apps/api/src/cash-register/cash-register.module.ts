import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashMovement } from './entities/cash-movement.entity';
import { CashRegister } from './entities/cash-register.entity';

/**
 * Local bookkeeping, not a Dataico integration — sits at the top level
 * alongside `customers/`, not under `invoicing/`, same reasoning as that
 * module (see docs/ARCHITECTURE.md). Also imports `Invoice`/`Quotation`
 * directly (not `InvoicesModule`/`QuotationsModule`) purely to read the
 * daily-total aggregates — see the note in `cash-register.service.ts`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CashRegister, CashMovement, Invoice, Quotation]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
