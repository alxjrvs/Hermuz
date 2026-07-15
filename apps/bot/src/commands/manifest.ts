import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  type RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder
} from 'discord.js'
import {
  applyOptions,
  type CommandConfig,
  type CommandLeaf
} from '~/framework/command'
import * as campaignAnnounce from './campaign/announce'
import * as campaignCreate from './campaign/create'
import * as gameSetup from './game/setup'
import * as gameDayAnnounce from './game_day/announce'
import * as gameDayCancel from './game_day/cancel'
import * as gameDayList from './game_day/list'
import * as gameDaySchedule from './game_day/schedule'
import * as games from './games'
import * as ping from './ping'
import * as setSchedulingChannel from './set_scheduling_channel'

type CommandModule = {
  config: CommandConfig
  default: CommandLeaf['handler']
}

const leaf = (mod: CommandModule, adminOnly = false): CommandLeaf => ({
  config: mod.config,
  handler: mod.default,
  adminOnly
})

/** Top-level commands (no subcommands). */
const topLevel: Record<string, CommandLeaf> = {
  ping: leaf(ping),
  games: leaf(games),
  set_scheduling_channel: leaf(setSchedulingChannel, true)
}

interface CommandGroup {
  description: string
  subcommands: Record<string, CommandLeaf>
}

/** Subcommand groups (folder → group, file → subcommand). */
const groups: Record<string, CommandGroup> = {
  game: {
    description: 'Manage games',
    subcommands: { setup: leaf(gameSetup, true) }
  },
  game_day: {
    description: 'Manage game days',
    subcommands: {
      schedule: leaf(gameDaySchedule),
      announce: leaf(gameDayAnnounce),
      cancel: leaf(gameDayCancel, true),
      list: leaf(gameDayList)
    }
  },
  campaign: {
    description: 'Manage campaigns',
    subcommands: {
      create: leaf(campaignCreate, true),
      announce: leaf(campaignAnnounce)
    }
  }
}

/** Build the REST body for guild command registration. */
export function buildCommandData(): RESTPostAPIApplicationCommandsJSONBody[] {
  const data: RESTPostAPIApplicationCommandsJSONBody[] = []

  for (const [name, cmd] of Object.entries(topLevel)) {
    const builder = new SlashCommandBuilder()
      .setName(name)
      .setDescription(cmd.config.description)
    if (cmd.config.defaultMemberPermissions !== undefined)
      builder.setDefaultMemberPermissions(cmd.config.defaultMemberPermissions)
    applyOptions(builder, cmd.config.options)
    data.push(builder.toJSON())
  }

  for (const [groupName, group] of Object.entries(groups)) {
    const builder = new SlashCommandBuilder()
      .setName(groupName)
      .setDescription(group.description)
    // If every subcommand is admin-only, gate the whole group at the Discord level.
    if (Object.values(group.subcommands).every((s) => s.adminOnly))
      builder.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    for (const [subName, sub] of Object.entries(group.subcommands)) {
      builder.addSubcommand((sc) => {
        sc.setName(subName).setDescription(sub.config.description)
        applyOptions(sc, sub.config.options)
        return sc
      })
    }
    data.push(builder.toJSON())
  }

  return data
}

/** Resolve the leaf handler for an incoming slash-command interaction. */
export function resolveCommand(
  interaction: ChatInputCommandInteraction
): CommandLeaf | undefined {
  const group = groups[interaction.commandName]
  if (group) {
    const sub = interaction.options.getSubcommand(false)
    return sub ? group.subcommands[sub] : undefined
  }
  return topLevel[interaction.commandName]
}
