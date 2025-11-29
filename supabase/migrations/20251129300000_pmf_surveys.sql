-- ============================================================================
-- PMF SURVEYS & PLATFORM ADMIN
-- ============================================================================
-- Sean Ellis "How disappointed would you be?" survey for measuring PMF
-- Platform admin flag for cross-org dashboard access
-- ============================================================================

-- Add platform admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- Disappointment level enum for Sean Ellis survey
DO $$ BEGIN
    CREATE TYPE disappointment_level AS ENUM (
        'very_disappointed',
        'somewhat_disappointed', 
        'not_disappointed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PMF Survey responses table
CREATE TABLE IF NOT EXISTS pmf_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    
    -- Sean Ellis question response
    disappointment_level disappointment_level NOT NULL,
    follow_up_text TEXT, -- Optional "Why?" response
    
    -- Context
    triggered_by TEXT NOT NULL, -- 'random', 'milestone', 'post_call'
    page_url TEXT,
    dismissed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey cooldowns to prevent over-surveying
CREATE TABLE IF NOT EXISTS survey_cooldowns (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_survey_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_surveys INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_org ON pmf_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_user ON pmf_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_level ON pmf_surveys(disappointment_level);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_created ON pmf_surveys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(is_platform_admin) WHERE is_platform_admin = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pmf_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_cooldowns ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PMF SURVEYS POLICIES
-- ============================================================================

-- Users can insert their own survey responses
DROP POLICY IF EXISTS "Users can submit own surveys" ON pmf_surveys;
CREATE POLICY "Users can submit own surveys"
ON pmf_surveys FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can view their own surveys
DROP POLICY IF EXISTS "Users can view own surveys" ON pmf_surveys;
CREATE POLICY "Users can view own surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can view ALL surveys across all orgs
DROP POLICY IF EXISTS "Platform admins can view all surveys" ON pmf_surveys;
CREATE POLICY "Platform admins can view all surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- ============================================================================
-- SURVEY COOLDOWNS POLICIES
-- ============================================================================

-- Users can view and manage their own cooldown
DROP POLICY IF EXISTS "Users can view own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can view own cooldown"
ON survey_cooldowns FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can insert own cooldown"
ON survey_cooldowns FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cooldown" ON survey_cooldowns;
CREATE POLICY "Users can update own cooldown"
ON survey_cooldowns FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PLATFORM ADMIN POLICIES FOR EXISTING TABLES
-- ============================================================================

-- Platform admins can view all organizations
DROP POLICY IF EXISTS "Platform admins can view all organizations" ON organizations;
CREATE POLICY "Platform admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- Platform admins can view all users
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
CREATE POLICY "Platform admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() 
        AND u.is_platform_admin = TRUE
    )
);

-- Platform admins can view all feedback items
DROP POLICY IF EXISTS "Platform admins can view all feedback" ON feedback_items;
CREATE POLICY "Platform admins can view all feedback"
ON feedback_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- Platform admins can update any feedback (for status changes)
DROP POLICY IF EXISTS "Platform admins can update all feedback" ON feedback_items;
CREATE POLICY "Platform admins can update all feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- Platform admins can view all cancellation feedback
DROP POLICY IF EXISTS "Platform admins can view all cancellation feedback" ON cancellation_feedback;
CREATE POLICY "Platform admins can view all cancellation feedback"
ON cancellation_feedback FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- Platform admins can view all agent profiles
DROP POLICY IF EXISTS "Platform admins can view all agent profiles" ON agent_profiles;
CREATE POLICY "Platform admins can view all agent profiles"
ON agent_profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- Platform admins can view all call logs
DROP POLICY IF EXISTS "Platform admins can view all call logs" ON call_logs;
CREATE POLICY "Platform admins can view all call logs"
ON call_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_platform_admin = TRUE
    )
);

-- ============================================================================
-- HELPER FUNCTION FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_survey_cooldowns_updated_at ON survey_cooldowns;
CREATE TRIGGER trigger_survey_cooldowns_updated_at
BEFORE UPDATE ON survey_cooldowns
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

