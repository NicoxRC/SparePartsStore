import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { ResolutionsService } from '../resolutions/resolutions.service';
import { CreatePosInvoiceDto } from './dto/create-pos-invoice.dto';
import { PosInvoice } from './entities/pos-invoice.entity';
import { PosInvoicesService } from './pos-invoices.service';

describe('PosInvoicesService', () => {
  let service: PosInvoicesService;
  let posInvoicesRepository: {
    create: jest.Mock<Partial<PosInvoice>, [Partial<PosInvoice>]>;
    save: jest.Mock<Promise<PosInvoice>, [Partial<PosInvoice>]>;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
  };
  let dataicoClient: {
    post: jest.Mock<Promise<unknown>, [string, unknown, string?]>;
    get: jest.Mock<Promise<unknown>, [string, string?]>;
  };
  let dataicoConfig: { posBaseUrl: string };
  let resolutionsService: { findActiveForDocumentType: jest.Mock };
  let productsService: { findOne: jest.Mock };
  let inventoryService: { createMovement: jest.Mock };

  const product = {
    id: 'prod-1',
    reference: 'REP-001',
    description: 'Filtro de aceite',
    salePrice: 50000,
    stock: 10,
  } as unknown as Product;

  const baseDto: CreatePosInvoiceDto = {
    number: 300002,
    issueDate: '2026-09-07',
    paymentMeansCode: 'CASH',
    paymentMeansType: 'DEBITO',
    customerType: 'NATURAL',
    customerIdentificationType: 'CC',
    customerIdentification: '11111',
    customerFirstName: 'CLIENTE',
    customerFamilyName: 'MOSTRADOR',
    customerEmail: 'noaplica@gmail.com',
    responsableIva: false,
    items: [{ productId: 'prod-1', quantity: 1, taxRate: 19 }],
  };

  beforeEach(() => {
    posInvoicesRepository = {
      create: jest.fn<Partial<PosInvoice>, [Partial<PosInvoice>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<PosInvoice>, [Partial<PosInvoice>]>((entity) =>
        Promise.resolve({
          ...entity,
          id: 'pos-1',
          createdAt: new Date(),
        } as PosInvoice),
      ),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    dataicoClient = {
      post: jest.fn<Promise<unknown>, [string, unknown, string?]>(),
      get: jest.fn<Promise<unknown>, [string, string?]>(),
    };
    dataicoConfig = {
      posBaseUrl: 'https://staging.dataico.com/direct/dataico_api/v2',
    };
    resolutionsService = { findActiveForDocumentType: jest.fn() };
    productsService = { findOne: jest.fn().mockResolvedValue(product) };
    inventoryService = {
      createMovement: jest.fn().mockResolvedValue(undefined),
    };

    service = new PosInvoicesService(
      posInvoicesRepository as unknown as Repository<PosInvoice>,
      dataicoClient as unknown as DataicoClientService,
      dataicoConfig as unknown as DataicoConfig,
      resolutionsService as unknown as ResolutionsService,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
    );
  });

  it('rejects when no active POS resolution exists, without calling Dataico', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue(null);

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it('looks up the resolution by INVOICE document type + POS subtype specifically', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue({
      resolutionNumber: '18764000000000',
      prefix: 'POSE',
    });
    dataicoClient.post.mockResolvedValue({});

    await service.create(baseDto, 'user-1');

    expect(resolutionsService.findActiveForDocumentType).toHaveBeenCalledWith(
      'invoice',
      'POS',
    );
  });

  it('rejects on insufficient stock, without calling Dataico', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue({
      resolutionNumber: '18764000000000',
      prefix: 'POSE',
    });
    productsService.findOne.mockResolvedValue({ ...product, stock: 0 });

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    beforeEach(() => {
      resolutionsService.findActiveForDocumentType.mockResolvedValue({
        resolutionNumber: '18764000000000',
        prefix: 'POSE',
      });
      dataicoClient.post.mockResolvedValue({
        number: 'POSE300002',
        dian_status: 'DIAN_ACEPTADO',
        cufe: 'pos-cufe',
      });
    });

    it('sends the confirmed POS payload shape to the POS base URL, not the main one', async () => {
      await service.create(baseDto, 'user-1');

      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/pos-invoices',
        expect.objectContaining({
          number: 300002,
          'send-dian': true,
          'send-email': false,
          'dian-resolution': { number: '18764000000000' },
          numbering: { prefix: 'POSE' },
          'payment-means': [
            { code: 'CASH', type: 'DEBITO', date: '07/09/2026' },
          ],
          customer: expect.objectContaining({
            identification_type: 'CC',
            first_name: 'CLIENTE',
            family_name: 'MOSTRADOR',
            'responsable-iva': false,
          }) as unknown,
        }),
        'https://staging.dataico.com/direct/dataico_api/v2',
      );
    });

    it('sends items with the nested product object and precise-rate tax shape', async () => {
      await service.create(baseDto, 'user-1');

      const [, body] = dataicoClient.post.mock.calls[0];
      const items = (body as { items: unknown[] }).items;
      expect(items).toEqual([
        expect.objectContaining({
          product: { sku: 'REP-001', description: 'Filtro de aceite' },
          quantity: 1,
          price: 50000,
          taxes: [{ category: 'IVA', 'precise-rate': 19 }],
        }),
      ]);
    });

    it('decrements stock only after Dataico accepts the document', async () => {
      await service.create(baseDto, 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: -1 }),
        'user-1',
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the POS invoice does not exist', async () => {
      posInvoicesRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshStatus', () => {
    it('queries the POS base URL by dataicoNumber', async () => {
      posInvoicesRepository.findOne.mockResolvedValue({
        id: 'pos-1',
        dataicoNumber: 'POSE300002',
        createdAt: new Date(),
      });
      dataicoClient.get.mockResolvedValue({ dian_status: 'DIAN_ACEPTADO' });

      await service.refreshStatus('pos-1');

      expect(dataicoClient.get).toHaveBeenCalledWith(
        '/pos-invoices?number=POSE300002',
        'https://staging.dataico.com/direct/dataico_api/v2',
      );
    });
  });
});
