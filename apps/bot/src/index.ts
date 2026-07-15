import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js'
import { runMigrations } from '@hermuz/db'
import { config } from '~/config'
import { logger } from '~/utils/logger'
import { registerCommands } from '~/register'
import { resolveCommand } from '~/commands/manifest'
import {
  registerButtonHandler,
  dispatchButtonInteraction
} from '~/utils/buttonRegistry'
import { attendanceButtonHandler } from '~/handlers/attendanceButtonHandler'
import { campaignInterestButtonHandler } from '~/handlers/campaignInterestButtonHandler'
import { routeModalSubmit } from '~/interactions/modalRouter'
import { startApiServer } from '~/api/server'

// Register button handlers once at module load.
registerButtonHandler(attendanceButtonHandler)
registerButtonHandler(campaignInterestButtonHandler)

async function main(): Promise<void> {
  // Migrations run before anything opens the gateway or serves the API.
  logger.info('Running database migrations...')
  runMigrations()

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

  await client.login(config.discordToken)
}

main().catch((err) => {
  logger.error('Fatal error during startup:', err)
  process.exit(1)
})
