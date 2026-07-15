import { REST, Routes } from 'discord.js'
import { buildCommandData } from '~/commands/manifest'
import { config } from '~/config'
import { logger } from '~/utils/logger'

/** Register all slash commands to the single configured guild (instant, no propagation delay). */
export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discordToken)
  const body = buildCommandData()
  await rest.put(
    Routes.applicationGuildCommands(config.discordClientId, config.guildId),
    { body }
  )
  logger.info(`Registered ${body.length} guild commands to ${config.guildId}`)
}

// Standalone: `bun run src/register.ts`
if (import.meta.main) {
  registerCommands()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Failed to register commands:', err)
      process.exit(1)
    })
}
