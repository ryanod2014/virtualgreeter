# 🔧 Staging Environment Setup Guide

> ⏳ **Future Enhancement:** This guide is for when you're ready to add a staging environment. You'll need this when you have real paying customers and want isolated testing before production deployments.

This guide walks you through setting up the complete staging infrastructure for Ghost-Greeter.

**Time required**: ~30 minutes

**What you'll create**:
- Staging Supabase project
- Staging Railway service  
- Vercel environment configuration (branch-specific)
- `develop` branch with protection rules

---

## Prerequisites

Before starting, ensure you have:
- [ ] Admin access to the GitHub repository
- [ ] Supabase account (supabase.com)
- [ ] Railway account (railway.app)
- [ ] Vercel account with project access

---

## Part 1: Create Staging Supabase Project

### 1.1 Create the Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configure:
   - **Organization**: Select your org
   - **Name**: `ghost-greeter-staging`
   - **Database Password**: Generate a strong password → **SAVE THIS**
   - **Region**: Same as production (e.g., `us-east-1`)
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### 1.2 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. For each file in `supabase/migrations/` (in order!):
   - Open the file locally
   - Copy contents
   - Paste into SQL Editor
   - Click **"Run"**
   - Verify: "Success. No rows returned"

**Option A: Use Supabase CLI (Recommended)**
```bash
supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase db push --linked
```

**Option B: Manual** - Run these migration files in order:
```
20251125200000_initial_schema.sql
20251125200001_storage_policies.sql
20251126000000_fix_rls_recursion.sql
20251126005000_create_agent_pools.sql
20251126010000_pool_centric_schema.sql
20251126020000_add_wave_video_url.sql
20251126030000_add_connect_video_url.sql
20251126040000_add_call_analytics.sql
20251126050000_fix_call_logs_site_id.sql
20251126060000_add_org_logo.sql
20251126070000_add_rule_conditions.sql
20251127000000_add_invites.sql
20251127100000_pool_video_templates.sql
20251127200000_recording_settings.sql
20251127300000_disposition_primary_value.sql
20251127400000_storage_buckets_and_pool_id.sql
20251127500000_fix_call_logs_site_id_nullable.sql
20251127600000_recordings_bucket.sql
20251127700000_cancellation_feedback.sql
20251127800000_soft_delete_and_billing.sql
20251127900000_account_pause.sql
20251128000000_facebook_integration.sql
20251128100000_widget_settings.sql
20251128200000_agent_sessions.sql
20251128250000_founding_admin_not_agent.sql
20251128300000_embed_verification.sql
20251128400000_widget_pageviews.sql
20251128500000_widget_theme.sql
20251128600000_call_location.sql
20251128700000_country_blocklist.sql
20251129000000_feedback_system.sql
20251129100000_feedback_downvotes.sql
20251129200000_feedback_notifications.sql
20251129300000_pmf_surveys.sql
20251129400000_fix_platform_admin_rls.sql
20251129450000_feedback_enhancements.sql
20251129500000_agent_priority_ranking.sql
20251129600000_mrr_tracking.sql
```

### 1.3 Create Storage Buckets

1. Go to **Storage** in sidebar
2. Click **"New bucket"**
3. Create bucket: `videos`
   - Public: **Yes**
4. Create bucket: `recordings`
   - Public: **Yes**

### 1.4 Save API Keys

Go to **Settings → API** and save these values:

