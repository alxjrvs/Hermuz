/**
 * Minimal logger shim replacing `robo.js`'s `logger`. Same call surface
 * (info/warn/error/debug) so ported code only needs its import path swapped.
 */
type LogFn = (...args: unknown[]) => void

const stamp = (level: string): string => `${new Date().toISOString()} ${level}`

export const logger: Record<'info' | 'warn' | 'error' | 'debug', LogFn> = {
  info: (...args) => console.log(stamp('INFO'), ...args),
  warn: (...args) => console.warn(stamp('WARN'), ...args),
  error: (...args) => console.error(stamp('ERROR'), ...args),
  debug: (...args) => {
    if (process.env.DEBUG) console.debug(stamp('DEBUG'), ...args)
  }
}
