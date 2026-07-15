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
    }
  }
}
