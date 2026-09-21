import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PurchaseImportItem } from './entities/purchase-import-item.entity';
import { PurchaseImport } from './entities/purchase-import.entity';
import { PurchaseSheetParser } from './excel/purchase-sheet.parser';
import { PurchaseImportsController } from './purchase-imports.controller';
import { PurchaseImportsService } from './purchase-imports.service';
import { PurchaseInvoiceXmlParser } from './xml/purchase-invoice-xml.parser';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseImport,
      PurchaseImportItem,
      Product,
      Department,
      Group,
      Brand,
    ]),
    SuppliersModule,
    ProductsModule,
    InventoryModule,
  ],
  controllers: [PurchaseImportsController],
  providers: [
    PurchaseImportsService,
    PurchaseInvoiceXmlParser,
    PurchaseSheetParser,
  ],
})
export class PurchaseImportsModule {}
