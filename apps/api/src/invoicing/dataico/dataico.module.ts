import { Module } from '@nestjs/common';
import { DataicoClientService } from './dataico-client.service';
import { DataicoConfig } from './dataico.config';

/**
 * Shared Dataico HTTP client, importable directly by any invoicing
 * sub-domain module (resolutions, third-parties, invoices, ...) without
 * going through InvoicingModule — kept separate to avoid a circular
 * dependency (InvoicingModule aggregates the sub-domain modules, so it
 * can't also be something they depend on).
 */
@Module({
  providers: [DataicoConfig, DataicoClientService],
  exports: [DataicoClientService],
})
export class DataicoModule {}
