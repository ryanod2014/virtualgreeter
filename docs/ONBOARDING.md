# 🚀 New Developer Onboarding

Welcome to Ghost-Greeter! This guide will get you from zero to running in 15 minutes.

## Quick Overview

Ghost-Greeter is a B2B SaaS widget that creates the illusion of live video agents on websites. When visitors engage, they connect to real agents via WebRTC.

**Tech Stack:**
- **Monorepo**: Turborepo + pnpm
- **Frontend**: Next.js 14 (dashboard) + Preact (widget)
- **Backend**: Node.js + Socket.io (signaling server)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel (frontend) + Railway (backend)

---

## Step 1: Clone & Install (2 min)

```bash
# Clone the repo
git clone https://github.com/your-org/Digital_greeter.git
cd Digital_greeter

# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install
```

---

## Step 2: Environment Setup (5 min)

### Get Supabase Credentials

Ask your team lead for access to the **development/staging** Supabase project, or create your own:

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or get invited to existing)
3. Go to **Settings → API**
4. Copy: `Project URL` and `anon public` key

### Configure Environment Files

```bash
# Copy the example files
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/server/.env.example apps/server/.env
```

**Edit `apps/dashboard/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001
NEXT_PUBLIC_WIDGET_CDN_URL=http://localhost:5173/ghost-greeter.iife.js
```

**Edit `apps/server/.env`:**
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

⚠️ **Note**: `SUPABASE_SERVICE_ROLE_KEY` is a secret key. Get it from Settings → API → `service_role` (keep secret!)

---

## Step 3: Build & Run (3 min)

```bash
# Build shared packages (required first time)
pnpm build --filter=@ghost-greeter/domain
pnpm build --filter=@ghost-greeter/config

# Start everything in development mode
pnpm dev
```

This starts:
| App | URL |
|-----|-----|
| Dashboard | http://localhost:3000 |
| Server | http://localhost:3001 |
| Widget | http://localhost:5173 |

---

## Step 4: Verify It Works (2 min)

### Test Dashboard
1. Open http://localhost:3000
2. Sign up with your email
3. Complete onboarding flow
4. You should see the dashboard

### Test Widget
1. Open http://localhost:5173/test
2. Widget should appear in corner
3. Click to trigger intro video

### Test Server
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

---

## Step 5: Understand the Codebase (5 min)

### Project Structure

```
/
├── apps/
│   ├── dashboard/       # Next.js admin panel
│   │   ├── src/app/     # Pages (App Router)
│   │   ├── src/features/# Feature modules
│   │   └── src/lib/     # Utilities
│   │
│   ├── server/          # Socket.io signaling server
│   │   └── src/         # Server code
│   │
│   └── widget/          # Preact embeddable widget
│       └── src/         # Widget code
│
├── packages/
│   ├── domain/          # Shared types (SOURCE OF TRUTH)
│   ├── config/          # Shared ESLint/TS config
│   └── ui/              # Shared components
│
├── supabase/
│   └── migrations/      # Database migrations
│
└── docs/                # Documentation
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `packages/domain/src/types.ts` | All shared TypeScript types |
| `apps/dashboard/src/lib/supabase/` | Supabase client setup |
| `apps/server/src/index.ts` | Server entry point |
| `apps/widget/src/main.tsx` | Widget entry point |

### Commands Cheat Sheet

```bash
# Development
pnpm dev                    # Start all apps
pnpm dev --filter=dashboard # Start only dashboard
pnpm dev --filter=server    # Start only server

# Building
pnpm build                  # Build everything
pnpm typecheck              # Type check all packages
pnpm lint                   # Lint all packages

# Individual packages
pnpm --filter=@ghost-greeter/dashboard <command>
pnpm --filter=@ghost-greeter/server <command>
pnpm --filter=@ghost-greeter/widget <command>
```

---

## Step 6: Start Coding!

### Creating a Feature

1. **Create a branch**
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Run checks**
   ```bash
   pnpm typecheck
   pnpm lint
   ```

4. **Commit & push**
   ```bash
   git add -A
   git commit -m "feat(dashboard): add your feature"
   git push -u origin feature/your-feature-name
   ```

5. **Open a PR** to `develop` branch

---

## Helpful Resources

| Resource | Link |
|----------|------|
| Contributing Guide | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Environment Setup | [ENVIRONMENTS.md](../ENVIRONMENTS.md) |
| Deployment Guide | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| Supabase Setup | [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) |

---

## Getting Help

- **Stuck?** Check the existing documentation first
- **Bug?** Open a GitHub issue with reproduction steps
- **Question?** Ask in team Slack/Discord

---

## Common Issues

### "Cannot find module '@ghost-greeter/domain'"

Build the shared packages first:
```bash
pnpm build --filter=@ghost-greeter/domain
```

### "ECONNREFUSED localhost:3001"

The server isn't running. Start it:
```bash
pnpm dev --filter=@ghost-greeter/server
```

### "Invalid Supabase credentials"

1. Check your `.env.local` file has correct values
2. Make sure you're using the right Supabase project
3. Verify the anon key (not service key) for dashboard

### "pnpm: command not found"

Install pnpm:
```bash
npm install -g pnpm
```

---

Happy coding! 🎭

