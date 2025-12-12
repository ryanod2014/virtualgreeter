#!/bin/bash
# =============================================================================
# Launch Test Lock Agent
# =============================================================================
# Launches a Claude Code agent to add test coverage for a ticket's changes.
# The agent reads the modified files and adds behavior-level tests.
#
# Usage: 
#   ./scripts/launch-test-agent.sh TKT-001
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
SESSION_NAME="test-$TICKET_UPPER"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Launching Test Lock Agent: $TICKET_UPPER${NC}"
echo -e "${CYAN}============================================${NC}"

# Find the ticket's branch
BRANCH=$(git branch -r | grep -iE "agent/tkt-${TICKET_LOWER#tkt-}|agent/${TICKET_LOWER}" | head -1 | tr -d ' ')

if [ -z "$BRANCH" ]; then
    echo -e "${RED}✗ No branch found for $TICKET_UPPER${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found branch: $BRANCH${NC}"

# Get the modified files (app code only)
MERGE_BASE=$(git merge-base main "$BRANCH" 2>/dev/null)
MODIFIED_FILES=$(git diff --name-only "$MERGE_BASE" "$BRANCH" 2>/dev/null | grep -E "^apps/|^packages/" | grep -v "\.test\." | grep -v "tsconfig" | grep -v "\.d\.ts")

if [ -z "$MODIFIED_FILES" ]; then
    echo -e "${YELLOW}⚠ No app files to test for $TICKET_UPPER${NC}"
    exit 0
fi

echo -e "${BLUE}Files to add tests for:${NC}"
echo "$MODIFIED_FILES" | while read f; do echo "  - $f"; done

# Get ticket info from database
TICKET_TITLE=$(sqlite3 "$MAIN_REPO_DIR/data/workflow.db" "SELECT title FROM tickets WHERE UPPER(id) = '$TICKET_UPPER';" 2>/dev/null || echo "$TICKET_UPPER")

# Create the prompt
PROMPT="You are a TEST LOCK Agent. Your job is to add behavior-level test coverage for ticket $TICKET_UPPER.

## Ticket
**ID:** $TICKET_UPPER
**Title:** $TICKET_TITLE
**Branch:** $BRANCH

## Files Modified by This Ticket
$(echo "$MODIFIED_FILES" | while read f; do echo "- \`$f\`"; done)

## Your Task

1. **Read the SOP:** \`docs/workflow/TEST_LOCK_AGENT_SOP.md\`
2. **Read each modified file** listed above
3. **Read existing test patterns:** Look at \`*.test.ts\` files near the modified files
4. **Write tests** for each file's public functions/exports
5. **Run tests:** \`pnpm test\` - all must pass
6. **Commit:** Add your test files with message: \`test($TICKET_LOWER): Add test coverage for $TICKET_UPPER\`

## Test Requirements

- One behavior per \`it()\` block
- Test happy path, edge cases, and error conditions
- Use existing mock patterns from the codebase
- Tests must PASS (you're testing current behavior)
- Put test files next to source files (e.g., \`foo.ts\` → \`foo.test.ts\`)

## When Done

Write completion to: \`docs/agent-output/test-lock/$TICKET_UPPER-$(date +%Y%m%dT%H%M).md\`

Then update ticket status:
\`\`\`bash
curl -X POST http://localhost:3456/api/v2/agents/test-$TICKET_UPPER/complete \\
  -H 'Content-Type: application/json' \\
  -d '{\"success\": true, \"completion_file\": \"docs/agent-output/test-lock/$TICKET_UPPER-TIMESTAMP.md\"}'
\`\`\`
"

# Write prompt to file
PROMPT_FILE="$MAIN_REPO_DIR/.agent-logs/test-$TICKET_UPPER-prompt.txt"
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
    "echo '=== Test Lock Agent: $TICKET_UPPER ===' && \
     echo 'Started: \$(date)' && \
     echo '' && \
     claude --print '$PROMPT' 2>&1 | tee $MAIN_REPO_DIR/.agent-logs/test-$TICKET_UPPER-\$(date +%Y%m%dT%H%M%S).log; \
     echo ''; echo 'Agent finished. Press Enter to close.'; read"

echo -e "${GREEN}✓ Test Agent launched: $SESSION_NAME${NC}"
echo -e "  Attach: ${BLUE}tmux attach -t $SESSION_NAME${NC}"
