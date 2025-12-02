-- Migration: Call Recovery Support
-- Enables calls to survive server restarts by persisting active call state

-- Add columns for call recovery
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_token TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_eligible BOOLEAN DEFAULT false;

-- Index for finding orphaned calls that need recovery
-- An orphaned call is one that:
-- 1. Has status 'accepted' (was in progress)
-- 2. Is reconnect_eligible
-- 3. Has a recent heartbeat (within last 30 seconds before server died)
-- 4. Has no ended_at
CREATE INDEX IF NOT EXISTS idx_call_logs_reconnect 
  ON call_logs(status, reconnect_eligible, last_heartbeat_at)
  WHERE status = 'accepted' AND reconnect_eligible = true AND ended_at IS NULL;

-- Comments for clarity
COMMENT ON COLUMN call_logs.reconnect_token IS 'Unique token for reconnecting to an interrupted call';
COMMENT ON COLUMN call_logs.last_heartbeat_at IS 'Last heartbeat from either party - used to detect orphaned calls';
COMMENT ON COLUMN call_logs.reconnect_eligible IS 'Whether this call can be recovered after server restart';

