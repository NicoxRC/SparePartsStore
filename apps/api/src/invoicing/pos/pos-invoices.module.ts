import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../../inventory/inventory.module';
import { ProductsModule } from '../../products/products.module';
import { DataicoModule } from '../dataico/dataico.module';
import { ResolutionsModule } from '../resolutions/resolutions.module';
import { PosInvoice } from './entities/pos-invoice.entity';
import { PosInvoicesController } from './pos-invoices.controller';
import { PosInvoicesService } from './pos-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosInvoice]),
    DataicoModule,
    ResolutionsModule,
    ProductsModule,
    InventoryModule,
  ],
  controllers: [PosInvoicesController],
  providers: [PosInvoicesService],
})
export class PosInvoicesModule {}
