-- ============================================================================
-- PRODUCTION MIGRATIONS - November 29, 2024
-- ============================================================================
-- Run this ENTIRE file in your Production Supabase SQL Editor
-- Includes: Feedback System, Downvotes, Notifications, PMF Surveys, Platform Admin
-- ============================================================================

-- ============================================================================
-- 1. FEEDBACK SYSTEM (20251129000000)
-- ============================================================================

-- Feedback item types
CREATE TYPE feedback_type AS ENUM ('bug', 'feature');
CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'declined');
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Main feedback items table (bugs and feature requests)
CREATE TABLE feedback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type feedback_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status feedback_status DEFAULT 'open',
    priority feedback_priority DEFAULT 'medium',
    -- Bug-specific fields
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    browser_info TEXT,
    page_url TEXT,
    -- Feature-specific fields
    use_case TEXT,
    -- Metadata
    vote_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    admin_response TEXT,
    admin_responded_at TIMESTAMP WITH TIME ZONE,
    admin_responded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table for feature requests
CREATE TABLE feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each user can only vote once per item
    UNIQUE(feedback_item_id, user_id)
);

-- Comments table for feature requests and bugs
CREATE TABLE feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_admin_comment BOOLEAN DEFAULT FALSE,
    parent_comment_id UUID REFERENCES feedback_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_feedback_items_org_id ON feedback_items(organization_id);
CREATE INDEX idx_feedback_items_user_id ON feedback_items(user_id);
CREATE INDEX idx_feedback_items_type ON feedback_items(type);
CREATE INDEX idx_feedback_items_status ON feedback_items(status);
CREATE INDEX idx_feedback_items_type_status ON feedback_items(type, status);
CREATE INDEX idx_feedback_items_vote_count ON feedback_items(vote_count DESC);
CREATE INDEX idx_feedback_items_created_at ON feedback_items(created_at DESC);
CREATE INDEX idx_feedback_votes_item_id ON feedback_votes(feedback_item_id);
CREATE INDEX idx_feedback_votes_user_id ON feedback_votes(user_id);
CREATE INDEX idx_feedback_comments_item_id ON feedback_comments(feedback_item_id);
CREATE INDEX idx_feedback_comments_user_id ON feedback_comments(user_id);

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback_items 
        SET vote_count = vote_count + 1, updated_at = NOW()
        WHERE id = NEW.feedback_item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback_items 
        SET vote_count = vote_count - 1, updated_at = NOW()
        WHERE id = OLD.feedback_item_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment count
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

-- Triggers
CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_count();

CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION update_feedback_comment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_feedback_items_updated_at
BEFORE UPDATE ON feedback_items
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

CREATE TRIGGER trigger_feedback_comments_updated_at
BEFORE UPDATE ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

-- ROW LEVEL SECURITY
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- FEEDBACK ITEMS POLICIES
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

CREATE POLICY "Users can update own feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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

CREATE POLICY "Users can delete own feedback"
ON feedback_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- VOTES POLICIES
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

CREATE POLICY "Users can unvote"
ON feedback_votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- COMMENTS POLICIES
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

CREATE POLICY "Users can update own comments"
ON feedback_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
ON feedback_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 2. ENABLE DOWNVOTES (20251129100000)
-- ============================================================================

-- Add vote_type column to feedback_votes
ALTER TABLE feedback_votes ADD COLUMN vote_type SMALLINT NOT NULL DEFAULT 1;
-- 1 = upvote, -1 = downvote

-- Update the vote count trigger to handle up and down votes
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
        -- When changing vote type (e.g., upvote to downvote)
        UPDATE feedback_items 
        SET vote_count = vote_count - OLD.vote_type + NEW.vote_type, updated_at = NOW()
        WHERE id = NEW.feedback_item_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to include UPDATE
DROP TRIGGER IF EXISTS trigger_update_vote_count ON feedback_votes;
CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE OR UPDATE ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_count();

-- ============================================================================
-- 3. FEEDBACK NOTIFICATIONS (20251129200000)
-- ============================================================================

-- Notification types
CREATE TYPE notification_type AS ENUM ('reply', 'upvote', 'status_change');

-- Notifications table
CREATE TABLE feedback_notifications (
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

-- Indexes
CREATE INDEX idx_notifications_user_id ON feedback_notifications(user_id);
CREATE INDEX idx_notifications_unread ON feedback_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON feedback_notifications(created_at DESC);

-- RLS
ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON feedback_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can receive notifications"
ON feedback_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON feedback_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
ON feedback_notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- TRIGGER: Notify on reply to comment
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

CREATE TRIGGER trigger_notify_on_reply
AFTER INSERT ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment_reply();

-- TRIGGER: Notify on upvote to feature request
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

CREATE TRIGGER trigger_notify_on_upvote
AFTER INSERT ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION notify_on_upvote();

-- ============================================================================
-- 4. PMF SURVEYS & PLATFORM ADMIN (20251129300000)
-- ============================================================================

-- Add platform admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- Disappointment level enum for Sean Ellis survey
CREATE TYPE disappointment_level AS ENUM (
    'very_disappointed',
    'somewhat_disappointed', 
    'not_disappointed'
);

-- PMF Survey responses table
CREATE TABLE pmf_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    
    -- Sean Ellis question response
    disappointment_level disappointment_level NOT NULL,
    follow_up_text TEXT,
    
    -- Context
    triggered_by TEXT NOT NULL,
    page_url TEXT,
    dismissed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey cooldowns to prevent over-surveying
CREATE TABLE survey_cooldowns (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_survey_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_surveys INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pmf_surveys_org ON pmf_surveys(organization_id);
CREATE INDEX idx_pmf_surveys_user ON pmf_surveys(user_id);
CREATE INDEX idx_pmf_surveys_level ON pmf_surveys(disappointment_level);
CREATE INDEX idx_pmf_surveys_created ON pmf_surveys(created_at DESC);
CREATE INDEX idx_users_platform_admin ON users(is_platform_admin) WHERE is_platform_admin = TRUE;

-- RLS
ALTER TABLE pmf_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_cooldowns ENABLE ROW LEVEL SECURITY;

-- PMF Surveys Policies
CREATE POLICY "Users can submit own surveys"
ON pmf_surveys FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Survey Cooldowns Policies
CREATE POLICY "Users can view own cooldown"
ON survey_cooldowns FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cooldown"
ON survey_cooldowns FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cooldown"
ON survey_cooldowns FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for survey_cooldowns updated_at
CREATE TRIGGER trigger_survey_cooldowns_updated_at
BEFORE UPDATE ON survey_cooldowns
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

-- ============================================================================
-- 5. FIX PLATFORM ADMIN RLS RECURSION (20251129400000)
-- ============================================================================

-- Create function to check platform admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Platform admin policies using the function
CREATE POLICY "Platform admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all users"
ON users FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all feedback"
ON feedback_items FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can update all feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all cancellation feedback"
ON cancellation_feedback FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all agent profiles"
ON agent_profiles FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all call logs"
ON call_logs FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- ============================================================================
-- 6. FEEDBACK ENHANCEMENTS (20251129500000)
-- ============================================================================

-- Add new fields to feedback_items
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE feedback_items ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload to their org folder
CREATE POLICY "Users can upload feedback attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'feedback-attachments' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Storage policy: Anyone can view feedback attachments (public bucket)
CREATE POLICY "Anyone can view feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feedback-attachments');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_items_assignee ON feedback_items(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_items_resolved_at ON feedback_items(resolved_at) WHERE resolved_at IS NOT NULL;

-- Trigger to auto-set resolved_at when status changes to completed
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

