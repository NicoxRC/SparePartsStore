/**
 * Master switch for every menu entry and button that calls Dataico
 * (Facturas, Resoluciones DIAN, Facturar, Buscar en DIAN). On since the
 * store's production Dataico account went live; set to `false` to show them
 * disabled again.
 */
export const DATAICO_ENABLED = true;

/** Tooltip shown on anything disabled by `DATAICO_ENABLED`. */
export const DATAICO_DISABLED_HINT = 'Deshabilitado mientras se activa la cuenta de Dataico';
