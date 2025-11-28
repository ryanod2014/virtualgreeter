-- ============================================================================
-- ADD LOCATION COLUMNS TO CALL_LOGS
-- ============================================================================
-- Stores visitor location resolved from IP address for analytics and filtering
-- ============================================================================

-- Add location columns to call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
ADD COLUMN IF NOT EXISTS visitor_city TEXT,
ADD COLUMN IF NOT EXISTS visitor_region TEXT,
ADD COLUMN IF NOT EXISTS visitor_country TEXT,
ADD COLUMN IF NOT EXISTS visitor_country_code TEXT;

-- Create index for location-based filtering
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_city ON public.call_logs(visitor_city);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_region ON public.call_logs(visitor_region);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_country ON public.call_logs(visitor_country);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_country_code ON public.call_logs(visitor_country_code);

-- Composite index for common location queries
CREATE INDEX IF NOT EXISTS idx_call_logs_location ON public.call_logs(organization_id, visitor_country_code, visitor_region, visitor_city);

