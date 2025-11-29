-- ============================================================================
-- CANCELLATION FEEDBACK TABLE
-- ============================================================================
-- Stores feedback when users cancel their subscriptions for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  primary_reason TEXT NOT NULL,
  additional_reasons TEXT[] DEFAULT '{}',
  detailed_feedback TEXT,
  competitor_name TEXT,
  would_return BOOLEAN,
  return_conditions TEXT,
  agent_count INTEGER,
  monthly_cost DECIMAL(10,2),
  subscription_duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for querying by organization
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_org 
ON public.cancellation_feedback(organization_id);

-- Enable RLS
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Only admins can view their org's cancellation feedback
DROP POLICY IF EXISTS "Admins can view their org feedback" ON public.cancellation_feedback;
CREATE POLICY "Admins can view their org feedback"
ON public.cancellation_feedback FOR SELECT
USING (
  organization_id = public.get_user_organization_id() 
  AND public.is_user_admin()
);

-- Users can insert feedback for their own org
DROP POLICY IF EXISTS "Users can submit cancellation feedback" ON public.cancellation_feedback;
CREATE POLICY "Users can submit cancellation feedback"
ON public.cancellation_feedback FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());
