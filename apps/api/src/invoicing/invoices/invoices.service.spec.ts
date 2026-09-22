import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../../cash-register/cash-register.service';
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
    save: jest.Mock<Promise<Invoice>, [Partial<Invoice>]>;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let numberQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };
  let dataicoClient: {
    post: jest.Mock<Promise<unknown>, [string, unknown]>;
    put: jest.Mock<Promise<unknown>, [string, unknown]>;
    get: jest.Mock<Promise<unknown>, [string]>;
  };
  let dataicoConfig: {
    accountId: string;
    sendDian: boolean;
    sendEmail: boolean;
  };
  let resolutionsService: {
    findActiveForDocumentType: jest.Mock;
    findByNumber: jest.Mock;
  };
  let productsService: { findOne: jest.Mock };
  let inventoryService: { createMovement: jest.Mock };
  let cashRegisterService: { assertOpenToday: jest.Mock };
  let configService: { get: jest.Mock };

  const product = {
    id: 'prod-1',
    reference: 'REP-001',
    description: 'Filtro de aceite',
    salePrice: 50000,
    stock: 10,
    taxExempt: false,
  } as unknown as Product;

  const baseDto: CreateInvoiceDto = {
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
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  beforeEach(() => {
    // 10am Bogotá (UTC-5) on 2026-09-07 — getStoreToday() resolves to
    // '2026-09-07', matching every hardcoded '07/09/2026' expectation below.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T15:00:00.000Z'));

    numberQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      // No prior local invoice for this prefix — falls back to
      // INVOICE_NUMBER_START, mocked below to '1225' to match every
      // existing 'FVE1225'-style expectation in this file.
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
    };
    invoicesRepository = {
      create: jest.fn<Partial<Invoice>, [Partial<Invoice>]>((entity) => entity),
      save: jest.fn<Promise<Invoice>, [Partial<Invoice>]>((entity) =>
        Promise.resolve({
          ...entity,
          id: 'inv-1',
          createdAt: new Date(),
        } as Invoice),
      ),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => numberQueryBuilder),
    };
    dataicoClient = {
      post: jest.fn<Promise<unknown>, [string, unknown]>(),
      put: jest.fn<Promise<unknown>, [string, unknown]>(),
      get: jest.fn<Promise<unknown>, [string]>(),
    };
    // The switches default to off in real config; most tests exercise the
    // "submitting" path, and the switch-off behavior has its own tests.
    dataicoConfig = {
      accountId: 'account-123',
      sendDian: true,
      sendEmail: false,
    };
    resolutionsService = {
      findActiveForDocumentType: jest.fn(),
      findByNumber: jest.fn(),
    };
    productsService = { findOne: jest.fn().mockResolvedValue(product) };
    inventoryService = {
      createMovement: jest.fn().mockResolvedValue(undefined),
    };
    cashRegisterService = {
      assertOpenToday: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) =>
        key === 'INVOICE_NUMBER_START' ? '1225' : defaultValue,
      ),
    };

    service = new InvoicesService(
      invoicesRepository as unknown as Repository<Invoice>,
      dataicoClient as unknown as DataicoClientService,
      dataicoConfig as unknown as DataicoConfig,
      resolutionsService as unknown as ResolutionsService,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
      cashRegisterService as unknown as CashRegisterService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects when there is no open cash register for today, without calling Dataico', async () => {
    cashRegisterService.assertOpenToday.mockRejectedValue(
      new BadRequestException('No hay una caja abierta para hoy.'),
    );

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it('rejects when no active INVOICE resolution exists, without calling Dataico', async () => {
    resolutionsService.findActiveForDocumentType.mockResolvedValue(null);

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it('scopes the active resolution lookup to the ELECTRONICO subtype, never just the document type', async () => {
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

    await service.create(baseDto, 'user-1');

    expect(resolutionsService.findActiveForDocumentType).toHaveBeenCalledWith(
      'invoice',
      'ELECTRONICO',
    );
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

    it('sends the create request with send_dian/send_email off when the switches are off (the default)', async () => {
      dataicoConfig.sendDian = false;
      dataicoConfig.sendEmail = false;

      await service.create(baseDto, 'user-1');

      const body = dataicoClient.post.mock.calls[0][1] as {
        actions: unknown;
        invoice: { env: string };
      };
      expect(body.actions).toEqual({ send_dian: false, send_email: false });
      expect(body.invoice.env).toBe('PRODUCCION');
    });

    it("sends tax_base as Dataico's 1-100 value (100), never the amount in pesos, while tax_amount stays the real IVA", async () => {
      await service.create(
        { ...baseDto, items: [{ productId: 'prod-1', quantity: 10 }] },
        'user-1',
      );

      const body = dataicoClient.post.mock.calls[0][1] as {
        invoice: {
          items: Array<{
            taxes: Array<{ tax_base: number; tax_amount: number }>;
          }>;
        };
      };
      const [tax] = body.invoice.items[0].taxes;
      expect(tax.tax_base).toBe(100);
      // 10 x 50000 = 500,000 with IVA -> 420,168.07 pre-tax -> the IVA is
      // the rest, 79,831.93: a real amount, not 100.
      expect(tax.tax_amount).toBe(79831.93);
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
            number: 1225,
            numbering: {
              resolution_number: '18764105397963',
              prefix: 'FVE',
              flexible: true,
            },
            items: [
              expect.objectContaining({
                sku: 'REP-001',
                description: 'Filtro de aceite',
                // salePrice (50000) already includes IVA: Dataico gets the
                // pre-tax price (50000 / 1.19 = 42016.8067) and the IVA
                // contained in 2 × 50000 (84033.61 base + 15966.39 IVA).
                price: 42016.8067,
                quantity: 2,
                taxes: [
                  {
                    tax_category: 'IVA',
                    tax_rate: 19,
                    tax_base: 100,
                    tax_amount: 15966.39,
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

    it('takes a fixed per-line discount off the IVA-included amount, then unwraps the IVA', async () => {
      await service.create(
        {
          ...baseDto,
          items: [{ productId: 'prod-1', quantity: 2, discount: 20000 }],
        },
        'user-1',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({
          invoice: expect.objectContaining({
            items: [
              expect.objectContaining({
                // 2 × 50000 = 100000 with IVA, minus the 20000 discount =
                // 80000 with IVA -> 67226.89 pre-tax, / 2 = 33613.4454 per
                // unit — price itself reflects the discount, so price ×
                // quantity on the actual invoice already equals the
                // discounted base; Dataico never sees a separate "discount"
                // field.
                price: 33613.4454,
                taxes: [
                  {
                    tax_category: 'IVA',
                    tax_rate: 19,
                    tax_base: 100,
                    tax_amount: 12773.11,
                  },
                ],
              }),
            ],
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it("charges a catalog line at unitPriceOverride instead of the product's salePrice, without touching the product", async () => {
      await service.create(
        {
          ...baseDto,
          items: [
            { productId: 'prod-1', quantity: 1, unitPriceOverride: 45000 },
          ],
        },
        'user-1',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({
          invoice: expect.objectContaining({
            items: [
              expect.objectContaining({
                // 45000 (override, IVA included), not the product's 50000
                // salePrice -> pre-tax 45000 / 1.19 = 37815.1261.
                price: 37815.1261,
                taxes: [
                  {
                    tax_category: 'IVA',
                    tax_rate: 19,
                    tax_base: 100,
                    tax_amount: 7184.87,
                  },
                ],
              }),
            ],
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(product.salePrice).toBe(50000);
    });

    it('leaves price untouched for a tax-exempt product — it only flags the "excluida" label, not a calculation', async () => {
      productsService.findOne.mockResolvedValue({
        ...product,
        taxExempt: true,
      });

      await service.create(
        {
          ...baseDto,
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
        'user-1',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({
          invoice: expect.objectContaining({
            items: [
              expect.objectContaining({
                price: 50000,
                taxes: [
                  {
                    tax_category: 'IVA',
                    tax_rate: 0,
                    tax_base: 100,
                    tax_amount: 0,
                  },
                ],
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

    describe('one-off lines (not a catalog product)', () => {
      const customLine = {
        description: 'Instalación de llantas',
        customUnitPrice: 30000,
        quantity: 2,
      };

      it('bills a typed line at its price with standard IVA, sku VARIOS, and never touches the catalog or stock', async () => {
        await service.create({ ...baseDto, items: [customLine] }, 'user-1');

        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        expect(dataicoClient.post).toHaveBeenCalledWith(
          '/invoices',
          expect.objectContaining({
            invoice: expect.objectContaining({
              items: [
                expect.objectContaining({
                  sku: 'VARIOS',
                  description: 'Instalación de llantas',
                  // 30000 typed is the sale price, IVA included:
                  // 2 × 30000 = 60000 -> 50420.17 pre-tax (25210.084 per
                  // unit) + 9579.83 IVA.
                  price: 25210.084,
                  quantity: 2,
                  taxes: [
                    expect.objectContaining({
                      tax_rate: 19,
                      tax_amount: 9579.83,
                    }),
                  ],
                }),
              ],
            }),
          }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        expect(productsService.findOne).not.toHaveBeenCalled();
        expect(inventoryService.createMovement).not.toHaveBeenCalled();
      });

      it('applies the sale discount to a one-off line and unwraps the IVA of what is left, like any product', async () => {
        await service.create(
          { ...baseDto, items: [{ ...customLine, discount: 10000 }] },
          'user-1',
        );

        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        expect(dataicoClient.post).toHaveBeenCalledWith(
          '/invoices',
          expect.objectContaining({
            invoice: expect.objectContaining({
              items: [
                expect.objectContaining({
                  // 2 × 30000 = 60000, minus 10000 = 50000 with IVA →
                  // 42016.81 pre-tax → 21008.4034 per unit; IVA 7983.19.
                  price: 21008.4034,
                  taxes: [
                    expect.objectContaining({
                      tax_rate: 19,
                      tax_amount: 7983.19,
                    }),
                  ],
                }),
              ],
            }),
          }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });

      it('rejects a line that is a product and a one-off at once, without calling Dataico', async () => {
        await expect(
          service.create(
            { ...baseDto, items: [{ ...customLine, productId: 'prod-1' }] },
            'user-1',
          ),
        ).rejects.toThrow(BadRequestException);
        expect(dataicoClient.post).not.toHaveBeenCalled();
      });

      it('rejects a line with neither a product nor a description and price', async () => {
        await expect(
          service.create({ ...baseDto, items: [{ quantity: 1 }] }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
        expect(dataicoClient.post).not.toHaveBeenCalled();
      });
    });

    it('persists the invoice with Dataico response fields mapped, excluding the xml blob', async () => {
      await service.create(baseDto, 'user-1');

      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.dianStatus).toBe('DIAN_ACEPTADO');
      expect(created.cufe).toBe('abc123');
      expect(created.dataicoUuid).toBe('dataico-uuid-1');
      // salePrice (50000) already includes IVA, so nothing is added:
      // 2 × 50000 = 100000 (84033.61 base + 15966.39 IVA).
      expect(created.totalAmount).toBe(100000);
      expect(created.responsePayload).not.toHaveProperty('xml');
    });

    it('auto-increments the number from the highest local one for this prefix, ignoring INVOICE_NUMBER_START', async () => {
      numberQueryBuilder.getRawOne.mockResolvedValue({ max: '1300' });

      await service.create(baseDto, 'user-1');

      expect(numberQueryBuilder.where).toHaveBeenCalledWith(
        'invoice.prefix = :prefix',
        { prefix: 'FVE' },
      );
      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.number).toBe(1301);
    });

    it('falls back to INVOICE_NUMBER_START when nothing is recorded locally yet for this prefix', async () => {
      numberQueryBuilder.getRawOne.mockResolvedValue({ max: null });

      await service.create(baseDto, 'user-1');

      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.number).toBe(1225);
    });

    it("defaults issueDate to the store's current day, never client-supplied", async () => {
      await service.create(baseDto, 'user-1');

      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.issueDate).toBe('2026-09-07');
    });

    it('defaults paymentDate to issueDate when not given (only meaningful for CREDITO)', async () => {
      const { paymentDate: _paymentDate, ...dtoWithoutPaymentDate } = baseDto;
      void _paymentDate;

      await service.create(dtoWithoutPaymentDate, 'user-1');

      const created = invoicesRepository.create.mock.calls[0][0];
      expect(created.paymentDate).toBe('2026-09-07');
    });
  });

  describe('getTicket', () => {
    it('builds the ticket from the invoice and the resolution it was numbered under', async () => {
      resolutionsService.findByNumber.mockResolvedValue({
        startDate: '2019-01-19',
        endDate: '2030-01-19',
        rangeStart: 1,
        rangeEnd: 1900000000,
      });
      invoicesRepository.findOne.mockResolvedValue({
        id: 'inv-1',
        number: 1789500028,
        prefix: 'FEE',
        dataicoNumber: 'FEE1789500028',
        resolutionNumber: '18760000001',
        customerIdentificationType: 'CC',
        customerIdentification: '79456123',
        customerEmail: 'c@example.com',
        issueDate: '2026-09-21',
        paymentDate: '2026-09-21',
        totalAmount: 172550,
        dianStatus: null,
        cufe: null,
        qrCode: null,
        requestPayload: null,
        responsePayload: null,
        createdAt: new Date('2026-09-21T18:03:48.000Z'),
      });

      const ticket = await service.getTicket('inv-1');

      expect(resolutionsService.findByNumber).toHaveBeenCalledWith(
        'FEE',
        '18760000001',
      );
      expect(ticket.authorization?.rangeEnd).toBe(1900000000);
    });

    it('404s when the invoice does not exist', async () => {
      invoicesRepository.findOne.mockResolvedValue(null);

      await expect(service.getTicket('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      invoicesRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resend', () => {
    const existingInvoice = {
      id: 'inv-1',
      dataicoUuid: 'dataico-uuid-1',
      dataicoNumber: 'FVE1225',
      createdAt: new Date(),
    } as unknown as Invoice;

    it('rejects when the invoice has no Dataico uuid on file', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        ...existingInvoice,
        dataicoUuid: null,
      });

      await expect(service.resend('inv-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(dataicoClient.put).not.toHaveBeenCalled();
    });

    it('PUTs to /invoices/{dataicoUuid} with the confirmed actions-only body', async () => {
      invoicesRepository.findOne.mockResolvedValue({ ...existingInvoice });
      invoicesRepository.save.mockImplementation((entity: Partial<Invoice>) =>
        Promise.resolve(entity as Invoice),
      );
      dataicoClient.put.mockResolvedValue({
        dian_status: 'DIAN_ACEPTADO',
        cufe: 'new-cufe',
      });

      dataicoConfig.sendEmail = true;

      await service.resend('inv-1', { sendDian: true, sendEmail: true });

      expect(dataicoClient.put).toHaveBeenCalledWith(
        '/invoices/dataico-uuid-1',
        { actions: { send_dian: true, send_email: true } },
      );
    });

    describe('DATAICO_SEND_* switches act as a ceiling', () => {
      beforeEach(() => {
        invoicesRepository.findOne.mockResolvedValue({ ...existingInvoice });
        invoicesRepository.save.mockImplementation((entity: Partial<Invoice>) =>
          Promise.resolve(entity as Invoice),
        );
        dataicoClient.put.mockResolvedValue({ dian_status: 'X' });
      });

      it('never submits to the DIAN or emails while both switches are off, even if the request asks to', async () => {
        dataicoConfig.sendDian = false;
        dataicoConfig.sendEmail = false;

        await service.resend('inv-1', { sendDian: true, sendEmail: true });

        expect(dataicoClient.put).toHaveBeenCalledWith(
          '/invoices/dataico-uuid-1',
          { actions: { send_dian: false, send_email: false } },
        );
      });

      it('with the DIAN switch on, a resend defaults to submitting (the usual reason to resend)', async () => {
        dataicoConfig.sendDian = true;

        await service.resend('inv-1', {});

        expect(dataicoClient.put).toHaveBeenCalledWith(
          '/invoices/dataico-uuid-1',
          { actions: { send_dian: true, send_email: false } },
        );
      });

      it('a switch that is on still lets the request opt out', async () => {
        dataicoConfig.sendDian = true;

        await service.resend('inv-1', { sendDian: false });

        expect(dataicoClient.put).toHaveBeenCalledWith(
          '/invoices/dataico-uuid-1',
          { actions: { send_dian: false, send_email: false } },
        );
      });
    });

    it('updates the existing row in place rather than creating a new one', async () => {
      invoicesRepository.findOne.mockResolvedValue({ ...existingInvoice });
      invoicesRepository.save.mockImplementation((entity: Partial<Invoice>) =>
        Promise.resolve(entity as Invoice),
      );
      dataicoClient.put.mockResolvedValue({ dian_status: 'DIAN_ACEPTADO' });

      await service.resend('inv-1', {});

      expect(invoicesRepository.create).not.toHaveBeenCalled();
      const saved = invoicesRepository.save.mock.calls[0][0] as Invoice;
      expect(saved.id).toBe('inv-1');
      expect(saved.dianStatus).toBe('DIAN_ACEPTADO');
    });
  });

  describe('refreshStatus', () => {
    it('rejects when the invoice has no Dataico number on file', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'inv-1',
        dataicoNumber: null,
      });

      await expect(service.refreshStatus('inv-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(dataicoClient.get).not.toHaveBeenCalled();
    });

    it('queries /invoices?number= using the stored dataicoNumber', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'inv-1',
        dataicoNumber: 'FVE1225',
        createdAt: new Date(),
      });
      invoicesRepository.save.mockImplementation((entity: Partial<Invoice>) =>
        Promise.resolve(entity as Invoice),
      );
      dataicoClient.get.mockResolvedValue({ dian_status: 'DIAN_ACEPTADO' });

      await service.refreshStatus('inv-1');

      expect(dataicoClient.get).toHaveBeenCalledWith(
        '/invoices?number=FVE1225',
      );
    });
  });
});
