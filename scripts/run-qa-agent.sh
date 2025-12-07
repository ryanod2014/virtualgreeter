#!/bin/bash
# =============================================================================
# QA Agent Runner - Isolated Worktree Testing
# =============================================================================
# Runs a QA agent for a single ticket in an isolated worktree.
# Does NOT affect the main repo's working directory.
#
# Usage:
#   ./scripts/run-qa-agent.sh TKT-001
#
# What it does:
#   1. Creates/reuses a worktree for the ticket's branch
#   2. Runs Claude Code QA in that worktree
#   3. Writes QA report to MAIN repo (not worktree)
#   4. If PASS: selectively merges only ticket files to main
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get the main repo directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$MAIN_REPO/../agent-worktrees"
QA_RESULTS_DIR="$MAIN_REPO/docs/agent-output/qa-results"
LOG_DIR="$MAIN_REPO/.agent-logs"

# Ensure directories exist
mkdir -p "$QA_RESULTS_DIR" "$LOG_DIR"

print_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# =============================================================================
# Main
# =============================================================================

TICKET_ID="$1"
if [ -z "$TICKET_ID" ]; then
    echo "Usage: $0 <TICKET_ID>"
    echo "Example: $0 TKT-001"
    exit 1
fi

TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
SESSION_NAME="qa-$TICKET_UPPER"
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
LOG_FILE="$LOG_DIR/qa-$TICKET_UPPER-$TIMESTAMP.log"

print_info "Starting QA for $TICKET_UPPER"

# -----------------------------------------------------------------------------
# Step 1: Find the branch for this ticket
# -----------------------------------------------------------------------------
cd "$MAIN_REPO"
git fetch origin --quiet

BRANCH=""
for pattern in "agent/${TICKET_LOWER}" "agent/${TICKET_UPPER}" "agent/${TICKET_ID}"; do
    FOUND=$(git branch -a | grep -iE "^[* ]*remotes/origin/${pattern}" | head -1 | sed 's|.*remotes/origin/||' | tr -d ' *')
    if [ -n "$FOUND" ]; then
        BRANCH="$FOUND"
        break
    fi
done

if [ -z "$BRANCH" ]; then
    print_error "No branch found for $TICKET_UPPER"
    exit 1
fi
print_success "Found branch: $BRANCH"

# -----------------------------------------------------------------------------
# Step 2: Setup worktree (reuse existing or create new)
# -----------------------------------------------------------------------------
WORKTREE_DIR="$WORKTREE_BASE/qa-$TICKET_UPPER"

if [ -d "$WORKTREE_DIR" ]; then
    print_info "Reusing existing worktree: $WORKTREE_DIR"
    cd "$WORKTREE_DIR"
    git fetch origin --quiet
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || true
    git pull origin "$BRANCH" --quiet 2>/dev/null || true
else
    print_info "Creating worktree: $WORKTREE_DIR"
    mkdir -p "$WORKTREE_BASE"
    git worktree add "$WORKTREE_DIR" "origin/$BRANCH" --detach 2>/dev/null || \
    git worktree add "$WORKTREE_DIR" "$BRANCH" 2>/dev/null || \
    git worktree add "$WORKTREE_DIR" -b "qa-$TICKET_LOWER" "origin/$BRANCH" 2>/dev/null
    
    cd "$WORKTREE_DIR"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || true
fi

print_success "Worktree ready: $WORKTREE_DIR"

# -----------------------------------------------------------------------------
# Step 3: Get ticket info for the prompt
# -----------------------------------------------------------------------------
cd "$MAIN_REPO"

