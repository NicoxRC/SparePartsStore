import 'dotenv/config';
import { getStoreToday } from '../../common/utils/store-date.util';
import dataSource from '../data-source';

/**
 * Fills a DEMO database with a fictional product catalog (departments,
 * groups, brands, products with stock) plus one login per role, so the app
 * can be shown live — see scripts/demo/start-demo.sh, the only intended way
 * to run this. No sales, customers or cash registers: those are created
 * live during the demo.
 *
 * Goes through the running API so stock movements are recorded by the real
 * services. A DIAN resolution is registered too (live sales need one), which
 * calls Dataico — so this refuses to run unless DATAICO_BASE_URL points at
 * the local mock.
 */

const API_URL = `http://localhost:${process.env.PORT ?? '3000'}/api`;
const DEMO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Demo1234!';

function assertDemoEnvironment(): void {
  const dbName = process.env.DB_NAME ?? '';
  const dataicoUrl = process.env.DATAICO_BASE_URL ?? '';
  if (!dbName.endsWith('_demo')) {
    throw new Error(
      `DB_NAME="${dbName}" no termina en "_demo" — este seed solo corre sobre la base de demostración.`,
    );
  }
  if (!/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(dataicoUrl)) {
    throw new Error(
      'DATAICO_BASE_URL no apunta al Dataico simulado local — el seed registraría la resolución en el Dataico real.',
    );
  }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
let accessToken = '';

async function api<T>(
  method: string,
  route: string,
  body?: unknown,
): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${route} -> ${response.status}: ${text}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

async function login(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SEED_ADMIN_EMAIL,
      password: DEMO_PASSWORD,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Login del admin falló (${response.status}): ${await response.text()}`,
    );
  }
  accessToken = ((await response.json()) as { accessToken: string })
    .accessToken;
}

// ---------------------------------------------------------------------------
// Fictional data
// ---------------------------------------------------------------------------
const DEPARTMENTS = [
  'CHEVROLET',
  'RENAULT',
  'MAZDA',
  'TOYOTA',
  'NISSAN',
  'HYUNDAI',
  'KIA',
  'VARIOS',
];
const GROUPS = [
  'MOTOR',
  'FRENOS',
  'SUSPENSION Y DIRECCION',
  'ELECTRICOS',
  'FILTROS',
  'LUBRICANTES',
  'TRANSMISION',
  'ACCESORIOS',
];
const BRANDS = [
  'BOSCH',
  'NGK',
  'MOBIL',
  'CASTROL',
  'GATES',
  'MONROE',
  'VALEO',
  'DENSO',
  'SKF',
  'FRAM',
  'TRW',
  'LUK',
  'MANN-FILTER',
  'GENERICO',
];

/** [reference, description, salePrice (IVA incluido), stock, department, group, brand] */
type ProductRow = [string, string, number, number, string, string, string];
const PRODUCTS: ProductRow[] = [
  [
    'BK-0986AB',
    'PASTILLAS FRENO DELANTERAS AVEO',
    98000,
    14,
    'CHEVROLET',
    'FRENOS',
    'BOSCH',
  ],
  [
    'BK-0986AC',
    'PASTILLAS FRENO DELANTERAS SPARK GT',
    89000,
    12,
    'CHEVROLET',
    'FRENOS',
    'BOSCH',
  ],
  [
    'TRW-DF4432',
    'DISCO FRENO DELANTERO LOGAN / SANDERO',
    145000,
    8,
    'RENAULT',
    'FRENOS',
    'TRW',
  ],
  [
    'TRW-GDB3456',
    'PASTILLAS FRENO MAZDA 3 2014-2019',
    132000,
    10,
    'MAZDA',
    'FRENOS',
    'TRW',
  ],
  [
    'BK-BANDA-HIL',
    'BANDAS FRENO TRASERAS HILUX',
    118000,
    6,
    'TOYOTA',
    'FRENOS',
    'BOSCH',
  ],
  [
    'LIQ-DOT4-500',
    'LIQUIDO DE FRENOS DOT4 500ML',
    24000,
    30,
    'VARIOS',
    'FRENOS',
    'BOSCH',
  ],
  [
    'FR-PH6607',
    'FILTRO ACEITE SPARK / AVEO',
    18000,
    40,
    'CHEVROLET',
    'FILTROS',
    'FRAM',
  ],
  [
    'FR-PH4967',
    'FILTRO ACEITE LOGAN / DUSTER',
    19500,
    35,
    'RENAULT',
    'FILTROS',
    'FRAM',
  ],
  [
    'MN-C2433',
    'FILTRO AIRE MAZDA 2 / 3',
    42000,
    16,
    'MAZDA',
    'FILTROS',
    'MANN-FILTER',
  ],
  [
    'MN-C3698',
    'FILTRO AIRE HILUX / FORTUNER',
    58000,
    9,
    'TOYOTA',
    'FILTROS',
    'MANN-FILTER',
  ],
  [
    'BK-F026402',
    'FILTRO COMBUSTIBLE UNIVERSAL',
    36000,
    20,
    'VARIOS',
    'FILTROS',
    'BOSCH',
  ],
  [
    'MN-CU2442',
    'FILTRO CABINA (AIRE ACONDICIONADO) TUCSON',
    48000,
    0,
    'HYUNDAI',
    'FILTROS',
    'MANN-FILTER',
  ],
  [
    'MB-20W50-GL',
    'ACEITE MOBIL SUPER 20W50 GALON',
    138000,
    25,
    'VARIOS',
    'LUBRICANTES',
    'MOBIL',
  ],
  [
    'MB-10W30-QT',
    'ACEITE MOBIL SUPER 10W30 CUARTO',
    38000,
    48,
    'VARIOS',
    'LUBRICANTES',
    'MOBIL',
  ],
  [
    'CS-5W30-QT',
    'ACEITE CASTROL MAGNATEC 5W30 CUARTO',
    46000,
    36,
    'VARIOS',
    'LUBRICANTES',
    'CASTROL',
  ],
  [
    'CS-ATF-QT',
    'ACEITE TRANSMISION AUTOMATICA ATF CUARTO',
    42000,
    18,
    'VARIOS',
    'LUBRICANTES',
    'CASTROL',
  ],
  [
    'REF-VERDE-GL',
    'REFRIGERANTE VERDE GALON',
    45000,
    22,
    'VARIOS',
    'LUBRICANTES',
    'GENERICO',
  ],
  [
    'NGK-BKR6E',
    'BUJIA NGK BKR6E (UNIDAD)',
    14000,
    80,
    'VARIOS',
    'ELECTRICOS',
    'NGK',
  ],
  [
    'NGK-IRIDIUM',
    'BUJIA IRIDIUM NGK (UNIDAD)',
    52000,
    24,
    'VARIOS',
    'ELECTRICOS',
    'NGK',
  ],
  [
    'BK-BAT-42',
    'BATERIA 42 AMP MANTENIMIENTO CERO',
    385000,
    5,
    'VARIOS',
    'ELECTRICOS',
    'BOSCH',
  ],
  [
    'DN-ALT-COR',
    'ALTERNADOR TOYOTA COROLLA',
    620000,
    2,
    'TOYOTA',
    'ELECTRICOS',
    'DENSO',
  ],
  [
    'VL-ARR-SAN',
    'MOTOR ARRANQUE SANDERO 1.6',
    540000,
    0,
    'RENAULT',
    'ELECTRICOS',
    'VALEO',
  ],
  [
    'BK-BOB-AVEO',
    'BOBINA ENCENDIDO AVEO',
    165000,
    4,
    'CHEVROLET',
    'ELECTRICOS',
    'BOSCH',
  ],
  [
    'GEN-BOMB-H4',
    'BOMBILLO H4 12V 60/55W',
    12000,
    60,
    'VARIOS',
    'ELECTRICOS',
    'GENERICO',
  ],
  [
    'GT-KIT-SPK',
    'KIT CORREA REPARTICION SPARK',
    245000,
    5,
    'CHEVROLET',
    'MOTOR',
    'GATES',
  ],
  [
    'GT-KIT-LOG',
    'KIT CORREA REPARTICION LOGAN 1.6 8V',
    268000,
    4,
    'RENAULT',
    'MOTOR',
    'GATES',
  ],
  [
    'GT-6PK1070',
    'CORREA ACCESORIOS 6PK1070',
    58000,
    15,
    'VARIOS',
    'MOTOR',
    'GATES',
  ],
  ['SKF-BOMBA-MZ', 'BOMBA DE AGUA MAZDA 3', 210000, 3, 'MAZDA', 'MOTOR', 'SKF'],
  [
    'GEN-TERM-82',
    'TERMOSTATO 82 GRADOS',
    38000,
    12,
    'VARIOS',
    'MOTOR',
    'GENERICO',
  ],
  [
    'GEN-EMP-CUL',
    'EMPAQUE CULATA AVEO 1.6',
    95000,
    0,
    'CHEVROLET',
    'MOTOR',
    'GENERICO',
  ],
  [
    'DN-INY-HIL',
    'INYECTOR HILUX 2.5 DIESEL',
    890000,
    2,
    'TOYOTA',
    'MOTOR',
    'DENSO',
  ],
  [
    'MR-AMORT-DA',
    'AMORTIGUADOR DELANTERO AVEO',
    185000,
    8,
    'CHEVROLET',
    'SUSPENSION Y DIRECCION',
    'MONROE',
  ],
  [
    'MR-AMORT-TL',
    'AMORTIGUADOR TRASERO LOGAN',
    165000,
    6,
    'RENAULT',
    'SUSPENSION Y DIRECCION',
    'MONROE',
  ],
  [
    'TRW-TER-DIR',
    'TERMINAL DIRECCION MAZDA 2',
    72000,
    10,
    'MAZDA',
    'SUSPENSION Y DIRECCION',
    'TRW',
  ],
  [
    'TRW-ROT-SPK',
    'ROTULA INFERIOR SPARK',
    64000,
    9,
    'CHEVROLET',
    'SUSPENSION Y DIRECCION',
    'TRW',
  ],
  [
    'GEN-BUJE-TIJ',
    'BUJE TIJERA DELANTERA HYUNDAI i10',
    28000,
    20,
    'HYUNDAI',
    'SUSPENSION Y DIRECCION',
    'GENERICO',
  ],
  [
    'SKF-RODA-DEL',
    'RODAMIENTO RUEDA DELANTERA KIA PICANTO',
    98000,
    7,
    'KIA',
    'SUSPENSION Y DIRECCION',
    'SKF',
  ],
  [
    'LUK-KIT-EMB',
    'KIT EMBRAGUE CHEVROLET SAIL',
    520000,
    3,
    'CHEVROLET',
    'TRANSMISION',
    'LUK',
  ],
  [
    'LUK-KIT-NIS',
    'KIT EMBRAGUE NISSAN MARCH',
    495000,
    0,
    'NISSAN',
    'TRANSMISION',
    'LUK',
  ],
  [
    'GEN-GUAYA-EMB',
    'GUAYA EMBRAGUE RENAULT TWINGO',
    45000,
    8,
    'RENAULT',
    'TRANSMISION',
    'GENERICO',
  ],
  [
    'GEN-PLUM-22',
    'PLUMILLAS LIMPIAPARABRISAS 22" (PAR)',
    32000,
    30,
    'VARIOS',
    'ACCESORIOS',
    'GENERICO',
  ],
  [
    'BK-PLUM-AERO',
    'PLUMILLAS BOSCH AEROTWIN 24" (PAR)',
    78000,
    14,
    'VARIOS',
    'ACCESORIOS',
    'BOSCH',
  ],
  [
    'GEN-TAPETE-4',
    'JUEGO TAPETES CAUCHO 4 PIEZAS',
    65000,
    10,
    'VARIOS',
    'ACCESORIOS',
    'GENERICO',
  ],
  [
    'GEN-AMBIENT',
    'AMBIENTADOR PINO',
    6000,
    100,
    'VARIOS',
    'ACCESORIOS',
    'GENERICO',
  ],
];

const USERS = [
  {
    email: 'empleado@demo.com',
    firstName: 'Carlos',
    lastName: 'Mostrador',
    role: 'employee',
    // Counter staff: sells, quotes, handles customers and the daily caja.
    permissions: [
      'products.view',
      'inventory.view',
      'invoices.create',
      'quotations.create',
      'quotations.update',
      'quotations.invoice',
      'quotations.cancel',
      'credit_notes.create',
      'cash_register.open',
      'cash_register.close',
      'cash_register.movements.create',
    ],
  },
  {
    email: 'bodega@demo.com',
    firstName: 'Laura',
    lastName: 'Bodega',
    role: 'employee',
    // Warehouse: receives supplier purchases and keeps stock right.
    permissions: [
      'products.create',
      'products.update',
      'inventory.create',
      'purchase_imports.create',
      'purchase_imports.confirm',
    ],
  },
  {
    email: 'contador@demo.com',
    firstName: 'Contador',
    lastName: 'Demo',
    role: 'auditor',
    permissions: [],
  },
];

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
interface Entity {
  id: string;
}

async function createLookups(
  resource: string,
  names: string[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const name of names) {
    const created = await api<Entity>('POST', `/${resource}`, { name });
    ids.set(name, created.id);
  }
  return ids;
}

async function seed(): Promise<void> {
  assertDemoEnvironment();
  await dataSource.initialize();
  await login();

  const [{ count }]: { count: number }[] = await dataSource.query(
    'SELECT COUNT(*)::int AS count FROM products',
  );
  if (count > 0) {
    console.log(
      'La base de demo ya tiene datos — nada que hacer (usa start-demo.sh --reset para empezar de cero).',
    );
    await dataSource.destroy();
    return;
  }

  console.log('Catálogos, productos y usuarios...');
  const departments = await createLookups('departments', DEPARTMENTS);
  const groups = await createLookups('groups', GROUPS);
  const brands = await createLookups('brands', BRANDS);

  for (const [
    reference,
    description,
    salePrice,
    stock,
    department,
    group,
    brand,
  ] of PRODUCTS) {
    await api('POST', '/products', {
      reference,
      description,
      salePrice,
      stock,
      departmentId: departments.get(department),
      groupId: groups.get(group),
      brandId: brands.get(brand),
    });
  }

  for (const user of USERS) {
    await api('POST', '/users', { ...user, password: DEMO_PASSWORD });
  }
  // Demo accounts log straight in, no forced password change mid-presentation.
  await dataSource.query('UPDATE users SET must_change_password = false');

  const year = Number(getStoreToday().slice(0, 4));
  await api('POST', '/invoicing/resolutions', {
    documentType: 'invoice',
    prefix: 'FEDE',
    resolutionCode: 'DEMO-001',
    resolutionNumber: '18760000000001',
    rangeStart: 1,
    rangeEnd: 5000,
    startDate: `${year}-01-01`,
    endDate: `${year + 1}-12-31`,
  });

  await dataSource.destroy();
  console.log(`Demo lista: ${PRODUCTS.length} productos.`);
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
