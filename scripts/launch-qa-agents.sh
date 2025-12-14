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
# This enables remote access for debugging if needed
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
    
    # Check cloudflared for tunnel support (optional remote access)
    if ! command -v cloudflared &> /dev/null; then
        print_warning "cloudflared not found. Remote access will not be available."
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
    print_header "Cleaning Up Legacy QA Worktrees"
    
    local WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
    
    # Find any legacy qa-* worktrees (from old behavior - QA now reuses ticket worktrees)
    local QA_WORKTREES=$(ls -d "$WORKTREE_BASE"/qa-* 2>/dev/null || true)
    
    if [ -z "$QA_WORKTREES" ]; then
        echo "No legacy QA worktrees to clean up."
        echo "Note: QA now reuses the ticket worktree created by dev agent."
        return
    fi
    
    for worktree in $QA_WORKTREES; do
        local name=$(basename "$worktree")
        echo "Removing legacy worktree: $name"
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
    local DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"
    
    cd "$MAIN_REPO_DIR"
    
    # Get ticket info from database API (not JSON files)
    local TICKET_INFO=$(curl -s --max-time 10 "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" 2>/dev/null)

    if [ -z "$TICKET_INFO" ] || echo "$TICKET_INFO" | grep -q '"error"'; then
        print_warning "Could not find ticket info for $TICKET_ID in database"
        # Fallback: try to get minimal info from the branch
        local TITLE="$TICKET_ID"
        local PRIORITY="medium"
        local ISSUE="See dev completion report"
        local AC=""
        local QA_NOTES=""
    else
        # Extract fields from database response
        local TITLE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','$TICKET_ID'))" 2>/dev/null || echo "$TICKET_ID")
        local PRIORITY=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','medium'))" 2>/dev/null || echo "medium")
        local ISSUE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('issue',''))" 2>/dev/null || echo "")
        local AC=$(echo "$TICKET_INFO" | python3 -c "import sys,json; ac=json.load(sys.stdin).get('acceptance_criteria',[]); print('\n'.join(['- [ ] ' + a for a in (json.loads(ac) if isinstance(ac,str) else ac)]))" 2>/dev/null || echo "")
        local QA_NOTES=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('qa_notes',''))" 2>/dev/null || echo "")
    fi
    
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
    # Reuse the same worktree as dev agent (one worktree per ticket through entire pipeline)
    local WORKTREE_DIR="$WORKTREE_BASE/$TICKET_ID"
    
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
    
    # Reuse existing worktree from dev agent (one worktree per ticket through entire pipeline)
    echo "Checking for existing worktree..."
    mkdir -p "$WORKTREE_BASE"
    
    if [ -d "$WORKTREE_DIR" ]; then
        print_success "Reusing existing worktree: $WORKTREE_DIR"
        # Pull latest changes and ensure we're on the right branch
        cd "$WORKTREE_DIR"
        git fetch origin 2>/dev/null || true
        git checkout "$BRANCH" 2>/dev/null || true
    else
        # Worktree doesn't exist - create it (fallback for edge cases)
        echo "Creating worktree (dev agent should have done this)..."
        cd "$MAIN_REPO_DIR"
        git fetch origin --prune 2>/dev/null || true
        
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
    fi

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
        print_success "UI TICKET DETECTED - Browser testing with Playwright"
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
    
    # Build the Claude command - short prompt that references the SOP
    CLAUDE_PROMPT="# QA Review Agent: $TICKET_ID

