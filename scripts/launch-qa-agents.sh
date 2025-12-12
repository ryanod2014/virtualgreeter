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

# Validate that an env file contains required variables
validate_env_file() {
    local ENV_FILE="$1"
    local REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    local MISSING=()
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Env file not found: $ENV_FILE"
        return 1
    fi
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
            MISSING+=("$var")
        fi
    done
    
    if [ ${#MISSING[@]} -gt 0 ]; then
        print_error "Missing required env vars in $ENV_FILE: ${MISSING[*]}"
        print_error "Copy from main project or run 'vercel env pull' in apps/dashboard"
        return 1
    fi
    
    return 0
}

# Calculate a unique port for each ticket to enable parallel QA testing
# Base port is 3100, ticket number is added (TKT-005 → 3105, TKT-042 → 3142)
get_port_for_ticket() {
    local TICKET_ID="$1"
    local BASE_PORT=3100
    
    # Extract numeric part from ticket ID (TKT-005 → 005 → 5)
    local TICKET_NUM=$(echo "$TICKET_ID" | grep -oE '[0-9]+' | head -1)
    
    if [ -z "$TICKET_NUM" ]; then
        # Fallback: hash the ticket ID to get a number
        TICKET_NUM=$(echo "$TICKET_ID" | cksum | cut -d' ' -f1)
        TICKET_NUM=$((TICKET_NUM % 100))
    fi
    
    # Remove leading zeros and calculate port
    TICKET_NUM=$((10#$TICKET_NUM))
    local PORT=$((BASE_PORT + TICKET_NUM))
    
    # Ensure port is in valid range (3100-3999)
    if [ $PORT -gt 3999 ]; then
        PORT=$((3100 + (TICKET_NUM % 900)))
    fi
    
    echo $PORT
}

# Start a Cloudflare tunnel and return the public URL
# This enables PM to access magic links from anywhere (not just localhost)
start_cloudflare_tunnel() {
    local PORT="$1"
    local TICKET_ID="$2"
    local TUNNEL_LOG="/tmp/cloudflare-tunnel-$TICKET_ID.log"
    
    # Check if cloudflared is available
    if ! command -v cloudflared &> /dev/null; then
        echo ""  # Return empty - will fall back to localhost
        return 1
    fi
    
    # Start tunnel in background
    cloudflared tunnel --url "http://localhost:$PORT" > "$TUNNEL_LOG" 2>&1 &
    local TUNNEL_PID=$!
    
    # Wait for tunnel URL to appear (max 15 seconds)
    local TRIES=0
    local MAX_TRIES=15
    local TUNNEL_URL=""
    
    while [ $TRIES -lt $MAX_TRIES ]; do
        # Look for the trycloudflare.com URL in the log
        TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
        if [ -n "$TUNNEL_URL" ]; then
            echo "$TUNNEL_URL"
            return 0
        fi
        sleep 1
        TRIES=$((TRIES + 1))
    done
    
    # Failed to get URL
    kill $TUNNEL_PID 2>/dev/null || true
    echo ""
    return 1
}

# Pre-flight check: verify dashboard can start in worktree
preflight_dashboard_check() {
    local WORKTREE_DIR="$1"
    local PORT="$2"
    local DASHBOARD_DIR="$WORKTREE_DIR/apps/dashboard"
    
    echo -e "${CYAN}[PRE-FLIGHT]${NC} Testing dashboard startup on port $PORT..."
    
    # Kill any existing process on this port
    lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    
    # Try to start dashboard on the specified port
    cd "$DASHBOARD_DIR"
    PORT=$PORT pnpm dev > /tmp/dashboard-preflight-$PORT.log 2>&1 &
    local DEV_PID=$!
    
    # Wait for startup (max 15 seconds)
    local TRIES=0
    local MAX_TRIES=15
    while [ $TRIES -lt $MAX_TRIES ]; do
        if curl -s http://localhost:$PORT 2>/dev/null | head -1 | grep -q "<!DOCTYPE\|<html"; then
            print_success "Dashboard starts successfully on port $PORT"
            kill $DEV_PID 2>/dev/null || true
            lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
            return 0
        fi
        sleep 1
        TRIES=$((TRIES + 1))
    done
    
    # Failed to start
    print_error "Dashboard failed to start on port $PORT within ${MAX_TRIES}s"
    print_error "Check /tmp/dashboard-preflight-$PORT.log for details"
    kill $DEV_PID 2>/dev/null || true
    lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    
    # Show last few lines of log
    echo -e "${YELLOW}Last lines of startup log:${NC}"
    tail -10 /tmp/dashboard-preflight-$PORT.log 2>/dev/null || true
    
    return 1
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
    
    # Check cloudflared for tunnel support (enables remote magic link access)
    if ! command -v cloudflared &> /dev/null; then
        print_warning "cloudflared not found. Magic links will only work locally."
        print_warning "Install with: brew install cloudflared"
        print_warning "This enables PM to access previews from anywhere."
    else
        print_success "cloudflared available for tunnel support"
    fi
    
    # Check Playwright MCP is configured and browsers are installed
    if ! claude mcp list 2>/dev/null | grep -q "playwright"; then
        print_warning "Playwright MCP not configured. Browser testing may not work."
        print_warning "Add with: claude mcp add --scope user playwright -- npx @playwright/mcp@latest"
    else
        # Verify Playwright browsers are installed
        if [ ! -d "$HOME/.cache/ms-playwright/chromium-"* ] 2>/dev/null; then
            print_warning "Playwright browsers not installed. Installing..."
            PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npx playwright install chromium 2>/dev/null
            if [ $? -eq 0 ]; then
                print_success "Playwright browsers installed"
            else
                print_error "Failed to install Playwright browsers"
            fi
        else
            print_success "Playwright MCP configured with browsers"
        fi
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
        
        local BRANCH=$(git branch -a | grep -E "$pattern" | head -1 | sed 's/^[* +]*//' | sed 's|remotes/origin/||' | tr -d ' ')
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
8. Write report to \`$MAIN_REPO_DIR/docs/agent-output/qa-results/\` (ABSOLUTE PATH - NOT the worktree!)
EOF

    print_success "Created prompt: $PROMPT_FILE"
    echo "$PROMPT_FILE"
}

launch_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="qa-$TICKET_ID"
    local WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
    local WORKTREE_DIR="$WORKTREE_BASE/qa-$TICKET_ID"
    
    # Calculate unique port for this ticket (enables parallel testing)
    local AGENT_PORT=$(get_port_for_ticket "$TICKET_ID")
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Launching QA agent for: $TICKET_ID (Port: $AGENT_PORT)${NC}"
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
    
    # =========================================================================
    # PRE-FLIGHT: Run regression tests BEFORE launching QA agent
    # =========================================================================
    # This catches regressions early, saving QA agent tokens
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running pre-flight regression tests...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -f "$MAIN_REPO_DIR/scripts/run-regression-tests.sh" ]; then
        # Run regression tests
        if "$MAIN_REPO_DIR/scripts/run-regression-tests.sh" "$TICKET_ID" "$BRANCH" 2>&1; then
            print_success "Pre-flight regression tests PASSED"
        else
            print_error "Pre-flight regression tests FAILED!"
            echo ""
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}NOT LAUNCHING QA AGENT - Regressions detected${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo "The dev agent broke tests outside the ticket scope."
            echo "This must be fixed before QA can review."
            echo ""
            echo "Options:"
            echo "  1. Run dispatch agent to create continuation ticket"
            echo "  2. Fix manually and re-run: ./scripts/run-regression-tests.sh $TICKET_ID"
            echo ""
            
            # Create blocker if one doesn't already exist
            EXISTING_BLOCKER=$(ls "$MAIN_REPO_DIR/docs/agent-output/blocked/REGRESSION-${TICKET_ID}"*.json 2>/dev/null | head -1)
            if [ -z "$EXISTING_BLOCKER" ]; then
                BLOCKER_FILE="$MAIN_REPO_DIR/docs/agent-output/blocked/REGRESSION-${TICKET_ID}-$(date +%Y%m%dT%H%M).json"
                cat > "$BLOCKER_FILE" << EOF
{
  "ticket_id": "$TICKET_ID",
  "blocker_type": "regression_failure",
  "branch": "$BRANCH",
  "blocked_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": "Pre-flight regression tests failed - dev broke code outside ticket scope",
  "dispatch_action": "create_continuation_ticket"
}
EOF
                print_warning "Created blocker: $BLOCKER_FILE"
            fi
            
            return 1
        fi
    else
        print_warning "Regression test script not found - skipping pre-flight check"
        print_warning "Expected: $MAIN_REPO_DIR/scripts/run-regression-tests.sh"
    fi
    echo ""
    
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

    # Copy .env files from main repo to worktree (required for Supabase connection)
    echo "Copying environment files to worktree..."
    if [ -f "$MAIN_REPO_DIR/apps/dashboard/.env.local" ]; then
        cp "$MAIN_REPO_DIR/apps/dashboard/.env.local" "$WORKTREE_DIR/apps/dashboard/.env.local"
        print_success "Copied apps/dashboard/.env.local"
    fi
    if [ -f "$MAIN_REPO_DIR/apps/server/.env.local" ]; then
        cp "$MAIN_REPO_DIR/apps/server/.env.local" "$WORKTREE_DIR/apps/server/.env.local"
        print_success "Copied apps/server/.env.local"
    fi
    if [ -f "$MAIN_REPO_DIR/apps/widget/.env.local" ]; then
        cp "$MAIN_REPO_DIR/apps/widget/.env.local" "$WORKTREE_DIR/apps/widget/.env.local"
        print_success "Copied apps/widget/.env.local"
    fi

    # Validate dashboard env file has required variables
    if [ -f "$WORKTREE_DIR/apps/dashboard/.env.local" ]; then
        if ! validate_env_file "$WORKTREE_DIR/apps/dashboard/.env.local"; then
            print_error "Environment validation failed - QA agent may not be able to start dashboard"
            print_warning "Continuing anyway, but browser testing may fail..."
        else
            print_success "Validated apps/dashboard/.env.local"
        fi
    else
        print_error "No .env.local found in dashboard - create one with Supabase credentials"
    fi

    # Pre-flight: verify dashboard can start (for UI tickets)
    if [ "$HAS_UI_FILES" = true ]; then
        echo ""
        if ! preflight_dashboard_check "$WORKTREE_DIR" "$AGENT_PORT"; then
            print_warning "Pre-flight dashboard check failed on port $AGENT_PORT"
            print_warning "QA agent will attempt to start it, but may hit the same issues"
            print_warning "Consider fixing dashboard startup before re-running QA"
        fi
        echo ""
    fi

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

    # Detect what types of testing are needed (can be BOTH!)
    HAS_UI_FILES="false"
    HAS_API_FILES="false"
    
    # Check for UI files
    if echo "$FILES_TO_MODIFY" | grep -qE '\.(tsx|css)$|/components/|/features/|/app/'; then
        HAS_UI_FILES="true"
    fi
    
    # Check for API/backend files (exclude .tsx files)
    if echo "$FILES_TO_MODIFY" | grep -E '/api/|/server/|/lib/|\.ts$' | grep -qvE '\.tsx$'; then
        HAS_API_FILES="true"
    fi
    
    # Determine ticket type
    TICKET_TYPE="api"  # default
    if [ "$HAS_UI_FILES" = "true" ] && [ "$HAS_API_FILES" = "true" ]; then
        TICKET_TYPE="hybrid"
        print_warning "HYBRID TICKET DETECTED - Will test BOTH API and UI"
    elif [ "$HAS_UI_FILES" = "true" ]; then
        TICKET_TYPE="ui"
        print_warning "UI TICKET DETECTED - Will require PM approval via magic link"
    else
        TICKET_TYPE="api"
        print_success "API/Backend ticket - Will auto-merge after QA"
    fi
    
    # Legacy variable for backward compatibility
    IS_UI_TICKET="false"
    if [ "$HAS_UI_FILES" = "true" ]; then
        IS_UI_TICKET="true"
    fi
    
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
    CLAUDE_PROMPT="You are a QA Review Agent. You are REPLACING a human QA team.

═══════════════════════════════════════════════════════════════
⛔ FORBIDDEN SHORTCUTS - READ THIS FIRST (ALL TICKET TYPES)
═══════════════════════════════════════════════════════════════

These phrases = AUTOMATIC REJECTION:
❌ 'Verified via code inspection' → EXECUTE, don't READ
❌ 'Unit tests pass' → Mocks don't prove real behavior
❌ 'Logic appears correct' → RUN IT to verify
❌ For UI: Testing one role and inferring others work → TEST EACH ROLE

THE GOLDEN RULE: If your evidence is 'I read the code', your QA is INVALID.

═══════════════════════════════════════════════════════════════
TICKET TYPE: $TICKET_TYPE
═══════════════════════════════════════════════════════════════

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ]; then echo '
⚠️  HYBRID TICKET - YOU MUST TEST BOTH API AND UI! ⚠️

This ticket modifies BOTH backend/API files AND UI components.
You MUST complete BOTH workflows:

1. FIRST: API/Backend Testing (docs/workflow/NON_UI_TICKET_QA_WORKFLOW.md)
   - Test all API endpoints with curl
   - Verify request/response behavior
   - Test error cases and edge cases
   - Document all curl commands and responses

2. THEN: UI Testing (docs/workflow/UI_TICKET_QA_WORKFLOW.md)
   - Test UI components with Playwright
   - Test for each role (admin, agent)
   - Generate magic links for PM review

Your test plan MUST have sections for BOTH API and UI tests.
Your self-audit MUST verify BOTH types of testing were done.
'; elif [ \"$TICKET_TYPE\" = \"ui\" ]; then echo '
UI TICKET - Browser testing required

Read: docs/workflow/UI_TICKET_QA_WORKFLOW.md
- Test with Playwright
- Test each role separately
- Generate magic links for PM review
'; else echo '
API/BACKEND TICKET - Execution-based testing required

Read: docs/workflow/NON_UI_TICKET_QA_WORKFLOW.md
- Test all endpoints with curl
- Verify responses and state changes
- Auto-merge after QA passes
'; fi)

GENERAL: docs/workflow/QA_REVIEW_AGENT_SOP.md

SESSION INFO:
  TICKET: $TICKET_ID | BRANCH: $BRANCH | TYPE: $TICKET_TYPE
  HAS_UI: $HAS_UI_FILES | HAS_API: $HAS_API_FILES
  SESSION_ID: $DB_SESSION_ID
  WORKTREE: $WORKTREE_DIR
  
  ⚠️  YOUR DASHBOARD PORT: $AGENT_PORT
  This port is unique to your ticket - use it for all testing!
  Other QA agents may be running on different ports simultaneously.
  
  🌐 TUNNEL URL: $TUNNEL_URL
  Use this URL for magic links! PM can access from anywhere.
  (If tunnel unavailable, falls back to localhost:$AGENT_PORT)
  
Heartbeat: curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/heartbeat

═══════════════════════════════════════════════════════════════
PHASE 1: CREATE YOUR TEST PLAN (BEFORE any testing!)
═══════════════════════════════════════════════════════════════

Write this FIRST:

\`\`\`markdown
## Test Plan for $TICKET_ID
## TICKET TYPE: $TICKET_TYPE

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ] || [ \"$HAS_API_FILES\" = \"true\" ]; then echo '
### API/BACKEND TESTS (Minimum 5)
| # | Endpoint/Operation | Method | Input | Expected | 
|---|-------------------|--------|-------|----------|
| 1 | /api/example | POST | {valid data} | 200 + success |
| 2 | /api/example | POST | {} | 400 + error |
| 3 | /api/example | POST | {invalid} | 400 + validation |
| 4 | /api/example | GET | unauthorized | 401 |
| 5 | /api/example/:id | GET | bad id | 404 |
'; fi)

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ] || [ \"$HAS_UI_FILES\" = \"true\" ]; then echo '
### UI TESTS - ROLES TO TEST
| Role | User Email | Tests | Magic Link? |
|------|-----------|-------|-------------|
| Admin | qa-admin-$TICKET_ID@greetnow.test | [list] | Yes |
| Agent | qa-agent-$TICKET_ID@greetnow.test | [list] | Yes |

### UI TESTS - SCENARIOS
| # | Scenario | User Action | Expected Result |
|---|----------|-------------|-----------------|
| 1 | Happy path | [action] | [result] |
| 2 | Error state | [trigger error] | [error UI] |
| 3 | Edge case | [boundary] | [behavior] |
'; fi)

### ARTIFACT TRACKING
| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| [test] | API/UI | ☐ | [pending] | [pending] |
\`\`\`

⚠️ DO NOT proceed until test plan is written!

═══════════════════════════════════════════════════════════════
PHASE 2: BUILD VERIFICATION
═══════════════════════════════════════════════════════════════

pnpm install && pnpm typecheck && pnpm lint && pnpm build && pnpm test

If fails: Check if same errors on main. Pre-existing = try pnpm dev anyway.
New errors = FAIL ticket.

═══════════════════════════════════════════════════════════════
PHASE 3: EXECUTE TESTS (One at a time, with evidence)
═══════════════════════════════════════════════════════════════

⚠️  START DASHBOARD ON YOUR ASSIGNED PORT ($AGENT_PORT):

cd apps/dashboard
PORT=$AGENT_PORT pnpm dev &
sleep 10

# Verify it's running on YOUR port
curl -s http://localhost:$AGENT_PORT | head -1

# ALL your testing should use http://localhost:$AGENT_PORT
# (NOT port 3000 - other agents may be using that!)

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ]; then echo '
═══════════════════════════════════════════════════════════════
⚠️  HYBRID: Complete BOTH sections below!
═══════════════════════════════════════════════════════════════

PART A: API/BACKEND TESTING (Do this FIRST!)
───────────────────────────────────────────
For EACH endpoint in your test plan:
  1. curl -X POST/GET the endpoint
  2. Capture full response
  3. Test error cases (missing fields, invalid types, unauthorized)
  4. Verify DB state changes via API
  5. Document request/response pairs

Example:
  curl -s -X POST http://localhost:3001/api/endpoint \\
    -H \"Content-Type: application/json\" \\
    -d \"{...}\" | jq .

PART B: UI TESTING (Do this AFTER API testing passes!)
──────────────────────────────────────────────────────
For EACH role in your test plan:
  1. Create user: curl -X POST http://localhost:3456/api/v2/qa/create-test-user
  2. Login via Playwright at http://localhost:$AGENT_PORT (creates org!)
  3. Verify org: curl http://localhost:3456/api/v2/qa/org-by-email/...
  4. Set state: curl -X POST http://localhost:3456/api/v2/qa/set-org-status
  5. Test feature WITH the API you just verified, take screenshots
  6. Generate magic link with TUNNEL URL: curl -X POST http://localhost:3456/api/v2/review-tokens \\
       -H \"Content-Type: application/json\" \\
       -d '\"'\"'{\"ticket_id\":\"$TICKET_ID\",\"user_email\":\"...\",\"preview_base_url\":\"$TUNNEL_URL\"}'\"'\"'
  7. REPEAT for next role
  
  🌐 Magic links use TUNNEL URL - PM can access from anywhere!
'; elif [ \"$TICKET_TYPE\" = \"ui\" ]; then echo '
UI TICKETS - For EACH role:
  1. Create user: curl -X POST http://localhost:3456/api/v2/qa/create-test-user
  2. Login via Playwright at http://localhost:$AGENT_PORT (creates org!)
  3. Verify org: curl http://localhost:3456/api/v2/qa/org-by-email/...
  4. Set state: curl -X POST http://localhost:3456/api/v2/qa/set-org-status
  5. Test feature at http://localhost:$AGENT_PORT, take screenshot
  6. Generate magic link with TUNNEL URL: curl -X POST http://localhost:3456/api/v2/review-tokens \\
       -H \"Content-Type: application/json\" \\
       -d '\"'\"'{\"ticket_id\":\"$TICKET_ID\",\"user_email\":\"...\",\"preview_base_url\":\"$TUNNEL_URL\"}'\"'\"'
  7. REPEAT for next role
  
  🌐 Magic links will use TUNNEL URL ($TUNNEL_URL) - PM can access from anywhere!
'; else echo '
API/BACKEND TICKETS - For EACH endpoint:
  1. curl -X POST/GET the endpoint
  2. Capture full response
  3. Test error cases (missing fields, invalid types)
  4. Verify DB state changes
  5. Document request/response pairs
'; fi)

═══════════════════════════════════════════════════════════════
PHASE 4: SELF-AUDIT (Before marking complete)
═══════════════════════════════════════════════════════════════

Answer honestly:

### General (ALL tickets)
- Total tests executed: ___ (should be ≥5)
- Evidence pieces: ___ (responses/screenshots)
- [ ] No 'verified via code inspection' phrases
- [ ] Every test has execution evidence

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ]; then echo '
### HYBRID TICKET - BOTH SECTIONS REQUIRED!

API Testing:
- API endpoints tested: ___
- curl commands executed: ___
- Responses captured: ___
- [ ] Tested error cases (400, 401, 404)
- [ ] Verified state changes

UI Testing:
- Roles in AC: ___ | Users created: ___ | Magic links: ___
- Screenshots taken: ___
- [ ] All role numbers match
- [ ] Each role has its own magic link

⛔ HYBRID TICKETS: Both sections must be complete!
'; elif [ \"$TICKET_TYPE\" = \"ui\" ]; then echo '
### UI Testing
- Roles in AC: ___ | Users created: ___ | Magic links: ___
- All numbers must match!
'; else echo '
### API Testing
- Endpoints tested: ___
- curl commands executed: ___
- Error cases tested: ___
'; fi)

⛔ DO NOT mark complete until self-audit passes!

If PASS:
  ═══════════════════════════════════════════════════════════════
  DELIVERABLES (Both UI and Non-UI)
  ═══════════════════════════════════════════════════════════════
  
  1. Write QA Report:
     $MAIN_REPO_DIR/docs/agent-output/qa-results/QA-$TICKET_ID-PASSED-\$(date +%Y%m%dT%H%M).md
     
     Include: Test plan, all test results, evidence, self-audit
  
  ─────────────────────────────────────────────────────────────
  FOR UI TICKETS: Create inbox with magic_links (PLURAL!)
  ─────────────────────────────────────────────────────────────
  
  Write: $MAIN_REPO_DIR/docs/agent-output/inbox/$TICKET_ID.json
  
  {
    \"ticket_id\": \"$TICKET_ID\",
    \"title\": \"[title]\",
    \"type\": \"ui_review\",
    \"status\": \"pending\",
    \"created_at\": \"[ISO timestamp]\",
    \"message\": \"QA verified ALL roles. PM please confirm each.\",
    \"branch\": \"$BRANCH\",
    \"tunnel_url\": \"$TUNNEL_URL\",
    \"qa_report\": \"docs/agent-output/qa-results/QA-$TICKET_ID-PASSED-[timestamp].md\",
    \"screenshots\": [
      {\"name\": \"Admin View\", \"path\": \"...\"},
      {\"name\": \"Agent View\", \"path\": \"...\"}
    ],
    \"magic_links\": [
      {\"role\": \"admin\", \"url\": \"$TUNNEL_URL/login?token=...\", \"what_pm_sees\": \"...\"},
      {\"role\": \"agent\", \"url\": \"$TUNNEL_URL/login?token=...\", \"what_pm_sees\": \"...\"}
    ],
    \"test_setup\": \"[how test accounts are configured]\",
    \"acceptance_criteria\": [\"list from ticket\"]
  }
  
  🌐 Magic links use TUNNEL_URL ($TUNNEL_URL) - PM can click from anywhere!
  
  Update ticket:
  curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID -d '{\"status\": \"qa_approved\"}'
  
  ─────────────────────────────────────────────────────────────
  FOR NON-UI TICKETS: Auto-merge flow
  ─────────────────────────────────────────────────────────────
  
  QA Report must include:
  - All curl commands executed
  - All responses received  
  - Expected vs actual for each test
  - State verification evidence
  
  Update ticket:
  curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID -d '{\"status\": \"merged\"}'
  
  ⚠️ CRITICAL: Use SELECTIVE MERGE only (NOT git merge!)
  This ensures you only merge files YOU worked on, not the entire branch.
  Other agents may have updated other files on main.
  
  Selective merge steps:
    cd $MAIN_REPO_DIR
    git checkout main && git pull origin main
    
    # Get list of files YOUR branch modified:
    git diff --name-only main...origin/$BRANCH
    
    # Checkout ONLY those files from your branch:
    git checkout origin/$BRANCH -- path/to/file1.ts path/to/file2.ts ...
    
    # Stage and commit:
    git add -A
    git commit -m 'Merge $TICKET_ID: [title] - QA Passed
    
    Selective merge - only files modified by this ticket.'
    git push origin main
  
  ❌ NEVER use: git merge $BRANCH (overwrites ALL files from branch point)
  
  ─────────────────────────────────────────────────────────────
  BOTH: Mark session complete
  ─────────────────────────────────────────────────────────────
  
  curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/complete \\
    -d '{\"completion_file\": \"docs/agent-output/qa-results/QA-$TICKET_ID-PASSED.md\"}'

If FAIL:
  ═══════════════════════════════════════════════════════════════
  
  Write BOTH files:
  1. $MAIN_REPO_DIR/docs/agent-output/blocked/QA-$TICKET_ID-FAILED-\$(date +%Y%m%dT%H%M).json
  2. $MAIN_REPO_DIR/docs/agent-output/qa-results/QA-$TICKET_ID-FAILED-\$(date +%Y%m%dT%H%M).md
  
  JSON format:
  {
    \"ticket_id\": \"$TICKET_ID\",
    \"blocker_type\": \"qa_failure\",
    \"summary\": \"[one-line summary]\",
    \"failures\": [{\"test\": \"...\", \"expected\": \"...\", \"actual\": \"...\"}],
    \"dispatch_action\": \"create_continuation_ticket\"
  }
  
  Update status:
  curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/block -d '{\"blocker_type\": \"qa_failure\", ...}'
  curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID -d '{\"status\": \"qa_failed\"}'

═══════════════════════════════════════════════════════════════
REMEMBER: If you didn't EXECUTE it, you didn't TEST it.
═══════════════════════════════════════════════════════════════"

    # Launch in tmux - run in worktree directory
    # Use remain-on-exit so the session stays after claude exits
    echo "Launching Claude Code in tmux session: $SESSION_NAME"
    
    # Create log file for this agent
    local LOG_FILE="$MAIN_REPO_DIR/.agent-logs/qa-$TICKET_ID-$(date +%Y%m%dT%H%M%S).log"
    mkdir -p "$MAIN_REPO_DIR/.agent-logs"
    
    # Write prompt to file (avoids shell escaping issues with special characters)
    local PROMPT_TEMP_FILE="$MAIN_REPO_DIR/.agent-logs/qa-$TICKET_ID-prompt.txt"
    echo "$CLAUDE_PROMPT" > "$PROMPT_TEMP_FILE"
    
    # Start Cloudflare tunnel for remote access to magic links
    echo "Starting Cloudflare tunnel for remote preview access..."
    local TUNNEL_URL=$(start_cloudflare_tunnel "$AGENT_PORT" "$TICKET_ID")
    
    if [ -n "$TUNNEL_URL" ]; then
        print_success "Tunnel started: $TUNNEL_URL"
        echo -e "  ${CYAN}PM can access magic links from anywhere!${NC}"
    else
        print_warning "Tunnel not available - magic links will use localhost:$AGENT_PORT"
        TUNNEL_URL="http://localhost:$AGENT_PORT"
    fi
    
    # Create a wrapper script for reliable execution
    local WRAPPER_SCRIPT="/tmp/qa-$TICKET_ID-wrapper.sh"
    cat > "$WRAPPER_SCRIPT" << WRAPPER_EOF
#!/bin/bash
cd '$WORKTREE_DIR'
export AGENT_SESSION_ID='$DB_SESSION_ID'
export AGENT_PORT='$AGENT_PORT'
export TUNNEL_URL='$TUNNEL_URL'

# Ensure Playwright environment is available
export PLAYWRIGHT_BROWSERS_PATH="\$HOME/.cache/ms-playwright"

# Verify Playwright MCP connection before starting
echo '=== Pre-flight: Checking Playwright MCP ==='
if claude mcp list 2>/dev/null | grep -q "playwright.*Connected"; then
    echo '✓ Playwright MCP connected'
else
    echo '⚠ Playwright MCP not connected, attempting restart...'
    # Give MCP a moment to initialize
    sleep 3
fi

echo ''
echo '=== QA Agent: $TICKET_ID ==='
echo 'Started: \$(date)'
echo 'Port: $AGENT_PORT'
echo 'Tunnel: $TUNNEL_URL'
echo ''
claude --dangerously-skip-permissions -p "\$(cat '$PROMPT_TEMP_FILE')" 2>&1 | tee '$LOG_FILE'
echo ''
echo '=== Completed: \$(date) ==='

# Cleanup tunnel on exit
pkill -f "cloudflared.*localhost:$AGENT_PORT" 2>/dev/null || true

sleep 3600
WRAPPER_EOF
    chmod +x "$WRAPPER_SCRIPT"
    
    tmux new-session -d -s "$SESSION_NAME" "$WRAPPER_SCRIPT"
    
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

