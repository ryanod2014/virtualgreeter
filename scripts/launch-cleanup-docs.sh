#!/bin/bash
# =============================================================================
# Launch Doc Agent for Cleanup (Already-Merged Tickets)
# =============================================================================
# Runs Doc Agent on main branch to add documentation for tickets that
# were merged before the new pipeline existed.
#
# Usage: ./scripts/launch-cleanup-docs.sh TKT-001 [files_json]
# =============================================================================

set -e

TICKET_ID="$1"
FILES_JSON="$2"

if [ -z "$TICKET_ID" ]; then
    echo "Usage: $0 TICKET_ID [files_json]"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="cleanup-doc-$TICKET_ID"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${BLUE}Session '$SESSION_NAME' already exists${NC}"
    exit 0
fi

# Parse files to document (from JSON array or use default)
if [ -n "$FILES_JSON" ]; then
    FILES_LIST=$(echo "$FILES_JSON" | python3 -c "import sys,json; print('\n'.join(json.load(sys.stdin)))" 2>/dev/null || echo "")
else
    FILES_LIST=""
fi

# Build the prompt
CLAUDE_PROMPT="You are a Doc Agent running CLEANUP for ticket: $TICKET_ID

This ticket was already merged to main. Your job is to ensure proper documentation exists for the changes it introduced.

## Your Task

1. Read docs/workflow/DOC_AGENT_SOP.md for documentation patterns
2. Find the commit(s) for $TICKET_ID: git log --oneline --grep='$TICKET_ID' -i
3. See what files were changed: git show --name-only <commit-hash>
4. Ensure docs/features/ has documentation covering these changes
5. Add JSDoc comments to any undocumented functions

## Files Modified by This Ticket
${FILES_LIST:-"(Run git log to find the files)"}

## Important
- You are on the MAIN branch - do NOT create a new branch
- Commit your documentation additions directly to main
- Push when done: git push origin main

## When Complete
Create: docs/agent-output/cleanup/DOCS-COMPLETE-$TICKET_ID-\$(date +%Y%m%dT%H%M%S).json

{
  \"ticket_id\": \"$TICKET_ID\",
  \"type\": \"docs\",
  \"status\": \"complete\",
  \"docs_updated\": [\"list of doc files created/modified\"],
  \"completed_at\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}

Then exit."

echo -e "${GREEN}Launching Doc Agent for $TICKET_ID cleanup...${NC}"

cd "$MAIN_REPO_DIR"
git checkout main
git pull origin main

tmux new-session -d -s "$SESSION_NAME" \
    "cd '$MAIN_REPO_DIR' && export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY' && claude --dangerously-skip-permissions -p '$CLAUDE_PROMPT'"

echo -e "${GREEN}✓ Launched: $SESSION_NAME${NC}"
echo -e "  Attach: ${BLUE}tmux attach -t $SESSION_NAME${NC}"