> **FIRST:** Read the full SOP: \`docs/workflow/QA_REVIEW_AGENT_SOP.md\`
>
> The SOP contains the 3-step process, forbidden shortcuts, and quality checklists.

---

## Session Context

| Key | Value |
|-----|-------|
| **Ticket** | $TICKET_ID |
| **Branch** | $BRANCH |
| **Type** | $TICKET_TYPE (HAS_UI: $HAS_UI_FILES, HAS_API: $HAS_API_FILES) |
| **Session ID** | $DB_SESSION_ID |
| **Worktree** | $WORKTREE_DIR |
| **Dashboard Port** | $AGENT_PORT (use this for ALL testing!) |
| **Tunnel URL** | $TUNNEL_URL |

---

## Type-Specific Workflow

$(if [ \"$TICKET_TYPE\" = \"hybrid\" ]; then echo '
⚠️ **HYBRID TICKET** - You MUST test BOTH API and UI!

1. **API Testing FIRST:** Read \`docs/workflow/NON_UI_TICKET_QA_WORKFLOW.md\`
   - Test all endpoints with curl
   - Verify request/response behavior
   - Test error cases (400, 401, 404)

2. **UI Testing SECOND:** Read \`docs/workflow/UI_TICKET_QA_WORKFLOW.md\`
   - Test with Playwright browser automation
   - Test EACH role separately (admin, agent)
   - Take screenshots as evidence
'; elif [ \"$TICKET_TYPE\" = \"ui\" ]; then echo '
**UI TICKET** - Browser testing required

Read: \`docs/workflow/UI_TICKET_QA_WORKFLOW.md\`
- Test with Playwright browser automation
- Test EACH role separately
- Take screenshots as evidence
'; else echo '
**API/BACKEND TICKET** - Execution-based testing required

Read: \`docs/workflow/NON_UI_TICKET_QA_WORKFLOW.md\`
- Test all endpoints with curl
- Verify responses and state changes
- Document request/response pairs
'; fi)

---

## Follow 3-Step Process from SOP

### STEP 1: BRAINSTORM

Before any testing, think through:
- What are ALL the ways this could break?
- What edge cases should I test?
- What error states should I verify?

### STEP 2: PLAN

Write a test plan BEFORE executing:
- List ALL tests you will run
- For UI: List EACH role you will test
- For API: List EACH endpoint you will hit

### STEP 3: EXECUTE

Run your plan. For EACH test:
- Execute the test
- Capture evidence (curl response / screenshot)
- Document pass/fail

---

## Start Dashboard on YOUR Port

\`\`\`bash
cd apps/dashboard
PORT=$AGENT_PORT pnpm dev &
sleep 10
curl -s http://localhost:$AGENT_PORT | head -1
\`\`\`

---

## On Completion

**IF PASS:**

1. Write QA report: \`docs/agent-output/qa-results/QA-$TICKET_ID-PASSED-\$(date +%Y%m%dT%H%M).md\`

2. Commit and push your report:
   \`\`\`bash
   git add docs/agent-output/qa-results/
   git commit -m \"qa($TICKET_ID): QA passed\"
   git push origin HEAD:$BRANCH
   \`\`\`
   
   *(If you forget this step, the pipeline will auto-detect and commit it for you)*

3. Update ticket status:
   \`\`\`bash
   curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID \\
     -H 'Content-Type: application/json' \\
     -d '{\"status\": \"qa_passed\"}'
   \`\`\`

4. Mark session complete:
   \`\`\`bash
   curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/complete \\
     -H 'Content-Type: application/json' \\
     -d '{\"completion_file\": \"docs/agent-output/qa-results/QA-$TICKET_ID-PASSED.md\"}'
   \`\`\`

**IF FAIL:**
  
1. Write blocker file: \`$MAIN_REPO_DIR/docs/agent-output/blocked/QA-$TICKET_ID-FAILED-\$(date +%Y%m%dT%H%M).json\`
  
   \`\`\`json
  {
    \"ticket_id\": \"$TICKET_ID\",
    \"blocker_type\": \"qa_failure\",
    \"summary\": \"[one-line summary]\",
    \"failures\": [{\"test\": \"...\", \"expected\": \"...\", \"actual\": \"...\"}],
    \"dispatch_action\": \"create_continuation_ticket\"
  }
   \`\`\`

2. Write QA report: \`$MAIN_REPO_DIR/docs/agent-output/qa-results/QA-$TICKET_ID-FAILED-\$(date +%Y%m%dT%H%M).md\`

3. Update status:
   \`\`\`bash
   curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/block \\
     -H 'Content-Type: application/json' \\
     -d '{\"blocker_type\": \"qa_failure\", \"summary\": \"[summary]\"}'
   curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_ID \\
     -H 'Content-Type: application/json' \\
     -d '{\"status\": \"qa_failed\"}'
   \`\`\`

---

## Heartbeat (every 5-10 min)

\`\`\`bash
curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/heartbeat
\`\`\`

---

⛔ **REMEMBER:** If you didn't EXECUTE it, you didn't TEST it. Read the SOP!"

    # Launch in tmux - run in worktree directory
    # Use remain-on-exit so the session stays after claude exits
    echo "Launching Claude Code in tmux session: $SESSION_NAME"
    
    # Create log file for this agent
    local LOG_FILE="$MAIN_REPO_DIR/.agent-logs/qa-$TICKET_ID-$(date +%Y%m%dT%H%M%S).log"
    mkdir -p "$MAIN_REPO_DIR/.agent-logs"
    
    # Write prompt to file (avoids shell escaping issues with special characters)
    local PROMPT_TEMP_FILE="$MAIN_REPO_DIR/.agent-logs/qa-$TICKET_ID-prompt.txt"
    echo "$CLAUDE_PROMPT" > "$PROMPT_TEMP_FILE"
    
    # Start Cloudflare tunnel for remote access (optional)
    echo "Starting Cloudflare tunnel for remote preview access..."
    local TUNNEL_URL=$(start_cloudflare_tunnel "$AGENT_PORT" "$TICKET_ID")
    
    if [ -n "$TUNNEL_URL" ]; then
        print_success "Tunnel started: $TUNNEL_URL"
        echo -e "  ${CYAN}Remote access available via tunnel${NC}"
    else
        print_warning "Tunnel not available - using localhost:$AGENT_PORT"
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
claude --model claude-opus-4-20250514 --dangerously-skip-permissions -p "\$(cat '$PROMPT_TEMP_FILE')" 2>&1 | tee '$LOG_FILE'
echo ''
echo '=== Completed: \$(date) ==='

# ─────────────────────────────────────────────────────────────────────────────
# POST-RUN: Ensure session is properly closed
# ─────────────────────────────────────────────────────────────────────────────
echo 'Running post-run checks...'

# Check if session is still running (QA agent didn't call /complete or /block)
SESSION_STATUS=\$(curl -s "http://localhost:3456/api/v2/agents/$DB_SESSION_ID" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "\$SESSION_STATUS" = "running" ]; then
    echo '⚠ Session still running - QA agent exited without proper cleanup'
    
    # Check ticket status to determine what happened
    TICKET_STATUS=\$(curl -s "http://localhost:3456/api/v2/tickets/$TICKET_ID" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "\$TICKET_STATUS" = "qa_passed" ] || [ "\$TICKET_STATUS" = "qa_approved" ]; then
        # QA passed but forgot to mark session complete
        echo '✓ Ticket passed QA - marking session complete'
        curl -s -X POST "http://localhost:3456/api/v2/agents/$DB_SESSION_ID/complete" \
            -H "Content-Type: application/json" \
            -d '{"completion_file": null}' 2>/dev/null
    elif [ "\$TICKET_STATUS" = "qa_failed" ] || [ "\$TICKET_STATUS" = "blocked" ]; then
        # QA failed but forgot to mark session blocked
        echo '✓ Ticket failed QA - marking session blocked'
        curl -s -X POST "http://localhost:3456/api/v2/agents/$DB_SESSION_ID/block" \
            -H "Content-Type: application/json" \
            -d '{"blocker_type": "qa_failure", "summary": "QA failed - session cleanup"}' 2>/dev/null
    else
        # QA agent crashed without updating anything - mark as crashed
        echo '✗ QA agent crashed without updating status - marking session crashed'
        curl -s -X POST "http://localhost:3456/api/v2/agents/$DB_SESSION_ID/crash" \
            -H "Content-Type: application/json" \
            -d '{"reason": "Agent exited without updating ticket or session status"}' 2>/dev/null
    fi
else
    echo "✓ Session already closed (status: \$SESSION_STATUS)"
fi

# Cleanup tunnel on exit
pkill -f "cloudflared.*localhost:$AGENT_PORT" 2>/dev/null || true

# Cleanup dev server on this port (kills all processes using the port)
echo "Cleaning up dev server on port $AGENT_PORT..."
lsof -ti :$AGENT_PORT | xargs kill -9 2>/dev/null || true

# Cleanup any vite/vitest/tsx processes from this worktree
echo "Cleaning up dev processes from worktree..."
pkill -9 -f "vite.*$WORKTREE_DIR" 2>/dev/null || true
pkill -9 -f "vitest.*$WORKTREE_DIR" 2>/dev/null || true
pkill -9 -f "tsx.*$WORKTREE_DIR" 2>/dev/null || true
pkill -9 -f "$WORKTREE_DIR/.*node_modules" 2>/dev/null || true

echo "✓ Cleanup complete"

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

