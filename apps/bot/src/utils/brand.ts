import { EmbedBuilder, type EmbedAuthorOptions } from 'discord.js'

/**
 * Hermuz brand tokens for Discord embeds.
 *
 * Colors mirror the web theme in apps/web/src/styles.css so the bot and the
 * web app read as one system: iris for interactive / "collecting RSVPs", a
 * mint green for a full or confirmed session, a muted red for cancelled.
 */
export const BRAND = {
  accent: 0x7f7cf6, // iris
  accentBright: 0x9a97ff,
  good: 0x4fc9a0,
  danger: 0xdf5d68
} as const

/** Byline stamped on every Hermuz embed. */
export const BRAND_AUTHOR: EmbedAuthorOptions = {
  name: 'Hermuz · Monitor of the Orrery'
}

/** A fresh embed pre-stamped with the Hermuz byline. */
export function brandedEmbed(): EmbedBuilder {
  return new EmbedBuilder().setAuthor(BRAND_AUTHOR)
}
