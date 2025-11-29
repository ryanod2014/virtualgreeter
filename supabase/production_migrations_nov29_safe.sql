-- ============================================================================
-- PRODUCTION MIGRATIONS - November 29, 2024 (SAFE VERSION)
-- ============================================================================
-- This version handles objects that may already exist
-- Run this ENTIRE file in your Production Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. FEEDBACK SYSTEM (20251129000000) - SAFE VERSION
-- ============================================================================

-- Create types only if they don't exist
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'feature');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'declined');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS feedback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type feedback_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status feedback_status DEFAULT 'open',
    priority feedback_priority DEFAULT 'medium',
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    browser_info TEXT,
    page_url TEXT,
    use_case TEXT,
    vote_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    admin_response TEXT,
    admin_responded_at TIMESTAMP WITH TIME ZONE,
    admin_responded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feedback_item_id, user_id)
);

CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_admin_comment BOOLEAN DEFAULT FALSE,
    parent_comment_id UUID REFERENCES feedback_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_feedback_items_org_id ON feedback_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_user_id ON feedback_items(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_type ON feedback_items(type);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status ON feedback_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_items_type_status ON feedback_items(type, status);
CREATE INDEX IF NOT EXISTS idx_feedback_items_vote_count ON feedback_items(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_created_at ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_item_id ON feedback_votes(feedback_item_id);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user_id ON feedback_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_item_id ON feedback_comments(feedback_item_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_user_id ON feedback_comments(user_id);

-- Functions (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback_items 
        SET vote_count = vote_count + NEW.vote_type, updated_at = NOW()
        WHERE id = NEW.feedback_item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback_items 
        SET vote_count = vote_count - OLD.vote_type, updated_at = NOW()
        WHERE id = OLD.feedback_item_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE feedback_items 
        SET vote_count = vote_count - OLD.vote_type + NEW.vote_type, updated_at = NOW()
        WHERE id = NEW.feedback_item_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_feedback_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback_items 
        SET comment_count = comment_count + 1, updated_at = NOW()
        WHERE id = NEW.feedback_item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback_items 
        SET comment_count = comment_count - 1, updated_at = NOW()
        WHERE id = OLD.feedback_item_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers (safe approach)
DROP TRIGGER IF EXISTS trigger_update_vote_count ON feedback_votes;
CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE OR UPDATE ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_count();

DROP TRIGGER IF EXISTS trigger_update_comment_count ON feedback_comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION update_feedback_comment_count();

DROP TRIGGER IF EXISTS trigger_feedback_items_updated_at ON feedback_items;
CREATE TRIGGER trigger_feedback_items_updated_at
BEFORE UPDATE ON feedback_items
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

DROP TRIGGER IF EXISTS trigger_feedback_comments_updated_at ON feedback_comments;
CREATE TRIGGER trigger_feedback_comments_updated_at
BEFORE UPDATE ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

-- Enable RLS (safe to run multiple times)
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe approach)
DROP POLICY IF EXISTS "Feature requests are public, bugs are org-only" ON feedback_items;
CREATE POLICY "Feature requests are public, bugs are org-only"
ON feedback_items FOR SELECT
TO authenticated
USING (
    type = 'feature' 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = feedback_items.organization_id
    )
);

DROP POLICY IF EXISTS "Users can create feedback" ON feedback_items;
CREATE POLICY "Users can create feedback"
ON feedback_items FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = feedback_items.organization_id
    )
);

DROP POLICY IF EXISTS "Users can update own feedback" ON feedback_items;
CREATE POLICY "Users can update own feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update feedback in their org" ON feedback_items;
CREATE POLICY "Admins can update feedback in their org"
ON feedback_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = feedback_items.organization_id
        AND users.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Users can delete own feedback" ON feedback_items;
CREATE POLICY "Users can delete own feedback"
ON feedback_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view votes on feature requests" ON feedback_votes;
CREATE POLICY "Users can view votes on feature requests"
ON feedback_votes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_items fi
        WHERE fi.id = feedback_votes.feedback_item_id
        AND fi.type = 'feature'
    )
);

DROP POLICY IF EXISTS "Users can vote on feature requests" ON feedback_votes;
CREATE POLICY "Users can vote on feature requests"
ON feedback_votes FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM feedback_items fi
        WHERE fi.id = feedback_votes.feedback_item_id
        AND fi.type = 'feature'
    )
);

