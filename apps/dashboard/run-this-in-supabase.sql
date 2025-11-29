-- ============================================================================
-- PMF SURVEYS & PLATFORM ADMIN 
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Add platform admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- 2. Create function to check platform admin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3. Create disappointment level enum
DO $$ BEGIN
    CREATE TYPE disappointment_level AS ENUM (
        'very_disappointed',
        'somewhat_disappointed', 
        'not_disappointed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create PMF surveys table
CREATE TABLE IF NOT EXISTS pmf_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    disappointment_level disappointment_level NOT NULL,
    follow_up_text TEXT,
    triggered_by TEXT NOT NULL,
    page_url TEXT,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create survey cooldowns table
CREATE TABLE IF NOT EXISTS survey_cooldowns (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_survey_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_surveys INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE pmf_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_cooldowns ENABLE ROW LEVEL SECURITY;

-- 7. PMF Survey Policies
DROP POLICY IF EXISTS "Users can submit own surveys" ON pmf_surveys;
CREATE POLICY "Users can submit own surveys" ON pmf_surveys FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own surveys" ON pmf_surveys;
CREATE POLICY "Users can view own surveys" ON pmf_surveys FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Platform admins can view all surveys" ON pmf_surveys;
CREATE POLICY "Platform admins can view all surveys" ON pmf_surveys FOR SELECT TO authenticated
USING (public.is_platform_admin());

-- 8. Survey Cooldown Policies  
DROP POLICY IF EXISTS "Users can view own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can view own cooldown" ON survey_cooldowns FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can insert own cooldown" ON survey_cooldowns FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can update own cooldown" ON survey_cooldowns FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. Platform Admin Policies
DROP POLICY IF EXISTS "Platform admins can view all organizations" ON organizations;
CREATE POLICY "Platform admins can view all organizations" ON organizations FOR SELECT TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
CREATE POLICY "Platform admins can view all users" ON users FOR SELECT TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all agent profiles" ON agent_profiles;
CREATE POLICY "Platform admins can view all agent profiles" ON agent_profiles FOR SELECT TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all call logs" ON call_logs;
CREATE POLICY "Platform admins can view all call logs" ON call_logs FOR SELECT TO authenticated
USING (public.is_platform_admin());

-- 10. Make ryanod2014@gmail.com a platform admin
UPDATE users SET is_platform_admin = true WHERE email = 'ryanod2014@gmail.com';

-- 11. Add feedback enhancement fields
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE;

-- 12. Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 13. Storage policies for feedback attachments
DROP POLICY IF EXISTS "Users can upload feedback attachments" ON storage.objects;
CREATE POLICY "Users can upload feedback attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'feedback-attachments' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Anyone can view feedback attachments" ON storage.objects;
CREATE POLICY "Anyone can view feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feedback-attachments');

-- 14. Verify
SELECT email, role, is_platform_admin FROM users;

