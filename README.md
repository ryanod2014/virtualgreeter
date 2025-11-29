# 🎭 Ghost-Greeter

A B2B SaaS digital greeter widget that simulates live video presence to convert website visitors.

## The Concept

Ghost-Greeter creates the illusion of a live video agent watching your website. When visitors engage, they're seamlessly connected to a real agent via WebRTC.

### How It Works

1. **The Hook**: Visitor lands on a website, widget is hidden
2. **The Trigger**: On first interaction (click/scroll), widget pops open with a pre-recorded intro video
3. **The Loop**: Intro ends → seamless switch to an "idle loop" (agent typing/working)
4. **The Conversion**: Modal appears: "John is requesting to unmute"
5. **The Reality**: Visitor accepts → pre-recorded video cuts → real agent joins via WebRTC

### Elastic Pooling

- **One-to-Many**: One agent can "broadcast" their loop to 100+ visitors simultaneously
- **Automatic Reassignment**: If agent enters a real call, other visitors are seamlessly switched to available agents

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo (pnpm) |
| Database & Auth | Supabase |
| Backend | Node.js + Express + Socket.io |
| Dashboard | Next.js 14 (App Router) |
| Widget | Preact + Vite |
| WebRTC | simple-peer |
| Styling | Tailwind CSS |

## Project Structure

```
/
├── apps/
│   ├── widget/          # Embeddable Preact widget (~30KB)
│   ├── dashboard/       # Agent dashboard (Next.js)
│   └── server/          # Signaling & routing server
│
├── packages/
│   ├── domain/          # Shared types & constants (SOURCE OF TRUTH)
│   ├── config/          # Shared TSConfig, ESLint
│   └── ui/              # Shared UI components
│
├── supabase/
│   └── migrations/      # Database migrations
│
└── .github/
    └── workflows/       # CI/CD pipelines
```

## Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/ryanod2014/virtualgreeter.git
cd virtualgreeter

# Install dependencies
pnpm install

# Set up environment variables
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/server/.env.example apps/server/.env
# Edit the .env files with your Supabase credentials

# Build shared packages
pnpm build --filter=@ghost-greeter/domain
pnpm build --filter=@ghost-greeter/config

# Start all apps in development
pnpm dev
```

### Running Individual Apps

| App | Command | URL |
|-----|---------|-----|
| Dashboard | `pnpm dev --filter=@ghost-greeter/dashboard` | http://localhost:3000 |
| Server | `pnpm dev --filter=@ghost-greeter/server` | http://localhost:3001 |
| Widget | `pnpm dev --filter=@ghost-greeter/widget` | http://localhost:5173 |

## Configuration

Environment variables are documented in the `.env.example` files:

- **Dashboard**: `apps/dashboard/.env.example`
- **Server**: `apps/server/.env.example`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production configuration.

## Widget Embedding

Add this script to any website:

```html
<script>
  window.GhostGreeter = {
    config: {
      siteId: "your-site-id",
      serverUrl: "https://your-server.com",
      position: "bottom-right",
      triggerDelay: 500,
    },
  };
</script>
<script src="https://cdn.ghost-greeter.com/widget.js"></script>
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VISITOR BROWSER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Ghost-Greeter Widget                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ VideoSequencer│  │  Signaling   │  │   WebRTC     │   │   │
│  │  │ (Intro→Loop) │  │   Client     │  │   Peer       │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Socket.io / WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SIGNALING SERVER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Pool Manager│  │Socket Handlers│  │  WebRTC      │          │
│  │  (Routing)   │  │  (Events)    │  │  Signaling   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Socket.io / WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT BROWSER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Agent Dashboard                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  Bullpen     │  │  Signaling   │  │   WebRTC     │   │   │
│  │  │  (Call UI)   │  │   Client     │  │   Peer       │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Types

All shared types are defined in `packages/domain/src/types.ts`:

- `AgentProfile` - Agent data stored in database
- `AgentState` - Live agent state tracked by signaling server
- `VisitorSession` - Visitor data tracked by signaling server
- `SocketEvents` - All Socket.io event definitions
- `CallRequest` / `ActiveCall` - Call lifecycle types

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup
- Branch strategy (`main` / `develop`)
- Code style guidelines
- Pull request process
- Database migration guidelines

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ONBOARDING.md](./docs/ONBOARDING.md) | **Start here!** New developer guide |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style & PR workflow |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Local / Staging / Production overview |
| [docs/STAGING_SETUP.md](./docs/STAGING_SETUP.md) | Complete staging infrastructure setup |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Database setup instructions |

### Verify Your Setup

```bash
./scripts/verify-setup.sh
```

## License

Proprietary - All rights reserved
