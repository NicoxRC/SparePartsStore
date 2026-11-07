import type { UserRole } from '../services/auth';

/**
 * Inactivity logout for shared store devices: an employee or auditor
 * session closes after 20 minutes with no interaction, with a warning
 * during the last minute. Admin is exempt.
 *
 * The last-activity time lives in localStorage (not memory) so it covers
 * a closed tab or a locked phone too, and is shared by every open tab:
 * using one keeps the others alive.
 */
export const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
export const IDLE_WARNING_MS = 60 * 1000;

const IDLE_ROLES: readonly UserRole[] = ['employee', 'auditor'];

const LAST_ACTIVITY_KEY = 'casarespuestos.lastActivityAt';
const IDLE_LOGOUT_NOTICE_KEY = 'casarespuestos.idleLogout';

// Activity events fire constantly; writing on each one is wasted work.
const WRITE_THROTTLE_MS = 5_000;
let lastWrite = 0;

export function appliesIdleLogout(role: UserRole | undefined): boolean {
  return role !== undefined && IDLE_ROLES.includes(role);
}

export function getLastActivity(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Records "the user did something now". `force` skips the throttle. */
export function markActivity(force = false): void {
  const now = Date.now();
  if (!force && now - lastWrite < WRITE_THROTTLE_MS) return;
  lastWrite = now;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

/** Left for the login page so it can say why the session closed. */
export function setIdleLogoutNotice(): void {
  sessionStorage.setItem(IDLE_LOGOUT_NOTICE_KEY, '1');
}

export function hasIdleLogoutNotice(): boolean {
  return sessionStorage.getItem(IDLE_LOGOUT_NOTICE_KEY) !== null;
}

export function clearIdleLogoutNotice(): void {
  sessionStorage.removeItem(IDLE_LOGOUT_NOTICE_KEY);
}
