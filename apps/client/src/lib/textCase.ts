import type { UseFormRegisterReturn } from 'react-hook-form';

type CaseTransform = (value: string) => string;
type ChangeEvent = Parameters<UseFormRegisterReturn['onChange']>[0];

const upper: CaseTransform = (value) => value.toUpperCase();
const lower: CaseTransform = (value) => value.toLowerCase();

/**
 * Same rule as the API's product-normalize.util: drops accents and
 * diaeresis (Á→A, Ü→U) but keeps the Ñ — the tilde only goes when it
 * doesn't sit on an N.
 */
const stripAccents: CaseTransform = (value) =>
  value
    .normalize('NFD')
    .replace(/(?<![nN])\u0303|[\u0300-\u0302\u0304-\u036f]/g, '')
    .normalize('NFC');

/**
 * Rewrites the input's value in place as the user types and keeps the caret
 * where it was — assigning `target.value` alone sends it to the end, which
 * breaks editing in the middle of a word.
 */
function applyCase(event: ChangeEvent, transform: CaseTransform): void {
  const target = event.target as HTMLInputElement;
  const transformed = transform(target.value);
  if (transformed === target.value) return;

  const { selectionStart, selectionEnd } = target;
  target.value = transformed;
  target.setSelectionRange(selectionStart, selectionEnd);
}

function withCase(
  field: UseFormRegisterReturn,
  transform: CaseTransform,
): UseFormRegisterReturn {
  return {
    ...field,
    onChange: (event: ChangeEvent) => {
      applyCase(event, transform);
      return field.onChange(event);
    },
  };
}

/** Spread in place of `register('field')` so the value is stored in UPPERCASE as it's typed. */
export function upperCaseField(field: UseFormRegisterReturn): UseFormRegisterReturn {
  return withCase(field, upper);
}

/** Spread in place of `register('field')` so the value is stored in lowercase as it's typed. */
export function lowerCaseField(field: UseFormRegisterReturn): UseFormRegisterReturn {
  return withCase(field, lower);
}

/** Spread in place of `register('field')` so accents are removed as they're typed (products only). */
export function noAccentsField(field: UseFormRegisterReturn): UseFormRegisterReturn {
  return withCase(field, stripAccents);
}

export const toUpperCase = upper;
export const toLowerCase = lower;
