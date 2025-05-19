import { EmbedBuilder, Colors } from 'discord.js'
import type { GameDay, Game, Attendance } from '../utils/supabase'
import { formatDate } from './formatters'
export function createGameDayMessageEmbed(
  gameDay: GameDay,
  attendances: Attendance[],
  game?: Game | null
): EmbedBuilder {
  let color: number
  if (gameDay.status === 'CANCELLED') {
    color = Colors.Red
  } else if (gameDay.status === 'SCHEDULING') {
    color = Colors.Yellow
  } else {
    color = Colors.Green
  }
  const embed = new EmbedBuilder().setTitle(gameDay.title).setColor(color)
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
    const minPlayers = game.min_players?.toString() || 'Not specified'
    const maxPlayers = game.max_players?.toString() || 'Not specified'
    embed.addFields({
      name: 'Game',
      value: `${game.name} (${game.short_name}) | Players: ${minPlayers}-${maxPlayers}`,
      inline: false
    })
  }
  embed.addFields(
    {
      name: 'Date & Time',
      value: formatDate(gameDay.date_time),
      inline: false
    },
    {
      name: 'Location',
      value: gameDay.location
        ? `${gameDay.location}${gameDay.host_user_id ? ` (Host: <@${gameDay.host_user_id}>)` : ''}`
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
              .map((a) => (a.user_id ? `<@${a.user_id}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    },
    {
      name: `🤔 Interested (${interestedAttendances.length})`,
      value:
        interestedAttendances.length > 0
          ? interestedAttendances
              .map((a) => (a.user_id ? `<@${a.user_id}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    },
    {
      name: `❌ Not Available (${notAvailableAttendances.length})`,
      value:
        notAvailableAttendances.length > 0
          ? notAvailableAttendances
              .map((a) => (a.user_id ? `<@${a.user_id}>` : 'Unknown User'))
              .join(' ')
          : 'No one yet',
      inline: true
    }
  ]
}
