-- ============================================================================
-- ALLOW NULL DISAPPOINTMENT LEVEL FOR DISMISSED SURVEYS
-- ============================================================================
-- When users dismiss surveys without selecting an option, we should store
-- NULL instead of defaulting to 'not_disappointed' to avoid skewing PMF data
-- ============================================================================

-- Alter the pmf_surveys table to allow NULL disappointment_level
ALTER TABLE pmf_surveys
ALTER COLUMN disappointment_level DROP NOT NULL;

-- Add comment explaining when NULL is used
COMMENT ON COLUMN pmf_surveys.disappointment_level IS 'Disappointment level from Sean Ellis survey. NULL if user dismissed without selecting.';
