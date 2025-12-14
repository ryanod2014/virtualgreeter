#!/bin/bash
# =============================================================================
# QA Agent Orchestrator - Smart Parallel QA Launcher
# =============================================================================
# Launches QA Review agents in parallel, throttled by CPU/memory.
# Automatically detects tickets ready for QA (completed dev work).
#
# Usage:
#   ./scripts/orchestrate-qa-agents.sh                    # Auto-detect QA-ready tickets
#   ./scripts/orchestrate-qa-agents.sh TKT-001 TKT-002    # Specific tickets
#   ./scripts/orchestrate-qa-agents.sh --max 5            # Set max concurrent
#   ./scripts/orchestrate-qa-agents.sh --dry-run          # Preview without launching
#
# Options:
#   --max N      Maximum concurrent QA agents (default: auto-detect)
#   --dry-run    Show what would be launched without launching
# =============================================================================

set -e
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCH_SCRIPT="$MAIN_REPO_DIR/scripts/launch-qa-agents.sh"
LOG_DIR="$MAIN_REPO_DIR/.agent-logs"

# Defaults
MAX_CONCURRENT=""  # Empty = auto-detect
DRY_RUN=false
YES_FLAG=false
TICKETS=()

# CPU threshold - don't launch if CPU > this %
CPU_THRESHOLD=70
# Memory threshold - don't launch if free memory < this MB
MEM_THRESHOLD_MB=2000
# Check interval in seconds
CHECK_INTERVAL=30

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

# Get current CPU usage (macOS)
get_cpu_usage() {
    top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | tr -d '%' | cut -d'.' -f1
}

# Get free memory in MB (macOS)
get_free_memory_mb() {
    local page_size=$(sysctl -n hw.pagesize)
    local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
    local inactive_pages=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
    echo $(( (free_pages + inactive_pages) * page_size / 1024 / 1024 ))
}

# Get number of CPU cores
get_cpu_cores() {
    sysctl -n hw.ncpu
}

# Auto-detect max concurrent based on system
auto_detect_max() {
    local cores=$(get_cpu_cores)
    local free_mem=$(get_free_memory_mb)
    
    # QA agents are lighter than dev agents - can run more
    local by_cores=$((cores / 2))
    local by_memory=$((free_mem / 1500))
    
    local max=$((by_cores < by_memory ? by_cores : by_memory))
    max=$((max < 2 ? 2 : max))
    max=$((max > 10 ? 10 : max))
    
    echo $max
}

# Check if system can handle another agent
can_launch_more() {
    local cpu=$(get_cpu_usage)
    local mem=$(get_free_memory_mb)
    
    if [ "$cpu" -gt "$CPU_THRESHOLD" ]; then
        log_warning "CPU too high: ${cpu}% > ${CPU_THRESHOLD}%"
        return 1
    fi
    
    if [ "$mem" -lt "$MEM_THRESHOLD_MB" ]; then
        log_warning "Memory too low: ${mem}MB < ${MEM_THRESHOLD_MB}MB"
        return 1
    fi
    
    return 0
}

# Get running QA agent sessions
get_running_agents() {
    tmux ls 2>/dev/null | grep "^qa-" | cut -d: -f1 | sed 's/qa-//' || true
}

# Count running QA agents
count_running_agents() {
    local running=$(get_running_agents)
    if [ -z "$running" ]; then
        echo 0
    else
        echo "$running" | wc -l | tr -d ' '
    fi
}

# Check if a specific QA agent is still running
is_agent_running() {
    local ticket_id="$1"
    tmux has-session -t "qa-$ticket_id" 2>/dev/null
}

