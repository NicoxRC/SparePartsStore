import { UnprocessableEntityException } from '@nestjs/common';
import {
  MAX_INVOICE_LINES,
  PurchaseInvoiceXmlParser,
} from './purchase-invoice-xml.parser';

// Hand-made fixtures shaped after the public DIAN UBL 2.1 conventions — NOT a
// real supplier file (none has been shared yet). Placeholder values only.
const NS =
  'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ' +
  'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ' +
  'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"';

interface LineOpts {
  qty?: string | null;
  description?: string | null;
  name?: string | null;
  sellerId?: string | null;
  standardId?: string | null;
  price?: string | null;
  baseQuantity?: string | null;
}

function line(opts: LineOpts = {}): string {
  const {
    qty = '2.000000',
    description = 'Filtro de aceite',
    name = null,
    sellerId = 'ABC-1',
    standardId = null,
    price = '10000.00',
    baseQuantity = null,
  } = opts;
  return `
    <cac:InvoiceLine>
      <cbc:ID>1</cbc:ID>
      ${qty === null ? '' : `<cbc:InvoicedQuantity unitCode="EA">${qty}</cbc:InvoicedQuantity>`}
      <cac:Item>
        ${description === null ? '' : `<cbc:Description>${description}</cbc:Description>`}
        ${name === null ? '' : `<cbc:Name>${name}</cbc:Name>`}
        ${sellerId === null ? '' : `<cac:SellersItemIdentification><cbc:ID>${sellerId}</cbc:ID></cac:SellersItemIdentification>`}
        ${standardId === null ? '' : `<cac:StandardItemIdentification><cbc:ID>${standardId}</cbc:ID></cac:StandardItemIdentification>`}
      </cac:Item>
      ${
        price === null
          ? ''
          : `<cac:Price><cbc:PriceAmount currencyID="COP">${price}</cbc:PriceAmount>${
              baseQuantity === null
                ? ''
                : `<cbc:BaseQuantity unitCode="EA">${baseQuantity}</cbc:BaseQuantity>`
            }</cac:Price>`
      }
    </cac:InvoiceLine>`;
}

interface InvoiceOpts {
  id?: string | null;
  issueDate?: string | null;
  uuid?: string | null;
  party?: string;
  lines?: string;
  prolog?: string;
}

const DEFAULT_PARTY = `
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>Distribuidora Uno SAS</cbc:RegistrationName>
        <cbc:CompanyID schemeID="7" schemeName="31">900123456</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>`;

function invoice(opts: InvoiceOpts = {}): string {
  const {
    id = 'SETP990000001',
    issueDate = '2026-09-01',
    uuid = 'ABCDEF0123',
    party = DEFAULT_PARTY,
    lines = line(),
    prolog = '<?xml version="1.0" encoding="UTF-8"?>',
  } = opts;
  return `${prolog}
<Invoice ${NS}>
  ${id === null ? '' : `<cbc:ID>${id}</cbc:ID>`}
  ${issueDate === null ? '' : `<cbc:IssueDate>${issueDate}</cbc:IssueDate>`}
  ${uuid === null ? '' : `<cbc:UUID schemeName="CUFE-SHA384">${uuid}</cbc:UUID>`}
  ${party}
  ${lines}
</Invoice>`;
}

