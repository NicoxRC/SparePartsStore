import { Module } from '@nestjs/common';

/**
 * Parent module for all Dataico electronic-invoicing sub-domains — see
 * docs/ARCHITECTURE.md's "Invoicing module" section for the target folder
 * structure. Intentionally empty until a sub-domain's Dataico API reference
 * has been shared and confirmed (see docs/phases/PHASE_7_DATAICO_FOUNDATION.md
 * and CLAUDE.md — never guess Dataico endpoint paths or payload shapes).
 */
@Module({})
export class InvoicingModule {}