TICKET_INFO=$(cat docs/data/tickets.json 2>/dev/null | python3 -c "
import sys,json
try:
    data=json.load(sys.stdin)
    for t in data.get('tickets',[]):
        if t.get('id','').upper() == '${TICKET_UPPER}':
            print(json.dumps(t))
            break
except: pass
" 2>/dev/null || echo "{}")

TITLE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','Unknown'))" 2>/dev/null || echo "Unknown")
FILES_TO_MODIFY=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(' '.join(json.load(sys.stdin).get('files_to_modify',[])))" 2>/dev/null || echo "")
AC=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print('\\n'.join(['- '+x for x in json.load(sys.stdin).get('acceptance_criteria',[])]))" 2>/dev/null || echo "- See ticket for criteria")

# -----------------------------------------------------------------------------
# Step 4: Build the Claude prompt
# -----------------------------------------------------------------------------
CLAUDE_PROMPT="You are a QA Review Agent testing ticket $TICKET_UPPER.

## Ticket: $TITLE
## Branch: $BRANCH
## Worktree: $WORKTREE_DIR

## Acceptance Criteria:
$AC

## CRITICAL INSTRUCTIONS:

1. **You are in an ISOLATED WORKTREE** at: $WORKTREE_DIR
   - All your testing happens here
   - This does NOT affect the main repo

2. **Run these tests IN THE WORKTREE:**
   cd $WORKTREE_DIR
   pnpm install
   pnpm typecheck
   pnpm build  
   pnpm test

3. **Verify each acceptance criterion**

4. **Write your QA report to the MAIN REPO:**
   - If PASS: $QA_RESULTS_DIR/QA-$TICKET_UPPER-PASSED-$TIMESTAMP.md
   - If FAIL: $QA_RESULTS_DIR/QA-$TICKET_UPPER-FAILED-$TIMESTAMP.md

5. **DO NOT modify any files in the main repo except your QA report**

6. **If tests PASS, include this merge command in your report:**
   \`\`\`bash
   cd $MAIN_REPO
   git fetch origin main
   git checkout main
   git pull origin main
   # Cherry-pick ONLY the ticket's files:
   git checkout origin/$BRANCH -- $FILES_TO_MODIFY
   git add $FILES_TO_MODIFY
   git commit -m 'feat: $TICKET_UPPER - $TITLE'
   git push origin main
   \`\`\`

## Report Template:

# QA Review: $TICKET_UPPER

**Status:** ✅ PASSED / ❌ FAILED
**Ticket:** $TICKET_UPPER - $TITLE
**Branch:** $BRANCH
**Tested:** $(date +%Y-%m-%d)

## Build Verification
| Check | Status |
|-------|--------|
| pnpm install | |
| pnpm typecheck | |
| pnpm build | |
| pnpm test | |

## Acceptance Criteria
(verify each criterion)

## Merge Command
(if passed, include the selective merge command above)
"

# -----------------------------------------------------------------------------
# Step 5: Launch Claude in tmux
# -----------------------------------------------------------------------------
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    print_warn "Session $SESSION_NAME already exists. Attaching..."
    echo "Run: tmux attach -t $SESSION_NAME"
    exit 0
fi

print_info "Launching Claude Code in tmux: $SESSION_NAME"

tmux new-session -d -s "$SESSION_NAME" \
    "cd '$WORKTREE_DIR' && echo '=== QA Agent: $TICKET_UPPER ===' && echo 'Worktree: $WORKTREE_DIR' && echo 'Branch: $BRANCH' && echo '' && claude --dangerously-skip-permissions -p \"$CLAUDE_PROMPT\" 2>&1 | tee '$LOG_FILE'; echo ''; echo '=== QA Complete ==='; echo 'Report: $QA_RESULTS_DIR/QA-$TICKET_UPPER-*.md'; echo 'Press Enter to close...'; read"

print_success "QA Agent launched: $SESSION_NAME"
echo ""
echo -e "  ${CYAN}Worktree:${NC} $WORKTREE_DIR"
echo -e "  ${CYAN}Log:${NC} $LOG_FILE"
echo -e "  ${CYAN}Attach:${NC} tmux attach -t $SESSION_NAME"
echo ""

