/**
 * Plain result objects returned by the service layer. Services run Discord
 * side-effects + DB writes but never touch HTTP or interaction objects, so the
 * API routes translate these into status codes and the bot handlers could reuse
 * them too. `status` is a hint for the HTTP layer (defaults to 400/500).
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data })

export const fail = <T = never>(
  error: string,
  status?: number
): ServiceResult<T> => ({ ok: false, error, status })
