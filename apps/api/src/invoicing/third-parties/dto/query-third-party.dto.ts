import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QueryThirdPartyDto {
  @ApiProperty({ example: '891303834' })
  @IsString()
  @IsNotEmpty()
  identification: string;

  @ApiProperty({
    example: 'NIT',
    description:
      'Only NIT is confirmed against a real Dataico response so far — see docs/phases/PHASE_9_THIRD_PARTIES.md.',
  })
  @IsString()
  @IsNotEmpty()
  identificationType: string;
}
