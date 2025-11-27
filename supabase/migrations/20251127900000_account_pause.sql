-- ============================================================================
-- ACCOUNT PAUSE FEATURE
-- ============================================================================
-- Adds subscription pause functionality as a downsell option before cancellation.
-- Paused accounts retain all data but cannot make new calls.
-- ============================================================================

-- Add subscription status and pause fields to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_months INTEGER,
ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- Add constraint for valid subscription statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organizations_subscription_status_check'
    ) THEN
        ALTER TABLE public.organizations
        ADD CONSTRAINT organizations_subscription_status_check
        CHECK (subscription_status IN ('active', 'paused', 'cancelled'));
    END IF;
END $$;

-- Index for finding accounts that need to be resumed
CREATE INDEX IF NOT EXISTS idx_organizations_pause_ends_at 
ON public.organizations(pause_ends_at) 
WHERE subscription_status = 'paused';

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
ON public.organizations(subscription_status);

-- Comments for documentation
COMMENT ON COLUMN public.organizations.subscription_status IS 'Current subscription state: active, paused, or cancelled';
COMMENT ON COLUMN public.organizations.paused_at IS 'Timestamp when the account was paused';
COMMENT ON COLUMN public.organizations.pause_ends_at IS 'Timestamp when the pause period ends and billing resumes';
COMMENT ON COLUMN public.organizations.pause_months IS 'Number of months the account is paused for (1, 2, or 3)';
COMMENT ON COLUMN public.organizations.pause_reason IS 'Optional reason provided when pausing';

-- ============================================================================
-- PAUSE HISTORY TABLE (for tracking pause events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pause_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL CHECK (action IN ('paused', 'resumed', 'extended')),
    pause_months INTEGER,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for org lookup
CREATE INDEX IF NOT EXISTS idx_pause_history_org 
ON public.pause_history(organization_id);

-- RLS policies for pause_history
ALTER TABLE public.pause_history ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's pause history
CREATE POLICY "Admins can view org pause history"
ON public.pause_history FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can insert pause history for their org
CREATE POLICY "Admins can insert pause history"
ON public.pause_history FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

COMMENT ON TABLE public.pause_history IS 'Tracks account pause/resume events for analytics';

