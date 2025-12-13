-- ============================================================================
-- SETUP AUTO-RESUME CRON JOB FOR PAUSED SUBSCRIPTIONS
-- ============================================================================
-- Automatically resumes subscriptions when pause_ends_at is reached
-- Runs every hour to check for expired pauses
--
-- IMPORTANT: Requires pg_cron extension (already enabled via previous migration)
-- ============================================================================

-- Create function to auto-resume expired paused accounts
CREATE OR REPLACE FUNCTION auto_resume_expired_pauses()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    status TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    resume_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Find all paused organizations where pause_ends_at has passed
    FOR org_record IN
        SELECT id, name, pause_ends_at, paused_at
        FROM public.organizations
        WHERE subscription_status = 'paused'
          AND pause_ends_at IS NOT NULL
          AND pause_ends_at <= NOW()
        ORDER BY pause_ends_at ASC
    LOOP
        BEGIN
            -- Update organization to active status
            UPDATE public.organizations
            SET
                subscription_status = 'active',
                paused_at = NULL,
                pause_ends_at = NULL,
                pause_months = NULL,
                pause_reason = NULL
            WHERE id = org_record.id;

            -- Record in pause history
            -- Note: user_id is NULL for automated resumes
            INSERT INTO public.pause_history (
                organization_id,
                user_id,
                action,
                pause_months,
                reason
            ) VALUES (
                org_record.id,
                NULL, -- automated resume, no user action
                'resumed',
                NULL,
                'Automatic resume after pause period ended'
            );

            resume_count := resume_count + 1;

            -- Return success record
            organization_id := org_record.id;
            organization_name := org_record.name;
            status := 'success';
            error_message := NULL;
            RETURN NEXT;

            -- Log successful resume
            RAISE NOTICE 'Auto-resumed organization % (%) - paused_at: %, pause_ends_at: %',
                org_record.id, org_record.name, org_record.paused_at, org_record.pause_ends_at;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;

            -- Return error record
            organization_id := org_record.id;
            organization_name := org_record.name;
            status := 'error';
            error_message := SQLERRM;
            RETURN NEXT;

            -- Log error but continue processing other organizations
            RAISE WARNING 'Failed to auto-resume organization % (%): %',
                org_record.id, org_record.name, SQLERRM;
        END;
    END LOOP;

    -- Log summary
    RAISE NOTICE 'Auto-resume job completed: % succeeded, % failed',
        resume_count, error_count;

    RETURN;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION auto_resume_expired_pauses() IS 'Automatically resumes paused subscriptions when pause_ends_at is reached. Returns table of processed organizations with status. Run via cron every hour.';

-- Schedule the auto-resume job to run every hour
-- Using DO block for safe re-runs (unschedule if exists, then schedule)
DO $$
BEGIN
    -- Try to unschedule existing job (ignore if doesn't exist)
    BEGIN
        PERFORM cron.unschedule('auto-resume-paused-subscriptions');
    EXCEPTION WHEN OTHERS THEN
        -- Job doesn't exist, that's fine
        NULL;
    END;

    -- Schedule the new job to run every hour at :05 past the hour
    -- Using :05 to avoid exact hour boundaries when other jobs might be running
    PERFORM cron.schedule(
        'auto-resume-paused-subscriptions',        -- job name
        '5 * * * *',                               -- cron schedule: every hour at :05
        $$SELECT auto_resume_expired_pauses()$$    -- SQL to execute
    );
END;
$$;

-- Log that the migration completed
DO $$
BEGIN
    RAISE NOTICE 'Auto-resume cron job scheduled successfully. Runs every hour at :05 past the hour.';
END;
$$;
