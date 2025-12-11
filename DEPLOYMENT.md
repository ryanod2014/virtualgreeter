# Ghost-Greeter Production Deployment Guide

This guide walks you through deploying Ghost-Greeter to production.

## Architecture Overview

| Component | Platform | Purpose |
|-----------|----------|---------|
| Dashboard | Vercel | Next.js admin panel & agent interface |
| Server | Railway | Socket.io signaling server for WebRTC |
| Database | Supabase | PostgreSQL + Auth + Storage |
| Widget | CDN (optional) | Embeddable widget JS file |

## Prerequisites

- GitHub account (repo should be pushed to GitHub)
- Supabase account
- Vercel account
- Railway account

---

## Step 1: Create Production Supabase Project

### 1.1 Create New Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Configure:
   - **Name**: `ghost-greeter-prod`
   - **Database Password**: Generate and **save this securely**
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click **"Create new project"**
5. Wait for project to be ready (~2 minutes)

### 1.2 Run Database Migrations

You have two options:

**Option A: Use Supabase CLI (Recommended)**
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push --linked
```

**Option B: Manual via SQL Editor**

1. In Supabase Dashboard, go to **SQL Editor**
2. Run each migration file from `supabase/migrations/` **in order**:

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

**Tip**: Copy each file's contents, paste into SQL Editor, and click "Run".

### 1.3 Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Create bucket named `videos` with **Public** access
4. Create bucket named `recordings` with **Public** access (if using call recording)

### 1.4 Get API Keys

Go to **Settings > API** and copy:
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Step 2: Deploy Server to Railway

### 2.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 2.2 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your `virtualgreeter` (or `Digital_greeter`) repository
4. Railway will detect it's a monorepo

### 2.3 Configure Service

1. Click on the deployed service
2. Go to **Settings**
3. Set **Root Directory**: `apps/server`
4. Set **Build Command**: `cd ../.. && pnpm install && pnpm build --filter=@ghost-greeter/server`
5. Set **Start Command**: `node dist/index.js`

### 2.4 Add Environment Variables

Go to **Variables** tab and add:

```
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-domain.com
RATE_LIMIT_ENABLED=true
```

### 2.5 Deploy

1. Click **"Deploy"** or push to GitHub to trigger auto-deploy
2. Wait for deployment to complete
3. Note your Railway URL (e.g., `ghost-greeter-server-production.up.railway.app`)

### 2.6 Add Custom Domain (Optional)

1. Go to **Settings > Networking > Public Networking**
2. Add custom domain (e.g., `api.ghost-greeter.com`)
3. Configure DNS as instructed

---

## Step 3: Deploy Dashboard to Vercel

### 3.1 Import Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Choose your `virtualgreeter` repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/dashboard`
   - **Build Command**: (leave default, vercel.json handles it)
   - **Output Directory**: `.next`

### 3.2 Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SIGNALING_SERVER=https://your-railway-url.railway.app
NEXT_PUBLIC_WIDGET_CDN_URL=https://your-railway-url.railway.app/widget.js

# Stripe (add when ready)
STRIPE_SECRET_KEY=sk_test_xxx
# Price IDs for each billing frequency
STRIPE_MONTHLY_PRICE_ID=price_monthly_xxx
STRIPE_ANNUAL_PRICE_ID=price_annual_xxx
STRIPE_SIX_MONTH_PRICE_ID=price_six_month_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (add when ready)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3.3 Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your dashboard is now live!

### 3.4 Add Custom Domain (Optional)

1. Go to **Settings > Domains**
2. Add your domain (e.g., `app.ghost-greeter.com`)
3. Configure DNS as instructed

---

## Step 4: Configure Widget Distribution

For now, you can serve the widget directly from your Railway server or Vercel:

### Option A: Serve from Railway (Simple)

Add a static file route to serve the widget:

1. After building, the widget is at `apps/widget/dist/ghost-greeter.iife.js`
2. Set `NEXT_PUBLIC_WIDGET_CDN_URL` to serve from your server

### Option B: Upload to CDN (Production)

For better performance, upload to a CDN:

1. Build the widget: `pnpm build --filter=@ghost-greeter/widget`
2. Upload `apps/widget/dist/ghost-greeter.iife.js` to:
   - Cloudflare R2
   - AWS S3 + CloudFront
   - Or any static file host
3. Update `NEXT_PUBLIC_WIDGET_CDN_URL` to the CDN URL

---

## Step 5: Update CORS Configuration

After deployment, update your Railway server's `ALLOWED_ORIGINS` to include:

