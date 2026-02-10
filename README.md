# 🏢 AgentMonitor

> Real-time AI agent visualization & monitoring dashboard for [OpenClaw](https://github.com/nicepkg/openclaw)

Watch your AI agents work in a **pixel-art office**. Monitor status, chat with them, and customize everything — all from your browser.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-91%20passed-brightgreen)

<!-- TODO: Add screenshot/GIF here -->
<!-- ![AgentMonitor Screenshot](docs/screenshot.png) -->

<img width="2538" height="1262" alt="image" src="https://github.com/user-attachments/assets/908f2447-ec91-4d17-93b1-3d327cafe478" />

---

## ⚡ Quick Start

```bash
git clone https://github.com/ruiqili2/agent-monitor.git
cd agent-monitor
npm install
npm run dev
```

Open **http://localhost:3000** — that's it. The app starts in **Demo Mode** with 3 animated agents.

### Connect to OpenClaw Gateway

To monitor your real agents, either:

**Option A — URL params (fastest):**
```
http://localhost:3000?gateway=http://localhost:18789&token=YOUR_TOKEN
```

**Option B — Settings panel:**
1. Click ⚙️ Settings
2. Enter your Gateway URL (default: `http://localhost:18789`)
3. Enter your auth token
4. Toggle off Demo Mode

> **Where's my token?** Check `~/.openclaw/openclaw.json` → `gateway.auth.token`

---

## ✨ Features

### 🖥️ Dashboard
- **Agent Cards** — Real-time status, token usage, current task per agent
- **System Stats** — Total/active agents, token usage, uptime
- **Activity Feed** — Live event stream across all agents
- **Mini Office** — Pixel office preview right on the dashboard

### 🏢 Office View
- **Isometric Pixel Art** — Full office with furniture, zones, and decorations
- **18 Agent Behaviors** — Agents walk between zones based on their real status:

  | Category | Behaviors | Office Zone |
  |----------|-----------|-------------|
  | **Work** | coding, debugging | Desk (typing animation) |
  | | thinking | Whiteboard |
  | | researching | Desk (reading) |
  | | meeting | Meeting room |
  | | deploying | Desk (focused) |
  | **Interaction** | receiving_task | Walk to owner |
  | | reporting | Walk to owner |
  | **Life** | idle | Wander around |
  | | coffee, snacking | Break room |
  | | sleeping, napping | Lounge (zzZ) |
  | | toilet | Bathroom |
  | **Anomaly** | panicking | Running around! |
  | | dead | Collapsed 💀 |
  | | overloaded | Smoking head 🤯 |
  | | reviving | Sparkle effect ✨ |

- **Day/Night Cycle** — Ambient lighting changes over time
- **Particle Effects** — Visual feedback for different states

### 💬 Chat
- Click any agent to open a slide-in chat panel
- Send messages and see agent replies in real-time
- Uses `chat.send` + `chat.history` via OpenClaw Gateway WebSocket
- Demo mode simulates responses

### 🎨 4 Themes
| Theme | Vibe |
|-------|------|
| **Midnight** (default) | Deep blue, professional |
| **Void** | Pure dark, minimal |
| **Warm** | Cozy amber tones |
| **Neon** | Cyberpunk, high contrast |

### 🧑‍💼 Customization
- **Owner name & avatar** — Configurable (not hardcoded!)
- **Agent avatars** — glasses, hoodie, suit, casual, robot, cat, dog
- **Agent colors** — 6 presets per agent
- **Import/Export** — Save and share your config as JSON

---

