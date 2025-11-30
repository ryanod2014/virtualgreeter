-- ============================================================================
-- FIX RETENTION POLICY FOR "FOREVER" OPTION
-- ============================================================================
-- Updates delete_expired_recordings() to skip orgs with retention_days = -1

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
    -- Loop through each organization with recording enabled
    FOR org_record IN 
        SELECT id, recording_settings 
        FROM public.organizations 
        WHERE (recording_settings->>'enabled')::boolean = true
    LOOP
        -- Get retention days (default 30 if not set)
        retention_days := COALESCE((org_record.recording_settings->>'retention_days')::integer, 30);
        
        -- Skip if retention is set to "forever" (-1)
        IF retention_days = -1 THEN
            CONTINUE;
        END IF;
        
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
COMMENT ON FUNCTION delete_expired_recordings() IS 'Clears recording URLs from call_logs based on org retention policy. Skips orgs with retention_days=-1 (forever). Run via cron.';