function attached(inner: string, mode: 'cdata' | 'escaped' = 'cdata'): string {
  const body =
    mode === 'cdata'
      ? `<![CDATA[${inner}]]>`
      : inner
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>1</cbc:ID>
  <cac:Attachment>
    <cac:ExternalReference>
      <cbc:Description>${body}</cbc:Description>
    </cac:ExternalReference>
  </cac:Attachment>
</AttachedDocument>`;
}

describe('PurchaseInvoiceXmlParser', () => {
  const parser = new PurchaseInvoiceXmlParser();
  const parse = (xml: string) => parser.parse(Buffer.from(xml, 'utf8'));

  function codeOf(xml: string): string | undefined {
    try {
      parse(xml);
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      const body = (error as UnprocessableEntityException).getResponse() as {
        code: string;
      };
      return body.code;
    }
    return undefined;
  }

  describe('document detection', () => {
    it('parses a bare Invoice', () => {
      const result = parse(invoice());

      expect(result.invoiceNumber).toBe('SETP990000001');
      expect(result.issueDate).toBe('2026-09-01');
      expect(result.cufe).toBe('abcdef0123');
      expect(result.supplier).toEqual({
        nit: '900123456',
        dv: '7',
        name: 'Distribuidora Uno SAS',
      });
      expect(result.lines).toHaveLength(1);
    });

    it('unwraps an AttachedDocument with a CDATA inner invoice', () => {
      const result = parse(attached(invoice()));

      expect(result.invoiceNumber).toBe('SETP990000001');
      expect(result.lines).toHaveLength(1);
    });

    it('unwraps an AttachedDocument with an entity-escaped inner invoice', () => {
      const result = parse(attached(invoice(), 'escaped'));

      expect(result.invoiceNumber).toBe('SETP990000001');
    });

    it('rejects an AttachedDocument without an inner invoice', () => {
      const xml = attached('no xml here');

      expect(codeOf(xml)).toBe('ATTACHED_DOCUMENT_WITHOUT_INVOICE');
    });

    it('rejects an AttachedDocument whose inner document is not an Invoice', () => {
      const inner = '<ApplicationResponse><ID>1</ID></ApplicationResponse>';

      expect(codeOf(attached(inner))).toBe('UNSUPPORTED_DOCUMENT');
    });

    it.each(['CreditNote', 'DebitNote'])('rejects a %s root', (root) => {
      expect(codeOf(`<?xml version="1.0"?><${root}><ID>1</ID></${root}>`)).toBe(
        'UNSUPPORTED_DOCUMENT',
      );
    });

    it('rejects any other root', () => {
      expect(codeOf('<html><body>hi</body></html>')).toBe(
        'UNSUPPORTED_DOCUMENT',
      );
    });

    it('rejects malformed XML', () => {
      expect(codeOf('<Invoice><ID>1</Invoice>')).toBe('INVALID_XML');
    });

    it('rejects a non-XML file', () => {
      expect(codeOf('just some text')).toBe('INVALID_XML');
    });

    it('rejects an empty file', () => {
      expect(codeOf('   ')).toBe('INVALID_XML');
    });

    it('strips a UTF-8 BOM', () => {
      expect(
        parse(`${String.fromCharCode(0xfeff)}${invoice()}`).invoiceNumber,
      ).toBe('SETP990000001');
    });

    it('handles a document with no prefixes / different prefixes', () => {
      const xml = `<Invoice xmlns="urn:x"><ID>F1</ID><IssueDate>2026-01-02</IssueDate>
        <AccountingSupplierParty><Party><PartyTaxScheme>
          <RegistrationName>Prov</RegistrationName><CompanyID>800111222</CompanyID>
        </PartyTaxScheme></Party></AccountingSupplierParty>
        <InvoiceLine><InvoicedQuantity>3</InvoicedQuantity>
          <Item><Description>Bujia</Description></Item></InvoiceLine></Invoice>`;

      const result = parse(xml);

      expect(result.invoiceNumber).toBe('F1');
      expect(result.lines[0].quantity).toBe(3);
    });
  });

  describe('safety', () => {
    it('rejects a DOCTYPE in the outer document', () => {
      const xml = invoice({
        prolog: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY x "y">]>',
      });

      expect(codeOf(xml)).toBe('FORBIDDEN_DOCTYPE');
    });

    it('rejects an ENTITY declaration case-insensitively', () => {
      expect(codeOf('<?xml version="1.0"?><!entity x "y"><Invoice/>')).toBe(
        'FORBIDDEN_DOCTYPE',
      );
    });

    it('rejects a DOCTYPE hidden in an entity-escaped inner document', () => {
      const inner = invoice({
        prolog: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY x "y">]>',
      });

      expect(codeOf(attached(inner, 'escaped'))).toBe('FORBIDDEN_DOCTYPE');
    });

    it('rejects a DOCTYPE inside a CDATA inner document', () => {
      const inner = invoice({
        prolog: '<?xml version="1.0"?><!DOCTYPE foo>',
      });

      expect(codeOf(attached(inner, 'cdata'))).toBe('FORBIDDEN_DOCTYPE');
    });

    it('rejects hostile tag names without polluting prototypes', () => {
      const xml = invoice({
        lines: `${line()}<__proto__><polluted>yes</polluted></__proto__>`,
      });

      expect(codeOf(xml)).toBe('INVALID_XML');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe('header fields', () => {
    it.each([
      ['id', { id: null }, 'MISSING_INVOICE_NUMBER'],
      ['id too long', { id: 'X'.repeat(51) }, 'MISSING_INVOICE_NUMBER'],
      ['issue date', { issueDate: null }, 'MISSING_ISSUE_DATE'],
      ['bad issue date', { issueDate: '01/09/2026' }, 'MISSING_ISSUE_DATE'],
      ['impossible date', { issueDate: '2026-02-30' }, 'MISSING_ISSUE_DATE'],
      ['supplier', { party: '' }, 'MISSING_SUPPLIER'],
    ])('rejects a missing/invalid %s', (_label, opts, code) => {
      expect(codeOf(invoice(opts as InvoiceOpts))).toBe(code);
    });

    it('trims and uppercases the invoice number', () => {
      expect(parse(invoice({ id: ' setp-1 ' })).invoiceNumber).toBe('SETP-1');
    });

    it('returns a null CUFE when absent', () => {
      expect(parse(invoice({ uuid: null })).cufe).toBeNull();
    });

    it('reads the CUFE when the element carries attributes (already covered) and lowercases it', () => {
      expect(parse(invoice({ uuid: 'AbC123' })).cufe).toBe('abc123');
    });

    it('rejects an invoice with no lines', () => {
      expect(codeOf(invoice({ lines: '' }))).toBe('NO_LINES');
    });

    it('rejects more than the maximum number of lines', () => {
      const lines = line().repeat(MAX_INVOICE_LINES + 1);

      expect(codeOf(invoice({ lines }))).toBe('TOO_MANY_LINES');
    });

    it('accepts exactly the maximum number of lines', () => {
      const lines = line().repeat(MAX_INVOICE_LINES);

      expect(parse(invoice({ lines })).lines).toHaveLength(MAX_INVOICE_LINES);
    });
  });

  describe('supplier', () => {
    const party = (inner: string) => `
      <cac:AccountingSupplierParty><cac:Party>${inner}</cac:Party></cac:AccountingSupplierParty>`;

    it('falls back from PartyTaxScheme to PartyLegalEntity for NIT and name', () => {
      const xml = invoice({
        party: party(`<cac:PartyLegalEntity>
          <cbc:RegistrationName>Legal SA</cbc:RegistrationName>
          <cbc:CompanyID schemeID="3">800.111.222</cbc:CompanyID>
        </cac:PartyLegalEntity>`),
      });

      expect(parse(xml).supplier).toEqual({
        nit: '800111222',
        dv: '3',
        name: 'Legal SA',
      });
    });

    it('falls back to PartyName when there is no RegistrationName', () => {
      const xml = invoice({
        party:
          party(`<cac:PartyName><cbc:Name>Nombre Comercial</cbc:Name></cac:PartyName>
          <cac:PartyTaxScheme><cbc:CompanyID>900</cbc:CompanyID></cac:PartyTaxScheme>`),
      });

      expect(parse(xml).supplier.name).toBe('Nombre Comercial');
    });

    it('falls back to the natural person name', () => {
      const xml = invoice({
        party: party(`<cac:Person><cbc:FirstName>Ana</cbc:FirstName>
          <cbc:FamilyName>Perez</cbc:FamilyName></cac:Person>
          <cac:PartyTaxScheme><cbc:CompanyID>1017</cbc:CompanyID></cac:PartyTaxScheme>`),
      });

      expect(parse(xml).supplier.name).toBe('Ana Perez');
    });

    it('rejects a supplier without any name', () => {
      const xml = invoice({
        party: party(
          '<cac:PartyTaxScheme><cbc:CompanyID>900</cbc:CompanyID></cac:PartyTaxScheme>',
        ),
      });

      expect(codeOf(xml)).toBe('MISSING_SUPPLIER');
    });

    it('splits an inline check digit ("900.123.456-7")', () => {
      const xml = invoice({
        party:
          party(`<cac:PartyTaxScheme><cbc:RegistrationName>P</cbc:RegistrationName>
          <cbc:CompanyID>900.123.456-7</cbc:CompanyID></cac:PartyTaxScheme>`),
      });

      expect(parse(xml).supplier).toMatchObject({ nit: '900123456', dv: '7' });
    });

    it('keeps leading zeros in the NIT', () => {
      const xml = invoice({
        party:
          party(`<cac:PartyTaxScheme><cbc:RegistrationName>P</cbc:RegistrationName>
          <cbc:CompanyID>0012345</cbc:CompanyID></cac:PartyTaxScheme>`),
      });

      expect(parse(xml).supplier.nit).toBe('0012345');
    });

    it('ignores a non-digit schemeID as DV', () => {
      const xml = invoice({
        party:
          party(`<cac:PartyTaxScheme><cbc:RegistrationName>P</cbc:RegistrationName>
          <cbc:CompanyID schemeID="NIT">900123456</cbc:CompanyID></cac:PartyTaxScheme>`),
      });

      expect(parse(xml).supplier.dv).toBeNull();
    });
  });

  describe('lines', () => {
    it('handles a single InvoiceLine and several', () => {
      expect(parse(invoice({ lines: line() })).lines).toHaveLength(1);
      expect(
        parse(invoice({ lines: line() + line({ sellerId: 'X-2' }) })).lines,
      ).toHaveLength(2);
    });

    it('numbers lines 1-based in document order', () => {
      const lines = line({ sellerId: 'A' }) + line({ sellerId: 'B' });

      expect(
        parse(invoice({ lines })).lines.map((l) => [l.lineNumber, l.reference]),
      ).toEqual([
        [1, 'A'],
        [2, 'B'],
      ]);
    });

    describe('quantity', () => {
      it.each([
        ['2.000000', 2, 2],
        ['5', 5, 5],
        ['1.5', 1.5, null],
        ['0', 0, null],
        ['-3', -3, null],
        ['abc', 0, null],
      ])(
        '"%s" -> xmlQuantity %s, quantity %s',
        (raw, xmlQuantity, quantity) => {
          const [parsed] = parse(invoice({ lines: line({ qty: raw }) })).lines;

          expect(parsed.xmlQuantity).toBe(xmlQuantity);
          expect(parsed.quantity).toBe(quantity);
        },
      );

      it('leaves quantity for the reviewer when the element is missing', () => {
        const [parsed] = parse(invoice({ lines: line({ qty: null }) })).lines;

        expect(parsed.xmlQuantity).toBe(0);
        expect(parsed.quantity).toBeNull();
      });
    });

    describe('reference', () => {
      it('prefers the seller id, trimmed and uppercased', () => {
        const [parsed] = parse(
          invoice({ lines: line({ sellerId: ' ab-1 ', standardId: 'STD' }) }),
        ).lines;

        expect(parsed.reference).toBe('AB-1');
      });

      it('falls back to the standard id', () => {
        const [parsed] = parse(
          invoice({ lines: line({ sellerId: null, standardId: '7701234' }) }),
        ).lines;

        expect(parsed.reference).toBe('7701234');
      });

      it('is null when there is no usable code', () => {
        const [parsed] = parse(
          invoice({ lines: line({ sellerId: null }) }),
        ).lines;

        expect(parsed.reference).toBeNull();
      });

      it('is null when longer than 100 chars', () => {
        const [parsed] = parse(
          invoice({ lines: line({ sellerId: 'X'.repeat(101) }) }),
        ).lines;

        expect(parsed.reference).toBeNull();
      });

      it('keeps leading zeros', () => {
        const [parsed] = parse(
          invoice({ lines: line({ sellerId: '00123' }) }),
        ).lines;

        expect(parsed.reference).toBe('00123');
      });
    });

    describe('description', () => {
      it('uses Description', () => {
        expect(
          parse(invoice({ lines: line({ description: 'Bujia NGK' }) })).lines[0]
            .description,
        ).toBe('Bujia NGK');
      });

      it('falls back to Name', () => {
        const [parsed] = parse(
          invoice({ lines: line({ description: null, name: 'Solo nombre' }) }),
        ).lines;

        expect(parsed.description).toBe('Solo nombre');
      });

      it('uses the first when repeated', () => {
        const xml = invoice({
          lines: `<cac:InvoiceLine><cbc:InvoicedQuantity>1</cbc:InvoicedQuantity>
            <cac:Item><cbc:Description>Primera</cbc:Description>
            <cbc:Description>Segunda</cbc:Description></cac:Item></cac:InvoiceLine>`,
        });

        expect(parse(xml).lines[0].description).toBe('Primera');
      });

      it('is null when absent', () => {
        expect(
          parse(invoice({ lines: line({ description: null }) })).lines[0]
            .description,
        ).toBeNull();
      });

      it('truncates to 255 chars', () => {
        const [parsed] = parse(
          invoice({ lines: line({ description: 'D'.repeat(300) }) }),
        ).lines;

        expect(parsed.description).toHaveLength(255);
      });
    });
  });
});
