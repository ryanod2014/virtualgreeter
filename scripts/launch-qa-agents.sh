#!/bin/bash
# =============================================================================
# Launch QA Review Agents in Parallel
# =============================================================================
# Launches Claude Code QA agents for multiple tickets in parallel tmux sessions.
# QA agents test completed dev work and decide: PASS → merge, or FAIL → blocked.
#
# Usage: 
#   ./scripts/launch-qa-agents.sh TKT-001 TKT-002 TKT-003
#   ./scripts/launch-qa-agents.sh --list              # Show running QA agents
#   ./scripts/launch-qa-agents.sh --attach TKT-001    # Attach to QA session
#   ./scripts/launch-qa-agents.sh --kill TKT-001      # Kill specific QA agent
#   ./scripts/launch-qa-agents.sh --kill-all          # Kill all QA sessions
#
# Requirements:
#   - tmux installed (brew install tmux)
#   - Claude Code CLI installed
#   - Playwright MCP configured (for browser testing)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${MAGENTA}============================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_prerequisites() {
    # Check tmux
    if ! command -v tmux &> /dev/null; then
        print_error "tmux not found. Install with: brew install tmux"
        exit 1
    fi

    # Check claude
    if ! command -v claude &> /dev/null; then
        print_error "Claude Code CLI not found."
        exit 1
    fi
    
    # Check Playwright MCP is configured
    if ! claude mcp list 2>/dev/null | grep -q "playwright"; then
        print_warning "Playwright MCP not configured. Browser testing may not work."
        print_warning "Add with: claude mcp add --scope user playwright -- npx @playwright/mcp@latest"
    fi
}

list_agents() {
    print_header "Running QA Agent Sessions"
    
    SESSIONS=$(tmux ls 2>/dev/null | grep "^qa-" || true)
    
    if [ -z "$SESSIONS" ]; then
        echo "No QA agent sessions running."
    else
        echo "$SESSIONS"
        echo ""
        echo -e "To attach: ${BLUE}tmux attach -t qa-TKT-XXX${NC}"
        echo -e "To kill:   ${BLUE}$0 --kill TKT-XXX${NC}"
    fi
}

attach_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="qa-$TICKET_ID"
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux attach -t "$SESSION_NAME"
    else
        print_error "Session '$SESSION_NAME' not found"
        list_agents
        exit 1
    fi
}

kill_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="qa-$TICKET_ID"
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_success "Killed session: $SESSION_NAME"
    else
        print_warning "Session '$SESSION_NAME' not found"
    fi
}

kill_all_agents() {
    print_header "Killing All QA Agent Sessions"
    
    SESSIONS=$(tmux ls 2>/dev/null | grep "^qa-" | cut -d: -f1 || true)
    
    if [ -z "$SESSIONS" ]; then
        echo "No QA agent sessions to kill."
        return
    fi
    
    for session in $SESSIONS; do
        tmux kill-session -t "$session"
        print_success "Killed: $session"
    done
}

cleanup_qa_worktrees() {
    print_header "Cleaning Up QA Worktrees"
    
    local WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
    
    # Find all qa-* worktrees
    local QA_WORKTREES=$(ls -d "$WORKTREE_BASE"/qa-* 2>/dev/null || true)
    
    if [ -z "$QA_WORKTREES" ]; then
        echo "No QA worktrees to clean up."
        return
    fi
    
    for worktree in $QA_WORKTREES; do
        local name=$(basename "$worktree")
        echo "Removing worktree: $name"
        git -C "$MAIN_REPO_DIR" worktree remove "$worktree" --force 2>/dev/null || rm -rf "$worktree"
        print_success "Removed: $name"
    done
    
    # Prune stale worktree references
    git -C "$MAIN_REPO_DIR" worktree prune
    print_success "Pruned stale worktree references"
}

get_branch_for_ticket() {
    local TICKET_ID="$1"
    local TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
    local TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
    
    # Look for agent branch (try various naming conventions)
    cd "$MAIN_REPO_DIR"
    
    for pattern in \
        "agent/${TICKET_LOWER}-"* \
        "agent/${TICKET_UPPER}-"* \
        "agent/${TICKET_ID}-"*; do
        
        local BRANCH=$(git branch -a | grep -E "$pattern" | head -1 | sed 's/^[* ]*//' | sed 's|remotes/origin/||')
        if [ -n "$BRANCH" ]; then
            echo "$BRANCH"
            return
        fi
    done
    
    echo ""
}

