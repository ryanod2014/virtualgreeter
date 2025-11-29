# Ghost-Greeter Environments

This document describes the three environments and how to work with them.

> 📖 **Setting up staging for the first time?** See [docs/STAGING_SETUP.md](./docs/STAGING_SETUP.md) for the complete step-by-step guide.

## Environment Overview

| Environment | Branch | Purpose | URL |
|-------------|--------|---------|-----|
| **Local** | Any | Development & debugging | `localhost:3000` |
| **Staging** | `develop` | Pre-production testing | `staging.ghost-greeter.com` |
| **Production** | `main` | Live customer traffic | `app.ghost-greeter.com` |

---

## Infrastructure by Environment

### Production

| Service | Platform | URL |
|---------|----------|-----|
| Dashboard | Vercel | https://app.ghost-greeter.com |
| Server | Railway | https://ghost-greeterserver-production.up.railway.app |
| Database | Supabase | `ghost-greeter-prod` project |

### Staging

| Service | Platform | URL |
|---------|----------|-----|
| Dashboard | Vercel (preview) | https://develop.ghost-greeter.vercel.app |
| Server | Railway | https://ghost-greeter-staging.up.railway.app |
| Database | Supabase | `ghost-greeter-staging` project |

### Local

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| Server | http://localhost:3001 |
| Widget | http://localhost:5173 |
| Database | Your dev Supabase project or local |

---

## Branch → Environment Mapping

```
feature/* ──┐
bugfix/*  ──┼──► develop (staging) ──► main (production)
refactor/*──┘
```

### Workflow

1. **Create feature branch** from `develop`
2. **Open PR** to `develop` → Deploys to staging automatically
3. **Test on staging** with isolated database
4. **Merge to develop** → Staging updated
5. **Open PR** from `develop` to `main` → Production deploy
6. **Merge to main** → Live!

---

## Environment Variables by Branch (Vercel)

### Setting Up Branch-Specific Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

#### Production Variables (main branch only)

```bash
# Scope: Production
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PROD-ANON-KEY]
NEXT_PUBLIC_APP_URL=https://app.ghost-greeter.com
NEXT_PUBLIC_SIGNALING_SERVER=https://ghost-greeterserver-production.up.railway.app
NEXT_PUBLIC_WIDGET_CDN_URL=https://ghost-greeterserver-production.up.railway.app/widget.js
```

#### Staging Variables (develop branch / Preview)

```bash
# Scope: Preview
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[STAGING-ANON-KEY]
NEXT_PUBLIC_APP_URL=https://develop.ghost-greeter.vercel.app
NEXT_PUBLIC_SIGNALING_SERVER=https://ghost-greeter-staging.up.railway.app
NEXT_PUBLIC_WIDGET_CDN_URL=https://ghost-greeter-staging.up.railway.app/widget.js
```

---

## Setting Up Staging Infrastructure

### 1. Create Staging Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `ghost-greeter-staging`
3. Choose same region as production
4. Run all migrations from `supabase/migrations/` in order
5. Create storage buckets: `videos`, `recordings`
6. Copy API keys for Vercel/Railway config

### 2. Create Staging Railway Service

1. Go to [railway.app](https://railway.app)
2. In your project, click **+ New Service**
3. Choose **Deploy from GitHub repo**
4. Configure:
   - **Root Directory**: `apps/server`
   - **Build Command**: `cd ../.. && pnpm install && pnpm build --filter=@ghost-greeter/server`
   - **Start Command**: `node dist/index.js`
5. Add environment variables:

```bash
PORT=3001
NODE_ENV=staging
SUPABASE_URL=https://[STAGING-PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[STAGING-SERVICE-KEY]
ALLOWED_ORIGINS=https://develop.ghost-greeter.vercel.app,http://localhost:3000
RATE_LIMIT_ENABLED=true
```

6. Set deploy trigger to `develop` branch only

### 3. Configure Vercel Branch Deployments

1. Go to Vercel → Project Settings → Git
2. Ensure **Production Branch** is set to `main`
3. Preview deployments will auto-deploy from `develop` and feature branches

4. Go to **Environment Variables**
5. For each production variable, set **Scope: Production**
6. Add staging variables with **Scope: Preview**

---

## Testing on Staging

### Before Merging to Production

Always verify on staging:

- [ ] Auth flows work (sign up, sign in, sign out)
- [ ] Dashboard navigation works
- [ ] Widget loads and connects
- [ ] WebRTC calls complete successfully
- [ ] Database operations don't error
- [ ] No console errors

### Database Migrations on Staging

**Always test migrations on staging first:**

1. Run migration on staging Supabase
2. Test all affected features
3. If successful, run on production

---

## Hotfixes

For urgent production fixes:

```bash
# Branch from main
git checkout main
git pull
git checkout -b hotfix/critical-bug

# Fix the issue
# ...

# PR directly to main (skip staging for true emergencies)
# After merge, sync back to develop:
git checkout develop
git merge main
git push
```

---

## Common Issues

### "Staging shows production data"

Your Vercel preview is using production environment variables. Check:
- Vercel → Settings → Environment Variables
- Ensure staging vars have **Scope: Preview** (not Production)

### "Can't connect to staging server"

1. Check Railway staging service is running
2. Verify `ALLOWED_ORIGINS` includes your preview URL
3. Check the staging server logs in Railway

### "Migrations work on staging but fail on production"

- Check for data-dependent migrations
- Ensure production has required seed data
- Review RLS policies that might differ

---

## Quick Reference

| Task | Command / Action |
|------|-----------------|
| Deploy to staging | Push to `develop` or merge PR |
| Deploy to production | Merge `develop` → `main` |
| Check staging logs | Railway Dashboard → staging service |
| Check prod logs | Railway Dashboard → production service |
| Run migration on staging | Supabase Dashboard (staging) → SQL Editor |
| Run migration on prod | Supabase Dashboard (prod) → SQL Editor |

