#!/bin/bash
# =============================================================================
# Agent Orchestrator - Smart Parallel Launcher
# =============================================================================
# Launches agents in parallel, throttled by CPU/memory.
# Automatically starts more agents as others complete.
#
# Usage:
#   ./scripts/orchestrate-agents.sh TKT-001 TKT-002 TKT-003 ...
#   ./scripts/orchestrate-agents.sh --max 5 TKT-001 TKT-002 ...
#   ./scripts/orchestrate-agents.sh --auto  # Launch all from next batch
#
# Options:
#   --max N      Maximum concurrent agents (default: auto-detect)
#   --auto       Auto-detect tickets from PM dashboard API
#   --dry-run    Show what would be launched without launching
# =============================================================================

set -e

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
LAUNCH_SCRIPT="$MAIN_REPO_DIR/scripts/launch-agents.sh"
LOG_DIR="$MAIN_REPO_DIR/.agent-logs"
STATE_FILE="$LOG_DIR/orchestrator-state.json"

# Defaults
MAX_CONCURRENT=""  # Empty = auto-detect
DRY_RUN=false
AUTO_DETECT=false
TICKETS=()

# CPU threshold - don't launch if CPU > this %
CPU_THRESHOLD=70
# Memory threshold - don't launch if free memory < this MB
MEM_THRESHOLD_MB=2000
# Check interval in seconds
CHECK_INTERVAL=30
# Cleanup interval (every N checks)
CLEANUP_INTERVAL=3
CLEANUP_COUNTER=0

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

# Kill runaway Vite/Vitest processes that consume too much CPU
cleanup_runaway_processes() {
    # Find vite/vitest processes using more than 50% CPU
    local killed=0
    
    # Get PIDs of high-CPU vite processes
    local high_cpu_pids=$(ps aux | grep -E "vite|vitest" | grep -v grep | awk '$3 > 50 {print $2}')
    
    if [ -n "$high_cpu_pids" ]; then
        for pid in $high_cpu_pids; do
            kill -9 "$pid" 2>/dev/null && killed=$((killed + 1))
        done
        if [ $killed -gt 0 ]; then
            log_warning "Killed $killed runaway vite/vitest processes"
        fi
    fi
    
    # Also kill any orphaned node processes from old worktrees
    # (processes whose parent is init/1, consuming >30% CPU)
    local orphan_pids=$(ps aux | grep "node" | grep -v grep | awk '$3 > 30 && $4 > 5 {print $2}')
    
    if [ -n "$orphan_pids" ]; then
        local orphan_count=$(echo "$orphan_pids" | wc -l | tr -d ' ')
        if [ "$orphan_count" -gt 5 ]; then
            log_warning "Found $orphan_count high-CPU node processes - consider manual review"
        fi
    fi
}

# Get current CPU usage (macOS)
get_cpu_usage() {
    # Get CPU usage from top (macOS)
    top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | tr -d '%' | cut -d'.' -f1
}