## 🏗️ Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            #   Dashboard (/)
│   ├── office/page.tsx     #   Full office view (/office)
│   └── agent/[id]/page.tsx #   Agent detail (/agent/:id)
├── components/
│   ├── dashboard/          # AgentCard, AgentGrid, ActivityFeed, SystemStats, Navbar
│   ├── office/             # OfficeCanvas, MiniOffice, OfficeControls
│   ├── agent/              # AgentDetail, TokenUsage, SessionLog, TaskList
│   ├── chat/               # ChatWindow
│   ├── settings/           # SettingsPanel (3 tabs: Gateway, Agents, Theme)
│   └── shared/             # StatusBadge, ConnectionStatus
├── engine/                 # Canvas rendering engine
│   ├── isometric.ts        #   Isometric coordinate system
│   ├── pathfinding.ts      #   A* pathfinding on tile grid
│   └── animation.ts        #   Sprite animation system
├── sprites/                # Pixel art renderers
│   ├── characters.ts       #   Agent & owner sprites
│   ├── furniture.ts        #   Office furniture
│   ├── decorations.ts      #   Plants, posters, etc.
│   └── effects.ts          #   Particles, bubbles, sparkles
├── office/                 # Office layout & logic
│   ├── layout.ts           #   Tile map & zone definitions
│   └── zones.ts            #   Behavior → zone mapping
├── hooks/
│   ├── useAgents.ts        #   Agent state management + chat
│   ├── useGateway.ts       #   Gateway connection polling
│   └── useOffice.ts        #   Office animation state machine
├── lib/
│   ├── types.ts            #   TypeScript type definitions
│   ├── config.ts           #   Config loading/saving (localStorage + URL)
│   ├── gateway-client.ts   #   Gateway HTTP polling client
│   └── state-mapper.ts     #   Behavior → office state mapping
└── __tests__/              # Vitest test suite (91 tests)
```

### How it works

1. **Gateway Polling** — `useAgents` polls `/api/gateway` every 5s
2. **API Route** — Next.js server route connects to OpenClaw Gateway via WebSocket
3. **Behavior Inference** — Maps session `updatedAt` timestamps to agent behaviors
4. **Canvas Rendering** — HTML5 Canvas draws the isometric office at 60fps
5. **A\* Pathfinding** — Agents walk between zones when behavior changes

### Gateway Protocol

The app communicates with OpenClaw Gateway using the [WebSocket protocol v3](https://docs.openclaw.ai):

- `sessions.list` — Discover active sessions
- `chat.send` — Send messages to agents
- `chat.history` — Fetch conversation history
- Each API call opens a short-lived WebSocket connection (connect challenge → handshake → request → close)

---

## 🧪 Testing

```bash
npm test              # Run all tests (91 tests)
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

Test coverage includes:
- **state-mapper** (30 tests) — Behavior classification, office state mapping, demo data, formatters
- **gateway-client** (28 tests) — Behavior mapping, polling, error handling, multi-session
- **config** (20 tests) — Mutation immutability, import/export, localStorage, URL params
- **types** (11 tests) — Compile-time type consistency checks
- **api-routes** (2 tests) — Structural smoke tests

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Rendering | HTML5 Canvas (pixel art, no WebGL) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + CSS custom properties |
| WebSocket | [ws](https://github.com/websockets/ws) (server-side gateway connection) |
| Testing | [Vitest](https://vitest.dev) + Testing Library |
| Agent Platform | [OpenClaw](https://github.com/nicepkg/openclaw) |

---

## 🗺️ Roadmap

- [x] Dashboard with agent cards, stats, activity feed
- [x] Pixel-art isometric office with 18 behaviors
- [x] Real-time Gateway connection (WebSocket via API route)
- [x] Chat with agents (send + receive replies)
- [x] 4 themes + full customization
- [x] Test suite (91 tests)
- [ ] Persistent WebSocket connection (replace per-request connections)
- [ ] Real-time event subscription (replace HTTP polling)
- [ ] Cloudflare Tunnel support for remote access
- [ ] OpenClaw Plugin packaging (`openclaw plugins install @openclaw/agent-monitor`)
- [ ] npm package (`npx agent-monitor`)

---

## 🤝 Contributing

Contributions welcome! Here's how to get started:

1. **Fork** the repo
2. **Create a branch** — `git checkout -b feat/my-feature`
3. **Make changes** — Follow existing code style (TypeScript strict mode)
4. **Run tests** — `npm test` (all 91 must pass)
5. **Build check** — `npm run build` (must succeed)
6. **Submit a PR** — Describe what you changed and why

### Development tips
- `npm run dev` starts the dev server with hot reload
- `npm run test:watch` for TDD workflow
- The app auto-detects Gateway connection; no setup needed for UI work (demo mode)
- CSS variables in `src/app/globals.css` control all theme colors

---

## 📄 License

[MIT](LICENSE) — Use it, modify it, ship it.

---

<p align="center">
  Built with ⚡ by <a href="https://github.com/ruiqili2">ruiqili2</a> and an army of AI agents
</p>
