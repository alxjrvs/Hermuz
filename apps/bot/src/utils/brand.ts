import { EmbedBuilder, type EmbedAuthorOptions } from 'discord.js'

/**
 * Hermuz "Ephemeris" brand tokens for Discord embeds.
 *
 * Colors mirror the web theme in apps/web/src/styles.css so the bot and the
 * observation deck read as one system: brass for interactive / "turning"
 * (scheduling), verdigris for "held" (open / confirmed / locked), warm red for
 * "dark" (cancelled).
 */
export const BRAND = {
  brass: 0xd8a64a,
  gilt: 0xefc877,
  verdigris: 0x57a896,
  danger: 0xe8595e,
  void: 0x0b1020
} as const

/** Byline stamped on every Hermuz embed. */
export const BRAND_AUTHOR: EmbedAuthorOptions = {
  name: 'Hermuz · Keeper of the Orrery'
}

/** A fresh embed pre-stamped with the Hermuz byline. */
export function brandedEmbed(): EmbedBuilder {
  return new EmbedBuilder().setAuthor(BRAND_AUTHOR)
}
