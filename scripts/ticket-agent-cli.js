#!/usr/bin/env node
/**
 * =============================================================================
 * Ticket Agent CLI
 * =============================================================================
 * Creates tickets in the database AND generates detailed prompt files.
 * Used by Ticket Agent to create new tickets and continuations.
 * 
 * Usage:
 *   node scripts/ticket-agent-cli.js create --title "..." --priority high
 *   node scripts/ticket-agent-cli.js continue --from-blocker [SESSION_ID]
 *   node scripts/ticket-agent-cli.js from-decision --thread-id [THREAD_ID]
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

// Configuration
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3456';
const PROJECT_ROOT = path.join(__dirname, '..');
const PROMPTS_DIR = path.join(PROJECT_ROOT, 'docs/prompts/active');

// =============================================================================
// HTTP Client
// =============================================================================

function request(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, DASHBOARD_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// =============================================================================
// Git Helpers
// =============================================================================

function getGitDiff(branch, files = []) {
  try {
    const fileArgs = files.length > 0 ? `-- ${files.join(' ')}` : '';
    const output = execSync(
      `git diff main..origin/${branch} --stat ${fileArgs}`,
      { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 30000 }
    );
    return output.trim();
  } catch (e) {
    return 'Unable to get git diff';
  }
}

function getGitLog(branch, count = 5) {
  try {
    const output = execSync(
      `git log --oneline -${count} origin/${branch}`,
      { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 10000 }
    );
    return output.trim();
  } catch (e) {
    return 'Unable to get git log';
  }
}

function generateTicketId() {
  // Get current max ticket ID from DB
  // For now, use timestamp-based ID
  const num = Date.now() % 1000000;
  return `TKT-${String(num).padStart(3, '0')}`;
}

// =============================================================================
// Prompt File Generation
// =============================================================================

/**
 * Safely parse a field that might be a JSON string or already an array
 */
function safeParseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function generateContinuationPrompt(ticket, blocker, previousAttempts) {
  const iteration = (ticket.iteration || 1);
  const branch = ticket.branch || `agent/tkt-${ticket.id.toLowerCase()}`;
  
  const filesToModify = Array.isArray(ticket.files_to_modify) 
    ? ticket.files_to_modify 
    : safeParseArray(ticket.files_to_modify);
  const diffSummary = ticket.branch ? getGitDiff(ticket.branch, filesToModify) : 'No previous changes';
  const commitLog = ticket.branch ? getGitLog(ticket.branch) : 'No commits yet';
  
  const attemptHistory = previousAttempts.map((a, i) => 
    `| v${i + 1} | ${a.summary || 'Unknown'} | ${a.failure || 'Failed'} |`
  ).join('\n');

  return `# Dev Agent Continuation: ${ticket.id}

> **Type:** Continuation (${blocker.blocker_type || 'failure'})
> **Original Ticket:** ${ticket.parent_ticket_id || ticket.id.replace(/-v\\d+$/, '')}
> **Branch:** \`${branch}\` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v${iteration}

---

## PREVIOUS ATTEMPT FAILED - READ THIS FIRST

**What Previous Agent Changed:**
\`\`\`
${diffSummary}
\`\`\`

**Recent Commits:**
\`\`\`
${commitLog}
\`\`\`

**Why It Failed:**
${blocker.summary || 'Unknown failure'}

**Key Mistake to Avoid:**
${blocker.recommendation || 'Review the failure details carefully'}

---

## Failure Details

**Blocker Type:** ${blocker.blocker_type || 'unknown'}

**Summary:**
${blocker.summary || 'No summary provided'}

**Specific Failures:**
${(blocker.failures || []).map(f => `- ${f.criterion || f.category}: ${f.actual || f.evidence || 'Failed'}`).join('\n') || '- See summary above'}

**Recommendation:**
${blocker.recommendation || 'Fix the issues identified above'}

---

## Your Task

1. Review the previous attempt:
   \`\`\`bash
   git log --oneline -5 origin/${branch}
   git diff main..origin/${branch}
   \`\`\`

2. Checkout existing branch:
   \`\`\`bash
   git fetch origin
   git checkout ${branch}
   git pull origin ${branch}
   \`\`\`

3. **Understand WHY the previous fix failed before coding**

4. Fix the issues identified above

5. Verify with grep/code inspection BEFORE claiming completion

6. Update status when done:
   \`\`\`bash
   ./scripts/agent-cli.sh update-ticket ${ticket.id} --status dev_complete
   \`\`\`

---

## Original Acceptance Criteria

${(safeParseArray(ticket.acceptance_criteria)).map(ac => `- [ ] ${ac}`).join('\n') || '- See original ticket'}

---

## Files in Scope

${(safeParseArray(ticket.files_to_modify)).map(f => `- \`${f}\``).join('\n') || '- See original ticket'}

