import type {
  AutocompleteInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder
} from 'discord.js'

/** Option types Hermuz commands actually use. */
export type CommandOptionType = 'string' | 'role' | 'channel'

export interface CommandOption {
  name: string
  description: string
  type: CommandOptionType
  required?: boolean
  channelTypes?: readonly ChannelType[]
  /** String options only: enable Discord's live autocomplete. */
  autocomplete?: boolean
  /** String options only: a fixed set of choices (mutually exclusive with autocomplete). */
  choices?: readonly { name: string; value: string }[]
}

export interface CommandConfig {
  description: string
  /** A permission bit (e.g. `PermissionFlagsBits.Administrator`) required by default. */
  defaultMemberPermissions?: bigint
  options?: readonly CommandOption[]
}

/**
 * Identity shim replacing `robo.js`'s `createCommandConfig`. Preserves the
 * config object (typed) for REST registration; handlers still read their
 * options directly off `interaction.options.*`, as before.
 */
export function createCommandConfig(config: CommandConfig): CommandConfig {
  return config
}

export type CommandHandler = (
  interaction: ChatInputCommandInteraction
) => unknown

/** Resolves choices for an autocomplete option on a command. */
export type AutocompleteHandler = (
  interaction: AutocompleteInteraction
) => Promise<void> | void

/** A registerable leaf: its slash config, its handler, and whether it's admin-gated. */
export interface CommandLeaf {
  config: CommandConfig
  handler: CommandHandler
  adminOnly?: boolean
  /** Optional resolver for the command's autocomplete option(s). */
  autocomplete?: AutocompleteHandler
}

/** Apply Hermuz command options onto a (sub)command builder. */
export function applyOptions(
  builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  options: readonly CommandOption[] | undefined
): void {
  if (!options) return
  for (const opt of options) {
    switch (opt.type) {
      case 'string':
        builder.addStringOption((o) => {
          o.setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false)
          if (opt.choices) o.addChoices(...opt.choices)
          else o.setAutocomplete(opt.autocomplete ?? false)
          return o
        })
        break
      case 'role':
        builder.addRoleOption((o) =>
          o
            .setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false)
        )
        break
      case 'channel':
        builder.addChannelOption((o) => {
          o.setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false)
          if (opt.channelTypes)
            o.addChannelTypes(...(opt.channelTypes as unknown as never[]))
          return o
        })
        break
    }
  }
}
