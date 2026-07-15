import type { MiddlewareHandler } from 'hono'
import { verify } from 'hono/jwt'
import { config } from '~/config'

export interface AuthUser {
  id: string
  username: string
  isAdmin: boolean
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

/** Verify the Bearer JWT and attach the user to the context. 401 if missing/invalid. */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization')
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!bearer) return c.json({ error: 'unauthorized' }, 401)
  try {
    const payload = await verify(bearer, config.jwtSecret, 'HS256')
    c.set('user', {
      id: String(payload.sub),
      username: String(payload.username ?? ''),
      isAdmin: Boolean(payload.isAdmin)
    })
    await next()
  } catch {
    return c.json({ error: 'invalid token' }, 401)
  }
}

/** Gate writes on Administrator. Must run after authMiddleware. */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get('user')
  if (!user?.isAdmin) return c.json({ error: 'forbidden: admin only' }, 403)
  await next()
}
