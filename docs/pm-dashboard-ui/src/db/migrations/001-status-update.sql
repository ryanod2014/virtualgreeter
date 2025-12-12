-- =============================================================================
-- Migration 001: Update ticket status values
-- =============================================================================
-- Migrates existing statuses to the new state machine values:
--   unit_test_passed -> in_review
--   unit_test_failed -> blocked  
--   qa_passed -> qa_approved
--   ready -> ready (no change)
--   in_progress -> in_progress (no change)
--   dev_complete -> dev_complete (no change)
--   qa_pending -> qa_pending (no change)
--   qa_failed -> qa_failed (no change)
--   merged -> merged (no change)
--   cancelled -> cancelled (no change)
--   blocked -> blocked (no change)
-- 
-- New statuses added:
--   ui_review - Waiting for human UI approval
--   finalizing - Test+Doc agents running
--   ready_to_merge - All done, awaiting manual merge
-- =============================================================================

-- Migrate existing statuses
UPDATE tickets SET status = 'in_review' WHERE status = 'unit_test_passed';
UPDATE tickets SET status = 'blocked' WHERE status = 'unit_test_failed';
UPDATE tickets SET status = 'qa_approved' WHERE status = 'qa_passed';

-- Update metadata to track migration
INSERT OR REPLACE INTO metadata (key, value, updated_at) 
VALUES ('migration_001_completed', datetime('now'), datetime('now'));

-- Log the migration
INSERT INTO events (event_type, actor, entity_type, data, created_at)
VALUES (
  'migration_applied',
  'system',
  'database',
  '{"migration": "001-status-update", "changes": ["unit_test_passed -> in_review", "unit_test_failed -> blocked", "qa_passed -> qa_approved"]}',
  datetime('now')
);
