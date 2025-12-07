-- =============================================================================
-- Workflow Database Schema
-- =============================================================================
-- SQLite database for agent workflow state management.
-- Replaces JSON files: tickets.json, findings.json, decisions.json, etc.
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =============================================================================
-- FEATURES TABLE
-- Tracks feature inventory and documentation/test/review status
-- Replaces: doc-status.json
-- =============================================================================
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,                    -- e.g., 'widget-lifecycle'
    name TEXT NOT NULL,                     -- Human-readable name
    doc_file TEXT,                          -- Path to documentation file
    
    -- Documentation status
    documented INTEGER DEFAULT 0,           -- Boolean: has been documented
    last_documented TEXT,                   -- ISO timestamp
    needs_redoc INTEGER DEFAULT 0,          -- Boolean: needs re-documentation
    redoc_context TEXT,                     -- Why re-doc needed
    
    -- Test Lock status
    tested INTEGER DEFAULT 0,               -- Boolean: behavior tests created
    last_tested TEXT,                       -- ISO timestamp
    
    -- Review status
    reviewed INTEGER DEFAULT 0,             -- Boolean: has been reviewed
    last_reviewed TEXT,                     -- ISO timestamp
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_features_doc_status ON features(documented, needs_redoc);
CREATE INDEX IF NOT EXISTS idx_features_test_status ON features(tested);
CREATE INDEX IF NOT EXISTS idx_features_review_status ON features(reviewed);

-- =============================================================================
-- TICKETS TABLE
-- All ticket definitions and status
-- Replaces: tickets.json
-- =============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,                    -- e.g., 'TKT-001'
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',         -- critical, high, medium, low
    feature TEXT,                           -- Related feature name
    difficulty TEXT DEFAULT 'medium',       -- easy, medium, hard
    
    -- Status tracking
    status TEXT DEFAULT 'draft',            -- See status values below
    -- Status values:
    --   draft, ready, in_progress, dev_complete, 
    --   unit_test_passed, unit_test_failed,
    --   qa_pending, qa_passed, qa_failed,
    --   merged, cancelled
    
    -- Source and context
    source TEXT,                            -- Where ticket came from (findings, etc.)
    issue TEXT,                             -- Problem description
    
    -- JSON arrays stored as TEXT (will be parsed by application)
    feature_docs TEXT DEFAULT '[]',         -- JSON array of doc paths
    similar_code TEXT DEFAULT '[]',         -- JSON array of similar code refs
    files_to_modify TEXT DEFAULT '[]',      -- JSON array of files
    files_to_read TEXT DEFAULT '[]',        -- JSON array of reference files
    out_of_scope TEXT DEFAULT '[]',         -- JSON array of exclusions
    fix_required TEXT DEFAULT '[]',         -- JSON array of fix items
    acceptance_criteria TEXT DEFAULT '[]',  -- JSON array of AC items
    risks TEXT DEFAULT '[]',                -- JSON array of risk items
    dev_checks TEXT DEFAULT '[]',           -- JSON array of dev verification items
    qa_notes TEXT,                          -- Free text QA instructions
    
    -- Continuation/retry tracking
    parent_ticket_id TEXT,                  -- If continuation, points to original
    iteration INTEGER DEFAULT 1,            -- 1 for original, 2+ for retries
    
    -- Branch/worktree info
    branch TEXT,                            -- Git branch name
    worktree_path TEXT,                     -- Path to worktree
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (parent_ticket_id) REFERENCES tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_parent ON tickets(parent_ticket_id);

-- =============================================================================
-- FINDINGS TABLE
-- All findings from review agents, with staging/inbox/resolved status
-- Replaces: findings.json, findings-staging.json
-- =============================================================================
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,                    -- e.g., 'F-227'
    feature TEXT,                           -- Related feature
    category TEXT,                          -- e.g., 'A-cobrowse-viewer'
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',         -- critical, high, medium, low
    location TEXT,                          -- Where in docs/code
    issue TEXT,                             -- Problem description
    suggested_fix TEXT,                     -- Recommended fix
    
    -- Status tracking
    status TEXT DEFAULT 'staging',          -- staging, inbox, ticketed, merged, rejected, wont_fix
    
    -- Triage info
    merged_into TEXT,                       -- If merged, ID of canonical finding
    reject_reason TEXT,                     -- If rejected, why
    
    -- Ticket link
    ticket_id TEXT,                         -- If ticketed, which ticket
    
    -- Agent options (stored as JSON)
    options TEXT DEFAULT '[]',              -- JSON array of option objects
    agent_recommendation TEXT,
    
    -- Source tracking
    source_agent TEXT,                      -- Which agent created this
    source_session_id TEXT,                 -- Which session
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    triaged_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (merged_into) REFERENCES findings(id)
);

CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_ticket ON findings(ticket_id);

-- =============================================================================
-- DECISION_THREADS TABLE
-- Human decisions on findings and blockers
-- Replaces: decisions.json
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_threads (
    id TEXT PRIMARY KEY,                    -- UUID or finding_id based
    finding_id TEXT,                        -- Related finding if applicable
    ticket_id TEXT,                         -- Related ticket if applicable
    
    -- Status
    status TEXT DEFAULT 'pending',          -- pending, resolved, deferred
    
    -- Decision outcome
    decision_type TEXT,                     -- approve, reject, defer, modify
    decision_summary TEXT,                  -- Brief summary of decision
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (finding_id) REFERENCES findings(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_status ON decision_threads(status);
CREATE INDEX IF NOT EXISTS idx_decisions_finding ON decision_threads(finding_id);

-- =============================================================================
-- DECISION_MESSAGES TABLE
-- Individual messages in decision threads
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    
    role TEXT NOT NULL,                     -- human, system, dispatch_agent
    content TEXT NOT NULL,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (thread_id) REFERENCES decision_threads(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON decision_messages(thread_id);

-- =============================================================================
-- AGENT_SESSIONS TABLE
-- Tracks all agent executions (running, completed, crashed)
-- New table - enables auto-recovery and monitoring
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,                    -- UUID
    ticket_id TEXT,                         -- Related ticket (for dev/qa agents)
    feature_id TEXT,                        -- Related feature (for doc/review agents)
    
    agent_type TEXT NOT NULL,               -- dev, qa, doc, test_lock, review, triage, dispatch
    
    -- Status
    status TEXT DEFAULT 'queued',           -- queued, starting, running, completed, crashed, stalled, cancelled
    
    -- Timing
    queued_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    last_heartbeat TEXT,
    
    -- Tmux/process tracking
    tmux_session TEXT,                      -- e.g., 'agent-TKT-006'
    worktree_path TEXT,
    pid INTEGER,                            -- Process ID if known
    
    -- Recovery
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    
    -- Result
    exit_code INTEGER,
    exit_reason TEXT,                       -- completed, crashed, stalled, cancelled, blocked
    
    -- Output files
    completion_file TEXT,                   -- Path to completion report
    blocker_file TEXT,                      -- Path to blocker if blocked
    
    -- Blocker info (if blocked)
    blocker_type TEXT,                      -- clarification, environment, ci_failure, qa_failure
    blocker_summary TEXT,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (feature_id) REFERENCES features(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_ticket ON agent_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON agent_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_sessions_tmux ON agent_sessions(tmux_session);

-- =============================================================================
-- FILE_LOCKS TABLE
-- Explicit file locking to prevent conflicts
-- New table - replaces implicit locking via started/*.json files
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    session_id TEXT NOT NULL,
    ticket_id TEXT,
    
    -- Lock status
    acquired_at TEXT DEFAULT (datetime('now')),
    released_at TEXT,                       -- NULL if still held
    
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    
    -- Ensure unique active lock per file
    UNIQUE(file_path, released_at)
);

CREATE INDEX IF NOT EXISTS idx_locks_file ON file_locks(file_path);
CREATE INDEX IF NOT EXISTS idx_locks_session ON file_locks(session_id);
CREATE INDEX IF NOT EXISTS idx_locks_active ON file_locks(released_at) WHERE released_at IS NULL;

-- =============================================================================
-- WORKTREES TABLE
-- Track git worktree lifecycle
-- New table - enables cleanup and status tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS worktrees (
    id TEXT PRIMARY KEY,                    -- UUID
    ticket_id TEXT,
    
    path TEXT NOT NULL UNIQUE,              -- Filesystem path
    branch TEXT NOT NULL,                   -- Git branch
    
    -- Status
    status TEXT DEFAULT 'active',           -- active, stale, deleted
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    last_accessed TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_worktrees_ticket ON worktrees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);

-- =============================================================================
-- UNIT_TEST_RUNS TABLE
-- Track regression test results
-- New table - supports the separate unit test step
-- =============================================================================
CREATE TABLE IF NOT EXISTS unit_test_runs (
    id TEXT PRIMARY KEY,                    -- UUID
    ticket_id TEXT NOT NULL,
    session_id TEXT,                        -- Agent session that triggered this
    
    branch TEXT NOT NULL,
    
    -- Files context
    modified_files TEXT DEFAULT '[]',       -- JSON array of modified files
    excluded_tests TEXT DEFAULT '[]',       -- JSON array of excluded test files
    
    -- Results
    regression_passed INTEGER,              -- Boolean: did non-modified tests pass?
    regression_output TEXT,                 -- Full test output
    modified_tests_output TEXT,             -- Output from modified file tests (info only)
    
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    
    -- Timestamps
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_test_runs_ticket ON unit_test_runs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_passed ON unit_test_runs(regression_passed);

-- =============================================================================
-- EVENTS TABLE
-- Audit log for debugging and history
-- New table - tracks all state changes
-- =============================================================================
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    event_type TEXT NOT NULL,               -- See event types below
    -- Event types:
    --   ticket_created, ticket_updated, ticket_status_changed
    --   finding_created, finding_triaged, finding_resolved
    --   session_started, session_heartbeat, session_completed, session_crashed
    --   lock_acquired, lock_released
    --   decision_made, message_added
    --   test_run_started, test_run_completed
    
    actor TEXT NOT NULL,                    -- human, dev_agent, qa_agent, orchestrator, etc.
    
    -- Related entities
    entity_type TEXT,                       -- ticket, finding, session, etc.
    entity_id TEXT,                         -- ID of related entity
    
    -- Event data
    data TEXT,                              -- JSON with event-specific data
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- =============================================================================
-- METADATA TABLE
-- Schema version and migration tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert initial metadata
INSERT OR REPLACE INTO metadata (key, value) VALUES 
    ('schema_version', '1.0.0'),
    ('created_at', datetime('now')),
    ('migrated_from_json', 'false');

-- =============================================================================
-- VIEWS
-- Convenient views for common queries
-- =============================================================================

-- Active file locks (not released)
CREATE VIEW IF NOT EXISTS active_locks AS
SELECT 
    fl.file_path,
    fl.session_id,
    fl.ticket_id,
    fl.acquired_at,
    s.agent_type,
    s.status as session_status
FROM file_locks fl
JOIN agent_sessions s ON fl.session_id = s.id
WHERE fl.released_at IS NULL;

-- Running agents with ticket info
CREATE VIEW IF NOT EXISTS running_agents AS
SELECT 
    s.id,
    s.ticket_id,
    s.agent_type,
    s.tmux_session,
    s.started_at,
    s.last_heartbeat,
    s.attempt_number,
    t.title as ticket_title,
    t.priority as ticket_priority
FROM agent_sessions s
LEFT JOIN tickets t ON s.ticket_id = t.id
WHERE s.status = 'running';

-- Tickets ready for work (no active session, not locked)
CREATE VIEW IF NOT EXISTS ready_tickets AS
SELECT t.*
FROM tickets t
WHERE t.status = 'ready'
AND NOT EXISTS (
    SELECT 1 FROM agent_sessions s 
    WHERE s.ticket_id = t.id 
    AND s.status IN ('queued', 'starting', 'running')
);

-- Inbox findings (triaged and waiting for human)
CREATE VIEW IF NOT EXISTS inbox_findings AS
SELECT *
FROM findings
WHERE status = 'inbox'
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    created_at DESC;

-- Stalled sessions (no heartbeat in 10 minutes)
CREATE VIEW IF NOT EXISTS stalled_sessions AS
SELECT *
FROM agent_sessions
WHERE status = 'running'
AND last_heartbeat IS NOT NULL
AND datetime(last_heartbeat) < datetime('now', '-10 minutes');
