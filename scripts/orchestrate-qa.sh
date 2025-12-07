#!/bin/bash
# =============================================================================
# QA Orchestrator - Parallel QA Agent Launcher
# =============================================================================
# Launches QA agents in parallel using isolated worktrees.
# Does NOT affect your current working directory.
#
# Usage:
#   ./scripts/orchestrate-qa.sh                    # Auto-detect tickets ready for QA
#   ./scripts/orchestrate-qa.sh TKT-001 TKT-002    # Specific tickets
#   ./scripts/orchestrate-qa.sh --list             # List tickets ready for QA
#   ./scripts/orchestrate-qa.sh --status           # Show running QA sessions
#   ./scripts/orchestrate-qa.sh --cleanup          # Remove QA worktrees
#
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
MAIN_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
QA_SCRIPT="$SCRIPT_DIR/run-qa-agent.sh"
WORKTREE_BASE="$MAIN_REPO/../agent-worktrees"
QA_RESULTS_DIR="$MAIN_REPO/docs/agent-output/qa-results"

# Max concurrent agents (based on CPU cores / 2)
MAX_CONCURRENT=${MAX_CONCURRENT:-$(( $(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4) / 2 ))}
[ "$MAX_CONCURRENT" -lt 2 ] && MAX_CONCURRENT=2

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Get tickets ready for QA
# =============================================================================
get_qa_ready_tickets() {
    cd "$MAIN_REPO"
    
    # Get completed tickets from dev-status.json
    local COMPLETED=$(cat docs/data/dev-status.json 2>/dev/null | python3 -c "
import sys,json
try:
    data=json.load(sys.stdin)
    for c in data.get('completed',[]):
        print(c.get('ticket_id','').upper())
except: pass
" 2>/dev/null)
    
    # Get tickets that already have PASSED QA reports
    local ALREADY_PASSED=""
    if [ -d "$QA_RESULTS_DIR" ]; then
        ALREADY_PASSED=$(ls "$QA_RESULTS_DIR"/*PASSED*.md 2>/dev/null | \
            grep -oE '(TKT-[0-9]+|SEC-[0-9]+)' | sort -u | tr '[:lower:]' '[:upper:]')
    fi
    
    # Return completed tickets that don't have PASSED reports yet
    for ticket in $COMPLETED; do
        if ! echo "$ALREADY_PASSED" | grep -q "^${ticket}$"; then
            echo "$ticket"
        fi
    done
}

# =============================================================================
# Commands
# =============================================================================

show_status() {
    print_header "QA Agent Status"
    
    echo ""
    echo -e "${BLUE}Running QA Sessions:${NC}"
    local SESSIONS=$(tmux list-sessions 2>/dev/null | grep "^qa-" || echo "")
    if [ -z "$SESSIONS" ]; then
        echo "  (none)"
    else
        echo "$SESSIONS" | while read line; do
            echo "  • $line"
        done
    fi
    
    echo ""
    echo -e "${BLUE}QA Worktrees:${NC}"
    ls -d "$WORKTREE_BASE"/qa-* 2>/dev/null | while read dir; do
        echo "  • $(basename "$dir")"
    done || echo "  (none)"
    
    echo ""
    echo -e "${BLUE}Recent QA Reports:${NC}"
    ls -lt "$QA_RESULTS_DIR"/*.md 2>/dev/null | head -5 | while read line; do
        echo "  • $(basename "$(echo "$line" | awk '{print $NF}')")"
    done || echo "  (none)"
}

list_tickets() {
    print_header "Tickets Ready for QA"
    
    local TICKETS=$(get_qa_ready_tickets)
    if [ -z "$TICKETS" ]; then
        echo ""
        echo "No tickets ready for QA."
        echo ""
        echo "Tickets are ready for QA when:"
        echo "  1. They appear in docs/data/dev-status.json 'completed' array"
        echo "  2. They don't have a PASSED QA report yet"
    else
        echo ""
        echo "$TICKETS" | while read ticket; do
            # Get branch name
            local BRANCH=$(cd "$MAIN_REPO" && git branch -a | grep -iE "agent/${ticket}" | head -1 | sed 's|.*remotes/origin/||' | tr -d ' *')
            echo "  • $ticket  →  $BRANCH"
        done
    fi
    echo ""
}

cleanup_worktrees() {
    print_header "Cleaning Up QA Worktrees"
    
    # Kill any running QA sessions first
    for session in $(tmux list-sessions 2>/dev/null | grep "^qa-" | cut -d: -f1); do
        echo "Killing session: $session"
        tmux kill-session -t "$session" 2>/dev/null || true
    done
    
    # Remove worktrees
    for worktree in "$WORKTREE_BASE"/qa-*; do
        if [ -d "$worktree" ]; then
            echo "Removing: $(basename "$worktree")"
            git -C "$MAIN_REPO" worktree remove "$worktree" --force 2>/dev/null || rm -rf "$worktree"
        fi
    done
    
    git -C "$MAIN_REPO" worktree prune
    echo ""
    echo -e "${GREEN}Cleanup complete${NC}"
}

# =============================================================================
# Main orchestration
# =============================================================================

run_qa() {
    local TICKETS=("$@")
    
    if [ ${#TICKETS[@]} -eq 0 ]; then
        # Auto-detect tickets ready for QA
        mapfile -t TICKETS < <(get_qa_ready_tickets)
    fi
    
    if [ ${#TICKETS[@]} -eq 0 ]; then
        echo ""
        echo "No tickets to QA."
        echo "Use: $0 --list  to see what's available"
        exit 0
    fi
    
    print_header "QA Orchestrator"
    echo ""
    echo -e "  ${CYAN}Tickets:${NC} ${TICKETS[*]}"
    echo -e "  ${CYAN}Max concurrent:${NC} $MAX_CONCURRENT"
    echo -e "  ${CYAN}Main repo:${NC} $MAIN_REPO (untouched)"
    echo -e "  ${CYAN}Worktrees:${NC} $WORKTREE_BASE/qa-*"
    echo ""
    
    # Launch agents
    local LAUNCHED=0
    local RUNNING=0
    
    for TICKET in "${TICKETS[@]}"; do
        # Wait if we're at max concurrent
        while [ $RUNNING -ge $MAX_CONCURRENT ]; do
            sleep 5
            RUNNING=$(tmux list-sessions 2>/dev/null | grep -c "^qa-" || echo 0)
        done
        
        echo -e "${BLUE}Launching QA for:${NC} $TICKET"
        
        if "$QA_SCRIPT" "$TICKET"; then
            ((LAUNCHED++))
        fi
        
        RUNNING=$(tmux list-sessions 2>/dev/null | grep -c "^qa-" || echo 0)
        
        # Small delay between launches
        sleep 2
    done
    
    echo ""
    print_header "Launch Summary"
    echo ""
    echo -e "  ${GREEN}Launched:${NC} $LAUNCHED agents"
    echo -e "  ${CYAN}Running:${NC} $(tmux list-sessions 2>/dev/null | grep -c "^qa-" || echo 0) sessions"
    echo ""
    echo "Monitor with:"
    echo "  tmux attach -t qa-TKT-XXX   # Attach to specific agent"
    echo "  $0 --status                 # Show all status"
    echo ""
}

# =============================================================================
# Parse arguments
# =============================================================================

case "${1:-}" in
    --list|-l)
        list_tickets
        ;;
    --status|-s)
        show_status
        ;;
    --cleanup|-c)
        cleanup_worktrees
        ;;
    --help|-h)
        echo "Usage: $0 [options] [TICKET_IDS...]"
        echo ""
        echo "Options:"
        echo "  --list, -l      List tickets ready for QA"
        echo "  --status, -s    Show running QA sessions"
        echo "  --cleanup, -c   Remove QA worktrees and sessions"
        echo "  --help, -h      Show this help"
        echo ""
        echo "Examples:"
        echo "  $0                      # Auto-detect and run all"
        echo "  $0 TKT-001 TKT-002      # Run specific tickets"
        echo "  $0 --list               # See what needs QA"
        ;;
    *)
        chmod +x "$QA_SCRIPT"
        run_qa "$@"
        ;;
esac

