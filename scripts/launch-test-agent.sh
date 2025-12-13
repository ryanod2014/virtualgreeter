#!/bin/bash
# =============================================================================
# Launch Test Lock Agent
# =============================================================================
# Launches a Claude Code agent to add test coverage for a ticket's changes.
# Runs on the SAME BRANCH as the dev work (not main).
#
# Usage: 
#   ./scripts/launch-test-agent.sh TKT-001
#   ./scripts/launch-test-agent.sh TKT-001 --branch agent/tkt-001-feature
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
WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"

# Parse arguments
TICKET_ID=""
BRANCH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        *)
            if [ -z "$TICKET_ID" ]; then
                TICKET_ID="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$TICKET_ID" ]; then
    echo -e "${RED}Usage: $0 TKT-XXX [--branch BRANCH_NAME]${NC}"
    exit 1
fi

TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
SESSION_NAME="test-$TICKET_UPPER"
WORKTREE_DIR="$WORKTREE_BASE/test-$TICKET_UPPER"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Launching Test Lock Agent: $TICKET_UPPER${NC}"
echo -e "${CYAN}============================================${NC}"

# Find the ticket's branch if not specified
if [ -z "$BRANCH" ]; then
    cd "$MAIN_REPO_DIR"
    git fetch origin --quiet 2>/dev/null || true
    BRANCH=$(git branch -r | grep -iE "agent/tkt-${TICKET_LOWER#tkt-}|agent/${TICKET_LOWER}" | head -1 | tr -d ' ' | sed 's|origin/||')
fi

if [ -z "$BRANCH" ]; then
    echo -e "${RED}✗ No branch found for $TICKET_UPPER${NC}"
    echo "Specify with: $0 $TICKET_ID --branch agent/tkt-xxx"
    exit 1
fi

echo -e "${GREEN}✓ Branch: $BRANCH${NC}"

# Check if tmux session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Session $SESSION_NAME already exists${NC}"
    echo -e "Attach with: tmux attach -t $SESSION_NAME"
    exit 0
fi

# Set up worktree on the branch
echo "Setting up worktree..."
mkdir -p "$WORKTREE_BASE"

cd "$MAIN_REPO_DIR"
git fetch origin --quiet

if [ -d "$WORKTREE_DIR" ]; then
    echo -e "${YELLOW}⚠ Worktree exists, updating...${NC}"
    cd "$WORKTREE_DIR"
    git fetch origin --quiet
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    # Create worktree tracking the remote branch properly
    git worktree add -B "$BRANCH" "$WORKTREE_DIR" "origin/$BRANCH"
fi

cd "$WORKTREE_DIR"
echo -e "${GREEN}✓ Worktree ready: $WORKTREE_DIR${NC}"

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile --quiet 2>/dev/null || pnpm install --quiet

# Get the modified files (app code only, no tests)
# Compare origin/main with origin/BRANCH to get actual changed files (not local HEAD)
MERGE_BASE=$(git merge-base origin/main "origin/$BRANCH" 2>/dev/null || git merge-base main HEAD)
MODIFIED_FILES=$(git diff --name-only "$MERGE_BASE" "origin/$BRANCH" 2>/dev/null | grep -E "^apps/|^packages/" | grep -v "\.test\." | grep -v "tsconfig" | grep -v "\.d\.ts" || echo "")

if [ -z "$MODIFIED_FILES" ]; then
    echo -e "${YELLOW}⚠ No app files to test for $TICKET_UPPER${NC}"
    # Still register and complete the session
    curl -s -X POST "$DASHBOARD_URL/api/v2/agents/start" \
        -H "Content-Type: application/json" \
        -d "{\"ticket_id\": \"$TICKET_UPPER\", \"agent_type\": \"test_lock\", \"tmux_session\": \"$SESSION_NAME\"}" 2>/dev/null
    # Immediately complete
    echo -e "${GREEN}✓ No files to test - marking complete${NC}"
    exit 0
fi

echo -e "${BLUE}Files to add tests for:${NC}"
echo "$MODIFIED_FILES" | while read f; do [ -n "$f" ] && echo "  - $f"; done

