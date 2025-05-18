import { EmbedBuilder, Colors } from 'discord.js'
import type { GameDay, Game, Attendance } from './supabase'

/**
 * Format a date string to a human-readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

/**
 * Create an embed for a game day
 */
export const createGameDayEmbed = (
  gameDay: GameDay,
  game: Game,
  attendances: Attendance[]
): EmbedBuilder => {
  // Count attendances by status
  const availableCount = attendances.filter(
    (a) => a.status === 'AVAILABLE'
  ).length
  const interestedCount = attendances.filter(
    (a) => a.status === 'INTERESTED'
  ).length
  const notAvailableCount = attendances.filter(
    (a) => a.status === 'NOT_AVAILABLE'
  ).length

  // Determine color based on status
  let color: number
  if (gameDay.status === 'CANCELLED') {
    color = Colors.Red
  } else if (gameDay.status === 'SCHEDULING') {
    color = Colors.Yellow
  } else {
    // SCHEDULED
    color = Colors.Green
  }

  return new EmbedBuilder()
    .setTitle(gameDay.title)
    .setDescription(gameDay.description)
    .setColor(color)
    .addFields(
      {
        name: 'Game',
        value: `${game.name} (${game.short_name})`,
        inline: true
      },
      {
        name: 'Date & Time',
        value: formatDate(gameDay.date_time),
        inline: true
      },
      { name: 'Location', value: gameDay.location, inline: true },
      {
        name: 'Status',
        value: capitalizeFirstLetter(gameDay.status),
        inline: true
      },
      { name: 'Min Players', value: game.min_players.toString(), inline: true },
      { name: 'Max Players', value: game.max_players.toString(), inline: true },
      {
        name: 'Discord Role',
        value: gameDay.discord_role_id
          ? `<@&${gameDay.discord_role_id}>`
          : 'None',
        inline: true
      },
      {
        name: 'Attendance',
        value: `✅ Available: ${availableCount}\n🤔 Interested: ${interestedCount}\n❌ Not Available: ${notAvailableCount}`,
        inline: false
      }
    )
    .setFooter({ text: `Game Day ID: ${gameDay.id}` })
    .setTimestamp(new Date(gameDay.updated_at))
}

/**
 * Create an embed for a game
 */
export const createGameEmbed = (game: Game): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`${game.name} (${game.short_name})`)
    .setDescription(game.description)
    .setColor(Colors.Blue)
    .addFields(
      { name: 'Min Players', value: game.min_players.toString(), inline: true },
      { name: 'Max Players', value: game.max_players.toString(), inline: true },
      {
        name: 'Discord Role',
        value: `<@&${game.discord_role_id}>`,
        inline: true
      },
      {
        name: 'Short Name',
        value: game.short_name,
        inline: true
      }
    )
    .setFooter({ text: `Game ID: ${game.id}` })
}

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
