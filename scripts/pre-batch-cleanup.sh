#!/bin/bash
# =============================================================================
# Pre-Batch Cleanup
# =============================================================================
# Run this before launching a large batch of agents to free up system resources.
# Kills stale processes, clears old jobs/locks, and prunes package cache.
#
# Usage:
#   ./scripts/pre-batch-cleanup.sh           # Standard cleanup
#   ./scripts/pre-batch-cleanup.sh --deep    # Also cleanup merged worktrees
#   ./scripts/pre-batch-cleanup.sh --status  # Just show status, don't clean
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$PROJECT_ROOT/../agent-worktrees"

log() { echo -e "${CYAN}[CLEANUP]${NC} $1"; }
log_success() { echo -e "${GREEN}[CLEANUP]${NC} ✓ $1"; }
log_warning() { echo -e "${YELLOW}[CLEANUP]${NC} ⚠ $1"; }

# =============================================================================
# Status Functions
# =============================================================================

show_status() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    System Resource Status                   ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # CPU
    local cpu=$(top -l 1 -n 0 2>/dev/null | grep "CPU usage" | awk '{print $3}' | tr -d '%')
    echo -e "  ${CYAN}CPU Usage:${NC}        ${cpu:-?}%"
    
    # Memory
    local page_size=$(sysctl -n hw.pagesize 2>/dev/null)
    local free_pages=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | tr -d '.')
    local inactive_pages=$(vm_stat 2>/dev/null | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
    if [ -n "$page_size" ] && [ -n "$free_pages" ]; then
        local free_mb=$(( (free_pages + inactive_pages) * page_size / 1024 / 1024 ))
        echo -e "  ${CYAN}Free Memory:${NC}      ${free_mb}MB"
    fi
    
    # Process counts
    echo ""
    echo -e "  ${CYAN}Running Processes:${NC}"
    local vite_count=$(pgrep -f "vite" 2>/dev/null | wc -l | tr -d ' ')
    local vitest_count=$(pgrep -f "vitest" 2>/dev/null | wc -l | tr -d ' ')
    local tsx_count=$(pgrep -f "tsx.*watch" 2>/dev/null | wc -l | tr -d ' ')
    local node_count=$(pgrep -f "node" 2>/dev/null | wc -l | tr -d ' ')
    local claude_count=$(pgrep -f "claude" 2>/dev/null | wc -l | tr -d ' ')
    local tunnel_count=$(pgrep -f "cloudflared" 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "    vite:         $vite_count"
    echo -e "    vitest:       $vitest_count"
    echo -e "    tsx watch:    $tsx_count"
    echo -e "    node (total): $node_count"
    echo -e "    claude:       $claude_count"
    echo -e "    cloudflared:  $tunnel_count"
    
    # Worktrees
    echo ""
    if [ -d "$WORKTREE_BASE" ]; then
        local worktree_count=$(ls -1 "$WORKTREE_BASE" 2>/dev/null | wc -l | tr -d ' ')
        local worktree_size=$(du -sh "$WORKTREE_BASE" 2>/dev/null | awk '{print $1}')
        echo -e "  ${CYAN}Worktrees:${NC}        $worktree_count (${worktree_size:-?})"
    else
        echo -e "  ${CYAN}Worktrees:${NC}        0"
    fi
    
    # tmux sessions
    local tmux_count=$(tmux ls 2>/dev/null | grep -c "agent-" || echo "0")
    echo -e "  ${CYAN}Agent Sessions:${NC}   $tmux_count"
    
    # DB state
    echo ""
    echo -e "  ${CYAN}Database State:${NC}"
    local pending_jobs=$(sqlite3 "$PROJECT_ROOT/data/workflow.db" "SELECT COUNT(*) FROM jobs WHERE status = 'pending';" 2>/dev/null || echo "?")
    local active_locks=$(sqlite3 "$PROJECT_ROOT/data/workflow.db" "SELECT COUNT(*) FROM file_locks WHERE released_at IS NULL;" 2>/dev/null || echo "?")
    local running_sessions=$(sqlite3 "$PROJECT_ROOT/data/workflow.db" "SELECT COUNT(*) FROM agent_sessions WHERE status = 'running';" 2>/dev/null || echo "?")
    echo -e "    Pending jobs:     $pending_jobs"
    echo -e "    Active locks:     $active_locks"
    echo -e "    Running sessions: $running_sessions"
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_processes() {
    log "Killing stale development processes..."
    
    local killed=0
    
    # Kill vite processes
    local vite_pids=$(pgrep -f "vite" 2>/dev/null | grep -v "$$" || true)
    if [ -n "$vite_pids" ]; then
        echo "$vite_pids" | xargs kill -9 2>/dev/null || true
        killed=$((killed + $(echo "$vite_pids" | wc -l)))
    fi
    
    # Kill vitest processes
    local vitest_pids=$(pgrep -f "vitest" 2>/dev/null || true)
    if [ -n "$vitest_pids" ]; then
        echo "$vitest_pids" | xargs kill -9 2>/dev/null || true
        killed=$((killed + $(echo "$vitest_pids" | wc -l)))
    fi
    
    # Kill tsx watch processes
    local tsx_pids=$(pgrep -f "tsx.*watch" 2>/dev/null || true)
    if [ -n "$tsx_pids" ]; then
        echo "$tsx_pids" | xargs kill -9 2>/dev/null || true
        killed=$((killed + $(echo "$tsx_pids" | wc -l)))
    fi
    
    # Kill cloudflared tunnels
    pkill -9 -f "cloudflared" 2>/dev/null || true
    
    log_success "Killed $killed stale processes"
}

cleanup_ports() {
    log "Freeing common development ports..."
    
    local freed=0
    for port in 3000 3001 3002 3003 3004 3005 3456 5173 5174 5175 5176 5177 5178 5179 5180; do
        local pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            freed=$((freed + 1))
        fi
    done
    
    log_success "Freed $freed ports"
}

cleanup_database() {
    log "Clearing stale database entries..."
    
    cd "$PROJECT_ROOT"
    
    # Clear old pending jobs (more than 1 hour old)
    sqlite3 data/workflow.db "DELETE FROM jobs WHERE status = 'pending' AND created_at < datetime('now', '-1 hour');" 2>/dev/null || true
    
    # Clear stale file locks (more than 2 hours old)
    sqlite3 data/workflow.db "DELETE FROM file_locks WHERE acquired_at < datetime('now', '-2 hours') AND released_at IS NULL;" 2>/dev/null || true
    
    # Mark crashed sessions (running but no heartbeat for 30+ minutes)
    sqlite3 data/workflow.db "UPDATE agent_sessions SET status = 'crashed' WHERE status = 'running' AND last_heartbeat < datetime('now', '-30 minutes');" 2>/dev/null || true
    
    log_success "Cleared stale database entries"
}

cleanup_worktrees() {
    log "Checking for merged worktrees to clean..."
    
    if [ ! -d "$WORKTREE_BASE" ]; then
        log "No worktrees directory found"
        return
    fi
    
    cd "$PROJECT_ROOT"
    git fetch origin 2>/dev/null || true
    
    local cleaned=0
    for worktree in "$WORKTREE_BASE"/TKT-*; do
        if [ -d "$worktree" ]; then
            local ticket_id=$(basename "$worktree")
            local branch="agent/${ticket_id,,}"  # lowercase
            
            # Check if branch is merged to main
            if git merge-base --is-ancestor "$branch" origin/main 2>/dev/null; then
                log "Cleaning merged worktree: $ticket_id"
                git worktree remove "$worktree" --force 2>/dev/null || rm -rf "$worktree"
                git branch -D "$branch" 2>/dev/null || true
                cleaned=$((cleaned + 1))
            fi
        fi
    done
    
    if [ $cleaned -gt 0 ]; then
        log_success "Cleaned $cleaned merged worktrees"
    else
        log "No merged worktrees to clean"
    fi
}

prune_cache() {
    log "Pruning package cache..."
    
    cd "$PROJECT_ROOT"
    pnpm store prune 2>/dev/null || true
    
    log_success "Package cache pruned"
}

# =============================================================================
# Main
# =============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Pre-Batch Cleanup Utility                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

case "${1:-}" in
    --status|-s)
        show_status
        exit 0
        ;;
    --deep|-d)
        DEEP_CLEAN=true
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --status, -s    Show system status without cleaning"
        echo "  --deep, -d      Also cleanup merged worktrees"
        echo "  --help, -h      Show this help"
        echo ""
        exit 0
        ;;
esac

# Show before status
show_status

echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

# Run cleanup steps
cleanup_processes
cleanup_ports
cleanup_database

if [ "${DEEP_CLEAN:-false}" = true ]; then
    cleanup_worktrees
    prune_cache
fi

echo ""
log_success "Cleanup complete!"
echo ""

# Show after status
show_status
