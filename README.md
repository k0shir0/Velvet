# 🍷 Velvet

A modular, **locally-hosted** Discord bot managed through a sleek web control panel.

Velvet starts completely **barebones** — every feature is strictly opt-in. You toggle
modules on from the dashboard, stage your configuration, and hit **Push Changes** to deploy to the live bot.

---

## Architecture

A single Node.js process runs **both** the Discord bot and the dashboard backend, so the
control panel talks directly to the live bot instance.

```
velvet/
├─ shared/   @velvet/shared — module contract, config schemas, shared types (zod)
├─ server/   @velvet/server — discord.js bot + Express API + Socket.IO + SQLite (Drizzle)
└─ web/      @velvet/web     — React + Vite control panel (Velvet theme)
```

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Bot            | [discord.js](https://discord.js.org)              |
| Backend / API  | Express + [Socket.IO](https://socket.io)          |
| Frontend       | React + Vite                                      |
| Database       | SQLite via [Drizzle ORM](https://orm.drizzle.team) (`better-sqlite3`) |
| Validation     | [zod](https://zod.dev)                            |
| Logging        | [pino](https://getpino.io)                        |

### The module system

Every feature is a **module** that defaults to **disabled**. A module declares its metadata,
a zod config schema, optional slash commands, and `onEnable` / `onDisable` lifecycle hooks.
The dashboard stages changes locally; **Push Changes** sends the desired state to the server,
which validates it, persists it to SQLite, diffs it against the running bot, and hot-swaps the
affected modules.

---
# Gallary
<img width="1875" height="960" alt="image" src="https://github.com/user-attachments/assets/358a435e-a462-412b-b623-b4f64af0c4f4" />

<img width="1903" height="958" alt="image" src="https://github.com/user-attachments/assets/2b3dfc43-37d1-4099-8a75-8bd1f1110dfd" />






## Getting started

```bash
# 1. Install all workspaces
npm install

# 2. Configure secrets
cp .env.example .env
#   → fill in TOKEN, CLIENT_ID, GUILD_ID, and a DASHBOARD_PASSWORD

# 3. Run bot + dashboard in dev mode
npm run dev
```

- Control panel (Vite dev server): **http://localhost:5173**
- Backend API + WebSocket: **http://localhost:4317** (configurable via `DASHBOARD_PORT`)

Without a `TOKEN`, the dashboard still runs in offline mode so you can explore the panel. (for testing)
