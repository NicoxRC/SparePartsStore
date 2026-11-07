import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useAuth } from '../hooks/useAuth';
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  appliesIdleLogout,
  getLastActivity,
  markActivity,
  setIdleLogoutNotice,
} from '../lib/idleSession';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Closes an employee/auditor session after IDLE_TIMEOUT_MS without
 * interaction (see lib/idleSession.ts), warning during the last minute.
 * In-progress sale drafts are left alone: they live in localStorage and
 * are there again after logging back in.
 */
export function IdleSessionGuard({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const applies = appliesIdleLogout(user?.role);
  const [now, setNow] = useState(() => Date.now());
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!applies) return;
    // A session from before this feature has no timestamp yet.
    if (getLastActivity() === null) markActivity(true);

    const onActivity = () => markActivity();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    // Re-checks on return too: timers are paused while a phone is locked.
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [applies]);

  const remaining = applies
    ? (getLastActivity() ?? now) + IDLE_TIMEOUT_MS - now
    : Infinity;
  const expired = remaining <= 0;

  useEffect(() => {
    if (!expired || loggingOut.current) return;
    loggingOut.current = true;
    setIdleLogoutNotice();
    void logout();
  }, [expired, logout]);

  // Nothing behind it while logging out, so reopening the app after the
  // timeout doesn't flash the last screen.
  if (expired) return null;

  const stayConnected = () => {
    markActivity(true);
    setNow(Date.now());
  };

  const seconds = Math.ceil(remaining / 1000);

  return (
    <>
      {children}
      {remaining <= IDLE_WARNING_MS &&
        createPortal(
          <div
            role="alertdialog"
            aria-labelledby="idle-warning-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          >
            <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
              <h2 id="idle-warning-title" className="text-lg font-semibold text-ink">
                ¿Sigues ahí?
              </h2>
              <p className="mt-2 text-sm text-steel">
                Por inactividad, tu sesión se cerrará en{' '}
                <span className="font-mono font-semibold text-ink">{seconds} s</span>.
                Las ventas en curso no se pierden.
              </p>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="secondary" onClick={() => void logout()}>
                  Cerrar sesión
                </Button>
                <Button type="button" onClick={stayConnected}>
                  Seguir conectado
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
