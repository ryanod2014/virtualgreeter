-- ============================================================================
-- FEEDBACK ENHANCEMENTS
-- ============================================================================
-- Add screenshot/recording support, assignee tracking, and resolution timestamps
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

-- Index for assignee lookups
CREATE INDEX IF NOT EXISTS idx_feedback_items_assignee ON feedback_items(assignee_id) WHERE assignee_id IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_feedback_items_resolved_at ON feedback_items(resolved_at) WHERE resolved_at IS NOT NULL;

-- Trigger to auto-set resolved_at when status changes to completed
CREATE OR REPLACE FUNCTION set_feedback_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set resolved_at when status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.resolved_at = NOW();
    END IF;
    
    -- Set first_response_at when admin_response is first added
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