DROP POLICY IF EXISTS "Users can unvote" ON feedback_votes;
CREATE POLICY "Users can unvote"
ON feedback_votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view comments" ON feedback_comments;
CREATE POLICY "Users can view comments"
ON feedback_comments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_items fi
        WHERE fi.id = feedback_comments.feedback_item_id
        AND (
            fi.type = 'feature'
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid()
                AND u.organization_id = fi.organization_id
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can add comments" ON feedback_comments;
CREATE POLICY "Users can add comments"
ON feedback_comments FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM feedback_items fi
        WHERE fi.id = feedback_comments.feedback_item_id
        AND (
            fi.type = 'feature'
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid()
                AND u.organization_id = fi.organization_id
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can update own comments" ON feedback_comments;
CREATE POLICY "Users can update own comments"
ON feedback_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON feedback_comments;
CREATE POLICY "Users can delete own comments"
ON feedback_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 2. ENABLE DOWNVOTES (20251129100000)
-- ============================================================================

-- Add vote_type column if it doesn't exist
ALTER TABLE feedback_votes ADD COLUMN IF NOT EXISTS vote_type SMALLINT NOT NULL DEFAULT 1;

-- ============================================================================
-- 3. FEEDBACK NOTIFICATIONS (20251129200000)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('reply', 'upvote', 'status_change');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    feedback_item_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES feedback_comments(id) ON DELETE CASCADE,
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON feedback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON feedback_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON feedback_notifications(created_at DESC);

ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON feedback_notifications;
CREATE POLICY "Users can view own notifications"
ON feedback_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can receive notifications" ON feedback_notifications;
CREATE POLICY "Users can receive notifications"
ON feedback_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON feedback_notifications;
CREATE POLICY "Users can update own notifications"
ON feedback_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON feedback_notifications;
CREATE POLICY "Users can delete own notifications"
ON feedback_notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Notification triggers
CREATE OR REPLACE FUNCTION notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
    parent_user_id UUID;
    item_title TEXT;
BEGIN
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT user_id INTO parent_user_id
        FROM feedback_comments
        WHERE id = NEW.parent_comment_id;
        
        IF parent_user_id IS NOT NULL AND parent_user_id != NEW.user_id THEN
            SELECT title INTO item_title
            FROM feedback_items
            WHERE id = NEW.feedback_item_id;
            
            INSERT INTO feedback_notifications (user_id, type, feedback_item_id, comment_id, triggered_by_user_id, message)
            VALUES (
                parent_user_id,
                'reply',
                NEW.feedback_item_id,
                NEW.id,
                NEW.user_id,
                'Someone replied to your comment on "' || COALESCE(item_title, 'a feature request') || '"'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_reply ON feedback_comments;
CREATE TRIGGER trigger_notify_on_reply
AFTER INSERT ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment_reply();

CREATE OR REPLACE FUNCTION notify_on_upvote()
RETURNS TRIGGER AS $$
DECLARE
    item_owner_id UUID;
    item_title TEXT;
BEGIN
    IF NEW.vote_type = 1 THEN
        SELECT user_id, title INTO item_owner_id, item_title
        FROM feedback_items
        WHERE id = NEW.feedback_item_id;
        
        IF item_owner_id IS NOT NULL AND item_owner_id != NEW.user_id THEN
            INSERT INTO feedback_notifications (user_id, type, feedback_item_id, triggered_by_user_id, message)
            VALUES (
                item_owner_id,
                'upvote',
                NEW.feedback_item_id,
                NEW.user_id,
                'Someone upvoted your feature request "' || COALESCE(item_title, 'Untitled') || '"'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_upvote ON feedback_votes;
CREATE TRIGGER trigger_notify_on_upvote
AFTER INSERT ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION notify_on_upvote();

-- ============================================================================
-- 4. PMF SURVEYS & PLATFORM ADMIN (20251129300000)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

DO $$ BEGIN
    CREATE TYPE disappointment_level AS ENUM (
        'very_disappointed',
        'somewhat_disappointed', 
        'not_disappointed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

CREATE TABLE IF NOT EXISTS survey_cooldowns (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_survey_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_surveys INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmf_surveys_org ON pmf_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_user ON pmf_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_level ON pmf_surveys(disappointment_level);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_created ON pmf_surveys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(is_platform_admin) WHERE is_platform_admin = TRUE;

ALTER TABLE pmf_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit own surveys" ON pmf_surveys;
CREATE POLICY "Users can submit own surveys"
ON pmf_surveys FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own surveys" ON pmf_surveys;
CREATE POLICY "Users can view own surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (user_id = auth.uid());

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

DROP TRIGGER IF EXISTS trigger_survey_cooldowns_updated_at ON survey_cooldowns;
CREATE TRIGGER trigger_survey_cooldowns_updated_at
BEFORE UPDATE ON survey_cooldowns
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

-- ============================================================================
-- 5. FIX PLATFORM ADMIN RLS (20251129400000)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Platform admin policies
DROP POLICY IF EXISTS "Platform admins can view all organizations" ON organizations;
CREATE POLICY "Platform admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
CREATE POLICY "Platform admins can view all users"
ON users FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all feedback" ON feedback_items;
CREATE POLICY "Platform admins can view all feedback"
ON feedback_items FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update all feedback" ON feedback_items;
CREATE POLICY "Platform admins can update all feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all cancellation feedback" ON cancellation_feedback;
CREATE POLICY "Platform admins can view all cancellation feedback"
ON cancellation_feedback FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all agent profiles" ON agent_profiles;
CREATE POLICY "Platform admins can view all agent profiles"
ON agent_profiles FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all call logs" ON call_logs;
CREATE POLICY "Platform admins can view all call logs"
ON call_logs FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all surveys" ON pmf_surveys;
CREATE POLICY "Platform admins can view all surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- ============================================================================
-- 6. FEEDBACK ENHANCEMENTS (20251129500000)
-- ============================================================================

ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket (ignore if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
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

CREATE INDEX IF NOT EXISTS idx_feedback_items_assignee ON feedback_items(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_items_resolved_at ON feedback_items(resolved_at) WHERE resolved_at IS NOT NULL;

CREATE OR REPLACE FUNCTION set_feedback_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.resolved_at = NOW();
    END IF;
    
    IF NEW.admin_response IS NOT NULL AND OLD.admin_response IS NULL THEN
        NEW.first_response_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_feedback_resolved_at ON feedback_items;
CREATE TRIGGER trigger_set_feedback_resolved_at
BEFORE UPDATE ON feedback_items
FOR EACH ROW EXECUTE FUNCTION set_feedback_resolved_at();

-- ============================================================================
-- DONE! All migrations applied successfully.
-- ============================================================================
SELECT 'All migrations completed successfully!' AS result;

