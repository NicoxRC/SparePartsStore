import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationPayment } from '../quotations/entities/quotation-payment.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

// Entities only, not QuotationsModule: the cartera reads quotations and
// writes abonos without needing QuotationsService (and its invoicing chain).
@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationPayment])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
