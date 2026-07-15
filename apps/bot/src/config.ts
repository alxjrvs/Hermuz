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
  }
}
