import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  type RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder
} from 'discord.js'
import {
  type AutocompleteHandler,
  applyOptions,
  type CommandConfig,
  type CommandLeaf
} from '~/framework/command'
import * as campaignAnnounce from './campaign/announce'
import * as campaignConfirm from './campaign/confirm'
import * as campaignCreate from './campaign/create'
import * as campaignJoin from './campaign/join'
import * as campaignLeave from './campaign/leave'
import * as characterSet from './character/set'
import * as consoleLink from './console'
import * as gameSetup from './game/setup'
import * as gameDayAnnounce from './game_day/announce'
import * as gameDayCancel from './game_day/cancel'
import * as gameDayList from './game_day/list'
import * as gameDaySchedule from './game_day/schedule'
import * as games from './games'
import * as myCampaigns from './my/campaigns'
import * as mySchedule from './my/schedule'
import * as ping from './ping'
import * as rsvp from './rsvp'
import * as setSchedulingChannel from './set_scheduling_channel'
import * as surveyCancel from './survey/cancel'
import * as surveyCanonize from './survey/canonize'
import * as surveyCreate from './survey/create'
import * as taskClaim from './task/claim'
import * as taskDone from './task/done'
import * as taskList from './task/list'

type CommandModule = {
  config: CommandConfig
  default: CommandLeaf['handler']
  autocomplete?: AutocompleteHandler
}

const leaf = (mod: CommandModule, adminOnly = false): CommandLeaf => ({
  config: mod.config,
  handler: mod.default,
  adminOnly,
  autocomplete: mod.autocomplete
})

/** Top-level commands (no subcommands). */
const topLevel: Record<string, CommandLeaf> = {
  ping: leaf(ping),
  games: leaf(games),
  console: leaf(consoleLink),
  rsvp: leaf(rsvp),
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
      announce: leaf(campaignAnnounce),
      join: leaf(campaignJoin),
      leave: leaf(campaignLeave),
      confirm: leaf(campaignConfirm)
    }
  },
  character: {
    description: 'Manage your campaign characters',
    subcommands: {
      set: leaf(characterSet)
    }
  },
  my: {
    description: 'Your games and campaigns',
    subcommands: {
      schedule: leaf(mySchedule),
      campaigns: leaf(myCampaigns)
    }
  },
  task: {
    description: 'Game day setup checklist',
    subcommands: {
      list: leaf(taskList),
      done: leaf(taskDone),
      claim: leaf(taskClaim)
    }
  },
  survey: {
    description: 'Survey candidate dates for a new game day',
    subcommands: {
      create: leaf(surveyCreate, true),
      canonize: leaf(surveyCanonize, true),
      cancel: leaf(surveyCancel, true)
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

/**
 * Resolve the leaf for an interaction by command name + optional subcommand.
 * Works for both chat-input and autocomplete interactions (both expose
 * `commandName` and `options.getSubcommand`).
 */
export function resolveCommand(
  interaction: ChatInputCommandInteraction | AutocompleteInteraction
): CommandLeaf | undefined {
  const group = groups[interaction.commandName]
  if (group) {
    const sub = interaction.options.getSubcommand(false)
    return sub ? group.subcommands[sub] : undefined
  }
  return topLevel[interaction.commandName]
}
