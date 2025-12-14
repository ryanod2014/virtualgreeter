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
# Use SAME worktree as dev/QA agents (test writes .test.ts files, no conflict with dev code)
WORKTREE_DIR="$WORKTREE_BASE/$TICKET_UPPER"

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

# Install dependencies (skip if node_modules exists from dev/QA)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile --quiet 2>/dev/null || pnpm install --quiet
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Get the modified files (app code only, no tests or docs)
# Compare origin/main with origin/BRANCH to get actual changed files (not local HEAD)
MERGE_BASE=$(git merge-base origin/main "origin/$BRANCH" 2>/dev/null || git merge-base main HEAD)
MODIFIED_FILES=$(git diff --name-only "$MERGE_BASE" "origin/$BRANCH" 2>/dev/null | \
    grep -E "^apps/|^packages/" | \
    grep -E "\.(ts|tsx|js|jsx)$" | \
    grep -v "\.test\." | \
    grep -v "\.spec\." | \
    grep -v "tsconfig" | \
    grep -v "\.d\.ts" | \
    grep -v "/docs/" | \
    grep -v "__mocks__" || echo "")

if [ -z "$MODIFIED_FILES" ]; then
    echo -e "${YELLOW}⚠ No app files to test for $TICKET_UPPER${NC}"
    # Register session and immediately mark it complete
    REGISTER_RESULT=$(curl -s -X POST "$DASHBOARD_URL/api/v2/agents/start" \
        -H "Content-Type: application/json" \
        -d "{\"ticket_id\": \"$TICKET_UPPER\", \"agent_type\": \"test_lock\", \"tmux_session\": \"$SESSION_NAME\"}" 2>/dev/null)
    
    # Extract session ID and mark complete so pipeline can continue
    SESSION_ID=$(echo "$REGISTER_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$SESSION_ID" ]; then
        curl -s -X POST "$DASHBOARD_URL/api/v2/agents/$SESSION_ID/complete" \
            -H "Content-Type: application/json" \
            -d '{"completion_file": null}' 2>/dev/null
        echo -e "${GREEN}✓ No files to test - session marked complete${NC}"
    fi
    exit 0
fi

echo -e "${BLUE}Files to add tests for:${NC}"
echo "$MODIFIED_FILES" | while read f; do [ -n "$f" ] && echo "  - $f"; done

# =============================================================================
# GATHER RICH CONTEXT FOR WORLD-CLASS BEHAVIORAL TESTS
# =============================================================================

echo -e "${BLUE}Gathering ticket context...${NC}"