---

## Risks to Avoid

${(safeParseArray(ticket.risks)).map(r => `- ${r}`).join('\n') || '- Follow existing patterns'}

---

## Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
${attemptHistory || '| v1 | Initial attempt | See failure details above |'}
`;
}

function generateNewTicketPrompt(ticket, finding, decision) {
  const branch = `agent/tkt-${ticket.id.toLowerCase()}-${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
  
  return `# Dev Agent: ${ticket.id} - ${ticket.title}

> **Type:** New ticket
> **Priority:** ${ticket.priority || 'medium'}
> **Branch:** \`${branch}\`

---

## PM Decision

**Human decided:** ${decision.decision_summary || decision.decision_type || 'Approved'}

**Context:** ${finding?.issue || 'See details below'}

---

## Your Task

${ticket.issue || finding?.suggested_fix || 'Implement the required changes'}

---

## Context

**Feature Docs:**
${(safeParseArray(ticket.feature_docs)).map(d => `- ${d}`).join('\n') || '- Check docs/features/ for relevant documentation'}

**Similar Code:**
${(safeParseArray(ticket.similar_code)).map(c => `- ${c}`).join('\n') || '- Search codebase for similar patterns'}

---

## Scope

### Files to Modify
${(safeParseArray(ticket.files_to_modify)).map(f => `- \`${f}\``).join('\n') || '- Determine based on task'}

### Files to Read (Context Only)
${(safeParseArray(ticket.files_to_read)).map(f => `- \`${f}\``).join('\n') || '- Related files for context'}

### Out of Scope
${(safeParseArray(ticket.out_of_scope)).map(o => `- ${o}`).join('\n') || '- Do NOT modify unrelated files\n- Do NOT add features beyond scope'}

---

## Fix Required

${(safeParseArray(ticket.fix_required)).map((f, i) => `${i + 1}. ${f}`).join('\n') || '1. Implement the required changes\n2. Add appropriate tests\n3. Update documentation if needed'}

---

## Acceptance Criteria

${(safeParseArray(ticket.acceptance_criteria)).map(ac => `- [ ] ${ac}`).join('\n') || '- [ ] Feature works as described\n- [ ] No regressions introduced'}

---

## Risks to Avoid

${(safeParseArray(ticket.risks)).map(r => `- ${r}`).join('\n') || '- Follow existing patterns\n- Test edge cases'}

---

## Dev Checks

${(safeParseArray(ticket.dev_checks)).map(c => `- [ ] ${c}`).join('\n') || '- [ ] pnpm typecheck passes\n- [ ] pnpm build passes\n- [ ] pnpm test passes'}

---

## Session Management

\`\`\`bash
# Start session
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --ticket ${ticket.id} --type dev)

# On completion
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID
./scripts/agent-cli.sh update-ticket ${ticket.id} --status dev_complete
\`\`\`
`;
}

function writePromptFile(ticketId, content, iteration = 1) {
  const filename = `dev-agent-${ticketId}-v${iteration}.md`;
  const filepath = path.join(PROMPTS_DIR, filename);
  
  // Ensure directory exists
  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filepath, content);
  console.log(`Prompt file written: ${filepath}`);
  return filepath;
}

// =============================================================================
// Commands
// =============================================================================

