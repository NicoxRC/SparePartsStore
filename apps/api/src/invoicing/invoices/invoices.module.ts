import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../../cash-register/cash-register.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { ProductsModule } from '../../products/products.module';
import { DataicoModule } from '../dataico/dataico.module';
import { ResolutionsModule } from '../resolutions/resolutions.module';
import { Invoice } from './entities/invoice.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    DataicoModule,
    ResolutionsModule,
    ProductsModule,
    InventoryModule,
    CashRegisterModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
