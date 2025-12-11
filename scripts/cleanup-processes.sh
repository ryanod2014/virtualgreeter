#!/bin/bash
# =============================================================================
# Cleanup Runaway Processes
# =============================================================================
# Kills Vite/Vitest and other high-CPU node processes that slow down agents.
#
# Usage:
#   ./scripts/cleanup-processes.sh          # Kill high-CPU processes
#   ./scripts/cleanup-processes.sh --all    # Kill ALL vite/vitest processes
#   ./scripts/cleanup-processes.sh --watch  # Continuous monitoring mode
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }

# Kill processes matching pattern with CPU > threshold
kill_high_cpu() {
    local pattern="$1"
    local threshold="${2:-50}"
    local killed=0
    
    while read -r line; do
        if [ -n "$line" ]; then
            local pid=$(echo "$line" | awk '{print $2}')
            local cpu=$(echo "$line" | awk '{print $3}' | cut -d'.' -f1)
            local cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
            
            if [ "$cpu" -gt "$threshold" ] 2>/dev/null; then
                log_warning "Killing PID $pid (${cpu}% CPU): $cmd"
                kill -9 "$pid" 2>/dev/null && killed=$((killed + 1))
            fi
        fi
    done < <(ps aux | grep -E "$pattern" | grep -v grep | grep -v "cleanup-processes")
    
    echo $killed
}

# Show current process status
show_status() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}                    PROCESS STATUS                          ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}High-CPU Vite/Vitest processes:${NC}"
    ps aux | grep -E "vite|vitest" | grep -v grep | grep -v "cleanup-processes" | awk '$3 > 10 {printf "  PID %s: %.0f%% CPU - %s\n", $2, $3, $11}' || echo "  None"
    echo ""
    
    echo -e "${YELLOW}High-CPU Node processes:${NC}"
    ps aux | grep "node" | grep -v grep | grep -v "cleanup-processes" | awk '$3 > 20 {printf "  PID %s: %.0f%% CPU, %.0f%% MEM\n", $2, $3, $4}' | head -10 || echo "  None"
    echo ""
    
    echo -e "${YELLOW}Agent tmux sessions:${NC}"
    tmux ls 2>/dev/null | grep "^agent-" || echo "  None running"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main cleanup
do_cleanup() {
    local all_mode="$1"
    
    log "Starting cleanup..."
    
    if [ "$all_mode" = "all" ]; then
        # Kill ALL vite/vitest processes
        log "Killing ALL vite/vitest processes..."
        pkill -9 -f "vitest" 2>/dev/null
        pkill -9 -f "vite" 2>/dev/null
        log_success "Killed all vite/vitest processes"
    else
        # Only kill high-CPU processes
        local vite_killed=$(kill_high_cpu "vite|vitest" 50)
        
        if [ "$vite_killed" -gt 0 ]; then
            log_success "Killed $vite_killed high-CPU vite/vitest processes"
        else
            log "No high-CPU vite/vitest processes found"
        fi
    fi
    
    # Also clean up any zombie/defunct processes
    local zombies=$(ps aux | grep -E "defunct|<defunct>" | grep -v grep | wc -l | tr -d ' ')
    if [ "$zombies" -gt 0 ]; then
        log_warning "Found $zombies zombie processes (requires parent cleanup)"
    fi
    
    echo ""
    show_status
}

# Watch mode - continuous monitoring
watch_mode() {
    log "Starting watch mode (Ctrl+C to stop)..."
    
    while true; do
        clear
        show_status
        
        # Auto-kill if CPU is really high
        local vite_killed=$(kill_high_cpu "vite|vitest" 80)
        if [ "$vite_killed" -gt 0 ]; then
            log_success "Auto-killed $vite_killed runaway processes"
        fi
        
        echo ""
        echo -e "Auto-killing processes >80% CPU. Refreshing every 10s..."
        sleep 10
    done
}

# Parse arguments
case "$1" in
    --all|-a)
        do_cleanup "all"
        ;;
    --watch|-w)
        watch_mode
        ;;
    --status|-s)
        show_status
        ;;
    --help|-h)
        echo "Cleanup Runaway Processes"
        echo ""
        echo "Usage:"
        echo "  $0              Kill high-CPU (>50%) vite/vitest processes"
        echo "  $0 --all        Kill ALL vite/vitest processes"
        echo "  $0 --watch      Continuous monitoring + auto-cleanup"
        echo "  $0 --status     Show current process status"
        ;;
    *)
        do_cleanup
        ;;
esac



