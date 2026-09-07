import { Module } from '@nestjs/common';
import { DataicoClientService } from './dataico/dataico-client.service';
import { DataicoConfig } from './dataico/dataico.config';

/**
 * Parent module for all Dataico electronic-invoicing sub-domains — see
 * docs/ARCHITECTURE.md's "Invoicing module" section for the target folder
 * structure. Only the shared Dataico client/config live here so far;
 * sub-domain modules (resolutions/, third-parties/, invoices/,
 * reception-events/, ...) are added one at a time, each once its own
 * Dataico API reference has been shared and confirmed — see
 * docs/phases/PHASE_7_DATAICO_FOUNDATION.md and CLAUDE.md (never guess
 * Dataico endpoint paths or payload shapes).
 */
@Module({
  providers: [DataicoConfig, DataicoClientService],
  exports: [DataicoClientService],
})
export class InvoicingModule {}
