import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

/**
 * Imports `Invoice`/`Quotation` directly (not `InvoicesModule`/
 * `QuotationsModule`) purely to read a customer's purchase history —
 * same reasoning as `CashRegisterModule`. There's no FK from either table
 * to `customers` (see docs/GLOSSARY.md), so the history lookup matches on
 * `(customer_identification_type, customer_identification)` instead.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Customer, Invoice, Quotation])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
