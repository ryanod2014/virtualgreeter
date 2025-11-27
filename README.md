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
/root
  ├── apps/
  │   ├── widget/          # Embeddable Preact widget (~30KB)
  │   ├── dashboard/       # Agent dashboard (Next.js)
  │   └── server/          # Signaling & routing server
  │
  └── packages/
      ├── domain/          # Shared types & constants (SOURCE OF TRUTH)
      ├── config/          # Shared TSConfig, ESLint
      └── ui/              # Shared UI components
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm build --filter @ghost-greeter/domain
pnpm build --filter @ghost-greeter/config

# Start all apps in development
pnpm dev
```

### Running Individual Apps

```bash
# Widget (http://localhost:5173)
pnpm dev --filter @ghost-greeter/widget

# Dashboard (http://localhost:3000)
pnpm dev --filter @ghost-greeter/dashboard

# Server (http://localhost:3001)
pnpm dev --filter @ghost-greeter/server
```

## Configuration

### Environment Variables

**Server (`apps/server/.env`)**
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Dashboard (`apps/dashboard/.env.local`)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001
```

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
│  │  │  Bullpen   │  │  Signaling   │  │   WebRTC     │   │   │
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

## License

Proprietary - All rights reserved

