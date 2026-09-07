import { Injectable } from '@nestjs/common';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { QueryThirdPartyDto } from './dto/query-third-party.dto';
import {
  ThirdPartyResponseDto,
  type DataicoThirdPartyResponse,
} from './dto/third-party-response.dto';

@Injectable()
export class ThirdPartiesService {
  constructor(private readonly dataicoClient: DataicoClientService) {}

  async lookup(query: QueryThirdPartyDto): Promise<ThirdPartyResponseDto> {
    const params = new URLSearchParams({
      identification: query.identification,
      identification_type: query.identificationType,
    });

    const raw = await this.dataicoClient.get<DataicoThirdPartyResponse>(
      `/dian_terceros?${params.toString()}`,
    );

    return ThirdPartyResponseDto.fromDataico(raw);
  }
}
