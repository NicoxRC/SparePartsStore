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
 * Deliberately a short, growing seed list, NOT the full national DIVIPOLA
 * catalog (~1,122 municipios) — added only for cities actually needed so
 * far, per direct instruction, rather than risk transcribing an
 * unverifiable code from memory for something that ends up on a legal
 * document. Add more here as new cities are actually needed.
 */
export const DANE_CITIES: DaneCity[] = [
  { code: '001', name: 'Pasto', departmentCode: '52' }, // store's own city
  { code: '001', name: 'Bogotá D.C.', departmentCode: '11' },
  { code: '001', name: 'Medellín', departmentCode: '05' },
  { code: '001', name: 'Cali', departmentCode: '76' },
  { code: '001', name: 'Mocoa', departmentCode: '86' }, // Putumayo's capital
];

export const DEFAULT_DANE_DEPARTMENT_CODE = '52'; // Nariño
export const DEFAULT_DANE_CITY_CODE = '001'; // Pasto
