/**
 * Database Module Re-export
 * 
 * Re-exports the database module from scripts/db/db.js to maintain
 * a single source of truth while allowing the new modular structure
 * to import from src/db/.
 * 
 * This also adds additional helper functions needed by the new modules.
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from the original location (scripts/db/db.js is ES module)
const dbPath = join(__dirname, '../../../../scripts/db/db.js');

// Dynamic import since it's a different module location
let dbModule = null;

export async function loadDB() {
  if (dbModule) return dbModule;
  
  try {
    dbModule = await import(`file://${dbPath}`);
    console.log('✅ Database module loaded from scripts/db/');
    return dbModule;
  } catch (e) {
    console.error('Failed to load database module:', e.message);
    throw e;
  }
}

// Re-export common functions and objects
// These will be populated after loadDB() is called
export let db = null;
export let tickets = null;
export let findings = null;
export let sessions = null;
export let locks = null;
export let jobs = null;
export let decisions = null;
export let features = null;
export let worktrees = null;
export let unitTestRuns = null;
export let logEvent = null;
export let getDB = null;
export let initDB = null;
export let closeDB = null;

/**
 * Initialize and get all database exports
 */
export async function initializeDB() {
  const module = await loadDB();
  
  // Populate exports
  db = module.getDB();
  tickets = module.tickets;
  findings = module.findings;
  sessions = module.sessions;
  locks = module.locks;
  jobs = module.jobs;
  decisions = module.decisions;
  features = module.features;
  worktrees = module.worktrees;
  unitTestRuns = module.unitTestRuns;
  logEvent = module.logEvent;
  getDB = module.getDB;
  initDB = module.initDB;
  closeDB = module.closeDB;
  
  return module;
}

/**
 * Helper: Check if files are available (not locked by other tickets)
 */
export function checkFilesAvailable(files, excludeTicketId = null) {
  if (!locks) {
    console.warn('Locks module not initialized');
    return { available: true, blockedBy: null };
  }
  
  const activeLocks = locks.getActive();
  
  for (const file of files) {
    const lock = activeLocks.find(l => l.file_path === file);
    if (lock && lock.ticket_id !== excludeTicketId) {
      return {
        available: false,
        blockedBy: {
          file_path: file,
          ticket_id: lock.ticket_id,
          session_id: lock.session_id,
        }
      };
    }
  }
  
  return { available: true, blockedBy: null };
}

export default {
  loadDB,
  initializeDB,
  checkFilesAvailable,
};
