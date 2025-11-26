# Supabase Setup Guide

Follow these steps to connect Ghost-Greeter to your Supabase project.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from **Settings > API**

## 2. Run Database Migrations

Copy the SQL from `supabase/migrations/001_initial_schema.sql` and run it in your Supabase SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Paste the entire migration file
3. Click **Run**

This creates:
- `organizations` - B2B customers
- `users` - Links auth.users to organizations with roles (admin/agent)
- `sites` - Websites where widgets are embedded
- `agent_profiles` - Agent settings and video URLs
- `call_logs` - Call history for analytics

## 3. Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `videos`
3. Make it **public**
4. Add this policy (in SQL Editor):

```sql
-- Allow users to upload to their org folder
CREATE POLICY "Users can upload videos to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow public read access
CREATE POLICY "Public video read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');
```

## 4. Configure Environment Variables

Create `.env.local` in `apps/dashboard/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
```

## 5. Enable Email Auth (Optional)

By default, Supabase uses email confirmation. For development, you can disable this:

1. Go to **Authentication > Providers**
2. Click on **Email**
3. Toggle off **Confirm email**

## Database Schema Overview

### User Roles

- **Admin**: Can manage organization, sites, agents, and view all analytics
- **Agent**: Can only access their workbench and view their own stats

### Automatic Setup on Signup

When a user signs up:
1. A new organization is created for them
2. They're added as an admin
3. An agent profile is created

### Row-Level Security

All tables have RLS enabled:
- Users can only see data from their organization
- Agents can only update their own profile
- Admins have full access within their org

## Routes

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login page |
| `/signup` | Public | Signup page |
| `/onboarding` | Auth | Video upload wizard |
| `/dashboard` | Agent/Admin | Agent workbench |
| `/admin` | Admin | Admin overview |
| `/admin/agents` | Admin | Manage agents |
| `/admin/sites` | Admin | Manage sites |
| `/admin/analytics` | Admin | View call metrics |

