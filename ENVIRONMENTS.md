# Ghost-Greeter Environments

This document describes our environment setup and workflow.

## Current Setup: Local + Production

We're using a simplified two-environment setup:

| Environment | Branch | Purpose | Infrastructure |
|-------------|--------|---------|----------------|
| **Local** | Any | Development & testing | localhost |
| **Production** | `main` | Live application | Vercel + Railway + Supabase |

> 💡 **Future:** When we have real users and need isolated testing, we'll add a staging environment. See [docs/STAGING_SETUP.md](./docs/STAGING_SETUP.md) for the guide.

---

## Local Development

### Services

| Service | URL | Command |
|---------|-----|---------|
| Dashboard | http://localhost:3000 | `pnpm dev --filter=@ghost-greeter/dashboard` |
| Server | http://localhost:3001 | `pnpm dev --filter=@ghost-greeter/server` |
| Widget | http://localhost:5173 | `pnpm dev --filter=@ghost-greeter/widget` |

### Setup

```bash
# Copy environment files
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/server/.env.example apps/server/.env

# Edit with your Supabase credentials (use production or a dev project)
# Then start all services:
pnpm dev
```

### Database

For local development, you can:
1. **Use production Supabase** (⚠️ be careful with data!)
2. **Use a separate dev Supabase project** (recommended)
3. **Run Supabase locally** with the Supabase CLI

---

## Production

### Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| Dashboard | Vercel | https://app.ghost-greeter.com |
| Server | Railway | https://ghost-greeterserver-production.up.railway.app |
| Database | Supabase | `greeter-prod` project |

### Deployment

**Automatic:** Push to `main` branch triggers deployment on Vercel and Railway.

**Manual verification:**
1. Vercel: Check deployment status in Vercel dashboard
2. Railway: Check deployment logs in Railway dashboard
3. Supabase: Run migrations manually in SQL Editor

---

## Branch Workflow

```
feature/* ──┐
bugfix/*  ──┼──► main (production)
hotfix/*  ──┘
```

### Development Flow

1. **Create feature branch** from `main`
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature
   ```

2. **Develop locally** - Test thoroughly on localhost

3. **Open PR** to `main`
   - CI runs automatically
   - Review changes carefully (goes directly to production!)

4. **Merge** - Deploys to production automatically

### Testing Before Merge

Since we don't have staging, **test thoroughly locally**:

- [ ] Auth flows work
- [ ] Dashboard navigation works  
- [ ] Widget loads and connects
- [ ] WebRTC calls work
- [ ] No console errors
- [ ] Database operations succeed

---

## Environment Variables

### Dashboard (Vercel)

Set in Vercel → Project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sldbpqyvksdxsuuxqtgg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_APP_URL=https://app.ghost-greeter.com
NEXT_PUBLIC_SIGNALING_SERVER=https://ghost-greeterserver-production.up.railway.app
NEXT_PUBLIC_WIDGET_CDN_URL=https://ghost-greeterserver-production.up.railway.app/widget.js
```

### Server (Railway)

Set in Railway → Service → Variables:

```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://sldbpqyvksdxsuuxqtgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
ALLOWED_ORIGINS=https://app.ghost-greeter.com,https://your-customer-domains.com
RATE_LIMIT_ENABLED=true
```

---

## Database Migrations

**⚠️ Without staging, migrations go directly to production!**

### Safe Migration Process

1. **Backup first** (Supabase has automatic backups, but consider manual)
2. **Test migration SQL locally** if possible
3. **Run during low-traffic periods**
4. **Have a rollback plan**

### Running Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file contents
3. Run and verify

---

## Hotfixes

For urgent production issues:

```bash
git checkout main
git pull
git checkout -b hotfix/critical-fix

# Make fix
git add -A
git commit -m "fix: critical issue description"
git push -u origin hotfix/critical-fix

# Open PR, get quick review, merge ASAP
```

---

## When to Add Staging

Consider adding staging environment when:

- [ ] You have paying customers
- [ ] Multiple developers working simultaneously
- [ ] Complex features need extended testing
- [ ] Database migrations are risky
- [ ] QA team needs stable test environment

When ready, follow [docs/STAGING_SETUP.md](./docs/STAGING_SETUP.md).

---

## Quick Reference

| Task | Action |
|------|--------|
| Start local dev | `pnpm dev` |
| Deploy to prod | Merge PR to `main` |
| Check prod logs | Railway Dashboard |
| Run migration | Supabase SQL Editor |
| View prod errors | Vercel → Deployments → Functions |
