import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { normalizeProductReference } from '../../products/product-normalize.util';
import { parseNit } from '../supplier-nit.util';

export const MAX_INVOICE_LINES = 500;

export interface ParsedInvoiceLine {
  /** 1-based position in the document (not the XML's own line id). */
  lineNumber: number;
  reference: string | null;
  description: string | null;
  /** Exactly what the XML said; 0 when it was missing/unreadable. */
  xmlQuantity: number;
  /** Integer > 0, or null when the reviewer has to type it. */
  quantity: number | null;
  /** Only the Excel template carries a price; the XML parser leaves it out. */
  salePrice?: number | null;
}

export interface ParsedPurchaseInvoice {
  invoiceNumber: string;
  issueDate: string;
  cufe: string | null;
  supplier: { nit: string; dv: string | null; name: string };
  lines: ParsedInvoiceLine[];
}

type XmlNode = Record<string, unknown>;

const FORBIDDEN_DTD = /<!DOCTYPE|<!ENTITY/i;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function fail(code: string, message: string): never {
  throw new UnprocessableEntityException({ code, message });
}

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const BYTE_ORDER_MARK = 0xfeff;

function stripBom(value: string): string {
  return value.charCodeAt(0) === BYTE_ORDER_MARK ? value.slice(1) : value;
}

/** An element that repeats parses to an array; the first one is what we want. */
function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? (value as unknown[])[0] : value;
}

/** Reads one key from a node, ignoring inherited/unsafe keys from file content. */
function read(node: unknown, key: string): unknown {
  const target = firstOf(node);
  if (!isNode(target) || UNSAFE_KEYS.has(key)) return undefined;
  return Object.prototype.hasOwnProperty.call(target, key)
    ? target[key]
    : undefined;
}

function path(node: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((current, key) => read(current, key), node);
}

/**
 * Element text. An element carrying attributes (e.g. `<cbc:UUID
 * schemeName="CUFE-SHA384">abc</cbc:UUID>`) parses to `{ '#text': 'abc', ... }`.
 */
function text(value: unknown): string | null {
  const target = firstOf(value);
  const raw = isNode(target) ? target['#text'] : target;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const trimmed = String(raw).trim();
    return trimmed === '' ? null : trimmed;
  }
  return null;
}