# Get full ticket info from database
TICKET_JSON=$(curl -s --max-time 5 "$DASHBOARD_URL/api/v2/tickets/$TICKET_UPPER" 2>/dev/null || echo "{}")
TICKET_TITLE=$(echo "$TICKET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','$TICKET_UPPER'))" 2>/dev/null || echo "$TICKET_UPPER")
TICKET_DESCRIPTION=$(echo "$TICKET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
ACCEPTANCE_CRITERIA=$(echo "$TICKET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('acceptance_criteria',''))" 2>/dev/null || echo "")

# Get dev agent completion report if it exists
DEV_COMPLETION_FILE=""
DEV_COMPLETION_SUMMARY=""
if [ -f "$WORKTREE_DIR/docs/agent-output/completions/$TICKET_UPPER.md" ]; then
    DEV_COMPLETION_FILE="$WORKTREE_DIR/docs/agent-output/completions/$TICKET_UPPER.md"
elif [ -f "$MAIN_REPO_DIR/docs/agent-output/completions/$TICKET_UPPER.md" ]; then
    DEV_COMPLETION_FILE="$MAIN_REPO_DIR/docs/agent-output/completions/$TICKET_UPPER.md"
fi

if [ -n "$DEV_COMPLETION_FILE" ] && [ -f "$DEV_COMPLETION_FILE" ]; then
    echo -e "${GREEN}✓ Found dev agent completion report${NC}"
    # Extract key sections from completion report
    DEV_COMPLETION_SUMMARY=$(cat "$DEV_COMPLETION_FILE" | head -100)
fi

# Generate git diff summary (what actually changed)
echo -e "${BLUE}Analyzing code changes...${NC}"
GIT_DIFF_STAT=$(git diff --stat "$MERGE_BASE" "origin/$BRANCH" -- $MODIFIED_FILES 2>/dev/null | tail -20)

# Extract function/component signatures from changed files
echo -e "${BLUE}Extracting function signatures...${NC}"
FUNCTION_SIGNATURES=""
for file in $MODIFIED_FILES; do
    if [ -f "$WORKTREE_DIR/$file" ]; then
        # Extract exported functions, components, and key signatures
        FILE_SIGS=$(grep -E "^export (const|function|class|interface|type|async function)" "$WORKTREE_DIR/$file" 2>/dev/null | head -10 || echo "")
        if [ -n "$FILE_SIGS" ]; then
            FUNCTION_SIGNATURES="$FUNCTION_SIGNATURES
### \`$file\`
\`\`\`typescript
$FILE_SIGS
\`\`\`
"
        fi
    fi
done

# Get the actual diff content (limited to avoid huge prompts)
echo -e "${BLUE}Getting code diff...${NC}"
CODE_DIFF=$(git diff "$MERGE_BASE" "origin/$BRANCH" -- $MODIFIED_FILES 2>/dev/null | head -300)

echo -e "${GREEN}✓ Context gathered${NC}"

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

# Create the prompt file with RICH CONTEXT for world-class behavioral tests
PROMPT_FILE="$WORKTREE_DIR/.agent-prompt-test.md"
cat > "$PROMPT_FILE" << 'PROMPT_HEADER'
# TEST LOCK Agent: Write World-Class Behavioral Unit Tests

## 🎯 Your Mission

Write **behavioral unit tests** that capture EVERY code path and edge case for this ticket's changes. Your tests should be so comprehensive that any future regression would be caught immediately.

**Philosophy:** You are locking in CURRENT behavior as a snapshot. If code has a bug, test the buggy behavior. Tests prevent unintended changes, they don't define "correct."

---

PROMPT_HEADER

# Add ticket context
cat >> "$PROMPT_FILE" << EOF
## 📋 Ticket Context

| Field | Value |
|-------|-------|
| **Ticket** | $TICKET_UPPER |
| **Title** | $TICKET_TITLE |
| **Branch** | \`$BRANCH\` |
| **Session** | \`$DB_SESSION_ID\` |

EOF

# Add description if available
if [ -n "$TICKET_DESCRIPTION" ]; then
cat >> "$PROMPT_FILE" << EOF
### Description
$TICKET_DESCRIPTION

EOF
fi

# Add acceptance criteria if available
if [ -n "$ACCEPTANCE_CRITERIA" ]; then
cat >> "$PROMPT_FILE" << EOF
### Acceptance Criteria
$ACCEPTANCE_CRITERIA

EOF
fi

# Add dev agent completion summary if available
if [ -n "$DEV_COMPLETION_SUMMARY" ]; then
cat >> "$PROMPT_FILE" << EOF
---

## 📝 What the Dev Agent Built

The dev agent completed this ticket. Here's their summary:

<details>
<summary>Dev Agent Completion Report</summary>

$DEV_COMPLETION_SUMMARY

</details>

EOF
fi

# Add files to test with function signatures
cat >> "$PROMPT_FILE" << EOF
---

## 📁 Files to Test

$(echo "$MODIFIED_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done)

EOF

# Add function signatures if found
if [ -n "$FUNCTION_SIGNATURES" ]; then
cat >> "$PROMPT_FILE" << EOF
### Key Exports to Test
$FUNCTION_SIGNATURES

EOF
fi

# Add git diff summary
cat >> "$PROMPT_FILE" << EOF
---

## 🔍 What Changed (Git Diff Summary)

\`\`\`
$GIT_DIFF_STAT
\`\`\`

<details>
<summary>Full Diff (click to expand)</summary>

\`\`\`diff
$CODE_DIFF
\`\`\`

</details>

---

## ✅ Your Process

### Step 1: Analyze the Code Changes

For EACH file above, identify ALL behaviors:

| Behavior Type | What to Look For |
|---------------|------------------|
| **Happy paths** | Normal successful operations |
| **Edge cases** | Empty inputs, null, undefined, boundary values |
| **Error cases** | What throws, what returns error |
| **Conditional branches** | if/else, switch, ternary outcomes |
| **State changes** | Before/after, loading states, disabled states |
| **User interactions** | Clicks, form submissions, keyboard events |

### Step 2: Read Existing Test Patterns

\`\`\`bash
# Reference: Server-side test patterns
cat apps/server/src/features/routing/pool-manager.test.ts | head -80

# Reference: UI component test patterns  
cat apps/dashboard/src/features/pools/DeletePoolModal.test.tsx | head -80
\`\`\`

### Step 3: Write Comprehensive Tests

**CRITICAL RULES:**
1. **One behavior per \`it()\` block** - Never test multiple behaviors together
2. **Descriptive test names** - \`"returns error when subscription not found"\` not \`"handles error"\`
3. **Test file location** - Same directory as source: \`foo.ts\` → \`foo.test.ts\`
4. **For UI components** - Add \`/** @vitest-environment jsdom */\` at file top

**Required Mocking Patterns:**

\`\`\`typescript
// For UI tests - ALWAYS mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Info: () => <div data-testid="info-icon" />,
  // Add icons as needed
}));

// For Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// For Stripe
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { update: vi.fn(), cancel: vi.fn() },
    customers: { retrieve: vi.fn() },
  },
}));
\`\`\`

### Step 4: Verify All Tests Pass

\`\`\`bash
pnpm test
\`\`\`

If a test fails, **fix the test** - you're testing current behavior, not expected behavior.

### Step 5: Commit Your Tests

\`\`\`bash
git add .
git commit -m "test($TICKET_LOWER): Add comprehensive behavioral tests

Behaviors locked:
- [list key behaviors tested]"
git push origin $BRANCH
\`\`\`

### Step 6: Write Completion Report

**File:** \`docs/agent-output/test-lock/$TICKET_UPPER-\$(date +%Y%m%dT%H%M).md\`

\`\`\`markdown
# Test Lock Complete: $TICKET_UPPER

## Summary
- **Ticket:** $TICKET_UPPER - $TICKET_TITLE
- **Status:** ✅ COMPLETE
- **Tests Added:** [N] tests across [M] files

## Test Files Created

| File | Behaviors Tested |
|------|------------------|
| \`path/to/file.test.ts\` | N behaviors |

## Behaviors Locked

### [filename.ts]
| Function | Behaviors |
|----------|-----------|
| \`functionName\` | 1. happy path, 2. empty input, 3. error case |

## Test Results
\\\`\\\`\\\`
✓ All [N] tests passing
\\\`\\\`\\\`
\`\`\`

### Step 7: Signal Completion

\`\`\`bash
curl -X POST $DASHBOARD_URL/api/v2/agents/$DB_SESSION_ID/complete \\
  -H "Content-Type: application/json" \\
  -d '{"success": true}'
\`\`\`

---

## 🏆 Quality Bar: World-Class Tests

Before completing, verify:

- [ ] **Every exported function** has at least one test
- [ ] **Every code path** is covered (use the diff to find ALL branches)
- [ ] **Every edge case** from the ticket's acceptance criteria is tested
- [ ] **Test names are specific** - reading them tells you exactly what's tested
- [ ] **All tests pass** with \`pnpm test\`
- [ ] **No console errors** in test output
- [ ] **Mocks follow codebase patterns** (check existing tests)

---

## 📚 Reference: Full SOP

For advanced patterns (timers, MediaStream, complex mocks), read:
\`docs/workflow/TEST_LOCK_AGENT_SOP.md\`

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
     claude --model claude-opus-4-20250514 -p \"\$(cat '$PROMPT_FILE')\" --dangerously-skip-permissions 2>&1 | tee '$LOG_FILE'; \
     echo ''; \
     echo 'Pushing any uncommitted changes...'; \
     git add -A 2>/dev/null || true; \
     git diff --cached --quiet || git commit -m \"test($TICKET_LOWER): Auto-commit test changes\" 2>/dev/null || true; \
     git push origin HEAD:$BRANCH 2>/dev/null && echo '✅ Pushed to origin' || echo '⚠️ Push failed or nothing to push'; \
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
