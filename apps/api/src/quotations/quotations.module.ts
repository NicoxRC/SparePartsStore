import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { InventoryModule } from '../inventory/inventory.module';
import { InvoicesModule } from '../invoicing/invoices/invoices.module';
import { ProductsModule } from '../products/products.module';
import { QuotationItem } from './entities/quotation-item.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quotation, QuotationItem]),
    ProductsModule,
    InventoryModule,
    CashRegisterModule,
    InvoicesModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
