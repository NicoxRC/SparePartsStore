import { WhereExpressionBuilder } from 'typeorm';
import { escapeLike } from './escape-like.util';

/**
 * Drops accents and diaeresis (Á→A, Ü→U) so "jose" finds "JOSÉ". Ñ is a
 * letter, not an accent, and is kept: the tilde (U+0303) is only dropped
 * when it doesn't sit on an N.
 */
export function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/(?<![nN])\u0303|[\u0300-\u0302\u0304-\u036f]/g, '')
    .normalize('NFC');
}

// SQL-side mirror of stripAccents() for the accented vowels Spanish data
// actually carries. TRANSLATE maps by position; the trailing "." in ACCENTED
// has no counterpart in PLAIN, so dots are deleted ("S.A.S" ↔ "sas",
// "900.123.456" ↔ "900123456").
const ACCENTED = 'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛáéíóúàèìòùäëïöüâêîôû.';
const PLAIN = 'AEIOUAEIOUAEIOUAEIOUaeiouaeiouaeiouaeiou';

/** Wraps a SQL expression so it compares without accents or dots. */
export function unaccentSql(expression: string): string {
  return `TRANSLATE(${expression}, '${ACCENTED}', '${PLAIN}')`;
}

/** Splits a free-text search into accent- and dot-free words, dropping empty ones. */
export function searchWords(search: string | undefined): string[] {
  return stripAccents(search ?? '')
    .replace(/\./g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Predictive, word-by-word search: every word typed has to appear —
 * anywhere, in any order, ignoring case, accents and dots — in at least one of
 * `columns`. So "javi cant" finds JAVIER JOSÉ / CANTUCA while it's being
 * typed, without having to type the whole name exactly.
 *
 * Adds one `andWhere` per word, with parameters `<paramPrefix>0`,
 * `<paramPrefix>1`, … — pick a prefix no other condition on the query uses.
 */
export function andWhereEveryWord(
  qb: WhereExpressionBuilder,
  columns: string[],
  search: string | undefined,
  paramPrefix = 'search',
): void {
  searchWords(search).forEach((word, index) => {
    const param = `${paramPrefix}${index}`;
    const conditions = columns
      .map((column) => `${unaccentSql(column)} ILIKE :${param} ESCAPE '\\'`)
      .join(' OR ');
    qb.andWhere(`(${conditions})`, { [param]: `%${escapeLike(word)}%` });
  });
}