# Get tickets that are ready for QA (have branches but no QA result yet)
get_qa_ready_tickets() {
    cd "$MAIN_REPO_DIR"
    
    # Try v2 API first (database-backed)
    local V2_RESULT=$(curl -s "http://localhost:3456/api/v2/tickets?status=qa_pending" 2>/dev/null)
    
    if echo "$V2_RESULT" | grep -q '"tickets"'; then
        # v2 API available - tickets with qa_pending status
        echo "$V2_RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tickets = d.get('tickets', [])
    print(' '.join(t.get('id', '') for t in tickets))
except:
    pass
" 2>/dev/null
        return
    fi
    
    # Fallback to git branch scanning
    # Get all agent branches
    local BRANCHES=$(git branch -a | grep "agent/" | sed 's/^[* ]*//' | sed 's|remotes/origin/||' | sort -u)
    
    # Get tickets that already have QA results (more flexible pattern)
    local QA_DONE=$(ls docs/agent-output/qa-results/QA-*-PASSED*.md 2>/dev/null | \
        grep -oE '(TKT|SEC)-[0-9]+' | sort -u || true)
    
    # Get tickets that are blocked
    local BLOCKED=$(ls docs/agent-output/blocked/QA-*-FAILED*.json 2>/dev/null | \
        grep -oE '(TKT|SEC)-[0-9]+' | sort -u || true)
    
    # Get currently running QA agents
    local RUNNING=$(get_running_agents)
    
    # Find tickets with branches that haven't been QA'd
    local READY_TICKETS=()
    
    for BRANCH in $BRANCHES; do
        # Extract ticket ID from branch name (agent/TKT-001-description -> TKT-001)
        local TICKET=$(echo "$BRANCH" | sed 's|agent/||' | grep -oE '^(TKT|SEC)-[0-9]+' | head -1)
        
        if [ -z "$TICKET" ]; then
            continue
        fi
        
        # Skip if already QA'd
        if echo "$QA_DONE" | grep -q "^$TICKET$"; then
            continue
        fi
        
        # Skip if blocked
        if echo "$BLOCKED" | grep -q "^$TICKET$"; then
            continue
        fi
        
        # Skip if already running
        if echo "$RUNNING" | grep -q "^$TICKET$"; then
            continue
        fi
        
        # Skip duplicates
        if [[ " ${READY_TICKETS[*]} " =~ " ${TICKET} " ]]; then
            continue
        fi
        
        READY_TICKETS+=("$TICKET")
    done
    
    echo "${READY_TICKETS[@]}"
}

# Register QA agent session in database
register_qa_session() {
    local TICKET_ID="$1"
    local TMUX_SESSION="$2"
    local WORKTREE="$3"
    
    # Try to register with v2 API
    local RESULT=$(curl -s -X POST "http://localhost:3456/api/v2/agents/start" \
        -H "Content-Type: application/json" \
        -d "{\"ticket_id\": \"$TICKET_ID\", \"agent_type\": \"qa\", \"tmux_session\": \"$TMUX_SESSION\", \"worktree_path\": \"$WORKTREE\"}" 2>/dev/null)
    
    if echo "$RESULT" | grep -q '"id"'; then
        echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null
    fi
}

# Launch a single QA agent
launch_agent() {
    local ticket_id="$1"
    
    if is_agent_running "$ticket_id"; then
        log_warning "$ticket_id already running"
        return 1
    fi
    
    log "Launching QA for $ticket_id..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would launch: $ticket_id"
        return 0
    fi
    
    # Use the launch script
    "$LAUNCH_SCRIPT" "$ticket_id" > /dev/null 2>&1
    
    sleep 2
    
    if is_agent_running "$ticket_id"; then
        log_success "Launched QA for $ticket_id"
        
        # Register session in DB
        local WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
        local SESSION_ID=$(register_qa_session "$ticket_id" "qa-$ticket_id" "$WORKTREE_BASE/qa-$ticket_id")
        if [ -n "$SESSION_ID" ]; then
            log "Registered QA session: $SESSION_ID"
        fi
        
        return 0
    else
        log_error "Failed to launch QA for $ticket_id"
        return 1
    fi
}

