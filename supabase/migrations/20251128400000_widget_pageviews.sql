-- ============================================================================
-- WIDGET PAGEVIEWS TABLE
-- ============================================================================
-- Track when the widget popup is shown to visitors (before they call)
-- This allows calculating pageview-to-call conversion rate

CREATE TABLE IF NOT EXISTS public.widget_pageviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES public.agent_pools(id) ON DELETE SET NULL,
    visitor_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_organization_id ON public.widget_pageviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_created_at ON public.widget_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_agent_id ON public.widget_pageviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_pool_id ON public.widget_pageviews(pool_id);
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_org_date ON public.widget_pageviews(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.widget_pageviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view pageviews for their organization
DROP POLICY IF EXISTS "Admins can view organization pageviews" ON public.widget_pageviews;
CREATE POLICY "Admins can view organization pageviews"
    ON public.widget_pageviews
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.organization_id = widget_pageviews.organization_id
            AND u.role = 'admin'
        )
    );

-- Allow insert from service role (server-side tracking)
-- No RLS policy needed for insert as it's done via service role

