#!/bin/bash
# Batch QA Retest Script
# Launches QA agents in batches with CPU monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_REPO="/Users/ryanodonnell/projects/Digital_greeter"
WORKTREE_BASE="/Users/ryanodonnell/projects/agent-worktrees"
MAX_CONCURRENT=6
CPU_THRESHOLD=85

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $1"; }

get_cpu_usage() {
    top -l 1 -n 0 2>/dev/null | grep "CPU usage" | awk '{print $3}' | tr -d '%' | cut -d'.' -f1 || echo "0"
}

cleanup_vite() {
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "vitest" 2>/dev/null || true
}

wait_for_cpu() {
    while true; do
        local cpu=$(get_cpu_usage)
        cpu=${cpu:-0}
        if [ "$cpu" -lt "$CPU_THRESHOLD" ] 2>/dev/null; then
            break
        fi
        log_warning "CPU at ${cpu}%, waiting..."
        sleep 10
    done
}

get_running_qa_count() {
    local count=$(tmux list-sessions 2>/dev/null | grep -c "qa-retest-" 2>/dev/null || true)
    echo "${count:-0}"
}

wait_for_slot() {
    while true; do
        local running=$(get_running_qa_count)
        running=${running:-0}
        if [ "$running" -lt "$MAX_CONCURRENT" ] 2>/dev/null; then
            break
        fi
        log "Waiting for slot... ($running/$MAX_CONCURRENT running)"
        sleep 30
    done
}

find_branch() {
    local ticket=$1
    local ticket_lower=$(echo "$ticket" | tr '[:upper:]' '[:lower:]')
    
    # Try to find branch
    local branch=$(cd "$MAIN_REPO" && git branch -a | grep -i "agent.*$ticket_lower" | head -1 | sed 's/^[* ]*//' | sed 's|remotes/origin/||')
    
    if [ -z "$branch" ]; then
        # Try without agent/ prefix
        branch=$(cd "$MAIN_REPO" && git branch -a | grep -i "$ticket_lower" | head -1 | sed 's/^[* ]*//' | sed 's|remotes/origin/||')
    fi
    
    echo "$branch"
}

launch_qa() {
    local ticket=$1
    local ticket_upper=$(echo "$ticket" | tr '[:lower:]' '[:upper:]')
    local session="qa-retest-$ticket_upper"
    
    # Try to find existing worktree first
    local worktree=""
    for path in "$WORKTREE_BASE/qa-$ticket_upper" "$WORKTREE_BASE/qa-$ticket" "$WORKTREE_BASE/$ticket_upper" "$WORKTREE_BASE/$ticket"; do
        if [ -d "$path" ]; then
            worktree="$path"
            break
        fi
    done
    
    # Find branch
    local branch=$(find_branch "$ticket")
    if [ -z "$branch" ]; then
        log_error "No branch found for $ticket"
        return 1
    fi
    
    # Skip if already running
    if tmux has-session -t "$session" 2>/dev/null; then
        log_warning "$ticket already running"
        return 0
    fi
    
    # Create worktree if none found
    if [ -z "$worktree" ]; then
        worktree="$WORKTREE_BASE/qa-retest-$ticket_upper"
        cd "$MAIN_REPO"
        git worktree prune 2>/dev/null || true
        
        if git worktree add "$worktree" "origin/$branch" --detach 2>/dev/null; then
            log_success "Created worktree for $ticket"
        elif git worktree add "$worktree" "$branch" --detach 2>/dev/null; then
            log_success "Created worktree for $ticket (local)"
        else
            log_error "Failed to create worktree for $ticket"
            return 1
        fi
    else
        log "Using existing worktree: $worktree"
    fi
    
    # Create launch script
    cat > "/tmp/qa-retest-$ticket.sh" << SCRIPT
#!/bin/bash
cd "$worktree"
claude --model claude-opus-4-20250514 --dangerously-skip-permissions -p "You are a QA Review Agent.

CRITICAL: First read docs/workflow/QA_REVIEW_AGENT_SOP.md for your FULL testing procedure.

Your job is to THOROUGHLY test ticket $ticket on branch: $branch
Your goal is to TRY TO BREAK IT, not just verify the happy path works.

IMPORTANT: Follow Step 2 'Design Your Testing Protocol' BEFORE testing.
Plan out exactly HOW you will verify each acceptance criterion.

If build failures are PRE-EXISTING (same on main and feature branch):
1. STILL TRY running 'pnpm dev' - it often works even with typecheck errors!
2. pnpm dev does NOT depend on pnpm typecheck or pnpm build
3. Only skip browser testing if pnpm dev actually fails to start
4. If dev server works, DO browser testing with Playwright!

Write your QA report to: $MAIN_REPO/docs/agent-output/qa-results/QA-$ticket-RETEST-BATCH.md

When done, create blocker JSON if FAILED:
$MAIN_REPO/docs/agent-output/blocked/QA-$ticket-FAILED-\$(date +%Y%m%dT%H%M%S).json"
SCRIPT
    chmod +x "/tmp/qa-retest-$ticket.sh"
    
    # Launch in tmux
    tmux new-session -d -s "$session" "/tmp/qa-retest-$ticket.sh"
    log_success "Launched $ticket (session: $session)"
    return 0
}

# Main
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           BATCH QA RETEST - $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

TICKETS="$@"
if [ -z "$TICKETS" ]; then
    echo "Usage: $0 TKT-001 TKT-002 ..."
    exit 1
fi

TICKET_COUNT=$(echo "$TICKETS" | wc -w)
echo -e "${BLUE}Tickets to test:${NC} $TICKET_COUNT"
echo -e "${BLUE}Max concurrent:${NC} $MAX_CONCURRENT"
echo -e "${BLUE}CPU threshold:${NC} ${CPU_THRESHOLD}%"
echo ""

# Initial cleanup
log "Cleaning up stale processes..."
cleanup_vite

LAUNCHED=0
FAILED=0

for ticket in $TICKETS; do
    wait_for_slot
    wait_for_cpu
    
    if launch_qa "$ticket"; then
        ((LAUNCHED++))
    else
        ((FAILED++))
    fi
    
    # Brief pause between launches
    sleep 5
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Launched: $LAUNCHED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Monitor with: tmux list-sessions | grep qa-retest"
echo "Attach with:  tmux attach -t qa-retest-TKT-XXX"
echo "Results in:   docs/agent-output/qa-results/"
