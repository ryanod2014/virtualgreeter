-- ============================================================================
-- SETUP CRON JOB FOR RECORDING RETENTION CLEANUP
-- ============================================================================
-- Schedules automatic deletion of expired recordings based on org retention policy
-- Runs daily at 3 AM UTC
--
-- IMPORTANT: Before running this migration, enable pg_cron in Supabase:
--   1. Go to Supabase Dashboard > Database > Extensions
--   2. Search for "pg_cron" and enable it
-- ============================================================================

-- Enable pg_cron extension (must be enabled in Dashboard first)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the cleanup job to run daily at 3 AM UTC
-- Using DO block for safe re-runs (unschedule if exists, then schedule)
DO $$
BEGIN
    -- Try to unschedule existing job (ignore if doesn't exist)
    BEGIN
        PERFORM cron.unschedule('delete-expired-recordings');
    EXCEPTION WHEN OTHERS THEN
        -- Job doesn't exist, that's fine
        NULL;
    END;
    
    -- Schedule the new job
    PERFORM cron.schedule(
        'delete-expired-recordings',           -- job name
        '0 3 * * *',                           -- cron schedule: daily at 3 AM UTC
        $$SELECT delete_expired_recordings()$$ -- SQL to execute
    );
END;
$$;