# Display status
show_status() {
    local running_count=$(count_running_agents)
    local running_list=$(get_running_agents | tr '\n' ' ')
    local pending_count=${#PENDING_TICKETS[@]}
    local completed_count=${#COMPLETED_TICKETS[@]}
    local cpu=$(get_cpu_usage)
    local mem=$(get_free_memory_mb)
    
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}              QA AGENT ORCHESTRATOR                         ${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}Running:${NC}   $running_count / $MAX_CONCURRENT max"
    echo -e "  ${YELLOW}Pending:${NC}   $pending_count tickets"
    echo -e "  ${GREEN}Completed:${NC} $completed_count tickets"
    echo ""
    echo -e "  ${BLUE}CPU:${NC}       ${cpu}% (threshold: ${CPU_THRESHOLD}%)"
    echo -e "  ${BLUE}Memory:${NC}    ${mem}MB free (threshold: ${MEM_THRESHOLD_MB}MB)"
    echo ""
    if [ -n "$running_list" ]; then
        echo -e "  ${CYAN}Active:${NC}    $running_list"
    fi
    if [ ${#PENDING_TICKETS[@]} -gt 0 ]; then
        echo -e "  ${YELLOW}Queue:${NC}     ${PENDING_TICKETS[*]:0:5}$([ ${#PENDING_TICKETS[@]} -gt 5 ] && echo " +$((${#PENDING_TICKETS[@]} - 5)) more")"
    fi
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Press ${CYAN}Ctrl+C${NC} to stop orchestrator (agents keep running)"
    echo -e "  View agent: ${CYAN}tmux attach -t qa-TKT-XXX${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# Main Orchestration Loop
# =============================================================================

PENDING_TICKETS=()
COMPLETED_TICKETS=()

orchestrate() {
    log "Starting QA orchestration loop..."
    
    while true; do
        # Check for completed agents
        for ticket in $(get_running_agents); do
            if ! is_agent_running "$ticket"; then
                log_success "$ticket QA completed!"
                COMPLETED_TICKETS+=("$ticket")
            fi
        done
        
        # Get current counts
        local running=$(count_running_agents)
        local pending=${#PENDING_TICKETS[@]}
        
        # Show status (only clear if interactive terminal)
        [ -t 1 ] && clear
        show_status
        
        # All done?
        if [ $pending -eq 0 ] && [ $running -eq 0 ]; then
            echo ""
            log_success "All QA reviews completed! 🎉"
            echo ""
            echo "Completed tickets: ${COMPLETED_TICKETS[*]}"
            echo ""
            echo "Check results in: docs/agent-output/qa-results/"
            break
        fi
        
        # Try to launch more if we have capacity
        while [ $running -lt $MAX_CONCURRENT ] && [ $pending -gt 0 ]; do
            # Check system resources
            if ! can_launch_more; then
                log "Waiting for resources..."
                break
            fi
            
            # Get next ticket from queue
            local next_ticket="${PENDING_TICKETS[0]}"
            PENDING_TICKETS=("${PENDING_TICKETS[@]:1}")
            
            # Launch it
            if launch_agent "$next_ticket"; then
                running=$((running + 1))
            fi
            
            pending=${#PENDING_TICKETS[@]}
            
            # Small delay between launches
            sleep 3
        done
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# =============================================================================
# Parse Arguments
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --max)
            MAX_CONCURRENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --yes|-y)
            YES_FLAG=true
            shift
            ;;
        --help|-h)
            echo "QA Agent Orchestrator - Smart Parallel QA Launcher"
            echo ""
            echo "Usage:"
            echo "  $0                              Auto-detect QA-ready tickets"
            echo "  $0 TKT-001 TKT-002 ...         Launch specific tickets"
            echo "  $0 --max 5                     Set max concurrent"
            echo "  $0 --dry-run                   Preview without launching"
            echo ""
            echo "Options:"
            echo "  --max N      Maximum concurrent QA agents (default: auto)"
            echo "  --dry-run    Show what would be launched"
            echo "  --yes, -y    Skip confirmation prompt"
            echo "  --help       Show this help"
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            exit 1
            ;;
        *)
            TICKETS+=("$1")
            shift
            ;;
    esac
done

# =============================================================================
# Main
# =============================================================================

# Check for stale processes before launching
STALE_VITE=$(pgrep -f "vite" 2>/dev/null | wc -l | tr -d ' ')
STALE_TSX=$(pgrep -f "tsx.*watch" 2>/dev/null | wc -l | tr -d ' ')
if [ "$STALE_VITE" -gt 5 ] || [ "$STALE_TSX" -gt 5 ]; then
    log_warning "Found $STALE_VITE vite and $STALE_TSX tsx processes - consider running:"
    log_warning "  ./scripts/pre-batch-cleanup.sh"
    echo ""
fi

# Auto-detect max concurrent if not specified
if [ -z "$MAX_CONCURRENT" ]; then
    MAX_CONCURRENT=$(auto_detect_max)
    log "Auto-detected max concurrent: $MAX_CONCURRENT (based on $(get_cpu_cores) cores, $(get_free_memory_mb)MB free)"
fi

# Get tickets - either from args or auto-detect
if [ ${#TICKETS[@]} -eq 0 ]; then
    log "Auto-detecting tickets ready for QA..."
    TICKET_LIST=$(get_qa_ready_tickets)
    
    if [ -z "$TICKET_LIST" ]; then
        log "No tickets ready for QA. All branches have been reviewed or are blocked."
        exit 0
    fi
    
    read -ra TICKETS <<< "$TICKET_LIST"
    log "Found ${#TICKETS[@]} tickets ready for QA: ${TICKETS[*]}"
fi

# Initialize pending queue
PENDING_TICKETS=("${TICKETS[@]}")

# Show initial status
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              QA AGENT ORCHESTRATOR                         ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║   Tickets to QA:     ${#TICKETS[@]}                                       ${NC}"
echo -e "${GREEN}║   Max concurrent:    $MAX_CONCURRENT                                      ${NC}"
echo -e "${GREEN}║   CPU threshold:     ${CPU_THRESHOLD}%                                    ${NC}"
echo -e "${GREEN}║   Memory threshold:  ${MEM_THRESHOLD_MB}MB                                  ${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN - No QA agents will be launched${NC}"
    echo ""
    echo "Would launch QA for these tickets (batches of $MAX_CONCURRENT):"
    for ticket in "${TICKETS[@]}"; do
        echo "  - $ticket"
    done
    exit 0
fi

# Confirm (skip if --yes flag provided)
if [ "$YES_FLAG" = false ]; then
    echo -e "Press ${CYAN}Enter${NC} to start QA reviews, or ${RED}Ctrl+C${NC} to cancel..."
    read -r
fi

# Start orchestration
orchestrate

