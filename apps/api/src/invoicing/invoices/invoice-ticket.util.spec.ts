import { DianResolution } from '../resolutions/entities/dian-resolution.entity';
import { Invoice } from './entities/invoice.entity';
import { buildInvoiceTicket } from './invoice-ticket.util';

const resolution = {
  startDate: '2019-01-19',
  endDate: '2030-01-19',
  rangeStart: 1,
  rangeEnd: 1900000000,
} as DianResolution;

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    number: 1789500028,
    prefix: 'FEE',
    dataicoNumber: 'FEE1789500028',
    resolutionNumber: '18760000001',
    customerIdentificationType: 'CC',
    customerIdentification: '79456123',
    customerCompanyName: null,
    customerFirstName: 'JORGE',
    customerFamilyName: 'PARDO',
    customerEmail: 'jorge@example.com',
    issueDate: '2026-09-21',
    paymentDate: '2026-09-21',
    dianStatus: 'DIAN_NO_ENVIADO',
    cufe: 'abc123cufe',
    qrCode:
      'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=abc',
    totalAmount: 172550,
    createdAt: new Date('2026-09-21T18:03:48.000Z'),
    requestPayload: {
      invoice: {
        operation: 'ESTANDAR',
        payment_means: 'CASH',
        customer: {
          first_name: 'JORGE',
          family_name: 'PARDO',
          company_name: '',
          address_line: 'Calle 3 #5-20',
          city: '175',
          department: '25',
        },
        items: [
          {
            sku: 'SENS-1',
            description: 'Sensor de oxígeno',
            quantity: 1,
            price: 145000,
            taxes: [{ tax_category: 'IVA', tax_rate: 19 }],
          },
        ],
      },
    },
    responsePayload: {
      customer: { city: 'CHIA', department: 'CUNDINAMARCA' },
      validation_date: null,
    },
    ...overrides,
  } as Invoice;
}

