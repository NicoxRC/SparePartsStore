import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../../cash-register/cash-register.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { ProductsModule } from '../../products/products.module';
import { DataicoModule } from '../dataico/dataico.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { DebitNotesController } from './debit-notes.controller';
import { DebitNotesService } from './debit-notes.service';
import { DebitNote } from './entities/debit-note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DebitNote]),
    DataicoModule,
    InvoicesModule,
    ProductsModule,
    InventoryModule,
    CashRegisterModule,
  ],
  controllers: [DebitNotesController],
  providers: [DebitNotesService],
})
export class DebitNotesModule {}
