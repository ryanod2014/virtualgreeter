-- ============================================================================
-- MRR TRACKING & REVENUE METRICS
-- ============================================================================
-- Adds proper revenue tracking for churn analysis:
-- 1. MRR field on organizations
-- 2. MRR snapshots for historical tracking
-- 3. MRR changes log for expansion/contraction tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD MRR TO ORGANIZATIONS
-- ----------------------------------------------------------------------------

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS mrr_updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.organizations.mrr IS 'Current Monthly Recurring Revenue for this organization';
COMMENT ON COLUMN public.organizations.mrr_updated_at IS 'Last time MRR was updated';

-- ----------------------------------------------------------------------------
-- 2. MRR SNAPSHOTS TABLE (for historical tracking)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mrr_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mrr DECIMAL(10,2) NOT NULL,
  seat_count INTEGER NOT NULL,
  plan TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one snapshot per org per day
  UNIQUE(organization_id, snapshot_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_org ON public.mrr_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON public.mrr_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_org_date ON public.mrr_snapshots(organization_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.mrr_snapshots ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all snapshots
DROP POLICY IF EXISTS "Platform admins can view all MRR snapshots" ON public.mrr_snapshots;
CREATE POLICY "Platform admins can view all MRR snapshots"
ON public.mrr_snapshots FOR SELECT
USING (public.is_platform_admin());

COMMENT ON TABLE public.mrr_snapshots IS 'Daily MRR snapshots for historical tracking and cohort analysis';

-- ----------------------------------------------------------------------------
-- 3. MRR CHANGES LOG (for tracking expansion/contraction/churn)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE mrr_change_type AS ENUM (
  'new',           -- New customer
  'expansion',     -- Existing customer increased MRR (upgrade, add seats)
  'contraction',   -- Existing customer decreased MRR (downgrade, remove seats)
  'churn',         -- Customer cancelled
  'reactivation'   -- Previously churned customer came back
);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.mrr_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  change_type mrr_change_type NOT NULL,
  mrr_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  mrr_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  mrr_delta DECIMAL(10,2) NOT NULL, -- Positive for gains, negative for losses
  seat_count_before INTEGER,
  seat_count_after INTEGER,
  plan_before TEXT,
  plan_after TEXT,
  reason TEXT, -- Optional description
  changed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mrr_changes_org ON public.mrr_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_mrr_changes_type ON public.mrr_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_mrr_changes_date ON public.mrr_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_mrr_changes_type_date ON public.mrr_changes(change_type, changed_at);

-- Enable RLS
ALTER TABLE public.mrr_changes ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all changes
DROP POLICY IF EXISTS "Platform admins can view all MRR changes" ON public.mrr_changes;
CREATE POLICY "Platform admins can view all MRR changes"
ON public.mrr_changes FOR SELECT
USING (public.is_platform_admin());

COMMENT ON TABLE public.mrr_changes IS 'Log of all MRR changes for calculating expansion, contraction, and churn';

-- ----------------------------------------------------------------------------
-- 4. ORGANIZATION HEALTH SCORE TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_health (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL DEFAULT 100, -- 0-100 score
  risk_level TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  
  -- Component scores (each 0-100)
  activity_score INTEGER NOT NULL DEFAULT 100,
  engagement_score INTEGER NOT NULL DEFAULT 100,
  coverage_score INTEGER NOT NULL DEFAULT 100,
  growth_score INTEGER NOT NULL DEFAULT 100,
  
  -- Risk factors
  days_since_last_call INTEGER,
  calls_trend TEXT, -- 'increasing', 'stable', 'declining'
  coverage_rate DECIMAL(5,2),
  agent_utilization DECIMAL(5,2),
  
  -- Timestamps
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_health ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all health scores
DROP POLICY IF EXISTS "Platform admins can view all health scores" ON public.organization_health;
CREATE POLICY "Platform admins can view all health scores"
ON public.organization_health FOR SELECT
USING (public.is_platform_admin());

-- Admins can view their own org's health
DROP POLICY IF EXISTS "Admins can view own org health" ON public.organization_health;
CREATE POLICY "Admins can view own org health"
ON public.organization_health FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  AND public.is_user_admin()
);

COMMENT ON TABLE public.organization_health IS 'Calculated health scores for predicting churn risk';

-- ----------------------------------------------------------------------------
-- 5. MONTHLY METRICS AGGREGATES (for fast querying)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_start DATE NOT NULL UNIQUE, -- First day of month
  
  -- Organization counts
  total_orgs INTEGER NOT NULL DEFAULT 0,
  active_orgs INTEGER NOT NULL DEFAULT 0,
  new_orgs INTEGER NOT NULL DEFAULT 0,
  churned_orgs INTEGER NOT NULL DEFAULT 0,
  reactivated_orgs INTEGER NOT NULL DEFAULT 0,
  
  -- MRR metrics
  starting_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  ending_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  new_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  expansion_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  contraction_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  churned_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  reactivation_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Calculated rates
  logo_churn_rate DECIMAL(5,2), -- % of orgs that churned
  revenue_churn_rate DECIMAL(5,2), -- gross revenue churn %
  net_revenue_retention DECIMAL(6,2), -- NRR %
  quick_ratio DECIMAL(5,2), -- (New + Expansion) / (Contraction + Churn)
  
  -- Usage metrics
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_pageviews INTEGER NOT NULL DEFAULT 0,
  avg_coverage_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_metrics_date ON public.monthly_metrics(month_start DESC);

-- Enable RLS
ALTER TABLE public.monthly_metrics ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all metrics
DROP POLICY IF EXISTS "Platform admins can view monthly metrics" ON public.monthly_metrics;
CREATE POLICY "Platform admins can view monthly metrics"
ON public.monthly_metrics FOR SELECT
USING (public.is_platform_admin());

COMMENT ON TABLE public.monthly_metrics IS 'Pre-aggregated monthly metrics for fast dashboard loading';

-- ----------------------------------------------------------------------------
-- 6. COHORT RETENTION TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cohort_retention (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_month DATE NOT NULL, -- Month the cohort signed up
  months_since_signup INTEGER NOT NULL, -- 0, 1, 2, 3... months after signup
  
  -- Retention data
  starting_count INTEGER NOT NULL, -- Orgs in cohort at signup
  retained_count INTEGER NOT NULL, -- Orgs still active at this point
  retained_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  starting_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Calculated rates
  logo_retention_rate DECIMAL(5,2), -- % of orgs retained
  revenue_retention_rate DECIMAL(5,2), -- % of MRR retained (can be >100% with expansion)
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one row per cohort per month-since-signup
  UNIQUE(cohort_month, months_since_signup)
);

CREATE INDEX IF NOT EXISTS idx_cohort_retention_cohort ON public.cohort_retention(cohort_month);
CREATE INDEX IF NOT EXISTS idx_cohort_retention_months ON public.cohort_retention(months_since_signup);

-- Enable RLS
ALTER TABLE public.cohort_retention ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all retention data
DROP POLICY IF EXISTS "Platform admins can view cohort retention" ON public.cohort_retention;
CREATE POLICY "Platform admins can view cohort retention"
ON public.cohort_retention FOR SELECT
USING (public.is_platform_admin());

COMMENT ON TABLE public.cohort_retention IS 'Cohort retention curves by signup month';

-- ----------------------------------------------------------------------------
-- 7. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to calculate health score for an organization
CREATE OR REPLACE FUNCTION calculate_org_health_score(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  activity_score INTEGER := 100;
  engagement_score INTEGER := 100;
  coverage_score INTEGER := 100;
  growth_score INTEGER := 100;
  days_since_call INTEGER;
  call_count_this_month INTEGER;
  call_count_last_month INTEGER;
  coverage_rate DECIMAL;
  final_score INTEGER;
BEGIN
  -- Calculate days since last call
  SELECT EXTRACT(DAY FROM (NOW() - MAX(created_at)))::INTEGER
  INTO days_since_call
  FROM call_logs
  WHERE organization_id = org_id;
  
  -- Activity score based on recency
  IF days_since_call IS NULL THEN
    activity_score := 20; -- Never had a call
  ELSIF days_since_call <= 1 THEN
    activity_score := 100;
  ELSIF days_since_call <= 3 THEN
    activity_score := 90;
  ELSIF days_since_call <= 7 THEN
    activity_score := 70;
  ELSIF days_since_call <= 14 THEN
    activity_score := 50;
  ELSIF days_since_call <= 30 THEN
    activity_score := 30;
  ELSE
    activity_score := 10;
  END IF;
  
  -- Get call counts for trend
  SELECT COUNT(*) INTO call_count_this_month
  FROM call_logs
  WHERE organization_id = org_id
    AND created_at >= DATE_TRUNC('month', NOW());
  
  SELECT COUNT(*) INTO call_count_last_month
  FROM call_logs
  WHERE organization_id = org_id
    AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    AND created_at < DATE_TRUNC('month', NOW());
  
  -- Growth score based on call trend
  IF call_count_last_month = 0 THEN
    IF call_count_this_month > 0 THEN
      growth_score := 100;
    ELSE
      growth_score := 50;
    END IF;
  ELSIF call_count_this_month >= call_count_last_month THEN
    growth_score := 100;
  ELSIF call_count_this_month >= call_count_last_month * 0.7 THEN
    growth_score := 70;
  ELSIF call_count_this_month >= call_count_last_month * 0.5 THEN
    growth_score := 50;
  ELSE
    growth_score := 30;
  END IF;
  
  -- Coverage score
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN 100
    ELSE (COUNT(*) FILTER (WHERE agent_id IS NOT NULL)::DECIMAL / COUNT(*) * 100)::INTEGER
    END
  INTO coverage_score
  FROM widget_pageviews
  WHERE organization_id = org_id
    AND created_at >= NOW() - INTERVAL '30 days';
  
  -- Final weighted score
  final_score := (
    activity_score * 0.35 +
    engagement_score * 0.20 +
    coverage_score * 0.25 +
    growth_score * 0.20
  )::INTEGER;
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get risk level from health score
CREATE OR REPLACE FUNCTION get_risk_level(health_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF health_score >= 80 THEN
    RETURN 'low';
  ELSIF health_score >= 60 THEN
    RETURN 'medium';
  ELSIF health_score >= 40 THEN
    RETURN 'high';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 8. UPDATE EXISTING DATA
-- ----------------------------------------------------------------------------

-- Set initial MRR based on plan (rough estimates, should be adjusted)
UPDATE public.organizations
SET mrr = CASE plan
  WHEN 'free' THEN 0
  WHEN 'starter' THEN 49 * seat_count
  WHEN 'pro' THEN 99 * seat_count
  WHEN 'enterprise' THEN 199 * seat_count
  ELSE 0
END
WHERE mrr = 0;

-- Create initial health records for all orgs
INSERT INTO public.organization_health (organization_id, health_score, risk_level)
SELECT id, 100, 'low'
FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

