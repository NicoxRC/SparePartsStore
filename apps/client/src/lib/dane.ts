/**
 * DIVIPOLA (DANE) department/city codes for the invoice customer's address
 * — public, standardized Colombian government codes, not Dataico-specific
 * (Dataico's own confirmed standard-invoice example already used this same
 * department/city code shape: department "11", city "001" for Bogotá).
 */

export interface DaneDepartment {
  code: string;
  name: string;
}

export interface DaneCity {
  code: string;
  name: string;
  departmentCode: string;
}

/** The full, stable list of 33 (32 departments + Bogotá D.C.). */
export const DANE_DEPARTMENTS: DaneDepartment[] = [
  { code: '05', name: 'Antioquia' },
  { code: '08', name: 'Atlántico' },
  { code: '11', name: 'Bogotá D.C.' },
  { code: '13', name: 'Bolívar' },
  { code: '15', name: 'Boyacá' },
  { code: '17', name: 'Caldas' },
  { code: '18', name: 'Caquetá' },
  { code: '19', name: 'Cauca' },
  { code: '20', name: 'Cesar' },
  { code: '23', name: 'Córdoba' },
  { code: '25', name: 'Cundinamarca' },
  { code: '27', name: 'Chocó' },
  { code: '41', name: 'Huila' },
  { code: '44', name: 'La Guajira' },
  { code: '47', name: 'Magdalena' },
  { code: '50', name: 'Meta' },
  { code: '52', name: 'Nariño' },
  { code: '54', name: 'Norte de Santander' },
  { code: '63', name: 'Quindío' },
  { code: '66', name: 'Risaralda' },
  { code: '68', name: 'Santander' },
  { code: '70', name: 'Sucre' },
  { code: '73', name: 'Tolima' },
  { code: '76', name: 'Valle del Cauca' },
  { code: '81', name: 'Arauca' },
  { code: '85', name: 'Casanare' },
  { code: '86', name: 'Putumayo' },
  { code: '88', name: 'San Andrés y Providencia' },
  { code: '91', name: 'Amazonas' },
  { code: '94', name: 'Guainía' },
  { code: '95', name: 'Guaviare' },
  { code: '97', name: 'Vaupés' },
  { code: '99', name: 'Vichada' },
];

/**
 * Every municipio of Nariño (the store's department) plus the main city of
 * every other department — not the full national catalog (~1,122), by
 * decision. Codes checked against DANE's official DIVIPOLA dataset
 * (datos.gov.co, gdxc-w37w), not typed from memory: these end up on a
 * legal document. Add a city here if a customer from elsewhere needs it.
 */
