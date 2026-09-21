import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { DebitNotesService } from './debit-notes.service';
import { DebitNote } from './entities/debit-note.entity';

describe('DebitNotesService', () => {
  let service: DebitNotesService;
  let debitNotesRepository: {
    create: jest.Mock<Partial<DebitNote>, [Partial<DebitNote>]>;
    save: jest.Mock<Promise<DebitNote>, [Partial<DebitNote>]>;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getRawOne: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let dataicoClient: { post: jest.Mock<Promise<unknown>, [string, unknown]> };
  let dataicoConfig: {
    accountId: string;
    debitNotePrefix: string;
    sendDian: boolean;
    sendEmail: boolean;
  };
  let invoicesService: { findOne: jest.Mock };
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

  const dataicoCustomer = {
    tax_level_code: 'COMUN',
    party_type: 'PERSONA_JURIDICA',
    party_identification_type: 'NIT',
    party_identification: '830033494',
    country_code: 'CO',
    department: '11',
    city: '001',
    address_line: 'CL 1 # 2-3',
    email: 'cliente@acme.com',
    company_name: 'ACME S.A.S',
  };

  const existingInvoice = {
    id: 'inv-1',
    number: 1225,
    prefix: 'FVE',
    dataicoUuid: 'dataico-uuid-inv-1',
    requestPayload: { invoice: { customer: dataicoCustomer } },
  } as unknown as Invoice;

  const baseDto: CreateDebitNoteDto = {
    invoiceId: 'inv-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
  };

  beforeEach(() => {
    // 10am Bogotá (UTC-5) on 2026-09-07 — getStoreToday() resolves to
    // '2026-09-07', matching the hardcoded '07/09/2026' expectation below.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T15:00:00.000Z'));

    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      // No prior local debit note for this prefix — falls back to
      // DEBIT_NOTE_NUMBER_START, mocked below to '1'.
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    debitNotesRepository = {
      create: jest.fn<Partial<DebitNote>, [Partial<DebitNote>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<DebitNote>, [Partial<DebitNote>]>((entity) =>
        Promise.resolve({
          ...entity,
          id: 'note-1',
          createdAt: new Date(),
        } as DebitNote),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    dataicoClient = { post: jest.fn<Promise<unknown>, [string, unknown]>() };
    dataicoConfig = {
      accountId: 'account-123',
      debitNotePrefix: 'NDL',
      sendDian: true,
      sendEmail: false,
    };
    invoicesService = { findOne: jest.fn().mockResolvedValue(existingInvoice) };
    productsService = { findOne: jest.fn().mockResolvedValue(product) };
    inventoryService = {
      createMovement: jest.fn().mockResolvedValue(undefined),
    };
    cashRegisterService = {
      assertOpenToday: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) =>
        key === 'DEBIT_NOTE_NUMBER_START' ? '1' : defaultValue,
      ),
    };

    service = new DebitNotesService(
      debitNotesRepository as unknown as Repository<DebitNote>,
      dataicoClient as unknown as DataicoClientService,
      dataicoConfig as unknown as DataicoConfig,
      invoicesService as unknown as InvoicesService,
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

  it('rejects when the target invoice has no Dataico uuid on file', async () => {
    invoicesService.findOne.mockResolvedValue({
      ...existingInvoice,
      dataicoUuid: null,
    });

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it("rejects when the target invoice's stored request payload has no customer block", async () => {
    invoicesService.findOne.mockResolvedValue({
      ...existingInvoice,
      requestPayload: {},
    });

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  it('rejects on insufficient stock, without calling Dataico', async () => {
    productsService.findOne.mockResolvedValue({ ...product, stock: 0 });

    await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(dataicoClient.post).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    beforeEach(() => {
      dataicoClient.post.mockResolvedValue({
        number: 'NDL1',
        dian_status: 'DIAN_ACEPTADO',
        cufe: 'note-cufe',
        uuid: 'dataico-uuid-note-1',
        xml_url: 'https://app.dataico.com/xml',
        pdf_url: 'https://app.dataico.com/pdf',
        xml: 'huge-base64-blob-not-to-be-persisted',
      });
    });

    it('sends the debit note to Dataico with the confirmed field names, reusing the invoice uuid and customer block', async () => {
      await service.create(baseDto, 'user-1');

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/debit_notes',
        expect.objectContaining({
          actions: { send_dian: true, send_email: false },
          debit_note: expect.objectContaining({
            dataico_account_id: 'account-123',
            invoice_id: 'dataico-uuid-inv-1',
            issue_date: '07/09/2026',
            number: 1,
            numbering: { prefix: 'NDL', flexible: true },
            reason: 'OTROS',
            customer: dataicoCustomer,
            items: [
              expect.objectContaining({
                sku: 'REP-001',
                measuring_unit: '94',
                description: 'Filtro de aceite',
                quantity: 1,
                // salePrice (50000) includes IVA: Dataico gets the pre-tax
                // price (50000 / 1.19 = 42016.8067).
                price: 42016.8067,
                taxes: [{ tax_category: 'IVA', tax_rate: 19 }],
              }),
            ],
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('sends send_dian/send_email off when the switches are off (the default)', async () => {
      dataicoConfig.sendDian = false;
      dataicoConfig.sendEmail = false;

      await service.create(baseDto, 'user-1');

      const body = dataicoClient.post.mock.calls[0][1] as { actions: unknown };
      expect(body.actions).toEqual({ send_dian: false, send_email: false });
    });

    it('sends an empty taxes array for a tax-exempt product', async () => {
      productsService.findOne.mockResolvedValue({
        ...product,
        taxExempt: true,
      });

      await service.create(
        {
          ...baseDto,
          items: [{ productId: 'prod-1', quantity: 1 }],
        },
        'user-1',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/debit_notes',
        expect.objectContaining({
          debit_note: expect.objectContaining({
            items: [expect.objectContaining({ taxes: [] })],
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('decrements stock for each item only after Dataico accepts the note', async () => {
      await service.create(baseDto, 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: -1 }),
        'user-1',
      );
    });

    it('persists the note with Dataico response fields mapped, excluding the xml blob, linked to the invoice', async () => {
      await service.create(baseDto, 'user-1');

      const created = debitNotesRepository.create.mock.calls[0][0];
      expect(created.dianStatus).toBe('DIAN_ACEPTADO');
      expect(created.cufe).toBe('note-cufe');
      expect(created.dataicoUuid).toBe('dataico-uuid-note-1');
      expect(created.invoice).toBe(existingInvoice);
      expect(created.responsePayload).not.toHaveProperty('xml');
    });

    it('auto-increments the number from the highest local one for this prefix, ignoring DEBIT_NOTE_NUMBER_START', async () => {
      queryBuilder.getRawOne.mockResolvedValue({ max: '5' });

      await service.create(baseDto, 'user-1');

      expect(queryBuilder.where).toHaveBeenCalledWith('note.prefix = :prefix', {
        prefix: 'NDL',
      });
      const created = debitNotesRepository.create.mock.calls[0][0];
      expect(created.number).toBe(6);
    });

    it("defaults issueDate to the store's current day", async () => {
      await service.create(baseDto, 'user-1');

      const created = debitNotesRepository.create.mock.calls[0][0];
      expect(created.issueDate).toBe('2026-09-07');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the debit note does not exist', async () => {
      debitNotesRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
