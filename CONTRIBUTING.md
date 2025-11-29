# Contributing to Ghost-Greeter

Welcome! This guide will help you get started contributing to Ghost-Greeter.

## Table of Contents

- [Development Setup](#development-setup)
- [Branch Strategy](#branch-strategy)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Database Migrations](#database-migrations)
- [Testing](#testing)

---

## Development Setup

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (`npm install -g pnpm`)
- **Supabase CLI** (optional, for local development)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/Digital_greeter.git
cd Digital_greeter

# Install dependencies
pnpm install

# Copy environment files
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/server/.env.example apps/server/.env

# Build shared packages first
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

---

## Branch Strategy

We use a simple trunk-based workflow with **local + production** environments:

```
main        ← Production (protected, requires PR + CI passing)
  ↑              → Deploys to: Vercel + Railway + Supabase
feature/*   ← Your feature branches
bugfix/*    ← Bug fix branches
hotfix/*    ← Urgent production fixes
```

> 💡 **Note:** We'll add a `develop` branch and staging environment when we have real users. For now, test thoroughly locally before merging to `main`.

### Branch Naming

- `feature/add-user-dashboard` - New features
- `bugfix/fix-login-redirect` - Bug fixes
- `hotfix/critical-security-patch` - Urgent production fixes
- `refactor/cleanup-auth-logic` - Code refactoring
- `docs/update-readme` - Documentation updates

### Workflow

1. **Features**: `feature/*` → Test locally → PR to `main` → Production
2. **Bug fixes**: `bugfix/*` → PR to `main`
3. **Hotfixes**: `hotfix/*` → PR to `main` (expedited review)

### Environment Details

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for local and production setup.

---

## Making Changes

### 1. Create a Branch

```bash
# Start from develop for features
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

```bash
# Run type checking while developing
pnpm typecheck

# Run linting
pnpm lint

# Fix lint issues automatically
pnpm lint --fix
```

### 3. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(dashboard): add agent availability toggle"
git commit -m "fix(widget): resolve video loading issue"
git commit -m "docs: update deployment guide"
git commit -m "refactor(server): simplify socket event handling"
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub targeting `develop`.

---

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer `interface` over `type` for object shapes
- Export types from `packages/domain` for shared use
- Use descriptive variable names

### React / Next.js

- Use functional components with hooks
- Prefer Server Components where possible (Next.js App Router)
- Use `use client` directive only when needed
- Follow the existing component structure

### File Organization

```
apps/dashboard/src/
├── app/                  # Next.js App Router pages
├── components/           # Shared components
├── features/             # Feature-specific code
│   └── feature-name/
│       ├── components/   # Feature components
│       ├── hooks/        # Feature hooks
│       └── utils/        # Feature utilities
├── lib/                  # Utility libraries
└── hooks/                # Shared hooks
```

---

## Pull Request Process

### Before Submitting

- [ ] Run `pnpm typecheck` - No type errors
- [ ] Run `pnpm lint` - No lint errors
- [ ] Run `pnpm build` - Build succeeds
- [ ] Test your changes locally
- [ ] Update documentation if needed

### PR Requirements

1. **Title**: Use conventional commit format (`feat: add new feature`)
2. **Description**: Fill out the PR template completely
3. **Size**: Keep PRs focused and reasonably sized
4. **Tests**: Add tests for new functionality (when applicable)

### Review Process

1. Create PR → CI runs automatically
2. Request review (auto-assigned via CODEOWNERS)
3. Address feedback
4. Squash and merge once approved

---

## Database Migrations

### Creating a Migration

Migrations live in `supabase/migrations/` with timestamp naming:

```
20251128000000_description_of_change.sql
```

### Migration Guidelines

1. **Always test migrations locally first**
2. **Include rollback comments** (what to do if it fails)
3. **Never modify existing migrations** - create new ones
4. **Update RLS policies** when adding tables

### Running Migrations

**Local (with Supabase CLI):**
```bash
supabase db push
```

**Production:**
1. Go to Supabase Dashboard → SQL Editor
2. Run migration SQL manually
3. Verify changes in Table Editor

---

## Testing

### Manual Testing Checklist

Before submitting a PR, test these flows:

- [ ] **Auth**: Sign up, sign in, sign out
- [ ] **Dashboard**: Navigate all pages
- [ ] **Widget**: Load on test page, trigger video
- [ ] **WebRTC**: Complete a test call (if touching call logic)

### Running the Full Test Suite

```bash
# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Build everything (same as CI)
pnpm build
```

---

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Found a bug?** Open an Issue with reproduction steps
- **Security issue?** Email directly (don't open public issue)

---

## Project Structure Quick Reference

```
/
├── apps/
│   ├── dashboard/    # Next.js admin panel (Vercel)
│   ├── server/       # Socket.io signaling (Railway)
│   └── widget/       # Preact embeddable widget
├── packages/
│   ├── domain/       # Shared types (SOURCE OF TRUTH)
│   ├── config/       # Shared TSConfig, ESLint
│   └── ui/           # Shared UI components
├── supabase/
│   └── migrations/   # Database migrations
└── .github/
    └── workflows/    # CI/CD pipelines
```

---

Happy coding! 🎭

