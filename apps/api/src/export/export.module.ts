import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
