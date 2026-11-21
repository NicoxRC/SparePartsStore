import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { InventoryService } from '../inventory/inventory.service';
import { InvoicesService } from '../invoicing/invoices/invoices.service';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { InvoiceQuotationDto } from './dto/invoice-quotation.dto';
import { UpdateQuotationCustomerDto } from './dto/update-quotation-customer.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationPayment } from './entities/quotation-payment.entity';
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
    manager: { transaction: jest.Mock };
  };
  let transactionManager: {
    query: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let itemsUpdateBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let quotationItemsRepository: {
    create: jest.Mock<QuotationItem, [Partial<QuotationItem>]>;
    save: jest.Mock<Promise<QuotationItem[]>, [QuotationItem[]]>;
    delete: jest.Mock;
  };
  let queryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    withDeleted: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getRawOne: jest.Mock;
    getManyAndCount: jest.Mock;
    getOne: jest.Mock;
  };
  let paymentsBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
    getRawOne: jest.Mock;
  };
  let paymentsRepository: { createQueryBuilder: jest.Mock };
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
    taxExempt: false,
  } as unknown as Product;

  const productB = {
    id: 'prod-b',
    reference: 'REP-B',
    description: 'Bujía',
    salePrice: 20000,
    stock: 10,
    taxExempt: false,
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
    items: [{ productId: 'prod-a', quantity: 2 }],
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
      completedAt: null,
      invoice: null,
      cancelledAt: null,
      mergedAt: null,
      mergedInto: null,
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
      updatedAt: new Date('2026-09-20T10:00:00.000Z'),
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
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      // No prior quotations by default — resolveNextNumber() -> 1.
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      // loadWithItems() default — an open quotation with one line.
      getOne: jest.fn().mockResolvedValue(openQuotation()),
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
      manager: {
        transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
          work(transactionManager),
        ),
      },
    };
    itemsUpdateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    transactionManager = {
      query: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => itemsUpdateBuilder),
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
      assertOpenToday: jest.fn().mockResolvedValue({ id: 'reg-1' }),
    };
    invoicesService = {
      create: jest
        .fn()
        .mockResolvedValue([{ id: 'inv-1', totalAmount: 100000 }]),
    };

    paymentsBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      // No abonos by default.
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ paid: '0' }),
    };
    paymentsRepository = {
      createQueryBuilder: jest.fn(() => paymentsBuilder),
    };

    service = new QuotationsService(
      quotationsRepository as unknown as Repository<Quotation>,
      quotationItemsRepository as unknown as Repository<QuotationItem>,
      paymentsRepository as unknown as Repository<QuotationPayment>,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
      cashRegisterService as unknown as CashRegisterService,
      invoicesService as unknown as InvoicesService,
    );
  });

  describe('getOpenSummary', () => {
    it('sums only quotations that are not invoiced, completed or cancelled', async () => {
      queryBuilder.getRawOne.mockResolvedValueOnce({
        sum: '250000',
        count: '3',
      });

      const summary = await service.getOpenSummary();

      expect(summary).toEqual({ total: 250000, count: 3 });
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'quotation.invoicedAt IS NULL AND quotation.completedAt IS NULL AND quotation.cancelledAt IS NULL AND quotation.mergedAt IS NULL',
      );
    });

    it('returns zeros when there are no open quotations', async () => {
      queryBuilder.getRawOne.mockResolvedValueOnce(undefined);

      expect(await service.getOpenSummary()).toEqual({ total: 0, count: 0 });
    });

    it('subtracts the abonos already paid toward open quotations', async () => {
      queryBuilder.getRawOne.mockResolvedValueOnce({
        sum: '250000',
        count: '3',
      });
      paymentsBuilder.getRawOne.mockResolvedValueOnce({ paid: '70000' });

      expect(await service.getOpenSummary()).toEqual({
        total: 180000,
        count: 3,
      });
      expect(paymentsBuilder.where).toHaveBeenCalledWith(
        'payment.voidedAt IS NULL',
      );
    });
  });

  describe('paid amount on responses', () => {
    it('reports what was paid toward the quotation through abonos', async () => {
      paymentsBuilder.getRawMany.mockResolvedValueOnce([
        { quotationId: 'q-1', paid: '40000' },
      ]);

      const quotation = await service.findOne('q-1');

      expect(quotation.paidAmount).toBe(40000);
    });

    it('reports 0 when there is no abono', async () => {
      expect((await service.findOne('q-1')).paidAmount).toBe(0);
    });
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
        'quotation.invoicedAt IS NULL AND quotation.completedAt IS NULL AND quotation.cancelledAt IS NULL AND quotation.mergedAt IS NULL',
      );
    });

    it('escapes and wraps the search term for ILIKE matching', async () => {
      await service.findAll({ page: 1, limit: 20, search: '50%_off' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :search0'),
        { search0: '%50\\%\\_off%' },
      );
    });

    it('searches the customer name word by word, never the identification', async () => {
      await service.findAll({ page: 1, limit: 20, search: 'javi  cant' });

      const searchCalls = (
        queryBuilder.andWhere.mock.calls as [string, unknown][]
      ).filter(([where]) => where.includes('ILIKE'));
      expect(searchCalls).toEqual([
        [
          expect.stringContaining('quotation.customerFirstName'),
          { search0: '%javi%' },
        ],
        [
          expect.stringContaining('quotation.customerFamilyName'),
          { search1: '%cant%' },
        ],
      ]);
      for (const [where] of searchCalls) {
        expect(where).not.toContain('customerIdentification');
      }
    });

    it('treats digits as a quotation number prefix, lowest number first', async () => {
      await service.findAll({ page: 1, limit: 20, search: ' #12 ' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'CAST(quotation.number AS TEXT) LIKE :numberPrefix',
        { numberPrefix: '12%' },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.anything(),
      );
      expect(queryBuilder.orderBy).toHaveBeenLastCalledWith(
        'quotation.number',
        'ASC',
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
        expect.stringContaining('ILIKE :search0'),
        { search0: '%ACME%' },
      );
    });
  });

  it('filters empresa (NIT) and empleado (cédula) quotations by identification type', async () => {
    await service.findAll({ page: 1, limit: 20, customerType: 'empresa' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "quotation.customerIdentificationType = 'NIT'",
    );

    queryBuilder.andWhere.mockClear();
    await service.findAll({ page: 1, limit: 20, customerType: 'empleado' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "quotation.customerIdentificationType <> 'NIT'",
    );
  });

  describe('create', () => {
    it('rejects when there is no open cash register for today, without touching stock', async () => {
      cashRegisterService.assertOpenToday.mockRejectedValue(
        new BadRequestException('No hay una caja abierta para hoy.'),
      );

      await expect(service.create(baseDto, 'user-1', 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it("ties the quotation to the open register of the seller's till", async () => {
      cashRegisterService.assertOpenToday.mockResolvedValue({
        id: 'reg-caja-2',
      });

      await service.create(baseDto, 'user-1', 2);

      expect(cashRegisterService.assertOpenToday).toHaveBeenCalledWith(2);
      expect(quotationsRepository.create.mock.calls[0][0].cashRegister).toEqual(
        {
          id: 'reg-caja-2',
        },
      );
    });

    it('rejects on insufficient stock, without creating any movement', async () => {
      productsService.findOne.mockResolvedValue({ ...productA, stock: 1 });

      await expect(service.create(baseDto, 'user-1', 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it("decrements stock exactly like a real sale, locking each line's current price", async () => {
      await service.create(baseDto, 'user-1', 1);

      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: -2 }),
        'user-1',
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0].unitPrice).toBe(50000);
    });

    it("derives taxRate from the product's taxExempt flag, never trusting client input", async () => {
      productsService.findOne.mockResolvedValue({
        ...productA,
        taxExempt: true,
      });

      await service.create(baseDto, 'user-1', 1);

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0].taxRate).toBe(0);
    });

    it("locks a line's price at a per-line unitPriceOverride instead of the product's current salePrice, without touching the product", async () => {
      await service.create(
        {
          ...baseDto,
          items: [
            { productId: 'prod-a', quantity: 2, unitPriceOverride: 45000 },
          ],
        },
        'user-1',
        1,
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0].unitPrice).toBe(45000);
      expect(productA.salePrice).toBe(50000);
    });

    it('reads the next number and saves the quotation while holding the quotations numbering lock', async () => {
      queryBuilder.getRawOne.mockImplementationOnce(() => {
        expect(transactionManager.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          ['quotations'],
        );
        return Promise.resolve({ max: '41' });
      });

      await service.create(baseDto, 'user-1', 1);

      expect(quotationsRepository.manager.transaction).toHaveBeenCalledTimes(1);
      expect(quotationsRepository.create.mock.calls[0][0].number).toBe(42);
    });
  });

  describe('one-off lines (not a catalog product)', () => {
    const customLine = {
      description: 'Instalación de llantas',
      customUnitPrice: 30000,
      quantity: 2,
    };

    it('saves a typed line with its name and price, standard IVA, and moves no stock', async () => {
      await service.create(
        {
          ...baseDto,
          items: [customLine, { productId: 'prod-a', quantity: 1 }],
        },
        'user-1',
        1,
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0]).toEqual(
        expect.objectContaining({
          product: null,
          description: 'Instalación de llantas',
          unitPrice: 30000,
          taxRate: 19,
        }),
      );
      expect(inventoryService.createMovement).toHaveBeenCalledTimes(1);
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a' }),
        'user-1',
      );
    });

    it('rejects a line that is a product and a one-off at once', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            items: [{ ...customLine, productId: 'prod-a' }],
          },
          'user-1',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('keeps a one-off line through an edit, without stock movement for it', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({
          items: [
            {
              id: 'item-c',
              product: null,
              description: 'Instalación de llantas',
              quantity: 2,
              taxRate: 19,
              discount: null,
              unitPrice: 30000,
            } as unknown as QuotationItem,
          ],
        }),
      );

      await service.updateItems(
        'q-1',
        { items: [{ ...customLine, quantity: 3 }] },
        'user-1',
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      expect(savedItems[0]).toEqual(
        expect.objectContaining({
          product: null,
          quantity: 3,
          unitPrice: 30000,
        }),
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('passes a one-off line to the invoice as typed and does not return it to stock on cancel', async () => {
      const withCustom = openQuotation({
        items: [
          {
            id: 'item-c',
            product: null,
            description: 'Instalación de llantas',
            quantity: 2,
            taxRate: 19,
            discount: null,
            unitPrice: 30000,
          } as unknown as QuotationItem,
        ],
      });
      queryBuilder.getOne.mockResolvedValue(withCustom);

      await service.invoice(
        'q-1',
        {
          paymentMeans: 'CASH',
          paymentMeansType: 'DEBITO',
          useSameCustomer: true,
        },
        'user-1',
        1,
      );
      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              description: 'Instalación de llantas',
              customUnitPrice: 30000,
              quantity: 2,
            }),
          ],
        }),
        'user-1',
        1,
        { skipInventoryEffects: true },
      );

      queryBuilder.getOne.mockResolvedValue(withCustom);
      await service.cancel('q-1', 'user-1');
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });
  });

  describe('updateItems', () => {
    const dto: UpdateQuotationItemsDto = {
      items: [
        { productId: 'prod-a', quantity: 5 },
        { productId: 'prod-b', quantity: 1 },
      ],
    };

    it('saves nothing when the lines did not change, so the last-change date stays', async () => {
      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 2 }] },
        'user-1',
      );

      expect(quotationItemsRepository.delete).not.toHaveBeenCalled();
      expect(quotationsRepository.update).not.toHaveBeenCalled();
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('rejects an edit that leaves the total below what was already paid, before moving stock', async () => {
      // Open quotation: 2 × $50.000 = $100.000, $80.000 already paid.
      paymentsBuilder.getRawMany.mockResolvedValueOnce([
        { quotationId: 'q-1', paid: '80000' },
      ]);

      await expect(
        service.updateItems(
          'q-1',
          { items: [{ productId: 'prod-a', quantity: 1 }] },
          'user-1',
        ),
      ).rejects.toThrow('por debajo de lo ya abonado');
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(quotationItemsRepository.delete).not.toHaveBeenCalled();
    });

    it('completes the quotation when the edit brings the total down to exactly what was paid', async () => {
      paymentsBuilder.getRawMany.mockResolvedValueOnce([
        { quotationId: 'q-1', paid: '50000' },
      ]);

      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 1 }] },
        'user-1',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(quotationsRepository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({
          totalAmount: 50000,
          completedAt: expect.any(Date),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-a', quantity: 1 }),
        'user-1',
      );
    });

    it('keeps the quotation open when the edit leaves a balance over the abonos', async () => {
      paymentsBuilder.getRawMany.mockResolvedValueOnce([
        { quotationId: 'q-1', paid: '10000' },
      ]);

      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 1 }] },
        'user-1',
      );

      const [, changes] = quotationsRepository.update.mock.calls[0] as [
        string,
        Partial<Quotation>,
      ];
      expect(changes.totalAmount).toBe(50000);
      expect(changes).not.toHaveProperty('completedAt');
    });

    it('saves when only the discount changed', async () => {
      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 2, discount: 10 }] },
        'user-1',
      );

      expect(quotationsRepository.update).toHaveBeenCalled();
    });

    it('charges a line at the price typed inline, without touching the product', async () => {
      await service.updateItems(
        'q-1',
        {
          items: [
            { productId: 'prod-a', quantity: 2, unitPriceOverride: 45000 },
          ],
        },
        'user-1',
      );

      expect(quotationItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ unitPrice: 45000 }),
      );
      expect(quotationsRepository.update).toHaveBeenCalled();
    });

    it('rejects editing a quotation that is no longer open', async () => {
      queryBuilder.getOne.mockResolvedValue(
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
        { items: [{ productId: 'prod-b', quantity: 1 }] },
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

    describe('price locking', () => {
      beforeEach(() => {
        // prod-a was quoted at 50000; its price has since gone up to 60000.
        productsService.findOne.mockImplementation((id: string) =>
          Promise.resolve(
            id === 'prod-b' ? productB : { ...productA, salePrice: 60000 },
          ),
        );
      });

      const savedLine = (productId: string): QuotationItem | undefined =>
        quotationItemsRepository.save.mock.calls[0][0].find(
          (item) => item.product?.id === productId,
        );

      it('keeps the price a line was quoted at when the product price changed afterward', async () => {
        await service.updateItems('q-1', dto, 'user-1');

        expect(savedLine('prod-a')?.unitPrice).toBe(50000);
      });

      it('prices a product added by the edit at its current price', async () => {
        await service.updateItems('q-1', dto, 'user-1');

        expect(savedLine('prod-b')?.unitPrice).toBe(productB.salePrice);
      });

      it('keeps the quoted price even when only the quantity changed', async () => {
        await service.updateItems(
          'q-1',
          { items: [{ productId: 'prod-a', quantity: 3 }] },
          'user-1',
        );

        expect(savedLine('prod-a')?.unitPrice).toBe(50000);
      });

      it("totals the quotation with the quoted price, not the product's new one", async () => {
        await service.updateItems(
          'q-1',
          { items: [{ productId: 'prod-a', quantity: 3 }] },
          'user-1',
        );

        // 3 x 50000 quoted, IVA included: 150000 — the quoted price, not the
        // product's new one (60000 would give 180000).
        const [, changes] = quotationsRepository.update.mock.calls[0] as [
          string,
          { totalAmount: number },
        ];
        expect(changes.totalAmount).toBe(150000);
      });

      it('keeps the price of a re-added product after it was removed and added back in the same edit', async () => {
        await service.updateItems(
          'q-1',
          {
            items: [
              { productId: 'prod-a', quantity: 1 },
              { productId: 'prod-a', quantity: 1 },
            ],
          },
          'user-1',
        );

        const lines = quotationItemsRepository.save.mock.calls[0][0].filter(
          (item) => item.product?.id === 'prod-a',
        );
        expect(lines.map((line) => line.unitPrice)).toEqual([50000, 50000]);
      });
    });

    it("does not touch a line whose quantity didn't change", async () => {
      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 2 }] },
        'user-1',
      );

      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it("derives taxRate from the product's taxExempt flag, ignoring any old stored value", async () => {
      productsService.findOne.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod-b' ? productB : { ...productA, taxExempt: true },
        ),
      );

      await service.updateItems(
        'q-1',
        { items: [{ productId: 'prod-a', quantity: 2 }] },
        'user-1',
      );

      const savedItems = quotationItemsRepository.save.mock.calls[0][0];
      const lineA = savedItems.find(
        (item: QuotationItem) => item.product?.id === 'prod-a',
      );
      expect(lineA?.taxRate).toBe(0);
    });
  });

  describe('printout data', () => {
    it("exposes each line's product brand and who made the quotation", async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({
          createdBy: { firstName: 'Jose', lastName: 'Moncayo' } as never,
          items: [
            {
              id: 'item-1',
              product: { ...productA, brand: { name: 'VICTOR REINZ' } },
              quantity: 1,
              taxRate: 19,
              discount: null,
              unitPrice: 50000,
            } as unknown as QuotationItem,
          ],
        }),
      );

      const result = await service.findOne('q-1');

      expect(result.createdByName).toBe('Jose Moncayo');
      expect(result.items?.[0].productBrand).toBe('VICTOR REINZ');
    });

    it('leaves brand and seller null when they are not there', async () => {
      queryBuilder.getOne.mockResolvedValue(openQuotation());

      const result = await service.findOne('q-1');

      expect(result.createdByName).toBeNull();
      expect(result.items?.[0].productBrand).toBeNull();
    });
  });

  describe('invoice', () => {
    const invoiceDto: InvoiceQuotationDto = {
      paymentMeans: 'CASH',
      paymentMeansType: 'DEBITO',
      useSameCustomer: true,
    };

    it('loads the quotation and invoices it while holding its own lock, so a second request finds it already invoiced', async () => {
      queryBuilder.getOne.mockImplementationOnce(() => {
        expect(transactionManager.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          ['quotation:q-1'],
        );
        return Promise.resolve(openQuotation());
      });

      await service.invoice('q-1', invoiceDto, 'user-1', 1);

      expect(invoicesService.create).toHaveBeenCalledTimes(1);
      expect(quotationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'q-1', invoice: { id: 'inv-1' } }),
      );
    });

    it('rejects invoicing a quotation that is no longer open', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({ invoicedAt: new Date() }),
      );

      await expect(
        service.invoice('q-1', invoiceDto, 'user-1', 1),
      ).rejects.toThrow(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('requires customer data when not billing to the same customer', async () => {
      await expect(
        service.invoice(
          'q-1',
          { ...invoiceDto, useSameCustomer: false },
          'user-1',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('invoices into the till of whoever collects, not the one the quotation was made in', async () => {
      await service.invoice('q-1', invoiceDto, 'user-2', 2);

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.anything(),
        'user-2',
        2,
        { skipInventoryEffects: true },
      );
    });

    it("tells InvoicesService to skip its own stock effects and to use the quotation's locked price", async () => {
      await service.invoice('q-1', invoiceDto, 'user-1', 1);

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
        1,
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
        1,
      );

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerIdentification: '123' }),
        'user-1',
        1,
        { skipInventoryEffects: true },
      );
    });

    it('marks the quotation invoiced and links the resulting invoice', async () => {
      await service.invoice('q-1', invoiceDto, 'user-1', 1);

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

  describe('updateCustomer', () => {
    const customerDto: UpdateQuotationCustomerDto = {
      customerIdentificationType: 'CC',
      customerIdentification: '1020304050',
      customerPartyType: 'PERSONA_NATURAL',
      customerTaxLevelCode: 'SIMPLIFICADO',
      customerFirstName: 'JUAN',
      customerFamilyName: 'PEREZ',
      customerCountryCode: 'CO',
      customerDepartment: '11',
      customerCity: '001',
      customerAddressLine: 'CL 9 # 8-7',
      customerEmail: 'juan@correo.com',
      customerPhone: '3001234567',
    };

    it('replaces the customer snapshot without moving stock or restarting the payment term', async () => {
      await service.updateCustomer('q-1', customerDto, 'user-1');

      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(quotationsRepository.update).toHaveBeenCalledWith('q-1', {
        customerIdentificationType: 'CC',
        customerIdentification: '1020304050',
        customerIdentificationDv: null,
        customerPartyType: 'PERSONA_NATURAL',
        customerTaxLevelCode: 'SIMPLIFICADO',
        customerRegimen: null,
        // Was ACME S.A.S — a field left out is cleared, not kept.
        customerCompanyName: null,
        customerFirstName: 'JUAN',
        customerFamilyName: 'PEREZ',
        customerCountryCode: 'CO',
        customerDepartment: '11',
        customerCity: '001',
        customerAddressLine: 'CL 9 # 8-7',
        customerEmail: 'juan@correo.com',
        customerPhone: '3001234567',
        updatedBy: { id: 'user-1' },
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });
    });

    it('rejects editing a quotation that is no longer open', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({ cancelledAt: new Date() }),
      );

      await expect(
        service.updateCustomer('q-1', customerDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(quotationsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('rejects completing a quotation that is no longer open', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({ cancelledAt: new Date() }),
      );

      await expect(service.complete('q-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(quotationsRepository.update).not.toHaveBeenCalled();
    });

    it('closes the quotation without moving stock or invoicing', async () => {
      await service.complete('q-1', 'user-1');

      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(invoicesService.create).not.toHaveBeenCalled();
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(quotationsRepository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });

  describe('cancel', () => {
    it('loads the quotation while holding its own lock, so a double cancel returns the stock only once', async () => {
      queryBuilder.getOne.mockImplementationOnce(() => {
        expect(transactionManager.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          ['quotation:q-1'],
        );
        return Promise.resolve(openQuotation());
      });

      await service.cancel('q-1', 'user-1');

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(1);
    });

    it('rejects cancelling while the quotation has abonos, returning no stock', async () => {
      paymentsBuilder.getRawMany.mockResolvedValueOnce([
        { quotationId: 'q-1', paid: '20000' },
      ]);

      await expect(service.cancel('q-1', 'user-1')).rejects.toThrow(
        'tiene abonos',
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(quotationsRepository.update).not.toHaveBeenCalled();
    });

    it('rejects cancelling a completed quotation', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({ completedAt: new Date() }),
      );

      await expect(service.cancel('q-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('rejects cancelling a quotation that is no longer open', async () => {
      queryBuilder.getOne.mockResolvedValue(
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

  describe('merge', () => {
    const olderQuotation = () =>
      openQuotation({
        id: 'q-1',
        number: 1,
        notes: 'Taller norte',
        items: [
          {
            id: 'item-1',
            product: productA,
            description: null,
            quantity: 2,
            taxRate: 19,
            discount: null,
            unitPrice: 50000,
          } as QuotationItem,
        ],
      });
    const newerQuotation = () =>
      openQuotation({
        id: 'q-2',
        number: 7,
        notes: null,
        totalAmount: 30000,
        items: [
          {
            id: 'item-2',
            product: productB,
            description: null,
            quantity: 1,
            taxRate: 19,
            discount: 5000,
            unitPrice: 35000,
          } as QuotationItem,
        ],
      });

    function loadInOrder(...quotations: Quotation[]) {
      for (const quotation of quotations) {
        queryBuilder.getOne.mockResolvedValueOnce(quotation);
      }
    }

    it('folds the newer quotations into the oldest one, without stock or invoices', async () => {
      // Given newest first, so the survivor is chosen by number, not order.
      loadInOrder(newerQuotation(), olderQuotation());

      await service.merge({ quotationIds: ['q-2', 'q-1'] }, 'user-1');

      expect(itemsUpdateBuilder.set).toHaveBeenCalledWith({
        quotation: { id: 'q-1' },
      });
      expect(itemsUpdateBuilder.where).toHaveBeenCalledWith(
        'quotation_id IN (:...sourceIds)',
        { sourceIds: ['q-2'] },
      );
      // Lines and abonos both move to the survivor.
      expect(itemsUpdateBuilder.update).toHaveBeenCalledWith(QuotationItem);
      expect(itemsUpdateBuilder.update).toHaveBeenCalledWith(QuotationPayment);
      expect(itemsUpdateBuilder.execute).toHaveBeenCalledTimes(2);
      // 2 × 50.000 + (35.000 − 5.000) — each line keeps its price and discount.
      expect(transactionManager.update).toHaveBeenCalledWith(Quotation, 'q-1', {
        totalAmount: 130000,
        notes: 'Taller norte',
        updatedBy: { id: 'user-1' },
      });
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(transactionManager.save).toHaveBeenCalledWith(Quotation, [
        expect.objectContaining({
          id: 'q-2',
          mergedAt: expect.any(Date),
          mergedInto: { id: 'q-1' },
        }),
      ]);
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('joins the notes of every quotation', async () => {
      loadInOrder(
        olderQuotation(),
        openQuotation({ ...newerQuotation(), notes: 'Placa ABC123' }),
      );

      await service.merge({ quotationIds: ['q-1', 'q-2'] }, 'user-1');

      expect(transactionManager.update).toHaveBeenCalledWith(
        Quotation,
        'q-1',
        expect.objectContaining({ notes: 'Taller norte\nPlaca ABC123' }),
      );
    });

    it('rejects fewer than two distinct quotations', async () => {
      await expect(
        service.merge({ quotationIds: ['q-1', 'q-1'] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(transactionManager.update).not.toHaveBeenCalled();
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('rejects quotations of different customers', async () => {
      loadInOrder(
        olderQuotation(),
        openQuotation({
          ...newerQuotation(),
          customerIdentification: '1085000000',
        }),
      );

      await expect(
        service.merge({ quotationIds: ['q-1', 'q-2'] }, 'user-1'),
      ).rejects.toThrow('Solo se pueden unir cotizaciones del mismo cliente.');
      expect(transactionManager.update).not.toHaveBeenCalled();
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('rejects a quotation that is no longer open', async () => {
      loadInOrder(
        olderQuotation(),
        openQuotation({ ...newerQuotation(), invoicedAt: new Date() }),
      );

      await expect(
        service.merge({ quotationIds: ['q-1', 'q-2'] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(transactionManager.update).not.toHaveBeenCalled();
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('rejects a quotation that was already merged', async () => {
      loadInOrder(
        olderQuotation(),
        openQuotation({ ...newerQuotation(), mergedAt: new Date() }),
      );

      await expect(
        service.merge({ quotationIds: ['q-1', 'q-2'] }, 'user-1'),
      ).rejects.toThrow('La cotización COT-0007 ya fue unida a otra.');
    });
  });

  describe('merged quotations elsewhere', () => {
    it('cannot be invoiced once merged', async () => {
      queryBuilder.getOne.mockResolvedValue(
        openQuotation({ mergedAt: new Date() }),
      );

      await expect(
        service.invoice(
          'q-1',
          {
            paymentMeans: 'CASH',
            paymentMeansType: 'DEBITO',
            useSameCustomer: true,
          },
          'user-1',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('lists a customer by exact identification and filters merged ones', async () => {
      await service.findAll({
        page: 1,
        limit: 20,
        status: 'merged',
        customerIdentification: ' 830033494 ',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.mergedAt IS NOT NULL',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.customerIdentification = :identification',
        { identification: '830033494' },
      );
    });
  });
});