```
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

For customer websites, you'll need to add their domains or use a wildcard strategy.

---

## Step 6: Test the Deployment

### 6.1 Test Dashboard

1. Visit your Vercel URL
2. Create a new account (sign up)
3. Complete onboarding
4. Verify you can access the dashboard

### 6.2 Test Widget

1. Go to Admin > Sites in your dashboard
2. Copy the embed code
3. Create a test HTML file with the embed code
4. Open it in a browser
5. Verify the widget appears and connects

### 6.3 Test WebRTC

1. Have one person open the dashboard as an agent
2. Have another person trigger the widget
3. Test the video call connection

---

## Environment Variables Reference

### Dashboard (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Yes | Dashboard URL |
| `NEXT_PUBLIC_SIGNALING_SERVER` | Yes | Railway server URL |
| `NEXT_PUBLIC_WIDGET_CDN_URL` | Yes | Widget JS file URL |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_MONTHLY_PRICE_ID` | For billing | Monthly plan price ID ($297/seat/mo) |
| `STRIPE_ANNUAL_PRICE_ID` | For billing | Annual plan price ID ($2,316/seat/yr) |
| `STRIPE_SIX_MONTH_PRICE_ID` | For billing | 6-month plan price ID ($1,068/seat/6mo) |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook secret |
| `RESEND_API_KEY` | For emails | Resend API key |
| `RESEND_FROM_EMAIL` | For emails | Sender email address |

### Server (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (usually 3001) |
| `NODE_ENV` | Yes | Set to `production` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed origins |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting (default: true) |

---

## Troubleshooting

### Widget not connecting

1. Check browser console for errors
2. Verify `ALLOWED_ORIGINS` includes the widget's host domain
3. Verify `NEXT_PUBLIC_SIGNALING_SERVER` is correct in dashboard

### Build failing on Vercel

1. Check that all environment variables are set
2. Verify the root directory is set to `apps/dashboard`
3. Check Vercel build logs for specific errors

### Database connection issues

1. Verify Supabase project is active
2. Check that API keys are correct
3. Verify RLS policies are properly set up

### WebRTC not working

1. Ensure both parties have camera/mic permissions
2. Check that HTTPS is used (required for WebRTC)
3. Verify signaling server is reachable

---

## Staging Environment (Future)

When you're ready for a staging environment, follow [docs/STAGING_SETUP.md](./docs/STAGING_SETUP.md).

This will involve:
1. Creating a separate Supabase project
2. Creating a `develop` branch
3. Setting up a separate Railway service
4. Configuring Vercel preview environments

---

---

## Step 7: Enable Paywall (Before Public Launch)

**⚠️ CRITICAL:** The paywall is currently disabled for beta testing. Before public launch, you MUST enable it to prevent revenue loss.

### Pre-Requisites

Before enabling the paywall, ensure:
- All Stripe environment variables are set (see Step 3.2 above)
- Webhook endpoint is configured and tested
- Trial-to-paid conversion flow has been verified
- Terms of Service and Privacy Policy are published

### Enable Paywall Checklist

- [ ] **Verify Stripe Configuration**
  - [ ] `STRIPE_SECRET_KEY` uses live key (starts with `sk_live_`)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` uses live key (starts with `pk_live_`)
  - [ ] All three price IDs are configured (monthly, annual, 6-month)
  - [ ] Webhook secret is set in server environment

- [ ] **Test Payment Flow**
  - [ ] Can create SetupIntent successfully
  - [ ] Can enter card details using Stripe Elements
  - [ ] Can create subscription with trial period
  - [ ] Webhook delivers `invoice.paid` event correctly
  - [ ] Subscription status updates to "active" after trial

- [ ] **Update Code**
  - [ ] Edit `apps/dashboard/src/app/(auth)/signup/page.tsx`
  - [ ] Change line 63 from `window.location.href = "/admin";`
  - [ ] To: `window.location.href = "/paywall";`
  - [ ] Remove or update the TODO comment on line 62

- [ ] **Deploy Changes**
  - [ ] Commit: `git commit -m "Enable paywall for public launch"`
  - [ ] Push: `git push origin main`
  - [ ] Verify Vercel deployment completes successfully
  - [ ] Test signup flow redirects to paywall

- [ ] **Monitor Initial Signups**
  - [ ] Watch Stripe dashboard for first payments
  - [ ] Check webhook delivery logs
  - [ ] Monitor error rates in application logs

### Rollback Plan

If issues occur after enabling:

```bash
# Quick rollback - revert the commit
git revert HEAD
git push origin main

# Vercel will auto-deploy the rollback within 2-3 minutes
```

### Documentation

For detailed paywall enablement instructions, see:
- [Billing & Paywall System](./docs/features/billing.md)
- [Billing API Documentation](./docs/features/api/billing-api.md)

---

## Next Steps

After deployment:

1. **Enable paywall before public launch** (see Step 7 above)
2. Configure custom domain
3. Set up error tracking (Sentry)
4. Add uptime monitoring
5. Publish Terms of Service and Privacy Policy