function attribute(value: unknown, name: string): string | null {
  const target = firstOf(value);
  if (!isNode(target)) return null;
  const raw = target[`@_${name}`];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function parseDecimal(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

@Injectable()
export class PurchaseInvoiceXmlParser {
  // parseTagValue/parseAttributeValue false is load-bearing: with the defaults
  // a reference like "00123" becomes the number 123 and a NIT loses its
  // leading zeros. Every value stays a string until converted on purpose.
  private readonly xml = new XMLParser({
    removeNSPrefix: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => name === 'InvoiceLine',
  });

  parse(buffer: Buffer): ParsedPurchaseInvoice {
    const source = stripBom(buffer.toString('utf8'));
    if (source.trim() === '') {
      fail('INVALID_XML', 'El archivo está vacío.');
    }

    let root = this.parseDocument(source);

    if (root.name === 'AttachedDocument') {
      root = this.unwrapAttachedDocument(root.node);
    }

    if (root.name === 'CreditNote' || root.name === 'DebitNote') {
      fail(
        'UNSUPPORTED_DOCUMENT',
        'El archivo es una nota crédito/débito, no una factura de venta.',
      );
    }
    if (root.name !== 'Invoice') {
      fail(
        'UNSUPPORTED_DOCUMENT',
        'El archivo no es una factura electrónica (UBL Invoice).',
      );
    }

    return this.extractInvoice(root.node);
  }

  private parseDocument(source: string): { name: string; node: XmlNode } {
    // DIAN UBL never carries a DTD. Rejecting it before parsing closes XXE and
    // entity-expansion attacks without depending on parser settings.
    if (FORBIDDEN_DTD.test(source)) {
      fail(
        'FORBIDDEN_DOCTYPE',
        'El XML contiene una definición DOCTYPE/ENTITY, que no se permite.',
      );
    }
    if (XMLValidator.validate(source) !== true) {
      fail('INVALID_XML', 'El archivo no es un XML válido.');
    }

    let parsed: unknown;
    try {
      parsed = this.xml.parse(source);
    } catch {
      // The library itself refuses hostile tag names such as `__proto__`.
      fail('INVALID_XML', 'El archivo no es un XML válido.');
    }
    if (!isNode(parsed)) {
      fail('INVALID_XML', 'El archivo no es un XML válido.');
    }
    const name = Object.keys(parsed).find(
      (key) => !key.startsWith('?') && !UNSAFE_KEYS.has(key),
    );
    const node = name ? parsed[name] : undefined;
    if (!name || !isNode(node)) {
      fail('INVALID_XML', 'El archivo no es un XML válido.');
    }
    return { name, node };
  }

  /**
   * Received invoices often arrive wrapped in an AttachedDocument whose real,
   * signed Invoice sits (CDATA or entity-escaped) in
   * Attachment/ExternalReference/Description. One level only.
   */
  private unwrapAttachedDocument(node: XmlNode): {
    name: string;
    node: XmlNode;
  } {
    const candidates = toArray(
      path(node, 'Attachment', 'ExternalReference', 'Description'),
    ).map((value) => (typeof value === 'string' ? value : text(value)));
    const inner = candidates.find(
      (value): value is string =>
        typeof value === 'string' && value.includes('<'),
    );
    if (!inner) {
      fail(
        'ATTACHED_DOCUMENT_WITHOUT_INVOICE',
        'El documento adjunto no contiene una factura dentro.',
      );
    }
    return this.parseDocument(stripBom(inner));
  }

  private extractInvoice(invoice: XmlNode): ParsedPurchaseInvoice {
    const invoiceNumber = text(read(invoice, 'ID'))?.toUpperCase() ?? null;
    if (!invoiceNumber || invoiceNumber.length > 50) {
      fail(
        'MISSING_INVOICE_NUMBER',
        'No se encontró un número de factura válido en el XML.',
      );
    }

    const issueDate = text(read(invoice, 'IssueDate'));
    if (!issueDate || !this.isValidDate(issueDate)) {
      fail(
        'MISSING_ISSUE_DATE',
        'No se encontró una fecha de emisión válida en el XML.',
      );
    }

    const cufe = text(read(invoice, 'UUID'))?.toLowerCase() ?? null;

    const supplier = this.extractSupplier(invoice);

    const lines = toArray(read(invoice, 'InvoiceLine'));
    if (lines.length === 0) {
      fail('NO_LINES', 'La factura no tiene líneas de producto.');
    }
    if (lines.length > MAX_INVOICE_LINES) {
      fail(
        'TOO_MANY_LINES',
        `La factura tiene más de ${MAX_INVOICE_LINES} líneas; divídela antes de cargarla.`,
      );
    }

    return {
      invoiceNumber,
      issueDate,
      cufe,
      supplier,
      lines: lines.map((line, index) => this.extractLine(line, index + 1)),
    };
  }

  private extractSupplier(invoice: XmlNode): ParsedPurchaseInvoice['supplier'] {
    const party = path(invoice, 'AccountingSupplierParty', 'Party');
    const taxScheme = path(party, 'PartyTaxScheme');
    const legalEntity = path(party, 'PartyLegalEntity');

    const companyId =
      read(taxScheme, 'CompanyID') ?? read(legalEntity, 'CompanyID');
    const parsedNit = parseNit(
      text(companyId),
      attribute(companyId, 'schemeID'),
    );
    if (!parsedNit) {
      fail(
        'MISSING_SUPPLIER',
        'No se encontró el NIT del proveedor en el XML.',
      );
    }
    const { nit, dv } = parsedNit;

    const person = path(party, 'Person');
    const personName = [
      text(read(person, 'FirstName')),
      text(read(person, 'FamilyName')),
    ]
      .filter(Boolean)
      .join(' ');

    const name = firstText(
      read(taxScheme, 'RegistrationName'),
      read(legalEntity, 'RegistrationName'),
      path(party, 'PartyName', 'Name'),
      personName,
    );
    if (!name) {
      fail(
        'MISSING_SUPPLIER',
        'No se encontró el nombre del proveedor en el XML.',
      );
    }

    return { nit, dv, name };
  }

  private extractLine(line: unknown, lineNumber: number): ParsedInvoiceLine {
    const item = read(line, 'Item');

    const xmlQuantity = parseDecimal(text(read(line, 'InvoicedQuantity'))) ?? 0;
    const quantity =
      Number.isInteger(xmlQuantity) && xmlQuantity > 0 ? xmlQuantity : null;

    const description = firstText(
      read(item, 'Description'),
      read(item, 'Name'),
    );

    const rawReference = firstText(
      path(item, 'SellersItemIdentification', 'ID'),
      path(item, 'StandardItemIdentification', 'ID'),
    );
    const reference = rawReference
      ? normalizeProductReference(rawReference)
      : null;

    return {
      lineNumber,
      reference: reference && reference.length <= 100 ? reference : null,
      description: description ? description.slice(0, 255) : null,
      xmlQuantity,
      quantity,
    };
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }
}
