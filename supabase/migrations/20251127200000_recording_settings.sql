-- ============================================================================
-- RECORDING SETTINGS
-- ============================================================================
-- Adds recording settings to organizations and creates recordings storage bucket.
-- ============================================================================

-- Add recording settings column to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS recording_settings JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "retention_days": 30
  }'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.organizations.recording_settings IS 'Recording settings: { enabled: boolean, retention_days: number }';

-- ============================================================================
-- RECORDINGS STORAGE BUCKET
-- ============================================================================

-- Create recordings bucket if not exists (this is idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR RECORDINGS BUCKET
-- ============================================================================

-- Allow authenticated users to upload recordings to their org folder
DROP POLICY IF EXISTS "Users can upload recordings to their org folder" ON storage.objects;
CREATE POLICY "Users can upload recordings to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to update their own recordings (for overwriting)
DROP POLICY IF EXISTS "Users can update their own recordings" ON storage.objects;
CREATE POLICY "Users can update their own recordings"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to delete recordings in their org
DROP POLICY IF EXISTS "Users can delete recordings in their org" ON storage.objects;
CREATE POLICY "Users can delete recordings in their org"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow public read access to recordings (for playback)
DROP POLICY IF EXISTS "Public recording read access" ON storage.objects;
CREATE POLICY "Public recording read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

-- ============================================================================
-- SCHEDULED CLEANUP FUNCTION (for retention policy)
-- ============================================================================
-- This function can be called via a cron job to delete expired recordings

CREATE OR REPLACE FUNCTION delete_expired_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Loop through each organization
    FOR org_record IN 
        SELECT id, recording_settings 
        FROM public.organizations 
        WHERE (recording_settings->>'enabled')::boolean = true
    LOOP
        -- Get retention days (default 30 if not set)
        retention_days := COALESCE((org_record.recording_settings->>'retention_days')::integer, 30);
        cutoff_date := NOW() - (retention_days || ' days')::interval;
        
        -- Update call_logs to remove recording URLs for old recordings
        UPDATE public.call_logs
        SET recording_url = NULL
        WHERE organization_id = org_record.id
          AND recording_url IS NOT NULL
          AND created_at < cutoff_date;
          
        -- Note: Actual file deletion from storage should be handled separately
        -- by a backend job that reads the marked records and deletes files
    END LOOP;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION delete_expired_recordings() IS 'Clears recording URLs from call_logs based on org retention policy. Run via cron.';

