import type { KeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Enter-to-advance, counter-checkout style: pressing Enter in a text/number
 * input or a select moves focus to the next field instead of submitting the
 * form, so a cashier can move through a long form (e.g. the invoice form)
 * with Enter alone. Textareas keep Enter for newlines; the last field's
 * Enter still submits, since there's nothing left to advance to.
 *
 * Attach as `onKeyDown` on the `<form>` (or any container) wrapping the
 * fields.
 */
export function handleEnterAsTab(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Enter') return;

  const target = event.target as HTMLElement;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
  if (target instanceof HTMLInputElement && target.type === 'submit') return;

  const container = event.currentTarget;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null);

  const currentIndex = focusable.indexOf(target);
  const next = focusable[currentIndex + 1];
  if (!next) return;

  event.preventDefault();
  next.focus();
  if (next instanceof HTMLInputElement) {
    next.select();
  }
}
