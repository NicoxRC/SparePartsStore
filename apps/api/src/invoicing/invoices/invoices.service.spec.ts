import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { ResolutionsService } from '../resolutions/resolutions.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoicesRepository: {
    create: jest.Mock<Partial<Invoice>, [Partial<Invoice>]>;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };
  let dataicoClient: { post: jest.Mock<Promise<unknown>, [string, unknown]> };
  let dataicoConfig: { accountId: string };
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

  const baseDto: CreateInvoiceDto = {
    number: 1225,
    issueDate: '2026-09-07',
    paymentDate: '2026-09-07',
    paymentMeans: 'BANK_TRANSFER',
    paymentMeansType: 'DEBITO',
    customerIdentificationType: 'NIT',
    customerIdentification: '830033494',
    customerPartyType: 'PERSONA_JURIDICA',
    customerTaxLevelCode: 'COMUN',
    customerCompanyName: 'ACME S.A.S',
    customerCountryCode: 'CO',
    customerDepartment: '11',
    customerCity: '001',
    customerAddressLine: 'CL 1 # 2-3',
    customerEmail: 'cliente@acme.com',
    items: [{ productId: 'prod-1', quantity: 2, taxRate: 19 }],
  };

  beforeEach(() => {
    invoicesRepository = {
      create: jest.fn<Partial<Invoice>, [Partial<Invoice>]>((entity) => entity),
      save: jest.fn((entity: Partial<Invoice>) =>
        Promise.resolve({ ...entity, id: 'inv-1', createdAt: new Date() }),
      ),
      findAndCount: jest.fn(),
    };
    dataicoClient = { post: jest.fn<Promise<unknown>, [string, unknown]>() };
    dataicoConfig = { accountId: 'account-123' };
    resolutionsService = { findActiveForDocumentType: jest.fn() };
    productsService = { findOne: jest.fn().mockResolvedValue(product) };
    inventoryService = {
      createMovement: jest.fn().mockResolvedValue(undefined),
    };

    service = new InvoicesService(
      invoicesRepository as unknown as Repository<Invoice>,
      dataicoClient as unknown as DataicoClientService,
      dataicoConfig as unknown as DataicoConfig,
      resolutionsService as unknown as ResolutionsService,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
    );
  });

  it('rejects when no active INVOICE resolution exists, without calling Dataico', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue(null);

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it('rejects on insufficient stock, without calling Dataico', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue({
      resolutionNumber: 'RES-1',
      prefix: 'FVE',
    });
    productsService.findOne.mockResolvedValue({ ...product, stock: 1 });

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    beforeEach(() => {
      resolutionsService.findActiveForDocumentType.mockResolvedValue({
        resolutionNumber: '18764105397963',
        prefix: 'FVE',
      });
      dataicoClient.post.mockResolvedValue({
        number: 'FVE1225',
        dian_status: 'DIAN_ACEPTADO',
        cufe: 'abc123',
        uuid: 'dataico-uuid-1',
        xml_url: 'https://app.dataico.com/xml',
        pdf_url: 'https://app.dataico.com/pdf',
        xml: 'huge-base64-blob-not-to-be-persisted',
      });
    });

    it('sends the invoice to Dataico with the confirmed field names and computed tax', async () => {
      await service.create(baseDto, 'user-1');

      // jest's expect.objectContaining() types as `any`, which is unavoidable
      // when nesting it inside another object literal like this.
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({
          actions: { send_dian: true, send_email: false },
          invoice: expect.objectContaining({
            dataico_account_id: 'account-123',
            operation: 'ESTANDAR',
            invoice_type_code: 'FACTURA_VENTA',
            issue_date: '07/09/2026',
            numbering: {
              resolution_number: '18764105397963',
              prefix: 'FVE',
              flexible: true,
            },
            items: [
              expect.objectContaining({
                sku: 'REP-001',
                description: 'Filtro de aceite',
                price: 50000,
                quantity: 2,
                taxes: [
                  {
                    tax_category: 'IVA',
                    tax_rate: 19,
                    tax_base: 100000,
                    tax_amount: 19000,
                  },
                ],
                retentions: [],
              }),
            ],
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('decrements stock for each item only after Dataico accepts the invoice', async () => {
      await service.create(baseDto, 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: -2 }),
        'user-1',
      );
    });

    it('persists the invoice with Dataico response fields mapped, excluding the xml blob', async () => {
      await service.create(baseDto, 'user-1');

      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.dianStatus).toBe('DIAN_ACEPTADO');
      expect(created.cufe).toBe('abc123');
      expect(created.dataicoUuid).toBe('dataico-uuid-1');
      expect(created.totalAmount).toBe(119000);
      expect(created.responsePayload).not.toHaveProperty('xml');
    });
  });
});
