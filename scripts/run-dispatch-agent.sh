#!/bin/bash
# Run Dispatch Agent to process blockers and create continuation tickets
# Usage: ./scripts/run-dispatch-agent.sh

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "╔════════════════════════════════════════════════════════╗"
echo "║            DISPATCH AGENT LAUNCHER                     ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║  Processing blockers → Creating continuation tickets   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Count blockers
BLOCKER_COUNT=$(ls -1 docs/agent-output/blocked/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Found $BLOCKER_COUNT blocker files to process"
echo ""

# Show breakdown
echo "Breakdown by type:"
QA_COUNT=$(ls -1 docs/agent-output/blocked/QA-*.json 2>/dev/null | wc -l | tr -d ' ')
CI_COUNT=$(ls -1 docs/agent-output/blocked/CI-*.json 2>/dev/null | wc -l | tr -d ' ')
BLOCKED_COUNT=$(ls -1 docs/agent-output/blocked/BLOCKED-*.json 2>/dev/null | wc -l | tr -d ' ')
echo "  ⚡ QA Failures (auto-handle):    $QA_COUNT"
echo "  ⚡ CI Failures (auto-handle):    $CI_COUNT"
echo "  ⏸️  Clarifications (need human): $BLOCKED_COUNT"
echo ""

# Ensure archive folder exists
mkdir -p docs/agent-output/archive

# Create tmux session for dispatch agent
SESSION="dispatch-agent"

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true

echo "🚀 Launching Dispatch Agent in tmux session: $SESSION"
echo ""

# Create the dispatch prompt in a temp file to avoid quoting issues
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" << 'PROMPT_EOF'
You are a Dispatch Agent.

IMPORTANT: Read docs/workflow/DISPATCH_AGENT_SOP.md FIRST, then execute Task 1 (Process Blockers).

Your job RIGHT NOW:
1. Read each blocker file in docs/agent-output/blocked/
2. CHECK the blocker_type field INSIDE the JSON before deciding action:

   AUTO-HANDLE (create continuation ticket):
   - blocker_type: qa_failure -> Create rework ticket for dev agent
   - blocker_type: missing_tooling -> Create tooling ticket + add to requeue.json (SELF-HEALING LOOP)
   - blocker_type: ci_failure -> Create fix ticket for dev agent
   - blocker_type: external_setup_incomplete WITH recommendation mentioning "credentials stored" or "account exists" -> Create setup script ticket
   
   ROUTE TO INBOX (human required):
   - blocker_type: external_setup_incomplete WITHOUT existing credentials -> Human must create account first
   - blocker_type: clarification -> Human must answer question
   - blocker_type: environment -> Human must fix environment issue
   - dispatch_action: route_to_inbox -> Always route to inbox

3. For AUTO-HANDLE blockers:
   - Create a continuation ticket in docs/prompts/active/dev-agent-{TICKET}-v{N}.md
   - For missing_tooling: Create docs/prompts/active/dev-agent-TOOL-{N}.md AND add to docs/data/requeue.json
   - Include clear instructions for what needs to be fixed
   - Archive the blocker to docs/agent-output/archive/

4. For INBOX blockers:
   - Add entry to docs/data/decisions.json with status: awaiting_human
   - Include human_actions_required from the blocker

5. Check docs/data/requeue.json for any tickets waiting on tooling that's now merged
   - If tooling is available, re-queue the original ticket for QA

After processing, write a report to docs/agent-output/dispatch-report-TIMESTAMP.md

START NOW - read the blocked folder and process each blocker!
PROMPT_EOF

# Launch in tmux with full permissions
tmux new-session -d -s "$SESSION" "cd '$PROJECT_ROOT' && claude --dangerously-skip-permissions \"\$(cat $PROMPT_FILE)\""

echo "✅ Dispatch Agent launched!"
echo ""
echo "To view progress:"
echo "  tmux attach -t $SESSION"
echo ""
echo "To check results:"
echo "  ls docs/agent-output/archive/   # Processed blockers"
echo "  ls docs/prompts/active/         # New continuation tickets"
echo ""
