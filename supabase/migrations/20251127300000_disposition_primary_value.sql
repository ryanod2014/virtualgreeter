-- ============================================================================
-- DISPOSITION VALUE FIELD
-- ============================================================================
-- Adds ability to assign a dollar value to each disposition for tracking
-- revenue/conversions (like Facebook ads conversion value)
-- 
-- Note: Primary disposition is determined by display_order (first = primary)
-- ============================================================================

-- Add value column (dollar amount, like Facebook ads conversion value)
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2) DEFAULT NULL;

-- Index for value-based analytics
CREATE INDEX IF NOT EXISTS idx_dispositions_value
ON public.dispositions (organization_id, value)
WHERE value IS NOT NULL;

