-- ============================================================================
-- CALL ANALYTICS SCHEMA UPDATE
-- ============================================================================
-- Adds dispositions table and analytics columns to call_logs
-- ============================================================================

-- ============================================================================
-- DISPOSITIONS TABLE
-- ============================================================================
-- Organization-specific call outcomes that agents can assign after calls

CREATE TABLE IF NOT EXISTS public.dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dispositions_organization_id ON public.dispositions(organization_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_active ON public.dispositions(organization_id, is_active);

-- RLS Policies
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dispositions in their organization"
    ON public.dispositions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage dispositions"
    ON public.dispositions FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_dispositions_updated_at
    BEFORE UPDATE ON public.dispositions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ADD ANALYTICS COLUMNS TO CALL_LOGS
-- ============================================================================

-- Add ring timing columns
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ring_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS answer_time_seconds INTEGER;

-- Add recording URL
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add disposition reference
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS disposition_id UUID REFERENCES public.dispositions(id) ON DELETE SET NULL;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_call_logs_disposition_id ON public.call_logs(disposition_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_page_url ON public.call_logs(page_url);
CREATE INDEX IF NOT EXISTS idx_call_logs_duration ON public.call_logs(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_created ON public.call_logs(agent_id, created_at DESC);

-- ============================================================================
-- SEED DEFAULT DISPOSITIONS FOR EXISTING ORGANIZATIONS
-- ============================================================================

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Interested', '#22c55e', 1
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Not Interested', '#ef4444', 2
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Callback Requested', '#f59e0b', 3
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'No Answer', '#6b7280', 4
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Left Voicemail', '#8b5cf6', 5
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- AUTO-CREATE DEFAULT DISPOSITIONS FOR NEW ORGANIZATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_dispositions()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.dispositions (organization_id, name, color, display_order) VALUES
        (NEW.id, 'Interested', '#22c55e', 1),
        (NEW.id, 'Not Interested', '#ef4444', 2),
        (NEW.id, 'Callback Requested', '#f59e0b', 3),
        (NEW.id, 'No Answer', '#6b7280', 4),
        (NEW.id, 'Left Voicemail', '#8b5cf6', 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_organization_created_create_dispositions ON public.organizations;
CREATE TRIGGER on_organization_created_create_dispositions
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.create_default_dispositions();

