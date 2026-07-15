import {
  getAllGames,
  createGame,
  getAllCampaigns,
  createCampaign,
  getGameDayByRoleId,
  createGameDay,
  runMigrations,
} from '@hermuz/db'
import { logger } from '~/utils/logger'

/**
 * One-off seed of existing server data, inferred from the live Discord roles
 * (confirmed with the server owner). Idempotent: keyed on shortName (games) and
 * discordRoleId (campaigns / game days), so re-running is a no-op. Gated behind
 * the RUN_BACKFILL env flag in the bootstrap, or run directly:
 *   RUN_BACKFILL=1 bun run apps/bot/src/scripts/backfill.ts
 */

interface SeedGame {
  name: string
  shortName: string
  description?: string
  discordRoleId?: string | null
}

interface SeedCampaign {
  title: string
  gameShortName: string
  gameName: string
  discordRoleId: string
  description?: string
}

interface SeedGameDay {
  title: string
  gameShortName: string
  dateTime: string
  discordRoleId: string
  discordCategoryId?: string
}

const GAMES: SeedGame[] = [
  {
    name: 'Twilight Imperium',
    shortName: 'TI4',
    discordRoleId: '1372440056551178240', // @TWIMPer
    description: 'Played as single game days.',
  },
  {
    name: 'Arcs',
    shortName: 'Arcs',
    discordRoleId: '1372442551650615306', // @ARCbound
    description: 'Single game days and campaigns.',
  },
  { name: 'Dungeons & Dragons', shortName: 'D&D' },
  { name: 'Blades in the Dark', shortName: 'BitD' },
  { name: 'Salvage Union', shortName: 'SU' },
  { name: 'Daggerheart', shortName: 'DH' },
]

const CAMPAIGNS: SeedCampaign[] = [
  {
    title: 'Arcs Campaign 01',
    gameShortName: 'Arcs',
    gameName: 'Arcs',
    discordRoleId: '1375476962235125791',
  },
  {
    title: 'Arcs Campaign 2',
    gameShortName: 'Arcs',
    gameName: 'Arcs',
    discordRoleId: '1446500612375187566',
  },
  {
    title: 'Fulcrum',
    gameShortName: 'D&D',
    gameName: 'Dungeons & Dragons',
    discordRoleId: '1380162830044758106',
    description: 'Completed campaign.',
  },
  {
    title: 'Outkasts',
    gameShortName: 'BitD',
    gameName: 'Blades in the Dark',
    discordRoleId: '1377390215672631438',
    description: 'Completed campaign.',
  },
  {
    title: 'Local Union 812 "HAVEN"',
    gameShortName: 'SU',
    gameName: 'Salvage Union',
    discordRoleId: '1372448948551286794',
  },
  {
    title: 'The Blighted Band',
    gameShortName: 'DH',
    gameName: 'Daggerheart',
    discordRoleId: '1372448467301044344',
  },
]

const GAME_DAYS: SeedGameDay[] = [
  {
    title: 'TI4 — Nov 15',
    gameShortName: 'TI4',
    dateTime: '2025-11-15T18:00:00.000Z',
    discordRoleId: '1422202197004910664', // @TI4-11-15-25
    discordCategoryId: '1422202358972289074',
  },
]

export async function runBackfill(): Promise<void> {
  logger.info('Backfill: seeding games / campaigns / game days from Discord…')

  const gameIdByShort = new Map<string, string>()
  const existingGames = await getAllGames()
  for (const g of existingGames) gameIdByShort.set(g.shortName, g.id)

  for (const g of GAMES) {
    if (gameIdByShort.has(g.shortName)) continue
    const created = await createGame({
      name: g.name,
      shortName: g.shortName,
      description: g.description ?? null,
      discordRoleId: g.discordRoleId ?? null,
    })
    if (created) {
      gameIdByShort.set(g.shortName, created.id)
      logger.info(`Backfill: +game ${g.name} (${g.shortName})`)
    }
  }

  const existingCampaignRoleIds = new Set(
    (await getAllCampaigns()).map((c) => c.discordRoleId),
  )
  for (const c of CAMPAIGNS) {
    if (existingCampaignRoleIds.has(c.discordRoleId)) continue
    await createCampaign({
      title: c.title,
      gameId: gameIdByShort.get(c.gameShortName) ?? null,
      gameName: c.gameName,
      discordRoleId: c.discordRoleId,
      regularGameTime: 'TBD',
      description: c.description ?? null,
    })
    logger.info(`Backfill: +campaign ${c.title}`)
  }

  for (const gd of GAME_DAYS) {
    if (await getGameDayByRoleId(gd.discordRoleId)) continue
    await createGameDay({
      title: gd.title,
      dateTime: gd.dateTime,
      status: 'CLOSED',
      gameId: gameIdByShort.get(gd.gameShortName) ?? null,
      discordRoleId: gd.discordRoleId,
      discordCategoryId: gd.discordCategoryId ?? null,
    })
    logger.info(`Backfill: +game day ${gd.title}`)
  }

  logger.info('Backfill: done.')
}

if (import.meta.main) {
  runMigrations()
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Backfill failed:', err)
      process.exit(1)
    })
}
