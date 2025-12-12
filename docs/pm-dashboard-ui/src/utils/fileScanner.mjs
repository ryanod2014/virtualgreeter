/**
 * File Scanner Utilities
 * 
 * Scans agent-output directories and other file-based data.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = config.paths.projectRoot;
const DOCS_DIR = join(PROJECT_ROOT, 'docs');
const DATA_DIR = join(DOCS_DIR, 'data');
const AGENT_OUTPUT_DIR = join(DOCS_DIR, 'agent-output');

/**
 * Read JSON file safely
 */
export function readJSON(filename) {
  const filepath = join(DATA_DIR, filename);
  try {
    return JSON.parse(readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Scan features directory recursively
 */
export function scanFeaturesDir(dir, basePath = '') {
  const features = [];
  if (!existsSync(dir)) return features;
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    
    try {
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        features.push(...scanFeaturesDir(fullPath, relativePath));
      } else if (item.endsWith('.md')) {
        features.push({
          name: item.replace('.md', '').replace(/-/g, ' '),
          fileName: item,
          relativePath,
          docPath: fullPath,
          category: basePath || 'root'
        });
      }
    } catch (e) {
      // Skip files we can't read
    }
  }
  
  return features;
}

/**
 * Scan agent-output directories from LOCAL FILESYSTEM
 */
export function scanAgentOutputsLocal() {
  const outputs = {
    reviews: [],
    completions: [],
    blocked: [],
    docTracker: [],
    started: [],
    findings: [],
    testLock: [],
    qaResults: []
  };

  if (!existsSync(AGENT_OUTPUT_DIR)) {
    return outputs;
  }

  const scanDir = (subdir, targetArray, parser = null) => {
    const dir = join(AGENT_OUTPUT_DIR, subdir);
    if (!existsSync(dir)) return;
    
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file.startsWith('.')) continue;
        
        const filePath = join(dir, file);
        try {
          const content = readFileSync(filePath, 'utf8');
          const item = {
            fileName: file,
            filePath,
            content: parser ? undefined : content
          };
          
          const ticketMatch = file.match(/([A-Z]+-\d+[a-zA-Z]*)/i);
          if (ticketMatch) {
            item.ticketId = ticketMatch[1].toUpperCase();
          }
          
          if (parser) {
            try {
              const parsed = parser(content, file);
              Object.assign(item, parsed);
            } catch (e) {
              item.parseError = e.message;
            }
          }
          
          targetArray.push(item);
        } catch (e) {}
      }
    } catch (e) {}
  };

  scanDir('completions', outputs.completions, (content, file) => {
    if (file.endsWith('.json')) return JSON.parse(content);
    return { content };
  });

  scanDir('blocked', outputs.blocked, (content, file) => {
    if (file.endsWith('.json')) return JSON.parse(content);
    return { content };
  });

  scanDir('qa-results', outputs.qaResults, (content, file) => {
    const passed = content.includes('PASSED') || (content.includes('✅') && !content.includes('❌'));
    const failed = content.includes('FAILED') || content.includes('❌');
    return { content, passed: passed && !failed, failed };
  });

  scanDir('started', outputs.started, (content, file) => {
    if (file.endsWith('.json')) return JSON.parse(content);
    return { content };
  });

  scanDir('test-lock', outputs.testLock, (content, file) => {
    if (file.endsWith('.json')) return JSON.parse(content);
    return { content };
  });

  return outputs;
}

/**
 * Build devStatus from DB sessions, tickets, and file outputs
 * Uses ticket status from DB as the source of truth for pipeline stages
 */
export function buildDevStatus(agentOutputs, runningSessions = [], stalledSessions = [], tickets = []) {
  const inProgress = [];
  const completed = [];
  const merged = [];
  const stalled = [];

  // Build in_progress from running DB sessions
  for (const session of runningSessions) {
    if (session.agent_type === 'dev') {
      inProgress.push({
        ticket_id: session.ticket_id,
        started_at: session.started_at,
        tmux_session: session.tmux_session,
        session_id: session.id
      });
    }
  }

  // Build stalled from stalled sessions
  for (const session of stalledSessions) {
    stalled.push({
      ticket_id: session.ticket_id,
      started_at: session.started_at,
      last_heartbeat: session.last_heartbeat,
      session_id: session.id
    });
  }

  // Use ticket status as source of truth for completed/merged
  // This is more accurate than file scanning
  const inProgressIds = new Set(inProgress.map(i => i.ticket_id?.toUpperCase()));
  
  for (const ticket of tickets) {
    const ticketId = ticket.id?.toUpperCase();
    
    // Skip if in progress
    if (inProgressIds.has(ticketId)) continue;
    
    // Categorize by status
    switch (ticket.status) {
      case 'dev_complete':
      case 'in_review':
      case 'qa_pending':
        completed.push({
          ticket_id: ticket.id,
          status: ticket.status,
          updated_at: ticket.updated_at
        });
        break;
      case 'qa_approved':
      case 'finalizing':
      case 'ready_to_merge':
        completed.push({
          ticket_id: ticket.id,
          status: ticket.status,
          qa_passed: true,
          updated_at: ticket.updated_at
        });
        break;
      case 'merged':
      case 'done':
        merged.push({
          ticket_id: ticket.id,
          status: ticket.status,
          qa_passed: true,
          updated_at: ticket.updated_at
        });
        break;
    }
  }

  return {
    meta: { last_updated: new Date().toISOString() },
    in_progress: inProgress,
    completed,
    merged,
    stalled,
    retry_history: []
  };
}

export default { readJSON, scanFeaturesDir, scanAgentOutputsLocal, buildDevStatus };
