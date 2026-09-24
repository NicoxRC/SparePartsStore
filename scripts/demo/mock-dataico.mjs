/**
 * Local stand-in for Dataico, for demos only (`scripts/demo/start-demo.sh`).
 * Nothing here ever reaches the real Dataico or the DIAN: the demo API is
 * started with DATAICO_BASE_URL pointing at this server.
 *
 * It answers only the calls this app makes, with the fields the app reads
 * (see DataicoInvoiceResponse in invoices.service.ts and
 * DataicoThirdPartyResponse) — it is not a model of Dataico's API.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_DATAICO_PORT ?? 4010);
const BASE = `http://localhost:${PORT}`;

/** The document responses the app stores, keyed by number and by uuid. */
const documents = new Map();

function documentResponse(number) {
  const existing = documents.get(number);
  if (existing) return existing;
  const uuid = randomUUID();
  const doc = {
    number,
    uuid,
    dian_status: 'DIAN_ACEPTADO',
    customer_status: 'PENDIENTE',
    email_status: 'NO_ENVIADO',
    cufe: randomBytes(48).toString('hex'),
    xml_url: `${BASE}/files/${uuid}.xml`,
    pdf_url: `${BASE}/files/${uuid}.pdf`,
    qrcode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=DEMO-${uuid}`,
    dian_messages: [],
  };
  documents.set(number, doc);
  documents.set(uuid, doc);
  return doc;
}

/** `{ actions, invoice | credit_note | debit_note: { number, numbering: { prefix } } }` */
function numberFromBody(body) {
  const key = Object.keys(body ?? {}).find((k) => k !== 'actions');
  const doc = key ? body[key] : {};
  return `${doc?.numbering?.prefix ?? ''}${doc?.number ?? Date.now()}`;
}

const FIRST_NAMES = ['Andrés', 'Camila', 'Jorge', 'Valentina', 'Luis', 'Daniela'];
const LAST_NAMES = ['Guerrero', 'Burbano', 'Benavides', 'Rosero', 'Castillo', 'Ortiz'];

function thirdParty(url) {
  const identification = url.searchParams.get('identification') ?? '';
  const type = url.searchParams.get('identification_type') ?? 'CC';
  const seed = [...identification].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  if (type === 'NIT') {
    return {
      identification,
      identification_type: type,
      company_name: `TRANSPORTES DEMO ${identification.slice(-3)} SAS`,
      email: `contabilidad${identification.slice(-3)}@demo.com`,
    };
  }
  return {
    identification,
    identification_type: type,
    first_name: FIRST_NAMES[seed % FIRST_NAMES.length],
    family_name: LAST_NAMES[seed % LAST_NAMES.length],
    second_last_name: LAST_NAMES[(seed + 3) % LAST_NAMES.length],
    email: `cliente${identification.slice(-4)}@demo.com`,
  };
}

/** A one-page PDF saying this is a demo document, so "Ver factura" opens something. */
function demoPdf(title) {
  const text = `(${title.replace(/[()\\]/g, '')}) Tj`;
  const content = `BT /F1 20 Tf 60 740 Td (Documento de demostracion) Tj 0 -32 Td /F1 12 Tf ${text} 0 -20 Td (Generado por el Dataico simulado - no es una factura real.) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', BASE);
    const body = raw ? JSON.parse(raw) : undefined;
    const path = url.pathname;
    console.log(`${req.method} ${path}${url.search}`);

    if (req.method === 'GET' && path.startsWith('/files/')) {
      const id = path.slice('/files/'.length).replace(/\.(pdf|xml)$/, '');
      const doc = documents.get(id);
      const title = doc ? `Documento ${doc.number}` : 'Documento';
      return path.endsWith('.xml')
        ? send(res, 200, `<Demo number="${doc?.number ?? ''}"/>`, 'application/xml')
        : send(res, 200, demoPdf(title), 'application/pdf');
    }
    if (req.method === 'GET' && path === '/dian_terceros') {
      return send(res, 200, thirdParty(url));
    }
    if (req.method === 'POST' && ['/invoices', '/credit_notes', '/debit_notes'].includes(path)) {
      return send(res, 201, documentResponse(numberFromBody(body)));
    }
    if (req.method === 'PUT' && path.startsWith('/invoices/')) {
      const doc = documents.get(path.slice('/invoices/'.length));
      return doc ? send(res, 200, doc) : send(res, 404, { errors: ['Factura no encontrada'] });
    }
    if (req.method === 'GET' && path === '/invoices') {
      return send(res, 200, documentResponse(url.searchParams.get('number') ?? ''));
    }
    if (req.method === 'POST' && path.startsWith('/numberings/sync_dian/')) {
      return send(res, 200, {});
    }
    send(res, 404, { errors: [`Dataico simulado: ${req.method} ${path} no está soportado`] });
  });
}).listen(PORT, () => console.log(`Dataico simulado escuchando en ${BASE}`));
