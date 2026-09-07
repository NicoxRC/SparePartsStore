import { ApiProperty } from '@nestjs/swagger';

/**
 * Dataico's raw response shape for GET /dian_terceros — confirmed against
 * a real NIT lookup (see docs/phases/PHASE_9_THIRD_PARTIES.md). Only
 * `identification`/`identification_type`/`company_name`/`email` are
 * confirmed; `first_name`/`family_name` for a persona natural (non-NIT)
 * lookup are a reasonable guess based on Phase 10's confirmed invoice
 * payload, NOT verified — kept optional and unused until confirmed.
 */
export interface DataicoThirdPartyResponse {
  identification: string;
  identification_type: string;
  company_name?: string;
  email?: string;
  first_name?: string;
  family_name?: string;
}

export class ThirdPartyResponseDto {
  @ApiProperty()
  identification: string;

  @ApiProperty()
  identificationType: string;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  familyName?: string;

  static fromDataico(raw: DataicoThirdPartyResponse): ThirdPartyResponseDto {
    const dto = new ThirdPartyResponseDto();
    dto.identification = raw.identification;
    dto.identificationType = raw.identification_type;
    dto.companyName = raw.company_name;
    dto.email = raw.email;
    dto.firstName = raw.first_name;
    dto.familyName = raw.family_name;
    return dto;
  }
}
