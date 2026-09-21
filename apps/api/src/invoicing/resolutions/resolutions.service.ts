import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DianResolutionDocumentType } from '../../common/enums/dian-resolution-document-type.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { QueryResolutionsDto } from './dto/query-resolutions.dto';
import { ResolutionResponseDto } from './dto/resolution-response.dto';
import { DianResolution } from './entities/dian-resolution.entity';
import {
  ELECTRONIC_SUBTYPE,
  RESOLUTION_CODE_MESSAGE,
} from './resolution.constants';

const NUMBERING_SYNC_PATHS: Record<DianResolutionDocumentType, string> = {
  [DianResolutionDocumentType.INVOICE]: '/numberings/sync_dian/invoice',
  [DianResolutionDocumentType.SUPPORT_DOCS]:
    '/numberings/sync_dian/support_docs',
};

@Injectable()
export class ResolutionsService {
  constructor(
    @InjectRepository(DianResolution)
    private readonly resolutionsRepository: Repository<DianResolution>,
    private readonly dataicoClient: DataicoClientService,
  ) {}

  async create(
    dto: CreateResolutionDto,
    createdById: string,
  ): Promise<ResolutionResponseDto> {
    const path = NUMBERING_SYNC_PATHS[dto.documentType];
    const body = this.buildDataicoBody(dto);

    // Only persist locally once Dataico has actually accepted this
    // resolution — never record one "on file" that was rejected.
    await this.dataicoClient.post(path, body);

    const resolution = this.resolutionsRepository.create({
      documentType: dto.documentType,
      prefix: dto.prefix,
      subtype: ELECTRONIC_SUBTYPE,
      resolutionCode: dto.resolutionCode,
      resolutionNumber: dto.resolutionNumber,
      rangeStart: dto.rangeStart,
      rangeEnd: dto.rangeEnd,
      startDate: dto.startDate,
      endDate: dto.endDate,
      createdBy: { id: createdById } as DianResolution['createdBy'],
    });

    const saved = await this.resolutionsRepository.save(resolution);
    return ResolutionResponseDto.fromEntity(saved);
  }

  /**
   * The most recently synced resolution for a document type is the active
   * one — there is no separate "is active" flag, see the entity's own
   * comment. Used by InvoicesService to auto-fill an invoice's numbering
   * instead of asking the caller to re-type it every time.
   *
   * `subtype` optionally narrows further (callers pass `ELECTRONIC_SUBTYPE`).
   */
  async findActiveForDocumentType(
    documentType: DianResolutionDocumentType,
    subtype?: string,
  ): Promise<DianResolution | null> {
    return this.resolutionsRepository.findOne({
      where: subtype ? { documentType, subtype } : { documentType },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    query: QueryResolutionsDto,
  ): Promise<PaginatedResponseDto<ResolutionResponseDto>> {
    const { page, limit, documentType } = query;
    const qb = this.resolutionsRepository.createQueryBuilder('resolution');

    if (documentType) {
      qb.andWhere('resolution.documentType = :documentType', {
        documentType,
      });
    }

    qb.orderBy('resolution.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [resolutions, total] = await qb.getManyAndCount();

    return {
      data: resolutions.map((resolution) =>
        ResolutionResponseDto.fromEntity(resolution),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Builds Dataico's request body exactly as confirmed per document type —
   * see docs/phases/PHASE_8_RESOLUTIONS.md. The two types use DIFFERENT
   * field-naming conventions in the shared reference (support_docs:
   * snake_case; invoice: kebab-case) — this is intentional, not a bug, per
   * the reference as given.
   */
  private buildDataicoBody(dto: CreateResolutionDto): unknown {
    const dianResolution =
      dto.documentType === DianResolutionDocumentType.INVOICE
        ? {
            code: dto.resolutionCode,
            'code-msg': RESOLUTION_CODE_MESSAGE,
            number: dto.resolutionNumber,
            start: dto.rangeStart,
            end: dto.rangeEnd,
            'start-date': this.toDataicoDate(dto.startDate),
            'end-date': this.toDataicoDate(dto.endDate),
          }
        : {
            code: dto.resolutionCode,
            code_msg: RESOLUTION_CODE_MESSAGE,
            number: dto.resolutionNumber,
            start: dto.rangeStart,
            end: dto.rangeEnd,
            start_date: this.toDataicoDate(dto.startDate),
            end_date: this.toDataicoDate(dto.endDate),
          };

    return {
      numberings: [
        {
          prefix: dto.prefix,
          numbering_type: 'RESOLUCIONES_DIAN',
          subtype: ELECTRONIC_SUBTYPE,
          dian_resolutions: [dianResolution],
        },
      ],
    };
  }

  /** ISO 'YYYY-MM-DD' -> Dataico's confirmed 'DD/MM/YYYY' format. */
  private toDataicoDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
}
