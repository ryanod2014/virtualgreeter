/**
 * Inbox API Routes
 * 
 * Human review queue for UI changes that need manual approval.
 */

import { Router } from 'express';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import config from '../../config.mjs';
import { approveUiReview, rejectUiReview } from '../../core/orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Database module - will be injected
let db = null;

const PROJECT_ROOT = config.paths.projectRoot;
const INBOX_DIR = join(PROJECT_ROOT, 'docs/agent-output/inbox');

/**
 * Initialize with database module
 */
export function initInboxRoutes(dbModule) {
  db = dbModule;
}

// GET /api/v2/inbox - List pending inbox items (deduplicated by ticket)
router.get('/', (req, res) => {
  try {
    const itemsByTicket = new Map(); // Dedupe by ticket_id, keep most recent

    if (existsSync(INBOX_DIR)) {
      const files = readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = readFileSync(join(INBOX_DIR, file), 'utf8');
          const item = JSON.parse(content);
          // Only include pending items (not already approved/rejected)
          if (item.status !== 'approved' && item.status !== 'rejected') {
            const ticketId = (item.ticket_id || item.ticketId || '').toUpperCase();
            const existing = itemsByTicket.get(ticketId);
            const itemDate = new Date(item.created_at || 0);
            const existingDate = existing ? new Date(existing.created_at || 0) : new Date(0);
            
            // Keep the most recent entry per ticket
            if (!existing || itemDate > existingDate) {
              itemsByTicket.set(ticketId, { ...item, fileName: file });
            }
          }
        } catch (e) {
          // Skip malformed files
        }
      }
    }

    const items = Array.from(itemsByTicket.values());
    res.json({ items, count: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/inbox/:ticketId/approve - Human approves UI review
router.post('/:ticketId/approve', async (req, res) => {
  try {
    const ticketId = req.params.ticketId.toUpperCase();
    console.log(`✅ Human approved UI review for ${ticketId}`);

    // Find and update the inbox item
    let inboxBranch = null;
    let inboxUpdated = false;

    if (existsSync(INBOX_DIR)) {
      const files = readdirSync(INBOX_DIR).filter(f => f.includes(ticketId) && f.endsWith('.json'));
      for (const file of files) {
        const filePath = join(INBOX_DIR, file);
        try {
          const content = JSON.parse(readFileSync(filePath, 'utf8'));
          inboxBranch = content.branch || `agent/${ticketId.toLowerCase()}`;
          content.status = 'approved';
          content.approved_at = new Date().toISOString();
          writeFileSync(filePath, JSON.stringify(content, null, 2));
          inboxUpdated = true;
          
          // Move to approved folder
          const approvedDir = join(PROJECT_ROOT, 'docs/agent-output/inbox-approved');
          if (!existsSync(approvedDir)) {
            execSync(`mkdir -p "${approvedDir}"`);
          }
          renameSync(filePath, join(approvedDir, file));
          break;
        } catch (e) {
          console.error(`Error processing inbox file ${file}:`, e.message);
        }
      }
    }

    const branch = inboxBranch || `agent/${ticketId.toLowerCase()}`;

    // Use orchestrator to approve and queue test+doc agents
    try {
      approveUiReview(ticketId);
    } catch (e) {
      // Fallback: just update DB directly if orchestrator fails
      if (db?.tickets) {
        db.tickets.update(ticketId, { 
          status: 'finalizing',
          human_approved: true,
          approved_at: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      ticket_id: ticketId,
      branch,
      message: `✅ ${ticketId} approved! Test Lock + Doc agents queued.`
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/inbox/:ticketId/reject - Human rejects UI review
router.post('/:ticketId/reject', async (req, res) => {
  try {
    const ticketId = req.params.ticketId.toUpperCase();
    const { reason } = req.body;
    console.log(`❌ Human rejected UI review for ${ticketId}: ${reason}`);

    // Find and move the inbox item
    if (existsSync(INBOX_DIR)) {
      const files = readdirSync(INBOX_DIR).filter(f => f.includes(ticketId) && f.endsWith('.json'));
      for (const file of files) {
        const filePath = join(INBOX_DIR, file);
        try {
          const content = JSON.parse(readFileSync(filePath, 'utf8'));
          content.status = 'rejected';
          content.rejected_at = new Date().toISOString();
          content.rejection_reason = reason;
          writeFileSync(filePath, JSON.stringify(content, null, 2));
          
          // Move to rejected folder
          const rejectedDir = join(PROJECT_ROOT, 'docs/agent-output/inbox-rejected');
          if (!existsSync(rejectedDir)) {
            execSync(`mkdir -p "${rejectedDir}"`);
          }
          renameSync(filePath, join(rejectedDir, file));
          break;
        } catch (e) {
          console.error(`Error processing inbox file ${file}:`, e.message);
        }
      }
    }

    // Use orchestrator to reject and create blocker for Dispatch
    try {
      rejectUiReview(ticketId, reason);
    } catch (e) {
      // Fallback: just update DB directly if orchestrator fails
      if (db?.tickets) {
        db.tickets.update(ticketId, { 
          status: 'blocked',
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      ticket_id: ticketId,
      message: `❌ ${ticketId} rejected. Blocker created for Dispatch. Reason: ${reason}`
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
