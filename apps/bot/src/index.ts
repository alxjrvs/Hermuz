import { runMigrations } from '@hermuz/db'
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js'
import { startApiServer } from '~/api/server'
import { resolveCommand } from '~/commands/manifest'
import { config } from '~/config'
import { attendanceButtonHandler } from '~/handlers/attendanceButtonHandler'
import { campaignInterestButtonHandler } from '~/handlers/campaignInterestButtonHandler'
import { mealButtonHandler } from '~/handlers/mealButtonHandler'
import { routeModalSubmit } from '~/interactions/modalRouter'
import { registerCommands } from '~/register'
import { ensureHeartbeatJob } from '~/services/jobHandlers'
import { startScheduler } from '~/services/schedulerService'
import {
  dispatchButtonInteraction,
  registerButtonHandler
} from '~/utils/buttonRegistry'
import { logger } from '~/utils/logger'

// Register button handlers once at module load.
registerButtonHandler(attendanceButtonHandler)
registerButtonHandler(campaignInterestButtonHandler)
registerButtonHandler(mealButtonHandler)

async function main(): Promise<void> {
  // Migrations run before anything opens the gateway or serves the API.
  logger.info('Running database migrations...')
  runMigrations()

  // One-off seed of existing server data (idempotent). Set RUN_BACKFILL=1 once.
  if (process.env.RUN_BACKFILL === '1') {
    const { runBackfill } = await import('~/scripts/backfill')
    await runBackfill()
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent
    ]
  })

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}`)
    readyClient.user.setActivity('board game night')
    try {
      await registerCommands()
    } catch (err) {
      logger.error('Command registration failed:', err)
    }
  })

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const leaf = resolveCommand(interaction)
        if (!leaf) {
          logger.warn(`No handler for command: ${interaction.commandName}`)
          return
        }
        if (
          leaf.adminOnly &&
          !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
          await interaction.reply({
            content: 'You need Administrator permission to use this command.',
            flags: MessageFlags.Ephemeral
          })
          return
        }
        await leaf.handler(interaction)
      } else if (interaction.isAutocomplete()) {
        const leaf = resolveCommand(interaction)
        if (leaf?.autocomplete) await leaf.autocomplete(interaction)
        else await interaction.respond([])
      } else if (interaction.isButton()) {
        const handled = await dispatchButtonInteraction(interaction)
        if (!handled) logger.warn(`Unhandled button: ${interaction.customId}`)
      } else if (interaction.isModalSubmit()) {
        await routeModalSubmit(interaction)
      }
    } catch (err) {
      logger.error('Error handling interaction:', err)
    }
  })

  // Same process serves the JSON API (shares the one SQLite connection).
  startApiServer(client)

  // Background job loop (reminders, meal nudges, auto-opening sessions).
  await ensureHeartbeatJob()
  startScheduler(client)

  await client.login(config.discordToken)
}

main().catch((err) => {
  logger.error('Fatal error during startup:', err)
  process.exit(1)
})
