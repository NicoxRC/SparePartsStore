/**
 * Escapes LIKE/ILIKE metacharacters (`\`, `%`, `_`) in a user-supplied search
 * term so it can be safely embedded in a `LIKE`/`ILIKE` pattern.
 *
 * The backslash must be escaped first so it doesn't double-escape the
 * characters escaped afterwards. Callers should pair this with an
 * `ESCAPE '\'` clause (or wrap the result in `%...%` and rely on the default
 * Postgres escape character, which is `\`).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
