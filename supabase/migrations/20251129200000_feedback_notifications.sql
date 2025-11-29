-- ============================================================================
-- FEEDBACK NOTIFICATIONS
-- ============================================================================

-- Notification types
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('reply', 'upvote', 'status_change');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON feedback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON feedback_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON feedback_notifications(created_at DESC);

-- RLS
ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON feedback_notifications;
CREATE POLICY "Users can view own notifications"
ON feedback_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can create notifications (via triggers/functions)
DROP POLICY IF EXISTS "Users can receive notifications" ON feedback_notifications;
CREATE POLICY "Users can receive notifications"
ON feedback_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON feedback_notifications;
CREATE POLICY "Users can update own notifications"
ON feedback_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON feedback_notifications;
CREATE POLICY "Users can delete own notifications"
ON feedback_notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGER: Notify on reply to comment
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
    parent_user_id UUID;
    item_title TEXT;
BEGIN
    -- Only notify if this is a reply (has parent_comment_id)
    IF NEW.parent_comment_id IS NOT NULL THEN
        -- Get the parent comment's user
        SELECT user_id INTO parent_user_id
        FROM feedback_comments
        WHERE id = NEW.parent_comment_id;
        
        -- Don't notify if replying to yourself
        IF parent_user_id IS NOT NULL AND parent_user_id != NEW.user_id THEN
            -- Get the item title
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

-- ============================================================================
-- TRIGGER: Notify on upvote to feature request
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_upvote()
RETURNS TRIGGER AS $$
DECLARE
    item_owner_id UUID;
    item_title TEXT;
BEGIN
    -- Only notify on upvotes (vote_type = 1)
    IF NEW.vote_type = 1 THEN
        -- Get the item owner
        SELECT user_id, title INTO item_owner_id, item_title
        FROM feedback_items
        WHERE id = NEW.feedback_item_id;
        
        -- Don't notify if upvoting your own item
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

