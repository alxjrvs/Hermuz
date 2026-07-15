function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

/**
 * Runtime config. Getters so importing this module never throws — the required
 * check fires only when a value is actually read (at boot), keeping tooling happy.
 */
export const config = {
  get discordToken(): string {
    return required('DISCORD_TOKEN')
  },
  get discordClientId(): string {
    return required('DISCORD_CLIENT_ID')
  },
  get guildId(): string {
    return required('GUILD_ID')
  },
  get port(): number {
    return Number(process.env.PORT ?? 3000)
  },
  // --- Web GUI / Discord OAuth2 (Phase 2) ---
  get discordClientSecret(): string {
    return required('DISCORD_OAUTH_CLIENT_SECRET')
  },
  get jwtSecret(): string {
    return required('JWT_SECRET')
  },
  /** Public origin of the API itself (used to build the OAuth redirect URI). */
  get apiOrigin(): string {
    return process.env.API_ORIGIN ?? `http://localhost:${this.port}`
  },
  /** Netlify SPA origin — CORS allow-list + post-login redirect target. */
  get webOrigin(): string {
    return process.env.WEB_ORIGIN ?? 'http://localhost:5173'
  },
  get oauthRedirectUri(): string {
    return `${this.apiOrigin}/auth/callback`
  }
}