describe('buildInvoiceTicket', () => {
  it('assembles the header from the stored invoice', () => {
    const ticket = buildInvoiceTicket(makeInvoice(), resolution);

    expect(ticket).toMatchObject({
      number: 'FEE1789500028',
      operationType: 'Estándar',
      issuedAt: '2026-09-21T18:03:48.000Z',
      dueDate: '2026-09-21',
      currency: 'COP',
      cufe: 'abc123cufe',
      dianStatus: 'DIAN_NO_ENVIADO',
    });
  });

  it('falls back to prefix + number when Dataico gave no number', () => {
    const ticket = buildInvoiceTicket(
      makeInvoice({ dataicoNumber: null }),
      resolution,
    );

    expect(ticket.number).toBe('FEE1789500028');
  });

  describe('payment', () => {
    it.each([
      ['CASH', 'Efectivo'],
      ['CARD', 'Tarjeta'],
      ['BANK_TRANSFER', 'Transferencia'],
      ['SOMETHING_ELSE', 'SOMETHING_ELSE'],
    ])('labels %s as %s', (code, label) => {
      const invoice = makeInvoice();
      (
        invoice.requestPayload as { invoice: { payment_means: string } }
      ).invoice.payment_means = code;

      expect(buildInvoiceTicket(invoice, resolution).paymentMeans).toBe(label);
    });

    it('is Contado when paid the same day and Crédito when the payment date is later', () => {
      expect(buildInvoiceTicket(makeInvoice(), resolution).paymentForm).toBe(
        'Contado',
      );
      expect(
        buildInvoiceTicket(
          makeInvoice({ paymentDate: '2026-10-21' }),
          resolution,
        ).paymentForm,
      ).toBe('Crédito');
    });
  });

  describe('customer', () => {
    it('uses the person name and the city/department NAMES Dataico echoed', () => {
      const { customer } = buildInvoiceTicket(makeInvoice(), resolution);

      expect(customer).toEqual({
        name: 'JORGE PARDO',
        identificationType: 'CC',
        identification: '79456123',
        email: 'jorge@example.com',
        address: 'Calle 3 #5-20',
        city: 'CHIA, CUNDINAMARCA',
      });
    });

    it('prefers the company name', () => {
      const invoice = makeInvoice();
      (
        invoice.requestPayload as {
          invoice: { customer: { company_name: string } };
        }
      ).invoice.customer.company_name = 'ACME SAS';

      expect(buildInvoiceTicket(invoice, resolution).customer.name).toBe(
        'ACME SAS',
      );
    });

    it('falls back to the identification when there is no name at all', () => {
      const invoice = makeInvoice({
        customerFirstName: null,
        customerFamilyName: null,
        requestPayload: { invoice: { items: [] } },
      });

      expect(buildInvoiceTicket(invoice, resolution).customer.name).toBe(
        '79456123',
      );
    });

    it('has no city when Dataico echoed none, and no address when none was sent', () => {
      const { customer } = buildInvoiceTicket(
        makeInvoice({
          responsePayload: {},
          requestPayload: { invoice: { customer: {}, items: [] } },
        }),
        resolution,
      );

      expect(customer.city).toBeNull();
      expect(customer.address).toBeNull();
    });
  });

  describe('lines and totals', () => {
    it('prints the pre-tax value of each line and adds IVA on top', () => {
      const ticket = buildInvoiceTicket(makeInvoice(), resolution);

      expect(ticket.items).toEqual([
        {
          description: 'Sensor de oxígeno',
          quantity: 1,
          unit: 'EA',
          value: 145000,
          taxRate: 19,
        },
      ]);
      expect(ticket.subtotal).toBe(145000);
      expect(ticket.taxes).toEqual([{ rate: 19, amount: 27550 }]);
      expect(ticket.total).toBe(172550);
    });

    it('multiplies by the quantity', () => {
      const invoice = makeInvoice({
        requestPayload: {
          invoice: {
            items: [
              {
                sku: 'A',
                description: 'Filtro',
                quantity: 3,
                price: 10000,
                taxes: [{ tax_rate: 19 }],
              },
            ],
          },
        },
      });

      const ticket = buildInvoiceTicket(invoice, resolution);

      expect(ticket.items[0].value).toBe(30000);
      expect(ticket.taxes).toEqual([{ rate: 19, amount: 5700 }]);
    });

    it('leaves exempt lines out of the taxes but keeps them in the subtotal', () => {
      const invoice = makeInvoice({
        totalAmount: 130000,
        requestPayload: {
          invoice: {
            items: [
              {
                sku: 'A',
                description: 'Con IVA',
                quantity: 1,
                price: 100000,
                taxes: [{ tax_rate: 19 }],
              },
              {
                sku: 'B',
                description: 'Exento',
                quantity: 1,
                price: 30000,
                taxes: [],
              },
            ],
          },
        },
      });

      const ticket = buildInvoiceTicket(invoice, resolution);

      expect(ticket.subtotal).toBe(130000);
      expect(ticket.taxes).toEqual([{ rate: 19, amount: 19000 }]);
      expect(ticket.items[1].taxRate).toBe(0);
    });

    it('adds up the IVA that was sent on each line, in centavos, so base + IVA is the price', () => {
      const invoice = makeInvoice({
        totalAmount: 85000,
        requestPayload: {
          invoice: {
            items: [
              {
                sku: 'A',
                description: 'x',
                quantity: 1,
                price: 71428.5714,
                taxes: [{ tax_rate: 19, tax_amount: 13571.43 }],
              },
            ],
          },
        },
      });

      const ticket = buildInvoiceTicket(invoice, resolution);

      expect(ticket.subtotal).toBe(71428.57);
      expect(ticket.taxes).toEqual([{ rate: 19, amount: 13571.43 }]);
      expect(ticket.total).toBe(85000);
    });

    it('works the IVA out of the rate when the stored line has none', () => {
      const invoice = makeInvoice({
        requestPayload: {
          invoice: {
            items: [
              {
                sku: 'A',
                description: 'x',
                quantity: 1,
                price: 999,
                taxes: [{ tax_rate: 19 }],
              },
              {
                sku: 'B',
                description: 'y',
                quantity: 1,
                price: 999,
                taxes: [{ tax_rate: 19 }],
              },
            ],
          },
        },
      });

      // each line: 999 x 19% = 189.81, so 379.62
      expect(buildInvoiceTicket(invoice, resolution).taxes).toEqual([
        { rate: 19, amount: 379.62 },
      ]);
    });

    it('reports the total exactly as stored', () => {
      expect(
        buildInvoiceTicket(makeInvoice({ totalAmount: 555 }), resolution).total,
      ).toBe(555);
    });

    it('has no lines when the stored request has none', () => {
      const ticket = buildInvoiceTicket(
        makeInvoice({ requestPayload: null }),
        resolution,
      );

      expect(ticket.items).toEqual([]);
      expect(ticket.subtotal).toBe(0);
      expect(ticket.taxes).toEqual([]);
    });
  });

  describe('DIAN validation', () => {
    it.each([
      ['DIAN_ACEPTADO', true],
      ['ACEPTADO', true],
      ['DIAN_NO_ENVIADO', false],
      ['DIAN_RECHAZADO', false],
      [null, false],
    ])('%s -> validated %s', (status, expected) => {
      expect(
        buildInvoiceTicket(makeInvoice({ dianStatus: status }), resolution)
          .isDianValidated,
      ).toBe(expected);
    });

    it('passes the validation date through only when Dataico returned one', () => {
      expect(
        buildInvoiceTicket(makeInvoice(), resolution).validatedAt,
      ).toBeNull();
      expect(
        buildInvoiceTicket(
          makeInvoice({
            responsePayload: { validation_date: '21/09/2026 09:34' },
          }),
          resolution,
        ).validatedAt,
      ).toBe('21/09/2026 09:34');
    });
  });

  describe('numbering authorization', () => {
    it('carries the resolution number, prefix, validity and range', () => {
      expect(
        buildInvoiceTicket(makeInvoice(), resolution).authorization,
      ).toEqual({
        resolutionNumber: '18760000001',
        prefix: 'FEE',
        startDate: '2019-01-19',
        endDate: '2030-01-19',
        rangeStart: 1,
        rangeEnd: 1900000000,
      });
    });

    it('still prints number and prefix when the resolution row is gone', () => {
      expect(buildInvoiceTicket(makeInvoice(), null).authorization).toEqual({
        resolutionNumber: '18760000001',
        prefix: 'FEE',
        startDate: null,
        endDate: null,
        rangeStart: null,
        rangeEnd: null,
      });
    });
  });

  it('passes the QR text through, or null when there is none', () => {
    expect(buildInvoiceTicket(makeInvoice(), resolution).qrCode).toContain(
      'dian.gov.co',
    );
    expect(
      buildInvoiceTicket(makeInvoice({ qrCode: null }), resolution).qrCode,
    ).toBeNull();
  });
});
