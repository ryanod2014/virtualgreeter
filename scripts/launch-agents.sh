#!/bin/bash
# =============================================================================
# Launch Dev Agents in Parallel
# =============================================================================
# Launches Claude Code agents for multiple tickets in parallel tmux sessions.
# Uses worktrees for isolation and ensures agents work in the correct directory.
#
# Usage: 
#   ./scripts/launch-agents.sh TKT-001 TKT-002 TKT-003
#   ./scripts/launch-agents.sh --list              # Show running agents
#   ./scripts/launch-agents.sh --attach TKT-001    # Attach to agent session
#   ./scripts/launch-agents.sh --kill TKT-001      # Kill specific agent
#   ./scripts/launch-agents.sh --kill-all          # Kill all agent sessions
#
# Requirements:
#   - tmux installed (brew install tmux)
#   - ANTHROPIC_API_KEY set in environment
#   - Claude Code CLI installed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
SETUP_SCRIPT="$MAIN_REPO_DIR/scripts/setup-agent-worktree.sh"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================${NC}"
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
        print_error "Claude Code CLI not found. Install from: https://docs.anthropic.com/claude-code"
        exit 1
    fi

    # Check API key
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        print_warning "ANTHROPIC_API_KEY not set in environment"
        print_warning "Claude Code may use OAuth login instead"
        print_warning "For tmux sessions, set: export ANTHROPIC_API_KEY=your-key"
    fi
    
    # Cleanup high-CPU vite/vitest processes before launching
    cleanup_runaway_processes
}

# Kill runaway Vite/Vitest processes that consume too much CPU
cleanup_runaway_processes() {
    local high_cpu_pids=$(ps aux | grep -E "vite|vitest" | grep -v grep | awk '$3 > 50 {print $2}')
    
    if [ -n "$high_cpu_pids" ]; then
        local count=$(echo "$high_cpu_pids" | wc -l | tr -d ' ')
        for pid in $high_cpu_pids; do
            kill -9 "$pid" 2>/dev/null
        done
        print_warning "Killed $count high-CPU vite/vitest processes"
    fi
}

list_agents() {
    print_header "Running Agent Sessions"
    
    SESSIONS=$(tmux ls 2>/dev/null | grep "^agent-" || true)
    
    if [ -z "$SESSIONS" ]; then
        echo "No agent sessions running."
    else
        echo "$SESSIONS"
        echo ""
        echo -e "To attach: ${BLUE}tmux attach -t agent-TKT-XXX${NC}"
        echo -e "To kill:   ${BLUE}$0 --kill TKT-XXX${NC}"
    fi
}

attach_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="agent-$TICKET_ID"
    
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
    local SESSION_NAME="agent-$TICKET_ID"
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_success "Killed session: $SESSION_NAME"
    else
        print_warning "Session '$SESSION_NAME' not found"
    fi
}

kill_all_agents() {
    print_header "Killing All Agent Sessions"
    
    SESSIONS=$(tmux ls 2>/dev/null | grep "^agent-" | cut -d: -f1 || true)
    
    if [ -z "$SESSIONS" ]; then
        echo "No agent sessions to kill."
        return
    fi
    
    for session in $SESSIONS; do
        tmux kill-session -t "$session"
        print_success "Killed: $session"
    done
}

get_prompt_file() {
    local TICKET_ID="$1"
    local TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
    local TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
    
    # Look for prompt file (try various naming conventions)
    for pattern in \
        "docs/prompts/active/dev-agent-${TICKET_LOWER}-v"*.md \
        "docs/prompts/active/dev-agent-${TICKET_UPPER}-v"*.md \
        "docs/prompts/active/dev-agent-${TICKET_ID}-v"*.md; do
        
        # Use glob in worktree directory
        local MATCHES=$(ls $pattern 2>/dev/null | head -1 || true)
        if [ -n "$MATCHES" ]; then
            echo "$MATCHES"
            return
        fi
    done
    
    echo ""
}

