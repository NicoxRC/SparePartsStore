import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataicoModule } from '../dataico/dataico.module';
import { Invoice } from '../invoices/entities/invoice.entity';
import { DianResolution } from './entities/dian-resolution.entity';
import { ResolutionsController } from './resolutions.controller';
import { ResolutionsService } from './resolutions.service';

@Module({
  imports: [TypeOrmModule.forFeature([DianResolution, Invoice]), DataicoModule],
  controllers: [ResolutionsController],
  providers: [ResolutionsService],
  exports: [ResolutionsService],
})
export class ResolutionsModule {}
