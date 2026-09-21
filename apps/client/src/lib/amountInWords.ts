const UNITS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

/** 1..999 in words ("uno" stays "uno" here; callers shorten it before "mil"/"millones"). */
function belowThousand(n: number): string {
  if (n === 100) return 'cien';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (rest > 0) {
    if (rest < 30) {
      parts.push(UNITS[rest]);
    } else {
      const unit = rest % 10;
      parts.push(unit === 0 ? TENS[Math.floor(rest / 10)] : `${TENS[Math.floor(rest / 10)]} y ${UNITS[unit]}`);
    }
  }
  return parts.join(' ');
}

/** "uno" -> "un" and "veintiuno" -> "veintiún" when a noun follows ("un mil", "veintiún mil"). */
function shorten(words: string): string {
  return words.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
}

function integerToWords(n: number): string {
  if (n < 1000) return belowThousand(n);
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = thousands === 1 ? 'mil' : `${shorten(belowThousand(thousands))} mil`;
    return rest === 0 ? head : `${head} ${belowThousand(rest)}`;
  }
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const head = millions === 1 ? 'un millón' : `${shorten(integerToWords(millions))} millones`;
  return rest === 0 ? head : `${head} ${integerToWords(rest)}`;
}

/**
 * An amount in Colombian pesos spelled out, the way the store's quotation
 * prints it ("Vr letras"): 160000 -> "CIENTO SESENTA MIL PESOS". Whole pesos
 * only (the amount is rounded); handles up to 999.999.999.999.
 */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'CERO PESOS';
  // "uno" becomes "un" before the noun: un peso, treinta y un pesos, veintiún pesos.
  const words = shorten(integerToWords(n));
  const isExactMillions = n >= 1_000_000 && n % 1_000_000 === 0;
  const noun = n === 1 ? 'peso' : isExactMillions ? 'de pesos' : 'pesos';
  return `${words} ${noun}`.toUpperCase();
}
