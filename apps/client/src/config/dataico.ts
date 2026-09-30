/**
 * Off while the store's Dataico account is being activated: every menu
 * entry and button that would call Dataico (Facturas, Resoluciones DIAN,
 * Facturar, Buscar en DIAN) is shown disabled instead. Flip to `true` once
 * the account is live.
 */
export const DATAICO_ENABLED = false;

/** Tooltip shown on anything disabled by `DATAICO_ENABLED`. */
export const DATAICO_DISABLED_HINT = 'Deshabilitado mientras se activa la cuenta de Dataico';
