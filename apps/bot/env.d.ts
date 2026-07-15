export {}
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_OPTIONS: string
      DISCORD_CLIENT_ID: string
      DISCORD_TOKEN: string
      GUILD_ID: string
      DATABASE_PATH: string
      PORT: string
      DISCORD_OAUTH_CLIENT_SECRET: string
      JWT_SECRET: string
      API_ORIGIN: string
      WEB_ORIGIN: string
      RUN_BACKFILL?: string
    }
  }
}
