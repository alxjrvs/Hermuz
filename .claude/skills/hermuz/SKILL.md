---
name: hermuz
description: Operate the live Hermuz deployment — list/inspect/schedule games, campaigns and their sessions; set a repeating campaign's recurrence (weekday/time/timezone, incl. past-anchored biweekly series); generate/cancel sessions; trigger Render deploys; read runtime logs; and inspect the Discord guild's roles/channels. Use whenever the task is running or changing the deployed Hermuz app (not its source code).
---

# Hermuz operator

Hermuz runs as one Render web service (Discord bot + JSON API over SQLite) with a
Netlify web console. This skill drives the **live** deployment through a bundled
CLI so you don't hand-roll `curl` + admin JWTs.

## The CLI

Run from the repo root:

```bash
bun scripts/hermuz.ts <command> [args]     # or: ./scripts/hermuz.ts <command>
```

**Auth is automatic** — the CLI reads the Render API key from 1Password
(`op-agent secret op://claude-agent/render/credential`), pulls `JWT_SECRET` /
`DISCORD_TOKEN` / `GUILD_ID` from the Render service's env, and mints a
short-lived admin token. Nothing to configure. (If `op-agent` can't read the
key, ask the user to store it at `op://claude-agent/render/credential`.)

## Commands

| Command | What it does |
| --- | --- |
| `games` | list games (kind default, max sessions, id) |
| `campaigns` | list campaigns (kind, active session count, anchor, id) |
| `campaign <id>` | show a campaign JSON + its sessions |
| `campaign <id> schedule …` | make REPEATING + set recurrence, then generate sessions |
| `campaign <id> generate` | materialize / extend the session series |
| `campaign <id> cancel <sessionNo>` | cancel one session |
| `campaign <id> announce` | (re)post the campaign to the scheduling channel (**touches Discord**) |
| `sessions <id>` | list a campaign's sessions |
| `deploy [--wait]` | trigger a Render deploy of `main`, optionally poll to live |
| `logs [n]` | last n runtime log lines |
| `discord roles` / `discord channels` | list the guild's roles / channels (to find ids) |
| `whoami` | verify the auth chain |

### Scheduling a repeating campaign

Either give an explicit ISO anchor, or let the CLI compute it (DST-aware):

```bash
# "started this past Monday, 8:30pm ET, every other week"
bun scripts/hermuz.ts campaign <id> schedule \
  --weekday mon --time 20:30 --tz ET --start past --every 2

# "starts next Sunday, 11am ET, weekly, capped at 6 sessions"
bun scripts/hermuz.ts campaign <id> schedule \
  --weekday sun --time 11:00 --tz ET --start next --every 1 --max 6

# explicit anchor
bun scripts/hermuz.ts campaign <id> schedule --anchor 2026-07-19T15:00:00Z --every 2
```

`--start` is `past` (most recent occurrence, for series already running),
`next` (next occurrence), or a `YYYY-MM-DD`. `--tz` accepts `ET/CT/MT/PT/UTC`
or any IANA zone. The anchor is the **first session's** datetime and is the
source of truth for the cadence.

## Things to know

- **Sessions are calendar/DB entries only** — `schedule`/`generate` do **not**
  create Discord roles/channels/events. `announce` and campaign **creation**
  (via the web console / bot) are what touch Discord.
- The API is admin-gated; the CLI mints an admin token, so all commands work.
- **Render auto-deploy isn't wired**, so after merging a PR to `main`, run
  `bun scripts/hermuz.ts deploy --wait` to ship it (migrations run on boot).
- Overrides via env if the service ever moves: `HERMUZ_RENDER_SERVICE`,
  `HERMUZ_RENDER_OWNER`, `HERMUZ_API_ORIGIN`.
- To find a role/channel id for a campaign, use `discord roles` / `discord channels`.
