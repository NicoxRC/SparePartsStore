import { DataicoClientService } from '../dataico/dataico-client.service';
import { QueryThirdPartyDto } from './dto/query-third-party.dto';
import { ThirdPartiesService } from './third-parties.service';

describe('ThirdPartiesService', () => {
  let service: ThirdPartiesService;
  let dataicoClient: { get: jest.Mock };

  beforeEach(() => {
    dataicoClient = { get: jest.fn() };
    service = new ThirdPartiesService(
      dataicoClient as unknown as DataicoClientService,
    );
  });

  it('builds the query string with identification_type in snake_case', async () => {
    dataicoClient.get.mockResolvedValue({
      identification: '891303834',
      identification_type: 'NIT',
      company_name: 'DATAICO S.A.S',
      email: 'facturacion-recepcion@dataico.com',
    });

    const dto: QueryThirdPartyDto = {
      identification: '891303834',
      identificationType: 'NIT',
    };

    await service.lookup(dto);

    expect(dataicoClient.get).toHaveBeenCalledWith(
      '/dian_terceros?identification=891303834&identification_type=NIT',
    );
  });

  it('maps the Dataico response to camelCase', async () => {
    dataicoClient.get.mockResolvedValue({
      identification: '891303834',
      identification_type: 'NIT',
      company_name: 'DATAICO S.A.S',
      email: 'facturacion-recepcion@dataico.com',
    });

    const result = await service.lookup({
      identification: '891303834',
      identificationType: 'NIT',
    });

    expect(result).toEqual({
      identification: '891303834',
      identificationType: 'NIT',
      companyName: 'DATAICO S.A.S',
      email: 'facturacion-recepcion@dataico.com',
      firstName: undefined,
      familyName: undefined,
    });
  });
});
