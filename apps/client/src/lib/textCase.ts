import type { UseFormRegisterReturn } from 'react-hook-form';

type CaseTransform = (value: string) => string;
type ChangeEvent = Parameters<UseFormRegisterReturn['onChange']>[0];

const upper: CaseTransform = (value) => value.toUpperCase();
const lower: CaseTransform = (value) => value.toLowerCase();

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

export const toUpperCase = upper;
export const toLowerCase = lower;
