import { ApiProperty } from '@nestjs/swagger';
import { DianResolutionDocumentType } from '../../../common/enums/dian-resolution-document-type.enum';
import { DianResolution } from '../entities/dian-resolution.entity';

export class ResolutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DianResolutionDocumentType })
  documentType: DianResolutionDocumentType;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  subtype: string;

  @ApiProperty()
  resolutionCode: string;

  @ApiProperty({ nullable: true })
  resolutionCodeMessage: string | null;

  @ApiProperty()
  resolutionNumber: string;

  @ApiProperty()
  rangeStart: number;

  @ApiProperty()
  rangeEnd: number;

  @ApiProperty({ nullable: true })
  technicalKey: string | null;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  createdAt: string;

  static fromEntity(resolution: DianResolution): ResolutionResponseDto {
    const dto = new ResolutionResponseDto();
    dto.id = resolution.id;
    dto.documentType = resolution.documentType;
    dto.prefix = resolution.prefix;
    dto.subtype = resolution.subtype;
    dto.resolutionCode = resolution.resolutionCode;
    dto.resolutionCodeMessage = resolution.resolutionCodeMessage;
    dto.resolutionNumber = resolution.resolutionNumber;
    dto.rangeStart = resolution.rangeStart;
    dto.rangeEnd = resolution.rangeEnd;
    dto.technicalKey = resolution.technicalKey;
    dto.startDate = resolution.startDate;
    dto.endDate = resolution.endDate;
    dto.createdAt = resolution.createdAt.toISOString();
    return dto;
  }
}