get_prompt_file() {
    local TICKET_ID="$1"
    local TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
    local TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
    
    cd "$MAIN_REPO_DIR"
    
    # Look for QA review prompt file
    for pattern in \
        "docs/prompts/active/qa-review-${TICKET_LOWER}.md" \
        "docs/prompts/active/qa-review-${TICKET_UPPER}.md" \
        "docs/prompts/active/qa-review-${TICKET_ID}.md"; do
        
        if [ -f "$pattern" ]; then
            echo "$pattern"
            return
        fi
    done
    
    echo ""
}

create_qa_prompt() {
    local TICKET_ID="$1"
    local BRANCH="$2"
    local PROMPT_FILE="docs/prompts/active/qa-review-${TICKET_ID}.md"
    
    cd "$MAIN_REPO_DIR"
    
    # Get ticket info from tickets.json
    local TICKET_INFO=$(cat docs/data/tickets.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('tickets', []):
    if t.get('id', '').upper() == '${TICKET_ID}'.upper():
        print(json.dumps(t))
        break
" 2>/dev/null || echo "")

    if [ -z "$TICKET_INFO" ]; then
        print_warning "Could not find ticket info for $TICKET_ID"
        return 1
    fi
    
    # Extract fields
    local TITLE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))")
    local PRIORITY=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','medium'))")
    local ISSUE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('issue',''))")
    local AC=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print('\n'.join(['- [ ] ' + a for a in json.load(sys.stdin).get('acceptance_criteria',[])]))")
    local QA_NOTES=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('qa_notes',''))")
    
    # Create prompt file
    cat > "$PROMPT_FILE" << EOF
# QA Review Agent: ${TICKET_ID} - ${TITLE}

