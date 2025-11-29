# Supabase Setup Guide

This guide covers setting up Supabase for Ghost-Greeter development and production.

## Quick Start (Recommended)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** from **Settings > API**
3. Save your **service_role key** for the server (keep secret!)

### 2. Run Migrations with Supabase CLI

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push --linked
```

That's it! All tables, policies, and functions will be created automatically.

### 3. Verify Migration Status

```bash
supabase migration list --linked
```

All migrations should show matching Local and Remote versions.

---

## Manual Setup (Alternative)

If you prefer to run migrations manually:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run each file from `supabase/migrations/` **in order** (by timestamp)
3. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for the full list

---

## Configure Environment Variables

### Dashboard (`apps/dashboard/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001
NEXT_PUBLIC_WIDGET_CDN_URL=http://localhost:5173/ghost-greeter.iife.js
```

### Server (`apps/server/.env`)

```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

⚠️ **Never commit service_role keys to git!**

---

## Database Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `organizations` | B2B customers (companies using Ghost-Greeter) |
| `users` | Links auth.users to organizations with roles |
| `sites` | Websites where widgets are embedded |
| `agent_profiles` | Agent settings and video URLs |
| `agent_pools` | Groups of agents that share visitor load |
| `call_logs` | Call history for analytics |

### Feature Tables

| Table | Purpose |
|-------|---------|
| `invites` | Pending team member invitations |
| `widget_settings` | Per-site widget configuration |
| `widget_pageviews` | Analytics for widget impressions |
| `feedback_items` | User feedback and bug reports |
| `pmf_surveys` | Product-market fit survey responses |
| `cancellation_feedback` | Why users cancelled |

### User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access to organization settings, agents, sites, analytics |
| **agent** | Access to bullpen, can take calls, view own stats |

### Automatic Setup on Signup

When a user signs up via Supabase Auth:
1. A new organization is created for them
2. They're added as an **admin**
3. An agent profile is created

This is handled by the `handle_new_user()` trigger function.

---

## Storage Buckets

The following storage buckets are created by migrations:

| Bucket | Purpose | Public |
|--------|---------|--------|
| `videos` | Agent intro/loop videos | Yes |
| `recordings` | Call recordings | Yes |
| `feedback-attachments` | Feedback screenshots | Yes |

### Storage Policies

- Users can upload to their organization's folder
- Public read access for serving videos

---

## Row-Level Security (RLS)

All tables have RLS enabled with these rules:

- **Organizations**: Users can only see/edit their own org
- **Users**: Can see teammates, only admins can add/remove
- **Sites**: All users can view, only admins can manage
- **Agent Profiles**: Agents can edit their own, admins can manage all
- **Call Logs**: Agents see own calls, admins see all

---

## Useful Queries

### Check current user's organization
```sql
SELECT o.* FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE u.id = auth.uid();
```

### List all agents in an organization
```sql
SELECT u.full_name, ap.status, ap.display_name
FROM users u
JOIN agent_profiles ap ON ap.user_id = u.id
WHERE u.organization_id = 'YOUR_ORG_ID';
```

### Call analytics for last 7 days
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    AVG(duration_seconds) as avg_duration
FROM call_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### "Invalid API key"
- Check that you're using the **anon key** (not service_role) for the dashboard
- Verify the URL matches your project

### "Permission denied" errors
- Check RLS policies are set up correctly
- Verify the user is authenticated
- For server operations, ensure you're using the service_role key

### Migrations fail
- Run migrations in order (by timestamp)
- Check for existing objects with `DROP ... IF EXISTS` statements
- Use `supabase db push --include-all` if migrations are out of order

### "User already exists" on signup
- The `handle_new_user()` trigger may have failed
- Check if organization/user records were partially created
- Clean up orphaned records in `users` and `organizations` tables

---

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Project | Separate dev project | `greeter-prod` |
| Migrations | Test here first | Run after dev testing |
| Data | Can reset freely | Backup before changes |
| Keys | Local `.env` files | Platform env vars |

We recommend using a separate Supabase project for development to avoid affecting production data.