# Get ticket info from database
TICKET_TITLE=$(curl -s --max-time 5 "$DASHBOARD_URL/api/v2/tickets/$TICKET_UPPER" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','$TICKET_UPPER'))" 2>/dev/null || echo "$TICKET_UPPER")

# Register session in database
echo "Registering session..."
DB_SESSION_ID=""
REGISTER_RESULT=$(curl -s --max-time 10 -X POST "$DASHBOARD_URL/api/v2/agents/start" \
    -H "Content-Type: application/json" \
    -d "{\"ticket_id\": \"$TICKET_UPPER\", \"agent_type\": \"test_lock\", \"tmux_session\": \"$SESSION_NAME\", \"worktree_path\": \"$WORKTREE_DIR\"}" 2>/dev/null)

if echo "$REGISTER_RESULT" | grep -q '"id"'; then
    DB_SESSION_ID=$(echo "$REGISTER_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    echo -e "${GREEN}✓ Registered session: $DB_SESSION_ID${NC}"
else
    echo -e "${YELLOW}⚠ Could not register session (server may be down)${NC}"
    DB_SESSION_ID="test-$TICKET_UPPER-$(date +%s)"
fi

# Create the prompt file
PROMPT_FILE="$WORKTREE_DIR/.agent-prompt-test.md"
cat > "$PROMPT_FILE" << EOF
# EXECUTE IMMEDIATELY: Add Test Coverage for $TICKET_UPPER

**DO NOT ASK QUESTIONS. EXECUTE THESE STEPS IN ORDER.**

---

## Context

- **Ticket:** $TICKET_UPPER - "$TICKET_TITLE"
- **Branch:** \`$BRANCH\` (commit here, not main)
- **Session ID:** \`$DB_SESSION_ID\`

---

## Files to Add Tests For

$(echo "$MODIFIED_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done)

---

## STEP 1: Analyze Each File

For each file above, read it and identify:
- All exported functions/components
- Happy paths, edge cases, error conditions
- What behaviors need to be locked in

---

## STEP 2: Check Existing Test Patterns

\`\`\`bash
# Find existing tests near the files
find apps/dashboard/src -name "*.test.ts" -o -name "*.test.tsx" | head -5
cat apps/server/src/features/routing/pool-manager.test.ts | head -100
\`\`\`

---

## STEP 3: Write Tests

Create test files next to source files (e.g., \`foo.ts\` → \`foo.test.ts\`).

**For each file's public functions:**
- One \`it()\` block per behavior
- Test happy path, edge cases, error conditions
- Use \`vi.mock()\` for dependencies
- For UI components: add \`/** @vitest-environment jsdom */\` at top

**Test structure:**
\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/lib/dependency", () => ({ fn: vi.fn() }));

import { functionUnderTest } from "./file";

describe("functionName", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  
  it("returns X when given Y", () => {
    // Arrange
    // Act  
    // Assert
  });
  
  it("throws error when input is empty", () => {
    // ...
  });
});
\`\`\`

---

## STEP 4: Verify Tests Pass

\`\`\`bash
pnpm test
\`\`\`

All tests MUST pass. If a test fails, fix the test (you test CURRENT behavior).

---

## STEP 5: Commit and Push

\`\`\`bash
git add .
git commit -m "test($TICKET_LOWER): Add test coverage for $TICKET_UPPER"
git push origin $BRANCH
\`\`\`

---

## STEP 6: Signal Completion

\`\`\`bash
curl -X POST $DASHBOARD_URL/api/v2/agents/$DB_SESSION_ID/complete \\
  -H "Content-Type: application/json" \\
  -d '{"success": true}'
\`\`\`

Print:
\`\`\`
✅ Test Agent Complete
- Created: [list test files]
- Tests: [count] passing
\`\`\`
EOF

echo -e "${GREEN}✓ Created prompt: $PROMPT_FILE${NC}"

# Create log directory
mkdir -p "$MAIN_REPO_DIR/.agent-logs"
LOG_FILE="$MAIN_REPO_DIR/.agent-logs/test-$TICKET_UPPER-$(date +%Y%m%dT%H%M%S).log"

# Launch Claude in tmux with actual prompt execution
echo -e "${BLUE}Launching Claude Code in tmux session: $SESSION_NAME${NC}"

tmux new-session -d -s "$SESSION_NAME" -c "$WORKTREE_DIR" \
    "echo '=== Test Lock Agent: $TICKET_UPPER ===' && \
     echo 'Session ID: $DB_SESSION_ID' && \
     echo 'Branch: $BRANCH' && \
     echo 'Worktree: $WORKTREE_DIR' && \
     echo 'Started: \$(date)' && \
     echo '' && \
     claude --model claude-opus-4-20250514 -p '$PROMPT_FILE' --dangerously-skip-permissions 2>&1 | tee '$LOG_FILE'; \
     echo ''; \
     echo 'Signaling completion...'; \
     curl -s -X POST '$DASHBOARD_URL/api/v2/agents/$DB_SESSION_ID/complete' \
       -H 'Content-Type: application/json' \
       -d '{\"success\": true}' || echo 'Could not signal completion'; \
     echo ''; \
     echo 'Agent finished. Press Enter to close.'; \
     read"

echo -e "${GREEN}✓ Test Agent launched: $SESSION_NAME${NC}"
echo -e "  Worktree: ${BLUE}$WORKTREE_DIR${NC}"
echo -e "  Session:  ${BLUE}$DB_SESSION_ID${NC}"
echo -e "  Attach:   ${BLUE}tmux attach -t $SESSION_NAME${NC}"
