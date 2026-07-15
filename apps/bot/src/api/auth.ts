import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { PermissionFlagsBits, type Client } from 'discord.js'
import { getOrCreateUser } from '@hermuz/db'
import { config } from '~/config'
import { logger } from '~/utils/logger'

const DISCORD_API = 'https://discord.com/api'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

/**
 * Discord OAuth2 login. Scope is just `identify`; guild membership and admin
 * status are resolved authoritatively via the bot client (which is already in
 * the guild), so we never need the `guilds.members.read` scope.
 *
 * The SPA is cross-origin (Netlify ↔ Render), so instead of a cross-site cookie
 * we mint a signed JWT and hand it to the SPA via the redirect fragment.
 */
export function createAuthApp(client: Client): Hono {
  const app = new Hono()

  app.get('/login', (c) => {
    const params = new URLSearchParams({
      client_id: config.discordClientId,
      redirect_uri: config.oauthRedirectUri,
      response_type: 'code',
      scope: 'identify'
    })
    return c.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`)
  })

  app.get('/callback', async (c) => {
    const code = c.req.query('code')
    if (!code) return c.text('Missing authorization code', 400)

    try {
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.discordClientId,
          client_secret: config.discordClientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.oauthRedirectUri
        })
      })
      if (!tokenRes.ok)
        throw new Error(`token exchange failed: ${tokenRes.status}`)
      const token = (await tokenRes.json()) as { access_token: string }

      const userRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${token.access_token}` }
      })
      if (!userRes.ok) throw new Error(`identify failed: ${userRes.status}`)
      const user = (await userRes.json()) as { id: string; username: string }

      // Membership + admin check via the bot client.
      const guild = await client.guilds.fetch(config.guildId)
      let isAdmin = false
      try {
        const member = await guild.members.fetch(user.id)
        isAdmin = member.permissions.has(PermissionFlagsBits.Administrator)
      } catch {
        return c.redirect(`${config.webOrigin}/login?error=not_a_member`)
      }

      await getOrCreateUser(user.id, user.username)

      const jwt = await sign(
        {
          sub: user.id,
          username: user.username,
          isAdmin,
          exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
        },
        config.jwtSecret
      )
      return c.redirect(`${config.webOrigin}/auth#token=${jwt}`)
    } catch (err) {
      logger.error('OAuth callback error:', err)
      return c.redirect(`${config.webOrigin}/login?error=oauth_failed`)
    }
  })

  return app
}