const commands = {
  /**
   * Create a new ticket with prompt file
   */
  async create(args) {
    const title = getArg(args, '--title', '-t');
    const priority = getArg(args, '--priority', '-p') || 'medium';
    const feature = getArg(args, '--feature', '-f');
    const issue = getArg(args, '--issue', '-i');
    const filesToModify = getArg(args, '--files');
    
    if (!title) {
      throw new Error('--title is required');
    }
    
    const ticketId = generateTicketId();
    
    // Create ticket in DB
    const ticket = await request('POST', '/api/v2/tickets', {
      id: ticketId,
      title,
      priority,
      feature,
      issue,
      status: 'ready',
      files_to_modify: filesToModify ? JSON.parse(filesToModify) : [],
      iteration: 1,
    });
    
    // Generate prompt file
    const promptContent = generateNewTicketPrompt(ticket, null, { decision_summary: 'New ticket created' });
    const promptFile = writePromptFile(ticketId, promptContent, 1);
    
    console.log(`\nTicket created: ${ticketId}`);
    console.log(`Prompt file: ${promptFile}`);
    console.log(`Status: ready`);
    
    return { ticket, promptFile };
  },
  
  /**
   * Create continuation ticket from a blocker
   */
  async continue(args) {
    const sessionId = getArg(args, '--from-blocker', '--session', '-s');
    const ticketId = getArg(args, '--ticket', '-t');
    
    if (!sessionId && !ticketId) {
      throw new Error('--from-blocker (session ID) or --ticket is required');
    }
    
    // Get the blocked session
    let session = null;
    let originalTicketId = ticketId;
    
    if (sessionId) {
      session = await request('GET', `/api/v2/agents/${sessionId}`);
      if (!session) throw new Error(`Session ${sessionId} not found`);
      originalTicketId = session.ticket_id;
    }
    
    // Get original ticket
    const ticketResponse = await request('GET', `/api/v2/tickets/${originalTicketId}`);
    const originalTicket = ticketResponse?.ticket || ticketResponse;
    if (!originalTicket || !originalTicket.id) throw new Error(`Ticket ${originalTicketId} not found`);
    
    // Determine iteration
    const currentIteration = originalTicket.iteration || 1;
    const newIteration = currentIteration + 1;
    const newTicketId = `${originalTicketId.replace(/-v\d+$/, '')}-v${newIteration}`;
    
    // Build blocker info
    const blocker = {
      blocker_type: session?.blocker_type || 'failure',
      summary: session?.blocker_summary || 'Previous attempt failed',
      recommendation: 'Fix the issues and try again',
      failures: [],
    };
    
    // Create continuation ticket in DB
    const continuationData = {
      id: newTicketId,
      title: `${originalTicket.title} (Retry ${newIteration})`,
      priority: originalTicket.priority,
      feature: originalTicket.feature,
      difficulty: originalTicket.difficulty,
      status: 'ready',
      source: `Continuation of ${originalTicketId}`,
      issue: originalTicket.issue,
      feature_docs: originalTicket.feature_docs,
      similar_code: originalTicket.similar_code,
      files_to_modify: originalTicket.files_to_modify,
      files_to_read: originalTicket.files_to_read,
      out_of_scope: originalTicket.out_of_scope,
      fix_required: originalTicket.fix_required,
      acceptance_criteria: originalTicket.acceptance_criteria,
      risks: originalTicket.risks,
      dev_checks: originalTicket.dev_checks,
      qa_notes: originalTicket.qa_notes,
      parent_ticket_id: originalTicketId,
      iteration: newIteration,
      branch: originalTicket.branch,
    };
    
    const continuationResponse = await request('POST', '/api/v2/tickets', continuationData);
    const continuation = continuationResponse?.ticket || continuationResponse || continuationData;
    
    // Ensure continuation has id for prompt generation
    if (!continuation.id) continuation.id = newTicketId;
    
    // Generate prompt file
    const promptContent = generateContinuationPrompt(continuation, blocker, []);
    const promptFile = writePromptFile(newTicketId, promptContent, newIteration);
    
    console.log(`\nContinuation ticket created: ${newTicketId}`);
    console.log(`Prompt file: ${promptFile}`);
    console.log(`Original: ${originalTicketId}`);
    console.log(`Iteration: ${newIteration}`);
    console.log(`Status: ready`);
    
    return { ticket: continuation, promptFile };
  },
  
  /**
   * Create ticket from a decision thread
   */
  async 'from-decision'(args) {
    const threadId = getArg(args, '--thread-id', '--thread', '-t');
    
    if (!threadId) {
      throw new Error('--thread-id is required');
    }
    
    // Get the decision thread
    const thread = await request('GET', `/api/v2/decisions/${threadId}`);
    if (!thread) throw new Error(`Thread ${threadId} not found`);
    
    if (thread.status !== 'resolved') {
      throw new Error(`Thread ${threadId} is not resolved yet`);
    }
    
    // Get the related finding
    let finding = null;
    if (thread.finding_id) {
      finding = await request('GET', `/api/v2/findings/${thread.finding_id}`);
    }
    
    const ticketId = generateTicketId();
    
    // Create ticket from finding + decision
    const ticket = await request('POST', '/api/v2/tickets', {
      id: ticketId,
      title: finding?.title || thread.decision_summary || 'New ticket',
      priority: finding?.severity === 'critical' ? 'critical' : 
                finding?.severity === 'high' ? 'high' : 'medium',
      feature: finding?.feature,
      status: 'ready',
      source: `Finding ${finding?.id || 'unknown'}`,
      issue: `**Decision:** ${thread.decision_summary}\n\n${finding?.issue || ''}`,
      iteration: 1,
    });
    
    // Generate prompt file
    const promptContent = generateNewTicketPrompt(ticket, finding, thread);
    const promptFile = writePromptFile(ticketId, promptContent, 1);
    
    // Link finding to ticket
    if (finding) {
      await request('PUT', `/api/v2/findings/${finding.id}`, {
        status: 'ticketed',
        ticket_id: ticketId,
      });
    }
    
    console.log(`\nTicket created from decision: ${ticketId}`);
    console.log(`Prompt file: ${promptFile}`);
    console.log(`Finding: ${finding?.id || 'none'}`);
    console.log(`Decision: ${thread.decision_summary}`);
    console.log(`Status: ready`);
    
    return { ticket, promptFile };
  },
  
  /**
   * Generate prompt file for existing ticket
   */
  async 'generate-prompt'(args) {
    const ticketId = args[0] || getArg(args, '--ticket', '-t');
    
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }
    
    const ticket = await request('GET', `/api/v2/tickets/${ticketId}`);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
    
    const iteration = ticket.iteration || 1;
    const promptContent = generateNewTicketPrompt(ticket, null, { 
      decision_summary: ticket.source || 'Ticket regenerated' 
    });
    const promptFile = writePromptFile(ticketId, promptContent, iteration);
    
    console.log(`Prompt file generated: ${promptFile}`);
    return { promptFile };
  },
  
  help() {
    console.log(`
Ticket Agent CLI - Create tickets with prompt files

USAGE:
  ticket-agent-cli.js <command> [options]

COMMANDS:
  create              Create a new ticket with prompt file
    --title, -t       Ticket title (required)
    --priority, -p    Priority: critical, high, medium, low
    --feature, -f     Feature area
    --issue, -i       Issue description
    --files           JSON array of files to modify
  
  continue            Create continuation ticket from blocker
    --from-blocker    Session ID of blocked agent
    --ticket, -t      Or specify ticket ID directly
  
  from-decision       Create ticket from resolved decision thread
    --thread-id, -t   Thread ID (required)
  
  generate-prompt     Generate prompt file for existing ticket
    <ticket_id>       Ticket ID

EXAMPLES:
  # Create new ticket
  ticket-agent-cli.js create --title "Add error handling" --priority high
  
  # Create continuation from blocked session
  ticket-agent-cli.js continue --from-blocker abc123
  
  # Create from decision thread
  ticket-agent-cli.js from-decision --thread-id thread-456
  
  # Regenerate prompt for existing ticket
  ticket-agent-cli.js generate-prompt TKT-001
`);
  },
};

// =============================================================================
// Argument Parsing
// =============================================================================

function getArg(args, ...names) {
  for (const name of names) {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
  }
  return null;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    commands.help();
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for usage');
    process.exit(1);
  }
  
  try {
    await commands[command](commandArgs);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

