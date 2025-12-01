-- Funnel Events Table for tracking pageviews and conversions through the signup funnel
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session/visitor tracking
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  
  -- Funnel step
  step TEXT NOT NULL, -- 'landing', 'signup', 'paywall', 'seats', 'billing', 'signup_complete', 'paywall_complete', etc.
  
  -- Is this a conversion (completed action) vs just a pageview?
  is_conversion BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Optional: link to organization once created
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Event metadata
  value NUMERIC(10,2), -- Dollar value for revenue-generating events
  seats INTEGER, -- Number of seats selected
  billing_type TEXT, -- 'monthly', 'annual', '6month'
  
  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Page/referrer info
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_funnel_events_step ON funnel_events(step);
CREATE INDEX idx_funnel_events_created_at ON funnel_events(created_at);
CREATE INDEX idx_funnel_events_visitor_id ON funnel_events(visitor_id);
CREATE INDEX idx_funnel_events_organization_id ON funnel_events(organization_id);
CREATE INDEX idx_funnel_events_is_conversion ON funnel_events(is_conversion);

-- Allow inserts from anonymous users (public signup funnel)
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert funnel events (needed for anonymous tracking)
CREATE POLICY "Allow anonymous funnel event inserts" ON funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only platform admins can read funnel events
CREATE POLICY "Platform admins can read funnel events" ON funnel_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_platform_admin = true
    )
  );
