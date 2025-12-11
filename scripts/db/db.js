/**
 * =============================================================================
 * Workflow Database Module
 * =============================================================================
 * SQLite database operations for agent workflow state management.
 * Uses better-sqlite3 for synchronous, fast operations.
 * =============================================================================
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - stored in project data directory
const DB_PATH = join(__dirname, '../../data/workflow.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let db = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the database connection and create tables if needed
 */
export function initDB() {
  if (db) return db;
  
  db = new Database(DB_PATH);
  
  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  
  // Read and execute schema if tables don't exist
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'"
  ).get();
  
  if (!tableCheck) {
    console.log('Initializing database schema...');
    const schema = readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('Database schema created.');
  }
  
  return db;
}

/**
 * Close the database connection
 */
export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get the database instance (initializes if needed)
 */
export function getDB() {
  if (!db) initDB();
  return db;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function now() {
  return new Date().toISOString();
}

function generateId() {
  return uuidv4();
}

function parseJSON(str, defaultValue = []) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

function toJSON(obj) {
  return JSON.stringify(obj);
}

// Transform row with JSON fields parsed
function transformTicket(row) {
  if (!row) return null;
  return {
    ...row,
    feature_docs: parseJSON(row.feature_docs),
    similar_code: parseJSON(row.similar_code),
    files_to_modify: parseJSON(row.files_to_modify),
    files_to_read: parseJSON(row.files_to_read),
    out_of_scope: parseJSON(row.out_of_scope),
    fix_required: parseJSON(row.fix_required),
    acceptance_criteria: parseJSON(row.acceptance_criteria),
    risks: parseJSON(row.risks),
    dev_checks: parseJSON(row.dev_checks),
  };
}

function transformFinding(row) {
  if (!row) return null;
  return {
    ...row,
    options: parseJSON(row.options),
  };
}

// =============================================================================
// TICKETS
// =============================================================================

export const tickets = {
  /**
   * Get all tickets with optional filters
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.priority) {
      sql += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters.feature) {
      sql += ' AND feature = ?';
      params.push(filters.feature);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.prepare(sql).all(...params).map(transformTicket);
  },
  
  /**
   * Get a single ticket by ID (case-insensitive)
   */
  get(id) {
    const db = getDB();
    // Normalize ID to uppercase for consistent lookups
    const normalizedId = id?.toUpperCase();
    const row = db.prepare('SELECT * FROM tickets WHERE id = ? COLLATE NOCASE').get(normalizedId);
    return transformTicket(row);
  },
  
  /**
   * Create a new ticket
   */
  create(data) {
    const db = getDB();
    // Normalize ID to uppercase for consistency
    const id = (data.id || `TKT-${Date.now()}`).toUpperCase();
    
    const stmt = db.prepare(`
      INSERT INTO tickets (
        id, title, priority, feature, difficulty, status, source, issue,
        feature_docs, similar_code, files_to_modify, files_to_read,
        out_of_scope, fix_required, acceptance_criteria, risks, dev_checks,
        qa_notes, parent_ticket_id, iteration, branch, worktree_path,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);
    
    stmt.run(
      id,
      data.title,
      data.priority || 'medium',
      data.feature || null,
      data.difficulty || 'medium',
      data.status || 'draft',
      data.source || null,
      data.issue || null,
      toJSON(data.feature_docs || []),
      toJSON(data.similar_code || []),
      toJSON(data.files_to_modify || []),
      toJSON(data.files_to_read || []),
      toJSON(data.out_of_scope || []),
      toJSON(data.fix_required || []),
      toJSON(data.acceptance_criteria || []),
      toJSON(data.risks || []),
      toJSON(data.dev_checks || []),
      data.qa_notes || null,
      data.parent_ticket_id || null,
      data.iteration || 1,
      data.branch || null,
      data.worktree_path || null,
      now(),
      now()
    );
    
    // Log event
    logEvent('ticket_created', 'system', 'ticket', id, { title: data.title });
    
    return this.get(id);
  },
  
  /**
   * Update a ticket
   */
  update(id, data) {
    const db = getDB();
    // Normalize ID to uppercase for consistency
    const normalizedId = id?.toUpperCase();
    const existing = this.get(normalizedId);
    if (!existing) throw new Error(`Ticket ${normalizedId} not found`);
    
    const fields = [];
    const params = [];
    
    // Build dynamic update
    const allowedFields = [
      'title', 'priority', 'feature', 'difficulty', 'status', 'source', 'issue',
      'qa_notes', 'parent_ticket_id', 'iteration', 'branch', 'worktree_path'
    ];
    
    const jsonFields = [
      'feature_docs', 'similar_code', 'files_to_modify', 'files_to_read',
      'out_of_scope', 'fix_required', 'acceptance_criteria', 'risks', 'dev_checks'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    
    for (const field of jsonFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(toJSON(data[field]));
      }
    }
    
    if (fields.length === 0) return existing;
    
    fields.push('updated_at = ?');
    params.push(now());
    params.push(normalizedId);
    
    db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ? COLLATE NOCASE`).run(...params);
    
    // Log status change event
    if (data.status && data.status !== existing.status) {
      logEvent('ticket_status_changed', 'system', 'ticket', normalizedId, {
        from: existing.status,
        to: data.status
      });
    }
    
    return this.get(normalizedId);
  },
  
  /**
   * Delete a ticket
   */
  delete(id) {
    const db = getDB();
    const normalizedId = id?.toUpperCase();
    db.prepare('DELETE FROM tickets WHERE id = ? COLLATE NOCASE').run(normalizedId);
  },
  
  /**
   * Get tickets ready for work (no conflicts)
   */
  getReadyBatch(maxCount = 10) {
    const db = getDB();
    return db.prepare(`
      SELECT * FROM ready_tickets 
      LIMIT ?
    `).all(maxCount).map(transformTicket);
  }
};

// =============================================================================
// FINDINGS
// =============================================================================

export const findings = {
  /**
   * Get all findings with optional filters
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM findings WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.severity) {
      sql += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.feature) {
      sql += ' AND feature = ?';
      params.push(filters.feature);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.prepare(sql).all(...params).map(transformFinding);
  },
  
  /**
   * Get inbox findings (triaged and waiting for human)
   */
  getInbox() {
    const db = getDB();
    return db.prepare('SELECT * FROM inbox_findings').all().map(transformFinding);
  },
  
  /**
   * Get staging findings (not yet triaged)
   */
  getStaging() {
    const db = getDB();
    return db.prepare(
      "SELECT * FROM findings WHERE status = 'staging' ORDER BY created_at"
    ).all().map(transformFinding);
  },
  
  /**
   * Get a single finding by ID
   */
  get(id) {
    const db = getDB();
    const row = db.prepare('SELECT * FROM findings WHERE id = ?').get(id);
    return transformFinding(row);
  },
  
  /**
   * Create a new finding
   */
  create(data) {
    const db = getDB();
    const id = data.id || `F-${Date.now()}`;
    
    const stmt = db.prepare(`
      INSERT INTO findings (
        id, feature, category, title, severity, location, issue, suggested_fix,
        status, options, agent_recommendation, source_agent, source_session_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.feature || null,
      data.category || null,
      data.title,
      data.severity || 'medium',
      data.location || null,
      data.issue || null,
      data.suggested_fix || null,
      data.status || 'staging',
      toJSON(data.options || []),
      data.agent_recommendation || null,
      data.source_agent || null,
      data.source_session_id || null,
      now(),
      now()
    );
    
    logEvent('finding_created', data.source_agent || 'system', 'finding', id, {
      title: data.title,
      severity: data.severity
    });
    
    return this.get(id);
  },
  
  /**
   * Update a finding
   */
  update(id, data) {
    const db = getDB();
    const existing = this.get(id);
    if (!existing) throw new Error(`Finding ${id} not found`);
    
    const fields = [];
    const params = [];
    
    const allowedFields = [
      'feature', 'category', 'title', 'severity', 'location', 'issue',
      'suggested_fix', 'status', 'merged_into', 'reject_reason', 'ticket_id',
      'agent_recommendation', 'triaged_at'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    
    if (data.options !== undefined) {
      fields.push('options = ?');
      params.push(toJSON(data.options));
    }
    
    if (fields.length === 0) return existing;
    
    fields.push('updated_at = ?');
    params.push(now());
    params.push(id);
    
    db.prepare(`UPDATE findings SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    
    // Log triage event
    if (data.status && data.status !== existing.status) {
      logEvent('finding_triaged', 'triage_agent', 'finding', id, {
        from: existing.status,
        to: data.status
      });
    }
    
    return this.get(id);
  },
  
  /**
   * Promote finding from staging to inbox
   */
  promote(id) {
    return this.update(id, { status: 'inbox', triaged_at: now() });
  },
  
  /**
   * Merge finding into another (deduplicate)
   */
  merge(id, mergeIntoId) {
    return this.update(id, { status: 'merged', merged_into: mergeIntoId });
  },
  
  /**
   * Reject finding
   */
  reject(id, reason) {
    return this.update(id, { status: 'rejected', reject_reason: reason });
  },
  
  /**
   * Link finding to ticket
   */
  linkToTicket(id, ticketId) {
    return this.update(id, { status: 'ticketed', ticket_id: ticketId });
  }
};

// =============================================================================
// DECISION THREADS
// =============================================================================

export const decisions = {
  /**
   * Get all decision threads
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM decision_threads WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.finding_id) {
      sql += ' AND finding_id = ?';
      params.push(filters.finding_id);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.prepare(sql).all(...params);
  },
  
  /**
   * Get a single thread with messages
   */
  get(id) {
    const db = getDB();
    const thread = db.prepare('SELECT * FROM decision_threads WHERE id = ?').get(id);
    if (!thread) return null;
    
    const messages = db.prepare(
      'SELECT * FROM decision_messages WHERE thread_id = ? ORDER BY created_at'
    ).all(id);
    
    return { ...thread, messages };
  },
  
  /**
   * Create a new decision thread
   */
  create(data) {
    const db = getDB();
    const id = data.id || generateId();
    
    db.prepare(`
      INSERT INTO decision_threads (id, finding_id, ticket_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.finding_id || null,
      data.ticket_id || null,
      data.status || 'pending',
      now(),
      now()
    );
    
    return this.get(id);
  },
  
  /**
   * Add a message to a thread
   */
  addMessage(threadId, role, content) {
    const db = getDB();
    
    db.prepare(`
      INSERT INTO decision_messages (thread_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(threadId, role, content, now());
    
    // Update thread timestamp
    db.prepare('UPDATE decision_threads SET updated_at = ? WHERE id = ?')
      .run(now(), threadId);
    
    logEvent('message_added', role, 'decision_thread', threadId, { content });
    
    return this.get(threadId);
  },
  
  /**
   * Resolve a thread
   */
  resolve(id, decisionType, summary) {
    const db = getDB();
    
    db.prepare(`
      UPDATE decision_threads 
      SET status = 'resolved', decision_type = ?, decision_summary = ?, 
          resolved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(decisionType, summary, now(), now(), id);
    
    logEvent('decision_made', 'human', 'decision_thread', id, {
      type: decisionType,
      summary
    });
    
    return this.get(id);
  }
};

// =============================================================================
// AGENT SESSIONS
// =============================================================================

export const sessions = {
  /**
   * Get all sessions with optional filters
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM agent_sessions WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.agent_type) {
      sql += ' AND agent_type = ?';
      params.push(filters.agent_type);
    }
    if (filters.ticket_id) {
      sql += ' AND ticket_id = ?';
      params.push(filters.ticket_id);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.prepare(sql).all(...params);
  },
  
  /**
   * Get running sessions
   */
  getRunning() {
    const db = getDB();
    return db.prepare('SELECT * FROM running_agents').all();
  },
  
  /**
   * Get stalled sessions (no heartbeat in 10 min)
   */
  getStalled() {
    const db = getDB();
    return db.prepare('SELECT * FROM stalled_sessions').all();
  },
  
  /**
   * Get a single session by ID
   */
  get(id) {
    const db = getDB();
    return db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(id);
  },
  
  /**
   * Get session by tmux session name
   */
  getByTmux(tmuxSession) {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM agent_sessions WHERE tmux_session = ? AND status = ?'
    ).get(tmuxSession, 'running');
  },
  
  /**
   * Create a new session (queue an agent)
   */
  create(data) {
    const db = getDB();
    const id = data.id || generateId();
    
    db.prepare(`
      INSERT INTO agent_sessions (
        id, ticket_id, feature_id, agent_type, status,
        tmux_session, worktree_path, attempt_number, max_attempts,
        queued_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.ticket_id || null,
      data.feature_id || null,
      data.agent_type,
      data.status || 'queued',
      data.tmux_session || null,
      data.worktree_path || null,
      data.attempt_number || 1,
      data.max_attempts || 3,
      now(),
      now(),
      now()
    );
    
    return this.get(id);
  },
  
  /**
   * Start a session (agent is launching)
   */
  start(id, tmuxSession, worktreePath) {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET status = 'running', tmux_session = ?, worktree_path = ?,
          started_at = ?, last_heartbeat = ?, updated_at = ?
      WHERE id = ?
    `).run(tmuxSession, worktreePath, now(), now(), now(), id);
    
    logEvent('session_started', 'orchestrator', 'session', id, {
      tmux_session: tmuxSession
    });
    
    return this.get(id);
  },
  
  /**
   * Update heartbeat
   */
  heartbeat(id) {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET last_heartbeat = ?, updated_at = ?
      WHERE id = ?
    `).run(now(), now(), id);
    
    return this.get(id);
  },
  
  /**
   * Complete a session successfully
   */
  complete(id, completionFile = null) {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET status = 'completed', exit_reason = 'completed',
          completion_file = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(completionFile, now(), now(), id);
    
    logEvent('session_completed', 'agent', 'session', id, { completionFile });
    
    return this.get(id);
  },
  
  /**
   * Mark session as crashed
   */
  crash(id, reason = 'unknown') {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET status = 'crashed', exit_reason = ?,
          completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, now(), now(), id);
    
    logEvent('session_crashed', 'orchestrator', 'session', id, { reason });
    
    return this.get(id);
  },
  
  /**
   * Mark session as stalled
   */
  stall(id) {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET status = 'stalled', exit_reason = 'stalled',
          completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now(), now(), id);
    
    logEvent('session_stalled', 'orchestrator', 'session', id, {});
    
    return this.get(id);
  },
  
  /**
   * Block a session
   */
  block(id, blockerType, blockerSummary, blockerFile = null) {
    const db = getDB();
    
    db.prepare(`
      UPDATE agent_sessions 
      SET status = 'blocked', exit_reason = 'blocked',
          blocker_type = ?, blocker_summary = ?, blocker_file = ?,
          completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(blockerType, blockerSummary, blockerFile, now(), now(), id);
    
    logEvent('session_blocked', 'agent', 'session', id, {
      blocker_type: blockerType,
      summary: blockerSummary
    });
    
    return this.get(id);
  },
  
  /**
   * Check if session should be relaunched
   */
  shouldRelaunch(id) {
    const session = this.get(id);
    if (!session) return false;
    return session.attempt_number < session.max_attempts;
  },
  
  /**
   * Create relaunch session (continuation)
   */
  relaunch(id) {
    const session = this.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    return this.create({
      ticket_id: session.ticket_id,
      feature_id: session.feature_id,
      agent_type: session.agent_type,
      worktree_path: session.worktree_path,
      attempt_number: session.attempt_number + 1,
      max_attempts: session.max_attempts,
    });
  }
};

// =============================================================================
// FILE LOCKS
// =============================================================================

export const locks = {
  /**
   * Get all active locks
   */
  getActive() {
    const db = getDB();
    return db.prepare('SELECT * FROM active_locks').all();
  },
  
  /**
   * Get locks for a specific file
   */
  getForFile(filePath) {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM file_locks WHERE file_path = ? AND released_at IS NULL'
    ).get(filePath);
  },
  
  /**
   * Acquire locks for multiple files (atomic)
   * Returns { success: boolean, conflicts: string[] }
   */
  acquire(sessionId, ticketId, files) {
    const db = getDB();
    
    // Check for conflicts first
    const conflicts = [];
    for (const file of files) {
      const existing = this.getForFile(file);
      if (existing && existing.session_id !== sessionId) {
        conflicts.push(file);
      }
    }
    
    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }
    
    // Acquire all locks in a transaction
    const insertLock = db.prepare(`
      INSERT INTO file_locks (file_path, session_id, ticket_id, acquired_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const acquireLocks = db.transaction((files) => {
      for (const file of files) {
        // Skip if already locked by this session
        const existing = this.getForFile(file);
        if (!existing) {
          insertLock.run(file, sessionId, ticketId, now());
        }
      }
    });
    
    acquireLocks(files);
    
    logEvent('lock_acquired', 'orchestrator', 'session', sessionId, {
      files,
      ticket_id: ticketId
    });
    
    return { success: true, conflicts: [] };
  },
  
  /**
   * Release all locks for a session
   */
  release(sessionId) {
    const db = getDB();
    
    db.prepare(`
      UPDATE file_locks 
      SET released_at = ?
      WHERE session_id = ? AND released_at IS NULL
    `).run(now(), sessionId);
    
    logEvent('lock_released', 'orchestrator', 'session', sessionId, {});
  },
  
  /**
   * Release a specific lock
   */
  releaseFile(sessionId, filePath) {
    const db = getDB();
    
    db.prepare(`
      UPDATE file_locks 
      SET released_at = ?
      WHERE session_id = ? AND file_path = ? AND released_at IS NULL
    `).run(now(), sessionId, filePath);
  },
  
  /**
   * Check if files are available (not locked by another session)
   */
  checkAvailable(files, excludeSessionId = null) {
    const db = getDB();
    
    for (const file of files) {
      const lock = this.getForFile(file);
      if (lock && lock.session_id !== excludeSessionId) {
        return { available: false, blockedBy: lock };
      }
    }
    
    return { available: true };
  }
};

// =============================================================================
// FEATURES
// =============================================================================

export const features = {
  /**
   * Get all features
   */
  list() {
    const db = getDB();
    return db.prepare('SELECT * FROM features ORDER BY id').all();
  },
  
  /**
   * Get a single feature
   */
  get(id) {
    const db = getDB();
    return db.prepare('SELECT * FROM features WHERE id = ?').get(id);
  },
  
  /**
   * Create or update a feature
   */
  upsert(data) {
    const db = getDB();
    
    db.prepare(`
      INSERT INTO features (
        id, name, doc_file, documented, last_documented, needs_redoc, redoc_context,
        tested, last_tested, reviewed, last_reviewed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        doc_file = excluded.doc_file,
        documented = excluded.documented,
        last_documented = excluded.last_documented,
        needs_redoc = excluded.needs_redoc,
        redoc_context = excluded.redoc_context,
        tested = excluded.tested,
        last_tested = excluded.last_tested,
        reviewed = excluded.reviewed,
        last_reviewed = excluded.last_reviewed,
        updated_at = excluded.updated_at
    `).run(
      data.id,
      data.name || data.id,
      data.doc_file || null,
      data.documented ? 1 : 0,
      data.last_documented || null,
      data.needs_redoc ? 1 : 0,
      data.redoc_context || null,
      data.tested ? 1 : 0,
      data.last_tested || null,
      data.reviewed ? 1 : 0,
      data.last_reviewed || null,
      now(),
      now()
    );
    
    return this.get(data.id);
  },
  
  /**
   * Get features needing documentation
   */
  getNeedingDoc() {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM features WHERE documented = 0 OR needs_redoc = 1 ORDER BY id'
    ).all();
  },
  
  /**
   * Get features ready for test locking
   */
  getReadyForTestLock() {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM features WHERE documented = 1 AND tested = 0 ORDER BY id'
    ).all();
  },
  
  /**
   * Get features ready for review
   */
  getReadyForReview() {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM features WHERE documented = 1 AND tested = 1 AND reviewed = 0 ORDER BY id'
    ).all();
  }
};

// =============================================================================
// UNIT TEST RUNS
// =============================================================================

export const testRuns = {
  /**
   * Create a new test run record
   */
  create(data) {
    const db = getDB();
    const id = generateId();
    
    db.prepare(`
      INSERT INTO unit_test_runs (
        id, ticket_id, session_id, branch, modified_files, excluded_tests,
        started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.ticket_id,
      data.session_id || null,
      data.branch,
      toJSON(data.modified_files || []),
      toJSON(data.excluded_tests || []),
      now()
    );
    
    logEvent('test_run_started', 'system', 'test_run', id, {
      ticket_id: data.ticket_id,
      branch: data.branch
    });
    
    return this.get(id);
  },
  
  /**
   * Get a test run
   */
  get(id) {
    const db = getDB();
    const row = db.prepare('SELECT * FROM unit_test_runs WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      modified_files: parseJSON(row.modified_files),
      excluded_tests: parseJSON(row.excluded_tests),
    };
  },
  
  /**
   * Complete a test run with results
   */
  complete(id, results) {
    const db = getDB();
    
    db.prepare(`
      UPDATE unit_test_runs SET
        regression_passed = ?,
        regression_output = ?,
        modified_tests_output = ?,
        total_tests = ?,
        passed_tests = ?,
        failed_tests = ?,
        completed_at = ?
      WHERE id = ?
    `).run(
      results.regression_passed ? 1 : 0,
      results.regression_output || null,
      results.modified_tests_output || null,
      results.total_tests || 0,
      results.passed_tests || 0,
      results.failed_tests || 0,
      now(),
      id
    );
    
    logEvent('test_run_completed', 'system', 'test_run', id, {
      passed: results.regression_passed
    });
    
    return this.get(id);
  },
  
  /**
   * Get test runs for a ticket
   */
  getForTicket(ticketId) {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM unit_test_runs WHERE ticket_id = ? ORDER BY started_at DESC'
    ).all(ticketId);
  }
};

// =============================================================================
// EVENTS (Audit Log)
// =============================================================================

export function logEvent(eventType, actor, entityType, entityId, data = {}) {
  const db = getDB();
  
  db.prepare(`
    INSERT INTO events (event_type, actor, entity_type, entity_id, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(eventType, actor, entityType, entityId, toJSON(data), now());
}

export const events = {
  /**
   * Get recent events
   */
  getRecent(limit = 100) {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT ?'
    ).all(limit).map(row => ({
      ...row,
      data: parseJSON(row.data, {})
    }));
  },
  
  /**
   * Get events for an entity
   */
  getForEntity(entityType, entityId) {
    const db = getDB();
    return db.prepare(
      'SELECT * FROM events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at'
    ).all(entityType, entityId).map(row => ({
      ...row,
      data: parseJSON(row.data, {})
    }));
  }
};

// =============================================================================
// WORKTREES
// =============================================================================

export const worktrees = {
  /**
   * Get all worktrees
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM worktrees WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.prepare(sql).all(...params);
  },
  
  /**
   * Get a worktree by path
   */
  getByPath(path) {
    const db = getDB();
    return db.prepare('SELECT * FROM worktrees WHERE path = ?').get(path);
  },
  
  /**
   * Register a worktree
   */
  register(data) {
    const db = getDB();
    const id = generateId();
    
    db.prepare(`
      INSERT INTO worktrees (id, ticket_id, path, branch, status, created_at, last_accessed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.ticket_id || null,
      data.path,
      data.branch,
      data.status || 'active',
      now(),
      now()
    );
    
    return db.prepare('SELECT * FROM worktrees WHERE id = ?').get(id);
  },
  
  /**
   * Update last accessed time
   */
  touch(path) {
    const db = getDB();
    db.prepare('UPDATE worktrees SET last_accessed = ? WHERE path = ?').run(now(), path);
  },
  
  /**
   * Mark worktree as deleted
   */
  markDeleted(path) {
    const db = getDB();
    db.prepare(
      "UPDATE worktrees SET status = 'deleted', deleted_at = ? WHERE path = ?"
    ).run(now(), path);
  }
};

// =============================================================================
// JOBS (Background Job Queue)
// =============================================================================

export const jobs = {
  /**
   * Create a new job
   */
  create(data) {
    const db = getDB();
    const id = generateId();
    
    db.prepare(`
      INSERT INTO jobs (id, job_type, ticket_id, branch, payload, priority, scheduled_for, max_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.job_type,
      data.ticket_id || null,
      data.branch || null,
      toJSON(data.payload || {}),
      data.priority || 5,
      data.scheduled_for || null,
      data.max_attempts || 3
    );
    
    logEvent('job_created', 'system', 'job', id, { job_type: data.job_type, ticket_id: data.ticket_id });
    
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  },
  
  /**
   * Get next pending job (respects priority and schedule)
   */
  getNext() {
    const db = getDB();
    return db.prepare(`
      SELECT * FROM jobs 
      WHERE status = 'pending' 
        AND (scheduled_for IS NULL OR datetime(scheduled_for) <= datetime('now'))
        AND attempt < max_attempts
      ORDER BY priority ASC, created_at ASC 
      LIMIT 1
    `).get();
  },
  
  /**
   * Claim a job for processing
   */
  claim(id) {
    const db = getDB();
    const result = db.prepare(`
      UPDATE jobs 
      SET status = 'running', started_at = ?, attempt = attempt + 1, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(now(), now(), id);
    
    if (result.changes > 0) {
      return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    }
    return null;
  },
  
  /**
   * Mark job as completed
   */
  complete(id, result) {
    const db = getDB();
    db.prepare(`
      UPDATE jobs 
      SET status = 'completed', completed_at = ?, result = ?, updated_at = ?
      WHERE id = ?
    `).run(now(), toJSON(result), now(), id);
    
    logEvent('job_completed', 'system', 'job', id, result);
  },
  
  /**
   * Mark job as failed (may retry)
   */
  fail(id, error) {
    const db = getDB();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    
    const newStatus = job.attempt >= job.max_attempts ? 'failed' : 'pending';
    
    db.prepare(`
      UPDATE jobs 
      SET status = ?, error = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, error, now(), id);
    
    logEvent('job_failed', 'system', 'job', id, { error, will_retry: newStatus === 'pending' });
    
    return newStatus;
  },
  
  /**
   * Get pending jobs count by type
   */
  getPendingCounts() {
    const db = getDB();
    return db.prepare(`
      SELECT job_type, COUNT(*) as count 
      FROM jobs 
      WHERE status = 'pending'
      GROUP BY job_type
    `).all();
  },
  
  /**
   * Get jobs for a ticket
   */
  getForTicket(ticketId) {
    const db = getDB();
    return db.prepare('SELECT * FROM jobs WHERE ticket_id = ? ORDER BY created_at DESC').all(ticketId);
  },
  
  /**
   * List jobs with optional filters
   */
  list(filters = {}) {
    const db = getDB();
    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.job_type) {
      sql += ' AND job_type = ?';
      params.push(filters.job_type);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 100';
    return db.prepare(sql).all(...params);
  }
};

// =============================================================================
// HIGH-LEVEL WORKFLOW FUNCTIONS
// =============================================================================

/**
 * Get the next batch of tickets that can be worked on in parallel
 * Considers file locks and status
 */
export function getNextBatch(maxConcurrent = 3) {
  const db = getDB();
  
  // Get ready tickets
  const readyTickets = tickets.getReadyBatch(maxConcurrent * 2);
  
  // Get currently locked files
  const activeLocks = locks.getActive();
  const lockedFiles = new Set(activeLocks.map(l => l.file_path));
  
  // Filter to conflict-free batch
  const batch = [];
  const batchFiles = new Set(lockedFiles);
  
  for (const ticket of readyTickets) {
    if (batch.length >= maxConcurrent) break;
    
    const ticketFiles = ticket.files_to_modify || [];
    const hasConflict = ticketFiles.some(f => batchFiles.has(f));
    
    if (!hasConflict) {
      batch.push(ticket);
      ticketFiles.forEach(f => batchFiles.add(f));
    }
  }
  
  return batch;
}

/**
 * Get comprehensive dashboard data
 */
export function getDashboardData() {
  const db = getDB();
  
  return {
    tickets: {
      total: db.prepare('SELECT COUNT(*) as count FROM tickets').get().count,
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM tickets 
        GROUP BY status
      `).all(),
      recent: tickets.list().slice(0, 20)
    },
    findings: {
      inbox: findings.getInbox(),
      staging: findings.getStaging().length,
      total: db.prepare('SELECT COUNT(*) as count FROM findings').get().count
    },
    sessions: {
      running: sessions.getRunning(),
      stalled: sessions.getStalled(),
      recentCompleted: sessions.list({ status: 'completed' }).slice(0, 10)
    },
    locks: locks.getActive(),
    recentEvents: events.getRecent(50)
  };
}

// Export default for convenience
export default {
  initDB,
  closeDB,
  getDB,
  tickets,
  findings,
  decisions,
  sessions,
  locks,
  features,
  testRuns,
  events,
  worktrees,
  jobs,
  logEvent,
  getNextBatch,
  getDashboardData
};
