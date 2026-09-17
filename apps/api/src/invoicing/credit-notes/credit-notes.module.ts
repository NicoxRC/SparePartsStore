import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../../cash-register/cash-register.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { ProductsModule } from '../../products/products.module';
import { DataicoModule } from '../dataico/dataico.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { CreditNote } from './entities/credit-note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditNote]),
    DataicoModule,
    InvoicesModule,
    ProductsModule,
    InventoryModule,
    CashRegisterModule,
  ],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
})
export class CreditNotesModule {}
