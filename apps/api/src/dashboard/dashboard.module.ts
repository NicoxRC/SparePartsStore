import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Local, read-only reporting for the admin panel — not a Dataico
 * integration, no business logic of its own. Sits at the top level, same
 * as `cash-register/`/`customers/`. Imports `Invoice`/`Quotation`/
 * `Product` entities directly (not their modules) purely to read
 * aggregates, same narrow exception `CashRegisterModule` already
 * documents. Imports the whole `CashRegisterModule` (not just its
 * entities) because it reuses `CashRegisterService.getTodayStatus()`
 * outright instead of re-deriving the store-day cash logic — safe here
 * since nothing depends on `DashboardModule` back.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Quotation, Product]),
    CashRegisterModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
