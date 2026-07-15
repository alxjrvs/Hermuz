import type { Attendance, Game, GameDay } from '@hermuz/db'
import { EmbedBuilder } from 'discord.js'
import { BRAND, BRAND_AUTHOR } from './brand'

/** Human-readable date/time for a game day's ISO timestamp. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
export function createGameDayMessageEmbed(
  gameDay: GameDay,
  attendances: Attendance[],
  game?: Game | null
): EmbedBuilder {
  let color: number
  if (gameDay.status === 'CANCELLED') {
    color = BRAND.danger
  } else if (gameDay.status === 'SCHEDULING') {
    color = BRAND.accent
  } else {
    color = BRAND.good
  }
  const embed = new EmbedBuilder()
    .setAuthor(BRAND_AUTHOR)
    .setTitle(gameDay.title)
    .setColor(color)
  if (gameDay.status === 'CANCELLED') {
    embed.setDescription('This game day has been cancelled.')
    return embed
  }
  if (gameDay.status === 'CLOSED') {
    embed.setDescription(
      'This game day has been closed, and is not taking any more RSVPs.'
    )
    return embed
  }
  embed.setDescription(gameDay.description || 'No description provided')
  if (game) {
    const minPlayers = game.minPlayers?.toString() || 'Not specified'
    const maxPlayers = game.maxPlayers?.toString() || 'Not specified'
    embed.addFields({
      name: 'Game',
      value: `${game.name} (${game.shortName}) | Players: ${minPlayers}-${maxPlayers}`,
      inline: false
    })
  }
  embed.addFields(
    {
      name: 'Date & Time',
      value: formatDate(gameDay.dateTime),
      inline: false
    },
    {
      name: 'Location',
      value: gameDay.location
        ? `${gameDay.location}${gameDay.hostUserId ? ` (Host: <@${gameDay.hostUserId}>)` : ''}`
        : 'No location specified',
      inline: false
    }
  )
  embed.addFields(...createGameDayAttendanceEmbed(attendances))
  embed.setFooter({ text: `Game Day ID: ${gameDay.id}` })
  return embed
}
function createGameDayAttendanceEmbed(attendances: Attendance[]) {
  const availableAttendances = attendances.filter(
    (a) => a.status === 'AVAILABLE'
  )
  const interestedAttendances = attendances.filter(
    (a) => a.status === 'INTERESTED'
  )
  const notAvailableAttendances = attendances.filter(
    (a) => a.status === 'NOT_AVAILABLE'
  )
  return [
    {
      name: `✅ Attending (${availableAttendances.length})`,
      value:
        availableAttendances.length > 0
          ? availableAttendances
              .map((a) => (a.userId ? `<@${a.userId}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    },
    {
      name: `🤔 Interested (${interestedAttendances.length})`,
      value:
        interestedAttendances.length > 0
          ? interestedAttendances
              .map((a) => (a.userId ? `<@${a.userId}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    },
    {
      name: `❌ Not Available (${notAvailableAttendances.length})`,
      value:
        notAvailableAttendances.length > 0
          ? notAvailableAttendances
              .map((a) => (a.userId ? `<@${a.userId}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    }
  ]
}
