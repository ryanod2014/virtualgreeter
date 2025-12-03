-- ============================================================================
-- DEV DATABASE CATCHUP SCRIPT
-- Run this in Supabase SQL Editor for project: qrumylwziqidtoflwtdy
-- This applies all missing migrations from 20251130000000 onwards
-- ============================================================================

-- ============================================================================
-- 1. 20251130000000_add_transcription_summary (PARTIAL - fix conflicts)
-- ============================================================================
-- Most of this was already applied, just need to fix the policy conflict
DROP POLICY IF EXISTS "Admins can view org usage" ON public.usage_records;
CREATE POLICY "Admins can view org usage"
ON public.usage_records FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- 2. 20251130100000_fix_retention_forever
-- ============================================================================
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
    FOR org_record IN 
        SELECT id, recording_settings 
        FROM public.organizations 
        WHERE (recording_settings->>'enabled')::boolean = true
    LOOP
        retention_days := COALESCE((org_record.recording_settings->>'retention_days')::integer, 30);
        IF retention_days = -1 THEN
            CONTINUE;
        END IF;
        cutoff_date := NOW() - (retention_days || ' days')::interval;
        UPDATE public.call_logs
        SET recording_url = NULL
        WHERE organization_id = org_record.id
          AND recording_url IS NOT NULL
          AND created_at < cutoff_date;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION delete_expired_recordings() IS 'Clears recording URLs from call_logs based on org retention policy. Skips orgs with retention_days=-1 (forever). Run via cron.';

-- ============================================================================
-- 3. 20251130110000_setup_recording_cleanup_cron
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('delete-expired-recordings');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    PERFORM cron.schedule(
        'delete-expired-recordings',
        '0 3 * * *',
        $$SELECT delete_expired_recordings()$$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available - skipping cron setup';
END;
$$;

-- ============================================================================
-- 4. 20251201000000_add_user_phone
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
    user_phone TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.invites 
        WHERE email = NEW.email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
    ) THEN
        RETURN NEW;
    END IF;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_phone := NEW.raw_user_meta_data->>'phone';
    INSERT INTO public.organizations (name, slug)
    VALUES (
        user_name || '''s Organization',
        LOWER(REPLACE(user_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;
    INSERT INTO public.users (id, organization_id, email, full_name, phone, role)
    VALUES (NEW.id, new_org_id, NEW.email, user_name, user_phone, 'admin');
    INSERT INTO public.agent_profiles (user_id, organization_id, display_name, is_active)
    VALUES (NEW.id, new_org_id, user_name, FALSE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.users u
SET phone = (
    SELECT raw_user_meta_data->>'phone' 
    FROM auth.users a 
    WHERE a.id = u.id
)
WHERE u.phone IS NULL;

-- ============================================================================
-- 5. 20251201000001_add_funnel_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  step TEXT NOT NULL,
  is_conversion BOOLEAN NOT NULL DEFAULT FALSE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  value NUMERIC(10,2),
  seats INTEGER,
  billing_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_step ON funnel_events(step);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor_id ON funnel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_organization_id ON funnel_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_is_conversion ON funnel_events(is_conversion);

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous funnel event inserts" ON funnel_events;
CREATE POLICY "Allow anonymous funnel event inserts" ON funnel_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Platform admins can read funnel events" ON funnel_events;
CREATE POLICY "Platform admins can read funnel events" ON funnel_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_platform_admin = true));

-- ============================================================================
-- 6. 20251201100000_billing_frequency
-- ============================================================================
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'annual', 'six_month'));

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS has_six_month_offer BOOLEAN DEFAULT false;

UPDATE public.organizations 
SET billing_frequency = 'monthly', has_six_month_offer = false
WHERE billing_frequency IS NULL;

-- ============================================================================
-- 7. 20251201200000_greetnow_retargeting
-- ============================================================================
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS greetnow_retargeting_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_greetnow_retargeting 
  ON public.organizations(greetnow_retargeting_enabled) 
  WHERE greetnow_retargeting_enabled = true;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can insert platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can insert platform settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can delete platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can delete platform settings" ON public.platform_settings
  FOR DELETE TO authenticated USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update organization retargeting" ON public.organizations;
CREATE POLICY "Platform admins can update organization retargeting" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.platform_settings (key, value)
VALUES ('greetnow_facebook_pixel', '{"enabled": false, "pixel_id": null, "access_token": null, "test_event_code": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 8. 20251202000000_country_list_mode
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE country_list_mode_enum AS ENUM ('blocklist', 'allowlist');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS country_list_mode country_list_mode_enum DEFAULT 'blocklist' NOT NULL;

-- ============================================================================
-- 9. 20251203000000_pageviews_country
-- ============================================================================
ALTER TABLE public.widget_pageviews 
ADD COLUMN IF NOT EXISTS visitor_country_code TEXT;

CREATE INDEX IF NOT EXISTS idx_widget_pageviews_country 
ON public.widget_pageviews(visitor_country_code);

-- ============================================================================
-- 10. 20251203100000_catch_all_pool_validation
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_pool_routing_rule()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM agent_pools 
    WHERE id = NEW.pool_id AND is_catch_all = true
  ) THEN
    RAISE EXCEPTION 'Cannot add routing rules to catch-all pools.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_catch_all_pool_rules ON pool_routing_rules;
CREATE TRIGGER check_catch_all_pool_rules
  BEFORE INSERT ON pool_routing_rules
  FOR EACH ROW EXECUTE FUNCTION validate_pool_routing_rule();

DELETE FROM pool_routing_rules 
WHERE pool_id IN (SELECT id FROM agent_pools WHERE is_catch_all = true);

-- ============================================================================
-- 11. 20251203200000_call_recovery
-- ============================================================================
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_token TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_eligible BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_call_logs_reconnect 
  ON call_logs(status, reconnect_eligible, last_heartbeat_at)
  WHERE status = 'accepted' AND reconnect_eligible = true AND ended_at IS NULL;

-- ============================================================================
-- 12. 20251204000000_input_validation_constraints
-- ============================================================================
ALTER TABLE agent_pool_members DROP CONSTRAINT IF EXISTS agent_pool_members_priority_rank_check;
ALTER TABLE agent_pool_members ADD CONSTRAINT agent_pool_members_priority_rank_check
  CHECK (priority_rank >= 1 AND priority_rank <= 99);

ALTER TABLE agent_profiles DROP CONSTRAINT IF EXISTS agent_profiles_max_simulations_check;
ALTER TABLE agent_profiles ADD CONSTRAINT agent_profiles_max_simulations_check
  CHECK (max_simultaneous_simulations >= 1 AND max_simultaneous_simulations <= 100);

-- ============================================================================
-- DONE! Now insert migration records so CLI knows these are applied
-- ============================================================================
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT v, n, '{}'::jsonb[]
FROM (VALUES
  ('20251130000000', 'add_transcription_summary'),
  ('20251130100000', 'fix_retention_forever'),
  ('20251130110000', 'setup_recording_cleanup_cron'),
  ('20251201000000', 'add_user_phone'),
  ('20251201000001', 'add_funnel_events'),
  ('20251201100000', 'billing_frequency'),
  ('20251201200000', 'greetnow_retargeting'),
  ('20251202000000', 'country_list_mode'),
  ('20251203000000', 'pageviews_country'),
  ('20251203100000', 'catch_all_pool_validation'),
  ('20251203200000', 'call_recovery'),
  ('20251204000000', 'input_validation_constraints')
) AS t(v, n)
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = t.v);

SELECT 'Dev database catchup complete!' AS status;