| Value | Where to find | Save as |
|-------|--------------|---------|
| Project URL | `https://xxxxx.supabase.co` | `STAGING_SUPABASE_URL` |
| anon public | Under "Project API keys" | `STAGING_SUPABASE_ANON_KEY` |
| service_role | Under "Project API keys" | `STAGING_SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **Keep service_role secret!** Never commit it to git.

---

## Part 2: Create Staging Railway Service

### 2.1 Create New Service

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Open your Ghost-Greeter project
3. Click **"+ New"** → **"GitHub Repo"**
4. Select your repository

### 2.2 Configure the Service

Click on the new service, then:

**Settings Tab:**
- **Service Name**: `ghost-greeter-staging`
- **Root Directory**: `apps/server`
- **Build Command**: 
  ```
  cd ../.. && pnpm install && pnpm build --filter=@ghost-greeter/server
  ```
- **Start Command**: `node dist/index.js`
- **Watch Paths**: `/apps/server/**`, `/packages/**`

**Variables Tab** - Add these environment variables:
```env
PORT=3001
NODE_ENV=staging
SUPABASE_URL=https://[YOUR-STAGING-PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-STAGING-SERVICE-KEY]
ALLOWED_ORIGINS=https://*-your-vercel-project.vercel.app,http://localhost:3000,http://localhost:5173
RATE_LIMIT_ENABLED=true
```

### 2.3 Configure Deploy Branch

1. Go to **Settings → Source**
2. Set **Branch**: `develop`
3. This ensures only `develop` branch deploys to staging

### 2.4 Deploy & Get URL

1. Click **"Deploy"** or push to `develop`
2. Wait for deployment to complete
3. Go to **Settings → Networking**
4. Copy the public URL (e.g., `ghost-greeter-staging.up.railway.app`)

Save this as `STAGING_SERVER_URL`.

---

## Part 3: Configure Vercel Environments

### 3.1 Access Environment Variables

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your Ghost-Greeter project
3. Go to **Settings → Environment Variables**

### 3.2 Set Production Variables

For each of these, set **Environment**: `Production` only

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROD-PROJECT].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[PROD-ANON-KEY]` |
| `NEXT_PUBLIC_APP_URL` | `https://app.ghost-greeter.com` (or your prod URL) |
| `NEXT_PUBLIC_SIGNALING_SERVER` | `https://ghost-greeterserver-production.up.railway.app` |
| `NEXT_PUBLIC_WIDGET_CDN_URL` | `https://ghost-greeterserver-production.up.railway.app/widget.js` |

### 3.3 Set Staging/Preview Variables

For each of these, set **Environment**: `Preview` only

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[STAGING-PROJECT].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[STAGING-ANON-KEY]` |
| `NEXT_PUBLIC_APP_URL` | `https://develop-ghost-greeter.vercel.app` |
| `NEXT_PUBLIC_SIGNALING_SERVER` | `https://ghost-greeter-staging.up.railway.app` |
| `NEXT_PUBLIC_WIDGET_CDN_URL` | `https://ghost-greeter-staging.up.railway.app/widget.js` |

### 3.4 Verify Configuration

After saving, you should see each variable twice:
- Once with 🏭 Production badge
- Once with 👁️ Preview badge

---

## Part 4: Rename Branch (master → main)

### 4.1 Update GitHub Default Branch

1. Go to your repo on GitHub
2. **Settings → General → Default branch**
3. Click pencil icon
4. Change `master` to `main`
5. Click **"Update"**

### 4.2 Rename Local Branch

```bash
# Rename your local branch
git branch -m master main

# Push the new branch
git push -u origin main

# Delete old master from remote
git push origin --delete master

# Update local tracking
git fetch --prune
```

### 4.3 Update Team Members

Notify your team to update their local repos:
```bash
git checkout master
git branch -m master main
git fetch origin
git branch -u origin/main main
git remote set-head origin -a
```

---

## Part 5: Set Up Branch Protection

### 5.1 Protect `main` Branch

1. GitHub → **Settings → Branches → Add rule**
2. **Branch name pattern**: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: `1`
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
     - Search and add: `Build & Test`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
4. Click **"Create"**

### 5.2 Protect `develop` Branch

1. **Add another rule**
2. **Branch name pattern**: `develop`
3. Enable:
   - ✅ Require status checks to pass before merging
     - Add: `Build & Test`
   - ✅ Require branches to be up to date before merging
4. Click **"Create"**

---

## Part 6: Verify Everything Works

### 6.1 Test Staging Deployment

```bash
# Create a test branch
git checkout develop
git pull
git checkout -b test/verify-staging

# Make a small change (e.g., add a comment)
echo "// test" >> apps/dashboard/src/app/page.tsx

# Push and create PR
git add -A
git commit -m "test: verify staging deployment"
git push -u origin test/verify-staging
```

1. Open PR to `develop`
2. Wait for CI to pass ✅
3. Check Vercel preview deployment
4. Verify it connects to **staging** (not production) backend
5. Delete the test branch

### 6.2 Verify Environment Isolation

On the Vercel preview URL:
1. Open browser dev tools → Network tab
2. Look for Supabase requests
3. Confirm URL is your **staging** project (not production)

### 6.3 Test Production Deployment

1. Merge your test PR to `develop`
2. Create PR from `develop` to `main`
3. Verify CI passes
4. Merge to `main`
5. Check Vercel production deployment

---

## Quick Reference Card

After setup, save this for reference:

```
┌─────────────────────────────────────────────────────────────┐
│                    GHOST-GREETER ENVIRONMENTS               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STAGING (develop branch)                                   │
│  ├─ Dashboard: https://develop-ghost-greeter.vercel.app    │
│  ├─ Server:    https://ghost-greeter-staging.up.railway.app│
│  └─ Database:  ghost-greeter-staging (Supabase)            │
│                                                             │
│  PRODUCTION (main branch)                                   │
│  ├─ Dashboard: https://app.ghost-greeter.com               │
│  ├─ Server:    https://ghost-greeterserver-production...   │
│  └─ Database:  ghost-greeter-prod (Supabase)               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  WORKFLOW: feature/* → develop → main                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Preview URLs hit production database

**Cause**: Vercel env vars not scoped correctly
**Fix**: 
1. Go to Vercel → Settings → Environment Variables
2. Delete all variables
3. Re-add with correct scopes (Production vs Preview)

### Railway staging deploys on main pushes

**Cause**: Branch filter not set
**Fix**:
1. Railway → Service → Settings → Source
2. Set Branch to `develop`

### CI fails with "branch not found"

**Cause**: Branch not renamed in CI config
**Fix**: Check `.github/workflows/ci.yml` uses `main` not `master`

### Migrations fail on staging

**Cause**: Running out of order
**Fix**: 
1. In staging Supabase, go to SQL Editor
2. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Re-run all migrations in order

---

## Maintenance

### Adding New Migrations

1. Create migration locally
2. Test on staging Supabase first
3. If successful, run on production
4. Commit the migration file

### Syncing Staging Data

If staging needs fresh data:
```sql
-- In staging Supabase SQL Editor
-- Clear all tables (careful!)
TRUNCATE TABLE table_name CASCADE;
```

Or create a fresh staging Supabase project.

---

✅ **Setup Complete!** Your staging environment is now fully isolated from production.

