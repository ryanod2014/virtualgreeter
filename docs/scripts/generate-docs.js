#!/usr/bin/env node

/**
 * PM Dashboard & Ticket Backlog Generator
 * 
 * Generates markdown files from structured JSON data.
 * This keeps counts accurate and prevents sync issues.
 * 
 * Usage: node docs/scripts/generate-docs.js
 * 
 * The PM workflow remains EXACTLY the same - this just ensures
 * the dashboard and ticket backlog are always in sync with data.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DOCS_DIR = path.join(__dirname, '..');

// Load data
const tickets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tickets.json'), 'utf8'));
const findings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'findings-summary.json'), 'utf8'));

// Priority emoji mapping
const PRIORITY_EMOJI = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢'
};

const DIFFICULTY_EMOJI = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴'
};

const RISK_EMOJI = {
  low: '🟢',
  medium: '🟡',
  high: '🔴'
};

const STATUS_EMOJI = {
  ready: '📋',
  in_progress: '🔨',
  done: '✅',
  on_hold: '❄️',
  wont_fix: '❌'
};

// Count tickets by priority and status
function countTickets() {
  const counts = {
    critical: { total: 0, in_progress: 0, done: 0 },
    high: { total: 0, in_progress: 0, done: 0 },
    medium: { total: 0, in_progress: 0, done: 0 },
    low: { total: 0, in_progress: 0, done: 0 }
  };

  for (const ticket of tickets.tickets) {
    const priority = ticket.priority;
    counts[priority].total++;
    if (ticket.status === 'in_progress') counts[priority].in_progress++;
    if (ticket.status === 'done') counts[priority].done++;
  }

  return counts;
}

// Generate PM Dashboard
function generateDashboard() {
  const counts = countTickets();
  const totalTickets = tickets.tickets.length;
  const totalInProgress = Object.values(counts).reduce((sum, c) => sum + c.in_progress, 0);
  const totalDone = Object.values(counts).reduce((sum, c) => sum + c.done, 0);

  const totalAnswered = Object.values(findings.by_priority).reduce((sum, p) => sum + p.answered, 0);
  const totalPending = Object.values(findings.by_priority).reduce((sum, p) => sum + p.pending, 0);

  const dashboard = `# PM Dashboard

> **Purpose:** Single view of the entire documentation/review/ticketing pipeline.
> **Last Updated:** ${new Date().toISOString().split('T')[0]} (Auto-generated)
> **Quick Action:** Tell PM which priority to process for questions

---

## 🚦 Pipeline Status (At a Glance)

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  DOCUMENTATION  │ → │     REVIEW      │ → │    QUESTIONS    │ → │     TICKETS     │ → │       DEV       │
│   ${findings.meta.total_features}/${findings.meta.total_features} ✅      │    │   ${findings.meta.reviewed_features}/${findings.meta.total_features} ✅      │    │  ${totalAnswered} answered    │    │   ${totalTickets} created    │    │   ${totalInProgress} started     │
│   Complete!     │    │   Complete!     │    │  ${totalPending} remaining  │    │ ${counts.critical.total}🔴 ${counts.high.total}🟠 ${counts.medium.total}🟡 ${counts.low.total}🟢│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
\`\`\`

---

## 📊 Detailed Status

### Stage 1: Documentation
| Metric | Count | Status |
|--------|-------|--------|
| Total Features | ${findings.meta.total_features} | - |
| Documented | ${findings.meta.total_features} | ✅ Complete |
| Remaining | 0 | - |

**File:** \`docs/DOC_TRACKER.md\`

---

### Stage 2: Reviews
| Category | Total | Reviewed | Pending |
|----------|-------|----------|---------|
${Object.entries(findings.by_category).map(([cat, data]) => 
  `| ${cat.charAt(0).toUpperCase() + cat.slice(1)} | ${data.total} | ✅ ${data.reviewed} | ${data.total - data.reviewed} |`
).join('\n')}
| **TOTAL** | **${findings.meta.total_features}** | **${findings.meta.reviewed_features}** | **0** |

**Status:** ✅ All reviews complete!

**File:** \`docs/REVIEW_TRACKER.md\`

---

### Stage 3: Questions (Findings Needing Answers)

> ${findings.by_priority.critical.pending === 0 && findings.by_priority.high.pending > 0 
    ? '✅ Critical complete! Processing High priority.' 
    : findings.by_priority.critical.pending > 0 
    ? '⚠️ Critical findings need answers first!' 
    : '✅ Critical + High complete!'}

| Priority | Findings | Answered | Tickets | Pending |
|----------|----------|----------|---------|---------|
| 🔴 Critical | ${findings.by_priority.critical.total} | ${findings.by_priority.critical.answered > 0 ? '✅ ' : ''}${findings.by_priority.critical.answered} | ${findings.by_priority.critical.tickets_created} | ${findings.by_priority.critical.pending > 0 ? '⚠️ **' + findings.by_priority.critical.pending + '**' : '0'} |
| 🟠 High | ${findings.by_priority.high.total} | ${findings.by_priority.high.answered} | ${findings.by_priority.high.tickets_created} | ${findings.by_priority.high.pending > 0 ? '⚠️ **' + findings.by_priority.high.pending + '**' : '0'} |
| 🟡 Medium | ${findings.by_priority.medium.total} | ${findings.by_priority.medium.answered} | ${findings.by_priority.medium.tickets_created} | ⚠️ ${findings.by_priority.medium.pending} |
| 🟢 Low | ${findings.by_priority.low.total} | ${findings.by_priority.low.answered} | ${findings.by_priority.low.tickets_created} | ⚠️ ${findings.by_priority.low.pending} |
| **TOTAL** | **${findings.meta.total_findings}** | **${totalAnswered}** | **${totalTickets}** | **${totalPending}** |

**Current Status:** ${totalTickets} tickets created.  
**Next Action:** Process 🟠 High batch (${findings.by_priority.high.pending} remaining) when ready.

**File:** \`docs/REVIEW_FINDINGS.md\`

---

### Stage 4: Tickets
| Priority | Created | In Progress | Done |
|----------|---------|-------------|------|
| 🔴 Critical | ${counts.critical.total} | ${counts.critical.in_progress} | ${counts.critical.done} |
| 🟠 High | ${counts.high.total} | ${counts.high.in_progress} | ${counts.high.done} |
| 🟡 Medium | ${counts.medium.total} | ${counts.medium.in_progress} | ${counts.medium.done} |
| 🟢 Low | ${counts.low.total} | ${counts.low.in_progress} | ${counts.low.done} |
| **TOTAL** | **${totalTickets}** | **${totalInProgress}** | **${totalDone}** |

**File:** \`docs/TICKET_BACKLOG.md\`

---

## 🎯 What to Do Next

### ✅ Reviews Complete - Continue Q&A!

Tell the PM:
\`\`\`
Show me High priority findings - next batch
\`\`\`

**Priority breakdown:**
- 🔴 **Critical: ${findings.by_priority.critical.pending} pending** ${findings.by_priority.critical.pending === 0 ? '✅' : '← Start here'}
- 🟠 **High: ${findings.by_priority.high.pending} pending** ${findings.by_priority.critical.pending === 0 ? '← Continue here' : ''}
- 🟡 Medium: ${findings.by_priority.medium.pending} pending
- 🟢 Low: ${findings.by_priority.low.pending} pending

---

## 📁 Quick File Reference

| What You Want | File | Purpose |
|---------------|------|---------|
| See all features | \`docs/FEATURE_INVENTORY.md\` | Master list of features |
| See doc status | \`docs/DOC_TRACKER.md\` | What's documented |
| See review status | \`docs/REVIEW_TRACKER.md\` | What's been reviewed |
| See findings | \`docs/REVIEW_FINDINGS.md\` | Issues found by reviewers |
| See tickets | \`docs/TICKET_BACKLOG.md\` | Work items for dev |
| **Ticket data** | \`docs/data/tickets.json\` | **Structured ticket data** |
| PM workflow | \`docs/workflow/PM_DOCS_SOP.md\` | How PM operates |

---

## 🔄 How to Update This Dashboard

This dashboard is **auto-generated** from \`docs/data/tickets.json\` and \`docs/data/findings-summary.json\`.

\`\`\`bash
# Regenerate dashboard after updating JSON:
node docs/scripts/generate-docs.js
\`\`\`

The PM workflow remains exactly the same - just the underlying data format changed for accuracy.

---

## 📋 Session Log

<!-- PM logs sessions here for continuity -->

| Date | Session | Action | Result |
|------|---------|--------|--------|
| 2025-12-03 | Review Sprint | All 61 features reviewed | 742 findings |
| 2025-12-03 | Critical Q&A | Processed all 15 Critical findings | 7 tickets |
| 2025-12-03 | High Q&A Batch 1-2 | Processed 20 High findings | 16 more tickets |
| 2025-12-03 | Data Migration | Moved to JSON format | Better accuracy |
| - | - | - | - |

`;

  return dashboard;
}

// Generate Ticket Backlog
function generateTicketBacklog() {
  const counts = countTickets();
  const totalTickets = tickets.tickets.length;
  const totalInProgress = Object.values(counts).reduce((sum, c) => sum + c.in_progress, 0);
  const totalDone = Object.values(counts).reduce((sum, c) => sum + c.done, 0);

  // Group tickets by priority
  const byPriority = {
    critical: tickets.tickets.filter(t => t.priority === 'critical'),
    high: tickets.tickets.filter(t => t.priority === 'high'),
    medium: tickets.tickets.filter(t => t.priority === 'medium'),
    low: tickets.tickets.filter(t => t.priority === 'low')
  };

  const formatTicket = (ticket) => {
    const diffEmoji = DIFFICULTY_EMOJI[ticket.difficulty] || '🟡';
    const riskEmoji = RISK_EMOJI[ticket.risk] || '🟡';
    const statusEmoji = STATUS_EMOJI[ticket.status] || '📋';
    const prioEmoji = PRIORITY_EMOJI[ticket.priority];

    return `
### ${ticket.id}: ${ticket.title}

| Field | Value |
|-------|-------|
| **Priority** | ${prioEmoji} ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} |
| **Feature** | ${ticket.feature} |
| **Status** | ${statusEmoji} ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')} |
| **Difficulty** | ${diffEmoji} ${ticket.difficulty.charAt(0).toUpperCase() + ticket.difficulty.slice(1)} |
| **Complexity** | ${ticket.complexity.charAt(0).toUpperCase() + ticket.complexity.slice(1)} |
| **Risk** | ${riskEmoji} ${ticket.risk.charAt(0).toUpperCase() + ticket.risk.slice(1)} |
| **Source** | ${ticket.source} |

**Issue:**
${ticket.issue}

**Fix Required:**
${ticket.fix_required.map(f => `- ${f}`).join('\n')}

**Files to Edit:**
${ticket.files.map(f => `- \`${f}\``).join('\n')}

**Risk Notes:**
${ticket.risk_notes.map(n => `- ${n}`).join('\n')}

**Acceptance Criteria:**
${ticket.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n')}
${ticket.feature_inventory_update ? '\n**Feature Inventory:**\n- [ ] Update `docs/FEATURE_INVENTORY.md` with new feature' : ''}
${ticket.pre_work ? '\n**Pre-Work Required:**\n' + ticket.pre_work.map(p => `- [ ] ${p}`).join('\n') : ''}

---`;
  };

  const backlog = `# Ticket Backlog

> **Purpose:** Prioritized list of work items from review findings.
> **Owner:** Human reviews & prioritizes before dev sprint. PM maintains this file.
> **Generated:** ${new Date().toISOString().split('T')[0]} from \`docs/data/tickets.json\`

---

## Quick Stats

| Priority | Count | In Progress | Done |
|----------|-------|-------------|------|
| 🔴 Critical | ${counts.critical.total} | ${counts.critical.in_progress} | ${counts.critical.done} |
| 🟠 High | ${counts.high.total} | ${counts.high.in_progress} | ${counts.high.done} |
| 🟡 Medium | ${counts.medium.total} | ${counts.medium.in_progress} | ${counts.medium.done} |
| 🟢 Low | ${counts.low.total} | ${counts.low.in_progress} | ${counts.low.done} |
| **Total** | **${totalTickets}** | **${totalInProgress}** | **${totalDone}** |

---

## 🔴 Critical Priority

> Issues that block functionality, pose security risks, or cause data loss.

${byPriority.critical.map(formatTicket).join('\n')}

## 🟠 High Priority

> Major UX issues, significant logic flaws, important security fixes.

${byPriority.high.map(formatTicket).join('\n')}

## 🟡 Medium Priority

> Logic issues, accessibility gaps, UX improvements, documentation gaps.

${byPriority.medium.map(formatTicket).join('\n')}

## 🟢 Low Priority

> Nice-to-have, polish, minor edge cases, documentation improvements.

${byPriority.low.map(formatTicket).join('\n')}

## Status Legend

| Status | Meaning |
|--------|---------|
| 📋 Ready | Awaiting dev assignment |
| 🔨 In Progress | Being worked on |
| ✅ Done | Completed |
| ❄️ On Hold | Blocked or deferred |
| ❌ Won't Fix | Rejected - not a real issue or too low value |

---

## Completed Tickets

<!-- Move completed tickets here for historical reference -->

| ID | Feature | Issue | Completed | Notes |
|----|---------|-------|-----------|-------|
| - | - | - | - | - |

---

## Rejected Tickets

<!-- Move rejected tickets here for audit trail -->

| ID | Feature | Issue | Rejected | Reason |
|----|---------|-------|----------|--------|
| - | - | - | - | - |
`;

  return backlog;
}

// Main
console.log('📊 Generating PM Dashboard and Ticket Backlog...\n');

const dashboard = generateDashboard();
const backlog = generateTicketBacklog();

fs.writeFileSync(path.join(DOCS_DIR, 'PM_DASHBOARD.md'), dashboard);
console.log('✅ Generated: docs/PM_DASHBOARD.md');

fs.writeFileSync(path.join(DOCS_DIR, 'TICKET_BACKLOG.md'), backlog);
console.log('✅ Generated: docs/TICKET_BACKLOG.md');

const counts = countTickets();
console.log('\n📈 Summary:');
console.log(`   🔴 Critical: ${counts.critical.total}`);
console.log(`   🟠 High: ${counts.high.total}`);
console.log(`   🟡 Medium: ${counts.medium.total}`);
console.log(`   🟢 Low: ${counts.low.total}`);
console.log(`   ────────────`);
console.log(`   Total: ${tickets.tickets.length} tickets\n`);