> **Type:** QA Review
> **Ticket:** ${TICKET_ID}
> **Priority:** ${PRIORITY}
> **Branch:** \`${BRANCH}\`

---

## Ticket Summary

**Issue:** ${ISSUE}

---

## Acceptance Criteria to Verify

${AC}

---

## QA Notes

${QA_NOTES}

---

## Instructions

1. Read \`docs/workflow/QA_REVIEW_AGENT_SOP.md\` for full process
2. Checkout the branch: \`${BRANCH}\`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to \`docs/agent-output/qa-results/\`
EOF

    print_success "Created prompt: $PROMPT_FILE"
    echo "$PROMPT_FILE"
}

launch_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="qa-$TICKET_ID"
    local WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
    local WORKTREE_DIR="$WORKTREE_BASE/qa-$TICKET_ID"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Launching QA agent for: $TICKET_ID${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if session already exists
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_warning "Session '$SESSION_NAME' already exists"
        echo -e "  Attach with: ${BLUE}tmux attach -t $SESSION_NAME${NC}"
        return 1
    fi
    
    # Find branch for this ticket
    BRANCH=$(get_branch_for_ticket "$TICKET_ID")
    if [ -z "$BRANCH" ]; then
        print_error "No branch found for $TICKET_ID"
        echo "Expected: agent/$TICKET_ID-* or similar"
        return 1
    fi
    print_success "Found branch: $BRANCH"
    
    # Setup worktree for isolated testing
    echo "Setting up worktree for isolated testing..."
    mkdir -p "$WORKTREE_BASE"
    
    # Remove existing worktree if present
    if [ -d "$WORKTREE_DIR" ]; then
        git -C "$MAIN_REPO_DIR" worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"
    fi
    
    # Create worktree from the ticket branch
    cd "$MAIN_REPO_DIR"
    git fetch origin --prune 2>/dev/null || true
    
    # Check if branch exists remotely or locally
    if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
        git worktree add "$WORKTREE_DIR" "origin/$BRANCH" --detach 2>/dev/null || \
        git worktree add "$WORKTREE_DIR" "$BRANCH" 2>/dev/null
    else
        git worktree add "$WORKTREE_DIR" "$BRANCH" 2>/dev/null
    fi
    
    if [ ! -d "$WORKTREE_DIR" ]; then
        print_error "Failed to create worktree at $WORKTREE_DIR"
        return 1
    fi
    print_success "Created worktree: $WORKTREE_DIR"
    
    # Checkout the correct branch in worktree
    cd "$WORKTREE_DIR"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || true
    
    # Find or create prompt file (in main repo)
    cd "$MAIN_REPO_DIR"
    PROMPT_FILE=$(get_prompt_file "$TICKET_ID")
    if [ -z "$PROMPT_FILE" ]; then
        echo "Creating QA prompt file..."
        PROMPT_FILE=$(create_qa_prompt "$TICKET_ID" "$BRANCH")
        if [ -z "$PROMPT_FILE" ]; then
            print_error "Failed to create prompt file for $TICKET_ID"
            return 1
        fi
    fi
    print_success "Using prompt: $PROMPT_FILE"
    
    # Get list of files this ticket modifies (for selective merge)
    FILES_TO_MODIFY=$(cat docs/data/tickets.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('tickets', []):
    if t.get('id', '').upper() == '${TICKET_ID}'.upper():
        files = t.get('files_to_modify', [])
        print(' '.join(files))
        break
" 2>/dev/null || echo "")
    
    # Register session in database (v2 API)
    local DB_SESSION_ID=""
    local REGISTER_RESULT=$(curl -s -X POST "http://localhost:3456/api/v2/agents/start" \
        -H "Content-Type: application/json" \
        -d "{\"ticket_id\": \"$TICKET_ID\", \"agent_type\": \"qa\", \"tmux_session\": \"$SESSION_NAME\", \"worktree_path\": \"$WORKTREE_DIR\"}" 2>/dev/null)
    
    if echo "$REGISTER_RESULT" | grep -q '"id"'; then
        DB_SESSION_ID=$(echo "$REGISTER_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
        print_success "Registered QA session: $DB_SESSION_ID"
    fi
    
    # Build the Claude command - run in worktree, selective merge
    CLAUDE_PROMPT="You are a QA Review Agent.

CRITICAL: First read docs/workflow/QA_REVIEW_AGENT_SOP.md for your full testing procedure.

Your job is to THOROUGHLY test ticket $TICKET_ID on branch: $BRANCH
Your goal is to TRY TO BREAK IT, not just verify the happy path works.

SESSION_ID: $DB_SESSION_ID
Send heartbeat periodically:
  curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/heartbeat

IMPORTANT: You are running in an ISOLATED WORKTREE at:
  $WORKTREE_DIR

This prevents conflicts with other agents. Do NOT cd to the main repo.

═══════════════════════════════════════════════════════════════
MANDATORY BROWSER TESTING (DO NOT SKIP)
═══════════════════════════════════════════════════════════════

You MUST use Playwright MCP tools for browser testing. Available tools:
- mcp__playwright__browser_navigate - Go to URL
- mcp__playwright__browser_snapshot - Get page state (use this to find elements)
- mcp__playwright__browser_click - Click elements
- mcp__playwright__browser_type - Type into inputs
- mcp__playwright__browser_take_screenshot - REQUIRED for evidence

SCREENSHOTS ARE MANDATORY:
1. Create directory: mkdir -p $MAIN_REPO_DIR/docs/agent-output/qa-results/screenshots/$TICKET_ID
2. Take BEFORE screenshot (initial state)
3. Take AFTER screenshot (after your actions)
4. Take ERROR STATE screenshot (force an error)
5. Include ALL screenshot paths in your report

If you skip browser testing or screenshots, your QA is INVALID and will be rejected.

═══════════════════════════════════════════════════════════════
ADVERSARIAL TESTING - TRY TO BREAK IT
═══════════════════════════════════════════════════════════════

You are NOT just verifying it works. You are trying to FIND BUGS.

TEST THESE EDGE CASES:
- Empty inputs: Submit forms with blank required fields
- Invalid inputs: Wrong types, special chars (<script>alert(1)</script>), SQL injection ('; DROP TABLE)
- Boundary values: 0, -1, 999999999, strings with 1000+ characters
- Rapid clicks: Click submit button 5 times rapidly
- Cancel mid-action: Start an operation then navigate away
- Duplicate submission: Submit same form twice
- Unauthorized access: Try accessing without proper permissions
- Mobile viewport: Test at 375px width

For EACH edge case, document what you tried and what happened.
If you ONLY test the happy path, your QA is INCOMPLETE.

═══════════════════════════════════════════════════════════════
TESTING STEPS
═══════════════════════════════════════════════════════════════

1. READ the ticket spec from docs/data/tickets.json
2. READ the dev completion report from docs/agent-output/completions/
3. Run build verification: pnpm install && pnpm typecheck && pnpm lint && pnpm build && pnpm test
4. Start dev server: pnpm dev (wait for it to be ready)
5. BROWSER TEST the happy path with screenshots
6. BROWSER TEST edge cases and try to break it
7. Document ALL findings with evidence
8. Make PASS/FAIL decision

If PASS:
  - Write PASS report to: $MAIN_REPO_DIR/docs/agent-output/qa-results/QA-$TICKET_ID-PASSED.md
  - Mark session complete:
    curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/complete -H 'Content-Type: application/json' -d '{\"completion_file\": \"docs/agent-output/qa-results/QA-$TICKET_ID-PASSED.md\"}'
  - Update ticket status:
    curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID -H 'Content-Type: application/json' -d '{\"status\": \"merged\"}'
  - Include these SELECTIVE MERGE commands (only merge ticket files, not entire branch):
    cd $MAIN_REPO_DIR
    git checkout main
    git pull origin main
    git checkout $BRANCH -- $FILES_TO_MODIFY
    git add $FILES_TO_MODIFY
    git commit -m 'Merge $TICKET_ID: [title] - QA Passed'
    git push origin main

If FAIL:
  - Write FAIL report to: $MAIN_REPO_DIR/docs/agent-output/qa-results/QA-$TICKET_ID-FAILED.md
  - Mark session blocked:
    curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/block -H 'Content-Type: application/json' -d '{\"blocker_type\": \"qa_failure\", \"summary\": \"QA tests failed\"}'
  - Update ticket status:
    curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID -H 'Content-Type: application/json' -d '{\"status\": \"qa_failed\"}'
  - Write blocker to: $MAIN_REPO_DIR/docs/agent-output/blocked/$TICKET_ID-qa-blocker.md

CRITICAL: Only merge the specific files for this ticket. Do NOT merge:
  - docs/data/*.json (shared data files)
  - docs/pm-dashboard-ui/* (dashboard)
  - Any files not in the ticket's files_to_modify list"

    # Launch in tmux - run in worktree directory
    # Use remain-on-exit so the session stays after claude exits
    echo "Launching Claude Code in tmux session: $SESSION_NAME"
    
    # Create log file for this agent
    local LOG_FILE="$MAIN_REPO_DIR/.agent-logs/qa-$TICKET_ID-$(date +%Y%m%dT%H%M%S).log"
    mkdir -p "$MAIN_REPO_DIR/.agent-logs"
    
    tmux new-session -d -s "$SESSION_NAME" \
        "cd '$WORKTREE_DIR' && export AGENT_SESSION_ID='$DB_SESSION_ID' && echo '=== QA Agent: $TICKET_ID ===' && echo 'Started: $(date)' && echo '' && claude --dangerously-skip-permissions -p '$CLAUDE_PROMPT' 2>&1 | tee '$LOG_FILE'; echo ''; echo '=== Completed: $(date) ==='; echo 'Press Enter to close...'; read"
    
    print_success "QA Agent launched: $SESSION_NAME"
    echo -e "  Worktree: ${CYAN}$WORKTREE_DIR${NC}"
    echo -e "  Attach:   ${BLUE}tmux attach -t $SESSION_NAME${NC}"
}

# =============================================================================
# Main
# =============================================================================

# Handle flags
case "$1" in
    --list|-l)
        list_agents
        exit 0
        ;;
    --attach|-a)
        if [ -z "$2" ]; then
            print_error "Usage: $0 --attach TKT-XXX"
            exit 1
        fi
        attach_agent "$2"
        exit 0
        ;;
    --kill|-k)
        if [ -z "$2" ]; then
            print_error "Usage: $0 --kill TKT-XXX"
            exit 1
        fi
        kill_agent "$2"
        exit 0
        ;;
    --kill-all)
        kill_all_agents
        exit 0
        ;;
    --cleanup)
        cleanup_qa_worktrees
        exit 0
        ;;
    --help|-h)
        echo "Launch QA Review Agents in Parallel (with isolated worktrees)"
        echo ""
        echo "Usage:"
        echo "  $0 TKT-001 TKT-002 TKT-003   Launch QA agents for tickets"
        echo "  $0 --list                     Show running QA sessions"
        echo "  $0 --attach TKT-001           Attach to QA session"
        echo "  $0 --kill TKT-001             Kill specific QA agent"
        echo "  $0 --kill-all                 Kill all QA sessions"
        echo "  $0 --cleanup                  Remove all QA worktrees"
        echo ""
        echo "Each QA agent runs in an isolated worktree to prevent conflicts."
        echo "If QA passes, it provides selective merge commands (only ticket files)."
        exit 0
        ;;
    "")
        print_error "No ticket IDs provided"
        echo "Usage: $0 TKT-001 TKT-002 TKT-003"
        exit 1
        ;;
esac

# Check prerequisites
check_prerequisites

print_header "Launching QA Review Agents"
echo "Tickets: $@"

# Launch agents for each ticket
LAUNCHED=0
FAILED=0

for TICKET_ID in "$@"; do
    if launch_agent "$TICKET_ID"; then
        ((LAUNCHED++))
    else
        ((FAILED++))
    fi
    
    # Small delay between launches
    sleep 2
done

# Summary
print_header "Launch Summary"
echo -e "Launched: ${GREEN}$LAUNCHED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo ""

if [ $LAUNCHED -gt 0 ]; then
    echo "Running QA sessions:"
    tmux ls 2>/dev/null | grep "^qa-" || true
    echo ""
    echo -e "Monitor all: ${BLUE}tmux attach${NC} then ${CYAN}Ctrl+B${NC} then ${CYAN}s${NC} to switch"
    echo -e "List agents: ${BLUE}$0 --list${NC}"
fi