# Get free memory in MB (macOS)
get_free_memory_mb() {
    # Get page size and free pages
    local page_size=$(sysctl -n hw.pagesize)
    local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
    local inactive_pages=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
    
    # Calculate free + inactive memory in MB
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
    
    # Heuristic: 1 agent per 2 cores, max based on memory (2GB per agent)
    local by_cores=$((cores / 2))
    local by_memory=$((free_mem / 2000))
    
    # Take minimum, but at least 2 and at most 8
    local max=$((by_cores < by_memory ? by_cores : by_memory))
    max=$((max < 2 ? 2 : max))
    max=$((max > 8 ? 8 : max))
    
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

# Get running agent sessions
get_running_agents() {
    tmux ls 2>/dev/null | grep "^agent-" | cut -d: -f1 | sed 's/agent-//' || true
}

# Count running agents
count_running_agents() {
    local running=$(get_running_agents)
    if [ -z "$running" ]; then
        echo 0
    else
        echo "$running" | wc -l | tr -d ' '
    fi
}

# Check if a specific agent is still running
is_agent_running() {
    local ticket_id="$1"
    tmux has-session -t "agent-$ticket_id" 2>/dev/null
}

# Get tickets from PM dashboard API
get_tickets_from_api() {
    curl -s http://localhost:3456/api/data 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tickets = d.get('tickets', {}).get('tickets', [])
    devStatus = d.get('devStatus', {})
    
    completed = set(c.get('ticket_id', '').upper() for c in devStatus.get('completed', []))
    in_progress = set(i.get('ticket_id', '').upper() for i in devStatus.get('in_progress', []))
    
    # Get ready tickets not completed or in progress
    ready = [t for t in tickets if t.get('status') == 'ready' 
             and t.get('id', '').upper() not in completed
             and t.get('id', '').upper() not in in_progress]
    
    # Get locked files from completed tickets
    locked_files = set()
    for t in tickets:
        if t.get('id', '').upper() in completed or t.get('id', '').upper() in in_progress:
            for f in t.get('files_to_modify', []):
                locked_files.add(f)
    
    # Calculate conflict-free batch (greedy)
    batch = []
    batch_files = set(locked_files)
    
    # Sort by priority
    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    ready.sort(key=lambda t: priority_order.get(t.get('priority', 'low'), 4))
    
    for t in ready:
        t_files = set(t.get('files_to_modify', []))
        if not t_files & batch_files:
            batch.append(t.get('id'))
            batch_files |= t_files
    
    print(' '.join(batch))
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null || echo ""
}

# Launch a single agent
launch_agent() {
    local ticket_id="$1"
    
    if is_agent_running "$ticket_id"; then
        log_warning "$ticket_id already running"
        return 1
    fi
    
    log "Launching $ticket_id..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would launch: $ticket_id"
        return 0
    fi
    
    # Use the launch script
    "$LAUNCH_SCRIPT" "$ticket_id" > /dev/null 2>&1
    
    if is_agent_running "$ticket_id"; then
        log_success "Launched $ticket_id"
        return 0
    else
        log_error "Failed to launch $ticket_id"
        return 1
    fi
}

# Save state to file
save_state() {
    mkdir -p "$LOG_DIR"
    local running=$(get_running_agents | tr '\n' ',' | sed 's/,$//')
    local pending=$(echo "${PENDING_TICKETS[@]}" | tr ' ' ',')
    local completed=$(echo "${COMPLETED_TICKETS[@]}" | tr ' ' ',')
    
    cat > "$STATE_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "running": "[$running]",
  "pending": "[$pending]",
  "completed": "[$completed]",
  "max_concurrent": $MAX_CONCURRENT
}
EOF
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
    echo -e "${MAGENTA}                    AGENT ORCHESTRATOR                      ${NC}"
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
    echo -e "  View agent: ${CYAN}tmux attach -t agent-TKT-XXX${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# Main Orchestration Loop
# =============================================================================

# Arrays to track state
PENDING_TICKETS=()
COMPLETED_TICKETS=()

orchestrate() {
    log "Starting orchestration loop..."
    
    # Initial cleanup
    cleanup_runaway_processes
    
    while true; do
        # Periodic cleanup of runaway processes
        CLEANUP_COUNTER=$((CLEANUP_COUNTER + 1))
        if [ $((CLEANUP_COUNTER % CLEANUP_INTERVAL)) -eq 0 ]; then
            cleanup_runaway_processes
        fi
        
        # Check for completed agents
        for ticket in $(get_running_agents); do
            if ! is_agent_running "$ticket"; then
                log_success "$ticket completed!"
                COMPLETED_TICKETS+=("$ticket")
            fi
        done
        
        # Get current counts
        local running=$(count_running_agents)
        local pending=${#PENDING_TICKETS[@]}
        
        # Show status
        clear
        show_status
        
        # All done?
        if [ $pending -eq 0 ] && [ $running -eq 0 ]; then
            echo ""
            log_success "All agents completed! 🎉"
            echo ""
            echo "Completed tickets: ${COMPLETED_TICKETS[*]}"
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
            sleep 2
        done
        
        # Save state
        save_state
        
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
        --auto)
            AUTO_DETECT=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Agent Orchestrator - Smart Parallel Launcher"
            echo ""
            echo "Usage:"
            echo "  $0 TKT-001 TKT-002 TKT-003 ...   Launch specific tickets"
            echo "  $0 --auto                         Auto-detect from dashboard"
            echo "  $0 --max 5 TKT-001 TKT-002 ...   Set max concurrent"
            echo ""
            echo "Options:"
            echo "  --max N      Maximum concurrent agents (default: auto-detect based on CPU/RAM)"
            echo "  --auto       Get ticket list from PM dashboard API"
            echo "  --dry-run    Show what would be launched"
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

# Auto-detect max concurrent if not specified
if [ -z "$MAX_CONCURRENT" ]; then
    MAX_CONCURRENT=$(auto_detect_max)
    log "Auto-detected max concurrent: $MAX_CONCURRENT (based on $(get_cpu_cores) cores, $(get_free_memory_mb)MB free)"
fi

# Get tickets
if [ "$AUTO_DETECT" = true ]; then
    log "Fetching tickets from PM dashboard..."
    TICKET_LIST=$(get_tickets_from_api)
    
    if [ -z "$TICKET_LIST" ]; then
        log_error "Failed to get tickets from dashboard. Is it running at localhost:3456?"
        exit 1
    fi
    
    # Convert to array
    read -ra TICKETS <<< "$TICKET_LIST"
    log "Found ${#TICKETS[@]} tickets: ${TICKETS[*]}"
fi

if [ ${#TICKETS[@]} -eq 0 ]; then
    log_error "No tickets specified. Use --auto or provide ticket IDs."
    echo ""
    echo "Usage: $0 --auto"
    echo "   or: $0 TKT-001 TKT-002 TKT-003"
    exit 1
fi

# Initialize pending queue
PENDING_TICKETS=("${TICKETS[@]}")

# Show initial status
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               AGENT ORCHESTRATOR                           ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║   Tickets to launch: ${#TICKETS[@]}                                     ${NC}"
echo -e "${GREEN}║   Max concurrent:    $MAX_CONCURRENT                                      ${NC}"
echo -e "${GREEN}║   CPU threshold:     ${CPU_THRESHOLD}%                                    ${NC}"
echo -e "${GREEN}║   Memory threshold:  ${MEM_THRESHOLD_MB}MB                                  ${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN - No agents will be launched${NC}"
    echo ""
    echo "Would launch these tickets in batches of $MAX_CONCURRENT:"
    for ticket in "${TICKETS[@]}"; do
        echo "  - $ticket"
    done
    exit 0
fi

# Confirm
echo -e "Press ${CYAN}Enter${NC} to start, or ${RED}Ctrl+C${NC} to cancel..."
read -r

# Start orchestration
orchestrate
