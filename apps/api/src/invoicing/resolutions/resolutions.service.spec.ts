import { Repository } from 'typeorm';
import { DianResolutionDocumentType } from '../../common/enums/dian-resolution-document-type.enum';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { DianResolution } from './entities/dian-resolution.entity';
import { ResolutionsService } from './resolutions.service';

describe('ResolutionsService', () => {
  let service: ResolutionsService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataicoClient: { post: jest.Mock };

  const baseDto: CreateResolutionDto = {
    documentType: DianResolutionDocumentType.INVOICE,
    prefix: 'FE',
    resolutionCode: 'SDJ-002',
    resolutionNumber: '18764075467155',
    rangeStart: 50,
    rangeEnd: 200,
    technicalKey: 'abc123',
    startDate: '2024-07-21',
    endDate: '2025-07-21',
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity as DianResolution),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: 'res-1', createdAt: new Date() }),
      ),
      createQueryBuilder: jest.fn(),
    };

    dataicoClient = { post: jest.fn().mockResolvedValue(undefined) };

    service = new ResolutionsService(
      repository as unknown as Repository<DianResolution>,
      dataicoClient as unknown as DataicoClientService,
    );
  });

  describe('create — INVOICE document type', () => {
    it('calls the invoice numbering endpoint with kebab-case fields and DD/MM/YYYY dates', async () => {
      await service.create(baseDto, 'user-1');

      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/numberings/sync_dian/invoice',
        {
          numberings: [
            {
              prefix: 'FE',
              numbering_type: 'RESOLUCIONES_DIAN',
              subtype: 'ELECTRONICO',
              dian_resolutions: [
                {
                  code: 'SDJ-002',
                  'code-msg': 'Resolución agregada correctamente',
                  number: '18764075467155',
                  start: 50,
                  end: 200,
                  'technical-key': 'abc123',
                  'start-date': '21/07/2024',
                  'end-date': '21/07/2025',
                },
              ],
            },
          ],
        },
      );
    });

    it('always sends and stores the ELECTRONICO subtype, never a caller-supplied one', async () => {
      await service.create(baseDto, 'user-1');

      const body = (
        dataicoClient.post.mock.calls as Array<[string, unknown]>
      )[0][1] as {
        numberings: Array<{ subtype: string }>;
      };
      expect(body.numberings[0].subtype).toBe('ELECTRONICO');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subtype: 'ELECTRONICO' }),
      );
    });

    it('always sends the fixed code message, whatever a client supplies', async () => {
      await service.create(
        { ...baseDto, resolutionCodeMessage: 'ignored' } as CreateResolutionDto,
        'user-1',
      );

      const body = (
        dataicoClient.post.mock.calls as Array<[string, unknown]>
      )[0][1] as {
        numberings: Array<{ dian_resolutions: Array<Record<string, unknown>> }>;
      };
      expect(body.numberings[0].dian_resolutions[0]['code-msg']).toBe(
        'Resolución agregada correctamente',
      );
    });

    it('only persists the resolution locally after Dataico accepts it', async () => {
      await service.create(baseDto, 'user-1');

      expect(dataicoClient.post).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('does not persist locally when Dataico rejects the resolution', async () => {
      dataicoClient.post.mockRejectedValue(new Error('rejected'));

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('create — SUPPORT_DOCS document type', () => {
    it('calls the support_docs numbering endpoint with snake_case fields and no technical-key', async () => {
      const dto: CreateResolutionDto = {
        ...baseDto,
        documentType: DianResolutionDocumentType.SUPPORT_DOCS,
        technicalKey: undefined,
      };

      await service.create(dto, 'user-1');

      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/numberings/sync_dian/support_docs',
        {
          numberings: [
            {
              prefix: 'FE',
              numbering_type: 'RESOLUCIONES_DIAN',
              subtype: 'ELECTRONICO',
              dian_resolutions: [
                {
                  code: 'SDJ-002',
                  code_msg: 'Resolución agregada correctamente',
                  number: '18764075467155',
                  start: 50,
                  end: 200,
                  start_date: '21/07/2024',
                  end_date: '21/07/2025',
                },
              ],
            },
          ],
        },
      );
    });
  });
});
