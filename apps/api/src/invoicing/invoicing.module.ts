import { Module } from '@nestjs/common';
import { DataicoModule } from './dataico/dataico.module';
import { ResolutionsModule } from './resolutions/resolutions.module';

/**
 * Aggregates every Dataico electronic-invoicing sub-domain — see
 * docs/ARCHITECTURE.md's "Invoicing module" section for the target folder
 * structure. Sub-domain modules (third-parties/, invoices/,
 * reception-events/, ...) are added one at a time, each once its own
 * Dataico API reference has been shared and confirmed — see
 * docs/phases/PHASE_7_DATAICO_FOUNDATION.md and CLAUDE.md (never guess
 * Dataico endpoint paths or payload shapes). This module only aggregates;
 * it holds no providers of its own so sub-domain modules can import
 * DataicoModule directly without a circular dependency.
 */
@Module({
  imports: [DataicoModule, ResolutionsModule],
})
export class InvoicingModule {}
