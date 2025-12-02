-- Migration: Prevent routing rules on catch-all pools
-- Catch-all pools receive all traffic that doesn't match other pools' rules.
-- Having rules on a catch-all pool is contradictory and not allowed.

-- Create function to validate pool routing rules
CREATE OR REPLACE FUNCTION validate_pool_routing_rule()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the pool is a catch-all pool
  IF EXISTS (
    SELECT 1 FROM agent_pools 
    WHERE id = NEW.pool_id AND is_catch_all = true
  ) THEN
    RAISE EXCEPTION 'Cannot add routing rules to catch-all pools. Catch-all pools automatically receive all traffic that does not match other pools.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the validation on INSERT
DROP TRIGGER IF EXISTS check_catch_all_pool_rules ON pool_routing_rules;
CREATE TRIGGER check_catch_all_pool_rules
  BEFORE INSERT ON pool_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION validate_pool_routing_rule();

-- Also clear any existing rules from catch-all pools (data cleanup)
DELETE FROM pool_routing_rules 
WHERE pool_id IN (
  SELECT id FROM agent_pools WHERE is_catch_all = true
);

-- Add comment for documentation
COMMENT ON FUNCTION validate_pool_routing_rule() IS 'Prevents routing rules from being added to catch-all pools';

