<p align="center">✨ <strong>Generated with <a href="https://robojs.dev/create-robo">create-robo</a> magic!</strong> ✨</p>

---

# Hermuz - Board Game Scheduling Discord Bot 🎲

Hermuz is a Discord bot for managing board game scheduling and attendance in a Discord server. It allows users to create game days, RSVP to events, and track attendance.

## Features

- Create and manage games with associated Discord roles
- Schedule game days with date, time, and location
- RSVP to game days (interested, confirmed, declined)
- View upcoming game days and attendance lists
- Cancel game days when needed

## Technology Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Framework**: [Robo.js](https://robojs.dev/) (built on top of Discord.js)
- **Language**: TypeScript
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Code Quality**: ESLint and Prettier

## Table of Contents

- [🔗 Quick Links](#quick-links)
- [✨ Getting Started](#getting-started)
- [🛠️ Development](#development)
- [🔒 Debugging](#debugging)
- [🛠️ Client Configuration](#client-configuration)
- [🔌 Ecosystem](#ecosystem)
- [🚀 Hosting](#hosting)
- [📊 Database Setup](#database-setup)

## Quick Links

- [📚 **Documentation:** Getting started with Robo.js](https://robojs.dev/discord-bots)
- [✨ **Discord:** Robo - Imagine Magic](https://robojs.dev/discord)
- [🔗 **Templates:** Kickstart your project with a template.](https://robojs.dev/plugins/create)
- [📖 **Tutorials:** Learn how to create epic experiences.](https://dev.to/waveplay)

## Getting Started

Run development mode:

```bash
npm run dev
```

- [🔰 **Beginner Guide:** New to Discord Bots with Robo? Start here!](https://robojs.dev/discord-bots/beginner-guide)
- [🎭 **Run Modes:** Define profiles for your Robo session.](https://robojs.dev/robojs/mode#default-modes)

## Development

Creating a **[Slash Command](https://robojs.dev/discord-bots/commands)** is as easy as creating files.

Let's say you want a new `/hello` command. Just create a file in the `/src/commands` directory named `hello.js` and export a default function that returns something.

```javascript title="/src/commands/hello.js"
export default (interaction) => {
  interaction.reply('Hello World!')
}
```

![Code for a slash command](https://github.com/Wave-Play/robo.js/blob/main/docs/static/readme/slash-command-code.png?raw=true)

Your `/hello` command is now ready to use! **Robo.js** takes care of registration for you.

![Pk using a slash command](https://raw.githubusercontent.com/Wave-Play/robo.js/refs/heads/main/docs/static/readme/slash-command.png)

Ever clicked on an avatar or message and seen an _Apps_ section? Those are **[Context Commands](https://robojs.dev/discord-bots/context-menu)**!

Create a file file in `/src/context/message` named after the command. For example, `Quote.js`.

```javascript title="/src/context/message/Quote.js"
export default (interaction, message) => {
  interaction.reply(`${message.author} said:\n\n> ${message.content}`)
}
```

![Code for a context command](https://github.com/Wave-Play/robo.js/blob/main/docs/static/readme/context-message-code.png?raw=true)

You can do the same for users under `/src/context/user`.

![Quoting a message via context command](https://github.com/Wave-Play/robo.js/blob/main/docs/static/readme/context-message.png?raw=true)

- [📜 **Slash Commands:** Your bot follows best practices by default.](https://robojs.dev/discord-bots/commands)
- [📡 **Events:** Know and respond to everything that happens.](https://robojs.dev/discord-bots/events)
- [🖱️ **Context Commands:** Extend right click and long press behavior.](https://robojs.dev/discord-bots/context-menu)
- [⚡ **Flashcore Database:** Persist data in your Robo with ease.](https://robojs.dev/robojs/flashcore)

## Debugging

**Discord Bots** made with **Robo.js** come with a built-in **[Debugger](https://robojs.dev/discord-bots/debug)**.

Whenever your bot crashes in development mode, the debugger shows an interactive error message - all within **Discord**!

![Built-in debugger showing an error](https://github.com/Wave-Play/robo.js/blob/main/docs/static/readme/debugger.png?raw=true)

You even get `/dev` **[Subcommands](https://robojs.dev/discord-bots/commands#subcommands)** for quick access to logs, system info, and more. Just set your test server's ID as an **environment variable** called `DISCORD_GUILD_ID`.

- [🐛 **Debugging:** Troubleshoot right within Discord.](https://robojs.dev/discord-bots/debug)
- [🔑 **Credentials:** Secure your Discord Bot credentials.](https://robojs.dev/discord-bots/credentials#optional-variables)

## Client Configuration

**Robo.js** manages your **Discord.js** `Client` instance. You may import `client` anywhere in your project.

```javascript
// File: /src/commands/name.js
import { client } from 'robo.js'

export default () => {
  return `My name is ${client.user.username}`
}
```

Intents or other configurations can be set in the `config/robo.mjs` file.

```javascript
// File: /config/robo.mjs
export default {
  clientOptions: {
    intents: ['Guilds', 'GuildMessages']
  }
  // ... other options
}
```

- [🔧 **Configuration:** Customize behavior and features.](https://robojs.dev/robojs/config)

## Robo Ecosystem

By building with **Robo.js**, you gain access to a growing ecosystem of **[plugins](https://robojs.dev/plugins/directory)**, **[templates](https://robojs.dev/templates/overview)**, and **[tools](https://robojs.dev/cli/overview)**. **[Robo Plugins](https://robojs.dev/plugins/overview)** are special. They can add features with one command.

```bash
npx robo add @robojs/ai @robojs/moderation
```

Plugins integrate seamlessly thanks to the **[Robo File Structure](https://robojs.dev/discord-bots/file-structure)**. What's more, anyone can **[create a plugin](https://robojs.dev/plugins/create)**.

- [🔌 **Robo Plugins:** Add features to your Robo seamlessly.](https://robojs.dev/plugins/install)
- [🔌 **Creating Plugins:** Make your own plugins for Robo.js.](https://robojs.dev/plugins/create)
- [🗃️ **Plugin Directory:** Browse plugins for your Robo.](https://robojs.dev/plugins/create)
- [🔗 **Templates:** Kickstart your project with a template.](https://robojs.dev/plugins/create)

## Hosting

**Hosting** your project keeps it running 24/7. No need to keep your computer on at all times, or worry about your Internet connection.

You can host on any platform that supports **Node.js**, or run [`robo deploy`](https://robojs.dev/cli/robo#distributing) to host on **[RoboPlay](https://roboplay.dev)** - a hosting platform optimized for **Robo.js**.

```bash
npm run deploy
```

- [🚀 **RoboPlay:** Deploy with as little as one command.](https://robojs.dev/hosting/roboplay)
- [🛠️ **Self-Hosting:** Learn how to host and maintain it yourself.](https://robojs.dev/hosting/overview)

## Database Setup

This project uses Supabase as its database. Follow these steps to set up your database:

1. Create a new project on [Supabase](https://supabase.com/)
2. Create the following tables in your Supabase database:

### Users Table

```sql
CREATE TABLE users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL
);
```

### Games Table

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  discord_role_id TEXT NOT NULL,
  min_players INTEGER NOT NULL,
  max_players INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  complexity_rating INTEGER NOT NULL
);
```

### Game Days Table

```sql
CREATE TABLE game_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id),
  host_user_id TEXT NOT NULL REFERENCES users(discord_id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'canceled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Attendances Table

```sql
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_day_id UUID NOT NULL REFERENCES game_days(id),
  user_id TEXT NOT NULL REFERENCES users(discord_id),
  status TEXT NOT NULL CHECK (status IN ('interested', 'confirmed', 'declined', 'waitlisted')),
  UNIQUE(game_day_id, user_id)
);
```

3. Update the `.env` file with your Supabase URL and anon key:

```env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
```
