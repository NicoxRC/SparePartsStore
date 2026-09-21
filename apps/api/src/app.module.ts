import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { GroupsModule } from './groups/groups.module';
import { InventoryModule } from './inventory/inventory.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { ProductsModule } from './products/products.module';
import { PurchaseImportsModule } from './purchase-imports/purchase-imports.module';
import { QuotationsModule } from './quotations/quotations.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    CustomersModule,
    DepartmentsModule,
    GroupsModule,
    BrandsModule,
    InventoryModule,
    CashRegisterModule,
    InvoicingModule,
    QuotationsModule,
    DashboardModule,
    SuppliersModule,
    PurchaseImportsModule,
  ],
})
export class AppModule {}
