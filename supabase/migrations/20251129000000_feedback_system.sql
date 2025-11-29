-- ============================================================================
-- FEEDBACK SYSTEM
-- ============================================================================
-- Tables for bug reports, feature requests, voting, and comments
-- Feature requests are public and allow upvoting and commenting
-- ============================================================================

-- Feedback item types
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'feature');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'completed', 'closed', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main feedback items table (bugs and feature requests)
CREATE TABLE IF NOT EXISTS feedback_items (
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
CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each user can only vote once per item
    UNIQUE(feedback_item_id, user_id)
);

-- Comments table for feature requests and bugs
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

-- Indexes for performance
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
DROP TRIGGER IF EXISTS trigger_update_vote_count ON feedback_votes;
CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE ON feedback_votes
FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_count();

DROP TRIGGER IF EXISTS trigger_update_comment_count ON feedback_comments;
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
DROP TRIGGER IF EXISTS trigger_feedback_items_updated_at ON feedback_items;
CREATE TRIGGER trigger_feedback_items_updated_at
BEFORE UPDATE ON feedback_items
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

DROP TRIGGER IF EXISTS trigger_feedback_comments_updated_at ON feedback_comments;
CREATE TRIGGER trigger_feedback_comments_updated_at
BEFORE UPDATE ON feedback_comments
FOR EACH ROW EXECUTE FUNCTION update_feedback_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FEEDBACK ITEMS POLICIES
-- ============================================================================

-- Feature requests are PUBLIC (visible to all authenticated users across all orgs)
-- Bug reports are PRIVATE (only visible within the same org)
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

-- Users can create feedback (associated with their org)
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

-- Users can update their own feedback
DROP POLICY IF EXISTS "Users can update own feedback" ON feedback_items;
CREATE POLICY "Users can update own feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any feedback in their org (for bug status changes)
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

-- Users can delete their own feedback
DROP POLICY IF EXISTS "Users can delete own feedback" ON feedback_items;
CREATE POLICY "Users can delete own feedback"
ON feedback_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VOTES POLICIES (Feature requests only - public voting)
-- ============================================================================

-- Anyone can view votes on feature requests
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

-- Any authenticated user can vote on feature requests
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

-- Users can remove their own vote
DROP POLICY IF EXISTS "Users can unvote" ON feedback_votes;
CREATE POLICY "Users can unvote"
ON feedback_votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

-- Comments on feature requests are public, bug comments are org-only
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

-- Users can add comments on feature requests (public) or bugs in their org
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

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON feedback_comments;
CREATE POLICY "Users can update own comments"
ON feedback_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON feedback_comments;
CREATE POLICY "Users can delete own comments"
ON feedback_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

