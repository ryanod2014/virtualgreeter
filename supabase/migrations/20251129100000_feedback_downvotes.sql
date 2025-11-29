-- ============================================================================
-- ENABLE DOWNVOTES FOR FEEDBACK
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