launch_agent() {
    local TICKET_ID="$1"
    local SESSION_NAME="agent-$TICKET_ID"
    local WORKTREE_DIR="$WORKTREE_BASE/$TICKET_ID"
    local DASHBOARD_URL="http://localhost:3456"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Launching agent for: $TICKET_ID${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if session already exists
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_warning "Session '$SESSION_NAME' already exists"
        echo -e "  Attach with: ${BLUE}tmux attach -t $SESSION_NAME${NC}"
        echo -e "  Or kill with: ${BLUE}$0 --kill $TICKET_ID${NC}"
        return 1
    fi
    
    # Check for file lock conflicts before launching
    echo "Checking file locks..."
    local TICKET_INFO=$(curl -s --max-time 5 "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" 2>/dev/null)
    if [ -n "$TICKET_INFO" ] && echo "$TICKET_INFO" | grep -q '"files_to_modify"'; then
        # Get files this ticket needs
        local FILES_TO_MODIFY=$(echo "$TICKET_INFO" | python3 -c "import sys,json; files=json.load(sys.stdin).get('files_to_modify',[]); print(' '.join(files) if files else '')" 2>/dev/null)
        
        if [ -n "$FILES_TO_MODIFY" ]; then
            # Check if any are locked
            local LOCKS=$(curl -s --max-time 5 "$DASHBOARD_URL/api/v2/locks" 2>/dev/null)
            if [ -n "$LOCKS" ] && echo "$LOCKS" | grep -q '"locks"'; then
                local LOCKED_FILES=$(echo "$LOCKS" | python3 -c "import sys,json; locks=json.load(sys.stdin).get('locks',[]); print(' '.join([l['file_path'] for l in locks]))" 2>/dev/null)
                
                # Check for conflicts
                for file in $FILES_TO_MODIFY; do
                    if echo "$LOCKED_FILES" | grep -q "$file"; then
                        print_error "File conflict: $file is locked by another agent"
                        echo -e "  Cannot launch $TICKET_ID until lock is released"
                        echo -e "  Check locks with: ${BLUE}./scripts/agent-cli.sh check-locks${NC}"
                        return 1
                    fi
                done
            fi
        fi
        print_success "No file conflicts detected"
    else
        print_warning "Could not check file locks (server may be down)"
    fi
    
    # Setup worktree
    echo "Setting up worktree..."
    if ! "$SETUP_SCRIPT" "$TICKET_ID"; then
        print_error "Failed to setup worktree for $TICKET_ID"
        return 1
    fi
    
    # Register session in database (v2 API) with health check and retry
    local DB_SESSION_ID=""
    local MAX_RETRIES=3
    local RETRY_DELAY=2
    
    # Health check - verify server is running
    local SERVER_HEALTHY=false
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s --max-time 5 "$DASHBOARD_URL/api/v2/tickets" > /dev/null 2>&1; then
            SERVER_HEALTHY=true
            break
        fi
        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}Server not responding, retrying in ${RETRY_DELAY}s... ($i/$MAX_RETRIES)${NC}"
            sleep $RETRY_DELAY
        fi
    done
    
    if [ "$SERVER_HEALTHY" = true ]; then
        # Try to register session with retry
        for i in $(seq 1 $MAX_RETRIES); do
            local REGISTER_RESULT=$(curl -s --max-time 10 -X POST "$DASHBOARD_URL/api/v2/agents/start" \
                -H "Content-Type: application/json" \
                -d "{\"ticket_id\": \"$TICKET_ID\", \"agent_type\": \"dev\", \"tmux_session\": \"$SESSION_NAME\", \"worktree_path\": \"$WORKTREE_DIR\"}" 2>/dev/null)
            
            if echo "$REGISTER_RESULT" | grep -q '"id"'; then
                DB_SESSION_ID=$(echo "$REGISTER_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
                print_success "Registered session: $DB_SESSION_ID"
                break
            fi
            
            if [ $i -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}Session registration failed, retrying... ($i/$MAX_RETRIES)${NC}"
                sleep $RETRY_DELAY
            fi
        done
        
        if [ -z "$DB_SESSION_ID" ]; then
            print_warning "Could not register session after $MAX_RETRIES attempts (continuing without session ID)"
        else
            # Acquire file locks for this ticket's files
            if [ -n "$FILES_TO_MODIFY" ]; then
                echo "Acquiring file locks..."
                local LOCK_RESULT=$(curl -s --max-time 10 -X POST "$DASHBOARD_URL/api/v2/locks/acquire" \
                    -H "Content-Type: application/json" \
                    -d "{\"session_id\": \"$DB_SESSION_ID\", \"ticket_id\": \"$TICKET_ID\", \"files\": $(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('files_to_modify',[])))" 2>/dev/null)}" 2>/dev/null)
                
                if echo "$LOCK_RESULT" | grep -q '"success":true'; then
                    print_success "File locks acquired"
                else
                    print_warning "Could not acquire file locks (continuing anyway)"
                fi
            fi
        fi
    else
        print_warning "PM Dashboard server not running - session will not be tracked"
        echo -e "${YELLOW}  Start the server with: cd docs/pm-dashboard-ui && node server.js${NC}"
    fi
    
    # Find prompt file (check in worktree since it has the docs)
    cd "$WORKTREE_DIR"
    PROMPT_FILE=$(get_prompt_file "$TICKET_ID")
    
    if [ -z "$PROMPT_FILE" ]; then
        print_error "No prompt file found for $TICKET_ID"
        echo "Expected: docs/prompts/active/dev-agent-${TICKET_ID}-v*.md"
        return 1
    fi
    
    print_success "Found prompt: $PROMPT_FILE"
    
    # Build the Claude command
    # IMPORTANT: Use relative paths so Claude stays in the worktree!
    CLAUDE_PROMPT="You are a Dev Agent working in this directory: $(pwd)

CRITICAL: Your workspace is the CURRENT DIRECTORY. All file operations, git commits, 
and code changes MUST be within this directory. Do NOT reference or modify files 
in any other directory.

SESSION_ID: $DB_SESSION_ID
If you have a session ID, call this periodically (every 5-10 minutes of active work):
  curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/heartbeat

Read docs/workflow/DEV_AGENT_SOP.md for your standard operating procedure.
Then execute the ticket instructions in: $PROMPT_FILE

When you complete your work:
1. Commit all changes to git
2. Push your branch to origin
3. Create completion report in docs/agent-output/completions/
4. If you have a session ID, mark complete:
   curl -X POST http://localhost:3456/api/v2/agents/$DB_SESSION_ID/complete -H 'Content-Type: application/json' -d '{\"completion_file\": \"path/to/report.md\"}'"

    # Launch in tmux with API key passed through
    echo "Launching Claude Code in tmux session: $SESSION_NAME"
    
    # Build the wrapper command that runs failsafe after claude exits
    FAILSAFE_SCRIPT="$MAIN_REPO_DIR/scripts/agent-post-run.sh"
    
    # Create tmux session with:
    # 1. API key in environment
    # 2. Session ID in environment
    # 3. Claude command
    # 4. Failsafe script runs after claude exits (regardless of exit code)
    # Auto-exit after completion (no manual Enter required)
    tmux new-session -d -s "$SESSION_NAME" \
        "cd '$WORKTREE_DIR' && export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY' && export AGENT_SESSION_ID='$DB_SESSION_ID' && claude --model claude-opus-4-20250514 --dangerously-skip-permissions -p '$CLAUDE_PROMPT'; '$FAILSAFE_SCRIPT' '$TICKET_ID' '$WORKTREE_DIR' '$DB_SESSION_ID'"
    
    print_success "Agent launched: $SESSION_NAME"
    echo -e "  Worktree: ${CYAN}$WORKTREE_DIR${NC}"
    echo -e "  Session:  ${CYAN}$DB_SESSION_ID${NC}"
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
    --help|-h)
        echo "Launch Dev Agents in Parallel"
        echo ""
        echo "Usage:"
        echo "  $0 TKT-001 TKT-002 TKT-003   Launch agents for tickets"
        echo "  $0 --list                     Show running agent sessions"
        echo "  $0 --attach TKT-001           Attach to agent session"
        echo "  $0 --kill TKT-001             Kill specific agent"
        echo "  $0 --kill-all                 Kill all agent sessions"
        echo ""
        echo "Environment:"
        echo "  ANTHROPIC_API_KEY   Required for Claude Code authentication"
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

print_header "Launching Dev Agents"
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
done

# Summary
print_header "Launch Summary"
echo -e "Launched: ${GREEN}$LAUNCHED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo ""

if [ $LAUNCHED -gt 0 ]; then
    echo "Running sessions:"
    tmux ls 2>/dev/null | grep "^agent-" || true
    echo ""
    echo -e "Monitor all: ${BLUE}tmux attach${NC} then ${CYAN}Ctrl+B${NC} then ${CYAN}s${NC} to switch"
    echo -e "List agents: ${BLUE}$0 --list${NC}"
fi

