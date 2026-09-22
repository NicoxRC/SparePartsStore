import { ApiProperty } from '@nestjs/swagger';

/**
 * Dataico's raw response shape for GET /dian_terceros — confirmed against
 * real lookups of both kinds (see docs/phases/PHASE_9_THIRD_PARTIES.md).
 * A NIT returns `company_name`; a CC (persona natural) returns
 * `first_name`/`family_name`/`second_last_name` instead — Colombian
 * identification carries two surnames, and Dataico keeps them as two
 * separate fields rather than one combined `family_name`.
 */
export interface DataicoThirdPartyResponse {
  identification: string;
  identification_type: string;
  company_name?: string;
  email?: string;
  first_name?: string;
  family_name?: string;
  second_last_name?: string;
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

  @ApiProperty({ required: false })
  secondLastName?: string;

  static fromDataico(raw: DataicoThirdPartyResponse): ThirdPartyResponseDto {
    const dto = new ThirdPartyResponseDto();
    dto.identification = raw.identification;
    dto.identificationType = raw.identification_type;
    dto.companyName = raw.company_name;
    dto.email = raw.email;
    dto.firstName = raw.first_name;
    dto.familyName = raw.family_name;
    dto.secondLastName = raw.second_last_name;
    return dto;
  }
}
