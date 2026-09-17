import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { InventoryService } from '../inventory/inventory.service';
import { InvoicesService } from '../invoicing/invoices/invoices.service';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { InvoiceQuotationDto } from './dto/invoice-quotation.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';
import { QuotationItem } from './entities/quotation-item.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationsService } from './quotations.service';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let quotationsRepository: {
    create: jest.Mock<Partial<Quotation>, [Partial<Quotation>]>;
    save: jest.Mock<Promise<Quotation>, [Partial<Quotation>]>;
    update: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let quotationItemsRepository: {
    create: jest.Mock<QuotationItem, [Partial<QuotationItem>]>;
    save: jest.Mock<Promise<QuotationItem[]>, [QuotationItem[]]>;
    delete: jest.Mock;
  };
  let queryBuilder: {
    select: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getRawOne: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let productsService: { findOne: jest.Mock };
  let inventoryService: { createMovement: jest.Mock };
  let cashRegisterService: { assertOpenToday: jest.Mock };
  let invoicesService: { create: jest.Mock };

  const productA = {
    id: 'prod-a',
    reference: 'REP-A',
    description: 'Filtro de aceite',
    salePrice: 50000,
    stock: 10,
  } as unknown as Product;

  const productB = {
    id: 'prod-b',
    reference: 'REP-B',
    description: 'Bujía',
    salePrice: 20000,
    stock: 10,
  } as unknown as Product;

  const baseDto: CreateQuotationDto = {
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
    items: [{ productId: 'prod-a', quantity: 2, taxRate: 19 }],
  };

  /** A saved-and-reloaded open quotation with one existing line (2x productA). */
  function openQuotation(overrides: Partial<Quotation> = {}): Quotation {
    return {
      id: 'q-1',
      number: 1,
      customerIdentificationType: 'NIT',
      customerIdentification: '830033494',
      customerIdentificationDv: null,
      customerPartyType: 'PERSONA_JURIDICA',
      customerTaxLevelCode: 'COMUN',
      customerRegimen: null,
      customerCompanyName: 'ACME S.A.S',
      customerFirstName: null,
      customerFamilyName: null,
      customerCountryCode: 'CO',
      customerDepartment: '11',
      customerCity: '001',
      customerAddressLine: 'CL 1 # 2-3',
      customerEmail: 'cliente@acme.com',
      customerPhone: null,
      notes: null,
      totalAmount: 100000,
      invoicedAt: null,
      invoice: null,
      cancelledAt: null,
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
      items: [
        {
          id: 'item-1',
          product: productA,
          quantity: 2,
          taxRate: 19,
          discount: null,
          unitPrice: 50000,
        } as QuotationItem,
      ],
      ...overrides,
    } as Quotation;
  }

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      // No prior quotations by default — resolveNextNumber() -> 1.
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    quotationsRepository = {
      create: jest.fn<Partial<Quotation>, [Partial<Quotation>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<Quotation>, [Partial<Quotation>]>((entity) =>
        Promise.resolve({ id: 'q-1', ...entity } as Quotation),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(openQuotation()),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    quotationItemsRepository = {
      create: jest.fn<QuotationItem, [Partial<QuotationItem>]>(
        (entity) => entity as QuotationItem,
      ),
      save: jest
        .fn<Promise<QuotationItem[]>, [QuotationItem[]]>()
        .mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    productsService = {
      findOne: jest.fn((id: string) =>
        Promise.resolve(id === 'prod-b' ? productB : productA),
      ),
    };
    inventoryService = {
      createMovement: jest.fn().mockResolvedValue(undefined),
    };
    cashRegisterService = {
      assertOpenToday: jest.fn().mockResolvedValue(undefined),
    };
    invoicesService = {
      create: jest.fn().mockResolvedValue({ id: 'inv-1', totalAmount: 100000 }),
    };

    service = new QuotationsService(
      quotationsRepository as unknown as Repository<Quotation>,
      quotationItemsRepository as unknown as Repository<QuotationItem>,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
      cashRegisterService as unknown as CashRegisterService,
      invoicesService as unknown as InvoicesService,
    );
  });

  describe('findAll', () => {
    it('returns paginated results with meta built from the total count', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[openQuotation()], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('filters by status', async () => {
      await service.findAll({ page: 1, limit: 20, status: 'open' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.invoicedAt IS NULL AND quotation.cancelledAt IS NULL',
      );
    });

    it('escapes and wraps the search term for ILIKE matching', async () => {
      await service.findAll({ page: 1, limit: 20, search: '50%_off' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :search'),
        { search: '%50\\%\\_off%' },
      );
    });

    it('combines status and search filters', async () => {
      await service.findAll({
        page: 1,
        limit: 20,
        status: 'invoiced',
        search: 'ACME',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.invoicedAt IS NOT NULL',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :search'),
        { search: '%ACME%' },
      );
    });
  });

  describe('create', () => {
    it('rejects when there is no open cash register for today, without touching stock', async () => {
      cashRegisterService.assertOpenToday.mockRejectedValue(
        new BadRequestException('No hay una caja abierta para hoy.'),
      );

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('rejects on insufficient stock, without creating any movement', async () => {
      productsService.findOne.mockResolvedValue({ ...productA, stock: 1 });

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it("decrements stock exactly like a real sale, locking each line's current price", async () => {
      await service.create(baseDto, 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: -2 }),
        'user-1',
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0].unitPrice).toBe(50000);
    });
  });

  describe('updateItems', () => {
    const dto: UpdateQuotationItemsDto = {
      items: [
        { productId: 'prod-a', quantity: 5, taxRate: 19 },
        { productId: 'prod-b', quantity: 1, taxRate: 19 },
      ],
    };

    it('rejects editing a quotation that is no longer open', async () => {
      quotationsRepository.findOne.mockResolvedValue(
        openQuotation({ cancelledAt: new Date() }),
      );

      await expect(service.updateItems('q-1', dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('takes more stock for a raised quantity and returns stock for a dropped one, one movement per changed product', async () => {
      // existing: 2x prod-a. new: 5x prod-a (delta +3), 1x prod-b (delta +1, new line).
      await service.updateItems('q-1', dto, 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: -3 }),
        'user-1',
      );
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-b', quantity: -1 }),
        'user-1',
      );
      expect(inventoryService.createMovement).toHaveBeenCalledTimes(2);
    });

    it('returns the full amount to stock when a line is removed entirely', async () => {
      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-b', quantity: 1, taxRate: 19 }] },
        'user-1',
      );

      // prod-a: 0 - 2 = -2 delta -> +2 back to stock.
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: 2 }),
        'user-1',
      );
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-b', quantity: -1 }),
        'user-1',
      );
    });

    it('rejects when a raised quantity exceeds current stock, without moving anything', async () => {
      productsService.findOne.mockImplementation((id: string) =>
        Promise.resolve(id === 'prod-b' ? productB : { ...productA, stock: 1 }),
      );

      await expect(service.updateItems('q-1', dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('re-locks unitPrice to the current product price for every line in the new list', async () => {
      productsService.findOne.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod-b' ? productB : { ...productA, salePrice: 60000 },
        ),
      );

      await service.updateItems('q-1', dto, 'user-1');

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      const lineA = savedItems.find(
        (item: QuotationItem) => item.product.id === 'prod-a',
      );
      expect(lineA?.unitPrice).toBe(60000);
    });

    it("does not touch a line whose quantity didn't change", async () => {
      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 2, taxRate: 19 }] },
        'user-1',
      );

      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });
  });

  describe('invoice', () => {
    const invoiceDto: InvoiceQuotationDto = {
      paymentMeans: 'CASH',
      paymentMeansType: 'DEBITO',
      useSameCustomer: true,
    };

    it('rejects invoicing a quotation that is no longer open', async () => {
      quotationsRepository.findOne.mockResolvedValue(
        openQuotation({ invoicedAt: new Date() }),
      );

      await expect(
        service.invoice('q-1', invoiceDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('requires customer data when not billing to the same customer', async () => {
      await expect(
        service.invoice(
          'q-1',
          { ...invoiceDto, useSameCustomer: false },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it("tells InvoicesService to skip its own stock effects and to use the quotation's locked price", async () => {
      await service.invoice('q-1', invoiceDto, 'user-1');

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerCompanyName: 'ACME S.A.S',
          items: [
            expect.objectContaining({
              productId: 'prod-a',
              quantity: 2,
              unitPriceOverride: 50000,
            }),
          ],
        }),
        'user-1',
        { skipInventoryEffects: true },
      );
    });

    it('bills to the override customer when useSameCustomer is false', async () => {
      await service.invoice(
        'q-1',
        {
          ...invoiceDto,
          useSameCustomer: false,
          customer: {
            customerIdentificationType: 'CC',
            customerIdentification: '123',
            customerPartyType: 'PERSONA_NATURAL',
            customerTaxLevelCode: 'COMUN',
            customerCountryCode: 'CO',
            customerDepartment: '11',
            customerCity: '001',
            customerAddressLine: 'Otra dirección',
            customerEmail: 'otro@correo.com',
          },
        },
        'user-1',
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerIdentification: '123' }),
        'user-1',
        { skipInventoryEffects: true },
      );
    });

    it('marks the quotation invoiced and links the resulting invoice', async () => {
      await service.invoice('q-1', invoiceDto, 'user-1');

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(quotationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'q-1',
          invoicedAt: expect.any(Date),
          invoice: { id: 'inv-1' },
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a quotation that is no longer open', async () => {
      quotationsRepository.findOne.mockResolvedValue(
        openQuotation({ invoicedAt: new Date() }),
      );

      await expect(service.cancel('q-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('returns every line to stock and closes the quotation', async () => {
      await service.cancel('q-1', 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: 2 }),
        'user-1',
      );
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(quotationsRepository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ cancelledAt: expect.any(Date) }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });
});
