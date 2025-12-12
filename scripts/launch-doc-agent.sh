#!/bin/bash
# =============================================================================
# Launch Doc Agent
# =============================================================================
# Launches a Claude Code agent to update documentation for a ticket's changes.
#
# Usage: 
#   ./scripts/launch-doc-agent.sh TKT-001
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TICKET_ID="$1"

if [ -z "$TICKET_ID" ]; then
    echo -e "${RED}Usage: $0 TKT-XXX${NC}"
    exit 1
fi

TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
SESSION_NAME="doc-$TICKET_UPPER"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Launching Doc Agent: $TICKET_UPPER${NC}"
echo -e "${CYAN}============================================${NC}"

# Find the ticket's branch
BRANCH=$(git branch -r | grep -iE "agent/tkt-${TICKET_LOWER#tkt-}|agent/${TICKET_LOWER}" | head -1 | tr -d ' ')

if [ -z "$BRANCH" ]; then
    echo -e "${RED}✗ No branch found for $TICKET_UPPER${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found branch: $BRANCH${NC}"

# Get the modified files
MERGE_BASE=$(git merge-base main "$BRANCH" 2>/dev/null)
MODIFIED_FILES=$(git diff --name-only "$MERGE_BASE" "$BRANCH" 2>/dev/null | grep -E "^apps/|^packages/" | grep -v "\.test\." | grep -v "tsconfig")

if [ -z "$MODIFIED_FILES" ]; then
    echo -e "${YELLOW}⚠ No app files modified for $TICKET_UPPER - checking for doc updates${NC}"
fi

# Get ticket info from database
TICKET_TITLE=$(sqlite3 "$MAIN_REPO_DIR/data/workflow.db" "SELECT title FROM tickets WHERE UPPER(id) = '$TICKET_UPPER';" 2>/dev/null || echo "$TICKET_UPPER")
TICKET_ISSUE=$(sqlite3 "$MAIN_REPO_DIR/data/workflow.db" "SELECT issue FROM tickets WHERE UPPER(id) = '$TICKET_UPPER';" 2>/dev/null || echo "")

# Create the prompt
PROMPT="You are a DOC Agent. Your job is to ensure documentation is updated for ticket $TICKET_UPPER.

## Ticket
**ID:** $TICKET_UPPER
**Title:** $TICKET_TITLE
**Branch:** $BRANCH
**Issue:** $TICKET_ISSUE

## Files Modified by This Ticket
$(echo "$MODIFIED_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done)

## Your Task

1. **Read the SOP:** \`docs/workflow/DOC_AGENT_SOP.md\`
2. **Read the modified files** to understand what changed
3. **Find related documentation** in \`docs/features/\`
4. **Update docs** if the behavior changed or new features were added
5. **Commit:** Add doc updates with message: \`docs($TICKET_LOWER): Update documentation for $TICKET_UPPER\`

## Documentation Requirements

- Update any feature docs affected by code changes
- Add new sections if new functionality was added
- Update edge cases if error handling changed
- Keep docs accurate to current behavior

## When Done

Write completion to: \`docs/agent-output/doc-tracker/$TICKET_UPPER-$(date +%Y%m%dT%H%M).md\`

Include:
- Status: COMPLETE
- Docs updated (list files)
- Summary of changes

Then signal completion:
\`\`\`bash
curl -X POST http://localhost:3456/api/v2/agents/doc-$TICKET_UPPER/complete \\
  -H 'Content-Type: application/json' \\
  -d '{\"success\": true, \"completion_file\": \"docs/agent-output/doc-tracker/$TICKET_UPPER-TIMESTAMP.md\"}'
\`\`\`
"

# Write prompt to file
PROMPT_FILE="$MAIN_REPO_DIR/.agent-logs/doc-$TICKET_UPPER-prompt.txt"
mkdir -p "$MAIN_REPO_DIR/.agent-logs"
echo "$PROMPT" > "$PROMPT_FILE"

echo -e "${GREEN}✓ Created prompt: $PROMPT_FILE${NC}"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Session $SESSION_NAME already exists${NC}"
    echo -e "Attach with: tmux attach -t $SESSION_NAME"
    exit 0
fi

# Launch Claude in tmux
echo -e "${BLUE}Launching Claude Code in tmux session: $SESSION_NAME${NC}"

tmux new-session -d -s "$SESSION_NAME" -c "$MAIN_REPO_DIR" \
    "echo '=== Doc Agent: $TICKET_UPPER ===' && \
     echo 'Started: \$(date)' && \
     echo '' && \
     claude --print '$PROMPT' 2>&1 | tee $MAIN_REPO_DIR/.agent-logs/doc-$TICKET_UPPER-\$(date +%Y%m%dT%H%M%S).log; \
     echo ''; echo 'Agent finished. Press Enter to close.'; read"

echo -e "${GREEN}✓ Doc Agent launched: $SESSION_NAME${NC}"
echo -e "  Attach: ${BLUE}tmux attach -t $SESSION_NAME${NC}"