export const DANE_CITIES: DaneCity[] = [
  { code: '001', name: 'Pasto', departmentCode: '52' }, // store's own city
  { code: '019', name: 'Albán', departmentCode: '52' },
  { code: '022', name: 'Aldana', departmentCode: '52' },
  { code: '036', name: 'Ancuya', departmentCode: '52' },
  { code: '051', name: 'Arboleda', departmentCode: '52' },
  { code: '079', name: 'Barbacoas', departmentCode: '52' },
  { code: '083', name: 'Belén', departmentCode: '52' },
  { code: '110', name: 'Buesaco', departmentCode: '52' },
  { code: '240', name: 'Chachagüí', departmentCode: '52' },
  { code: '203', name: 'Colón', departmentCode: '52' },
  { code: '207', name: 'Consacá', departmentCode: '52' },
  { code: '210', name: 'Contadero', departmentCode: '52' },
  { code: '224', name: 'Cuaspud Carlosama', departmentCode: '52' },
  { code: '227', name: 'Cumbal', departmentCode: '52' },
  { code: '233', name: 'Cumbitara', departmentCode: '52' },
  { code: '215', name: 'Córdoba', departmentCode: '52' },
  { code: '250', name: 'El Charco', departmentCode: '52' },
  { code: '254', name: 'El Peñol', departmentCode: '52' },
  { code: '256', name: 'El Rosario', departmentCode: '52' },
  { code: '258', name: 'El Tablón de Gómez', departmentCode: '52' },
  { code: '260', name: 'El Tambo', departmentCode: '52' },
  { code: '520', name: 'Francisco Pizarro', departmentCode: '52' },
  { code: '287', name: 'Funes', departmentCode: '52' },
  { code: '317', name: 'Guachucal', departmentCode: '52' },
  { code: '320', name: 'Guaitarilla', departmentCode: '52' },
  { code: '323', name: 'Gualmatán', departmentCode: '52' },
  { code: '352', name: 'Iles', departmentCode: '52' },
  { code: '354', name: 'Imués', departmentCode: '52' },
  { code: '356', name: 'Ipiales', departmentCode: '52' },
  { code: '378', name: 'La Cruz', departmentCode: '52' },
  { code: '381', name: 'La Florida', departmentCode: '52' },
  { code: '385', name: 'La Llanada', departmentCode: '52' },
  { code: '390', name: 'La Tola', departmentCode: '52' },
  { code: '399', name: 'La Unión', departmentCode: '52' },
  { code: '405', name: 'Leiva', departmentCode: '52' },
  { code: '411', name: 'Linares', departmentCode: '52' },
  { code: '418', name: 'Los Andes', departmentCode: '52' },
  { code: '427', name: 'Magüí', departmentCode: '52' },
  { code: '435', name: 'Mallama', departmentCode: '52' },
  { code: '473', name: 'Mosquera', departmentCode: '52' },
  { code: '480', name: 'Nariño', departmentCode: '52' },
  { code: '490', name: 'Olaya Herrera', departmentCode: '52' },
  { code: '506', name: 'Ospina', departmentCode: '52' },
  { code: '540', name: 'Policarpa', departmentCode: '52' },
  { code: '560', name: 'Potosí', departmentCode: '52' },
  { code: '565', name: 'Providencia', departmentCode: '52' },
  { code: '573', name: 'Puerres', departmentCode: '52' },
  { code: '585', name: 'Pupiales', departmentCode: '52' },
  { code: '612', name: 'Ricaurte', departmentCode: '52' },
  { code: '621', name: 'Roberto Payán', departmentCode: '52' },
  { code: '678', name: 'Samaniego', departmentCode: '52' },
  { code: '835', name: 'San Andrés de Tumaco', departmentCode: '52' },
  { code: '685', name: 'San Bernardo', departmentCode: '52' },
  { code: '687', name: 'San Lorenzo', departmentCode: '52' },
  { code: '693', name: 'San Pablo', departmentCode: '52' },
  { code: '694', name: 'San Pedro de Cartago', departmentCode: '52' },
  { code: '683', name: 'Sandoná', departmentCode: '52' },
  { code: '696', name: 'Santa Bárbara', departmentCode: '52' },
  { code: '699', name: 'Santacruz', departmentCode: '52' },
  { code: '720', name: 'Sapuyes', departmentCode: '52' },
  { code: '786', name: 'Taminango', departmentCode: '52' },
  { code: '788', name: 'Tangua', departmentCode: '52' },
  { code: '838', name: 'Túquerres', departmentCode: '52' },
  { code: '885', name: 'Yacuanquer', departmentCode: '52' },
  { code: '001', name: 'Medellín', departmentCode: '05' },
  { code: '001', name: 'Barranquilla', departmentCode: '08' },
  { code: '001', name: 'Bogotá D.C.', departmentCode: '11' },
  { code: '001', name: 'Cartagena', departmentCode: '13' },
  { code: '001', name: 'Tunja', departmentCode: '15' },
  { code: '001', name: 'Manizales', departmentCode: '17' },
  { code: '001', name: 'Florencia', departmentCode: '18' },
  { code: '001', name: 'Popayán', departmentCode: '19' },
  { code: '001', name: 'Valledupar', departmentCode: '20' },
  { code: '001', name: 'Montería', departmentCode: '23' },
  { code: '754', name: 'Soacha', departmentCode: '25' }, // Cundinamarca's capital is Bogotá (11), so its largest municipality
  { code: '001', name: 'Quibdó', departmentCode: '27' },
  { code: '001', name: 'Neiva', departmentCode: '41' },
  { code: '001', name: 'Riohacha', departmentCode: '44' },
  { code: '001', name: 'Santa Marta', departmentCode: '47' },
  { code: '001', name: 'Villavicencio', departmentCode: '50' },
  { code: '001', name: 'Cúcuta', departmentCode: '54' },
  { code: '001', name: 'Armenia', departmentCode: '63' },
  { code: '001', name: 'Pereira', departmentCode: '66' },
  { code: '001', name: 'Bucaramanga', departmentCode: '68' },
  { code: '001', name: 'Sincelejo', departmentCode: '70' },
  { code: '001', name: 'Ibagué', departmentCode: '73' },
  { code: '001', name: 'Cali', departmentCode: '76' },
  { code: '001', name: 'Arauca', departmentCode: '81' },
  { code: '001', name: 'Yopal', departmentCode: '85' },
  { code: '001', name: 'Mocoa', departmentCode: '86' },
  { code: '001', name: 'San Andrés', departmentCode: '88' },
  { code: '001', name: 'Leticia', departmentCode: '91' },
  { code: '001', name: 'Inírida', departmentCode: '94' },
  { code: '001', name: 'San José del Guaviare', departmentCode: '95' },
  { code: '001', name: 'Mitú', departmentCode: '97' },
  { code: '001', name: 'Puerto Carreño', departmentCode: '99' },
];

export const DEFAULT_DANE_DEPARTMENT_CODE = '52'; // Nariño
export const DEFAULT_DANE_CITY_CODE = '001'; // Pasto
