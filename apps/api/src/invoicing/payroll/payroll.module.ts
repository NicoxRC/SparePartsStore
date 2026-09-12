import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataicoModule } from '../dataico/dataico.module';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollEntry]), DataicoModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
