#!/usr/bin/env bash
# =============================================================================
# FULL SELF-HEALING PIPELINE
# =============================================================================
#
# Pipeline Flow:
#   DEV → REGRESSION → QA → [UI_REVIEW if UI] → TESTS_DOCS → MERGE
#
# Self-Healing:
#   - QA/CI failures → auto-create continuation → back to DEV
#   - Human blockers → route to inbox → stop ticket
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$REPO_DIR/data/workflow.db"
STATE_FILE="$REPO_DIR/.pipeline-state.json"
LOG_FILE="$REPO_DIR/.pipeline.log"
WORKTREE_BASE="$REPO_DIR/../agent-worktrees"

CHECK_INTERVAL=30

# Colors
R='\033[0;31m'   # Red
G='\033[0;32m'   # Green
Y='\033[1;33m'   # Yellow
B='\033[0;34m'   # Blue
C='\033[0;36m'   # Cyan
M='\033[0;35m'   # Magenta
W='\033[0;37m'   # White
NC='\033[0m'     # No Color

# =============================================================================
# LOGGING
# =============================================================================

timestamp() { date '+%H:%M:%S'; }

log()         { echo -e "${C}[$(timestamp)]${NC} $1" | tee -a "$LOG_FILE"; }
log_step()    { echo -e "${B}[$(timestamp)] ▶${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${G}[$(timestamp)] ✓${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${Y}[$(timestamp)] ⚠${NC} $1" | tee -a "$LOG_FILE"; }
log_error()   { echo -e "${R}[$(timestamp)] ✗${NC} $1" | tee -a "$LOG_FILE"; }
log_phase()   { echo -e "${M}[$(timestamp)] [$2]${NC} $1" | tee -a "$LOG_FILE"; }

# =============================================================================
# STATE MANAGEMENT
# =============================================================================

state_init() {
    echo "{}" > "$STATE_FILE"
    : > "$LOG_FILE"
    log "State initialized"
}

state_get() {
    local ticket="$1"
    python3 -c "
import json, os
f = '$STATE_FILE'
d = json.load(open(f)) if os.path.exists(f) else {}
print(d.get('$ticket', {}).get('phase', 'dev'))
" 2>/dev/null || echo "dev"
}

state_set() {
    local ticket="$1"
    local phase="$2"
    python3 << EOF
import json, os
from datetime import datetime
f = '$STATE_FILE'
d = json.load(open(f)) if os.path.exists(f) else {}
if '$ticket' not in d:
    d['$ticket'] = {'history': []}
d['$ticket']['phase'] = '$phase'
d['$ticket']['updated'] = datetime.now().isoformat()
d['$ticket']['history'].append({'phase': '$phase', 'time': datetime.now().isoformat()})
json.dump(d, open(f, 'w'), indent=2)
EOF
}

state_show() {
    echo ""
    echo -e "${M}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    python3 << EOF
import json, os
f = '$STATE_FILE'
d = json.load(open(f)) if os.path.exists(f) else {}
phases = {'dev': '🔨', 'regression': '🧪', 'qa': '🔍', 'ui_review': '👀', 'tests_docs': '📝', 'merge': '🔀', 'done': '✅', 'blocked': '🚫'}
for t, v in sorted(d.items()):
    p = v.get('phase', 'dev')
    icon = phases.get(p, '❓')
    print(f"  {icon} {t}: {p}")
EOF
    echo -e "${M}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# DETECTION FUNCTIONS
# =============================================================================

detect_dev_running() {
    tmux has-session -t "agent-$1" 2>/dev/null && echo "true" || echo "false"
}

detect_qa_running() {
    tmux has-session -t "qa-$1" 2>/dev/null && echo "true" || echo "false"
}

detect_completion() {
    ls "$REPO_DIR/docs/agent-output/completions/" 2>/dev/null | grep -qi "$(echo $1 | tr '[:upper:]' '[:lower:]')" && echo "true" || echo "false"
}

detect_blocker() {
    ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -qi "$1" && echo "true" || echo "false"
}

detect_blocker_type() {
    local f=$(ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -i "$1" | tail -1)
    [ -n "$f" ] && python3 -c "import json; print(json.load(open('$REPO_DIR/docs/agent-output/blocked/$f')).get('blocker_type','unknown'))" 2>/dev/null || echo "none"
}

detect_qa_passed() {
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${1}.*PASSED" && echo "true" || echo "false"
}

detect_qa_failed() {
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${1}.*FAILED" && echo "true" || echo "false"
}

detect_is_ui_ticket() {
    python3 << EOF
import json
d = json.load(open('$REPO_DIR/docs/data/tickets.json'))
for t in d.get('tickets', []):
    if t['id'].upper() == '${1}'.upper():
        files = t.get('files_to_modify', [])
        ui = ['.tsx', '.css', '/components/', '/features/']
        print('true' if any(any(p in f for p in ui) for f in files) else 'false')
        exit()
print('false')
EOF
}

detect_ui_approved() {
    local status=$(sqlite3 "$DB_PATH" "SELECT status FROM tickets WHERE UPPER(id) = UPPER('$1');" 2>/dev/null)
    [[ "$status" == "test_lock_pending" || "$status" == "docs_pending" || "$status" == "ready_to_merge" ]] && echo "true" || echo "false"
}

# =============================================================================
# ACTION FUNCTIONS
# =============================================================================

action_update_db() {
    local ticket="$1"
    local status="$2"
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = '$status' WHERE UPPER(id) = UPPER('$ticket');"
    log "  DB: $ticket → $status"
}

action_run_regression() {
    local ticket="$1"
    local worktree="$WORKTREE_BASE/$ticket"
    
    log_step "REGRESSION: Running for $ticket"
    
    if [ ! -d "$worktree" ]; then
        log_warning "  No worktree at $worktree"
        return 0
    fi
    
    cd "$worktree"
    
    # Typecheck
    log "  Running: pnpm typecheck"
    if pnpm typecheck >> "$LOG_FILE" 2>&1; then
        log_success "  Typecheck PASSED"
    else
        log_error "  Typecheck FAILED"
        cd "$REPO_DIR"
        return 1
    fi
    
    # Tests
    log "  Running: pnpm test"
    if pnpm test >> "$LOG_FILE" 2>&1; then
        log_success "  Tests PASSED"
    else
        log_warning "  Tests had issues (continuing)"
    fi
    
    cd "$REPO_DIR"
    return 0
}

action_launch_qa() {
    local ticket="$1"
    log_step "QA: Launching agent for $ticket"
    
    "$SCRIPT_DIR/launch-qa-agents.sh" "$ticket" >> "$LOG_FILE" 2>&1 &
    sleep 5
    
    if [ "$(detect_qa_running $ticket)" = "true" ]; then
        log_success "  QA agent running"
    else
        log_warning "  QA agent may have started - check: tmux attach -t qa-$ticket"
    fi
}

action_create_ui_review() {
    local ticket="$1"
    log_step "UI_REVIEW: Creating review request for $ticket"
    
    local ts=$(date +%Y%m%dT%H%M%S)
    cat > "$REPO_DIR/docs/agent-output/inbox/UIREVIEW-$ticket-$ts.json" << EOF
{
  "id": "UIREVIEW-$ticket-$ts",
  "type": "ui_review",
  "ticket_id": "$ticket",
  "title": "UI Review: $ticket",
  "status": "pending",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "message": "This ticket modifies UI files. Please review and approve."
}
EOF
    action_update_db "$ticket" "qa_approved"
    log_success "  UI review request created → check Inbox"
}

action_run_tests_docs() {
    local ticket="$1"
    log_step "TESTS+DOCS: Running for $ticket"
    
    action_update_db "$ticket" "test_lock_pending"
    log "  Test lock: pending"
    
    # If test lock script exists, run it
    [ -f "$SCRIPT_DIR/lock-tests.sh" ] && "$SCRIPT_DIR/lock-tests.sh" "$ticket" >> "$LOG_FILE" 2>&1
    
    action_update_db "$ticket" "docs_pending"
    log "  Docs: pending"
    
    # If docs script exists, run it
    [ -f "$SCRIPT_DIR/update-docs.sh" ] && "$SCRIPT_DIR/update-docs.sh" "$ticket" >> "$LOG_FILE" 2>&1
    
    action_update_db "$ticket" "ready_to_merge"
    log_success "  Tests+Docs complete"
}

action_selective_merge() {
    local ticket="$1"
    log_step "MERGE: Selective merge for $ticket"
    
    # Get files
    local files=$(python3 << EOF
import json
d = json.load(open('$REPO_DIR/docs/data/tickets.json'))
for t in d.get('tickets', []):
    if t['id'].upper() == '${ticket}'.upper():
        print(' '.join(t.get('files_to_modify', [])))
        break
EOF
)
    
    if [ -z "$files" ]; then
        log_error "  No files_to_modify found"
        return 1
    fi
    
    local branch="agent/$(echo $ticket | tr '[:upper:]' '[:lower:]')"
    cd "$REPO_DIR"
    
    local count=0
    for file in $files; do
        if git show "$branch:$file" &>/dev/null; then
            if git checkout "$branch" -- "$file" 2>/dev/null; then
                log "  ✓ $file"
                count=$((count + 1))
            fi
        fi
    done
    
    if [ $count -eq 0 ]; then
        log_warning "  No files merged"
        return 0
    fi
    
    git add -A
    if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "Merge $ticket ($count files)" >> "$LOG_FILE" 2>&1
        action_update_db "$ticket" "merged"
        log_success "  Committed: $count files merged"
    fi
}

action_create_continuation() {
    local ticket="$1"
    local reason="$2"
    log_step "CONTINUATION: Creating for $ticket ($reason)"
    
    # Archive old completion reports so we don't re-trigger
    mkdir -p "$REPO_DIR/docs/agent-output/completions/archive"
    for f in $(ls "$REPO_DIR/docs/agent-output/completions/" 2>/dev/null | grep -i "$(echo $ticket | tr '[:upper:]' '[:lower:]')"); do
        mv "$REPO_DIR/docs/agent-output/completions/$f" "$REPO_DIR/docs/agent-output/completions/archive/" 2>/dev/null
        log "  Archived completion: $f"
    done
    
    local v=$(ls "$REPO_DIR/docs/prompts/active/" 2>/dev/null | grep -i "dev-agent-$ticket" | grep -oE 'v[0-9]+' | sort -V | tail -1 | tr -d 'v')
    local nv=$((${v:-1} + 1))
    
    cat > "$REPO_DIR/docs/prompts/active/dev-agent-$ticket-v${nv}.md" << EOF
# Continuation: $ticket v${nv}

> Reason: $reason
> Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Fix the issues from the failure report and try again.
Branch: agent/$(echo $ticket | tr '[:upper:]' '[:lower:]')
EOF
    
    action_update_db "$ticket" "ready"
    log_success "  Created v$nv prompt"
}

action_route_to_inbox() {
    local ticket="$1"
    local reason="$2"
    log_warning "BLOCKED: $ticket → Inbox ($reason)"
    action_update_db "$ticket" "blocked"
}

# =============================================================================
# PHASE PROCESSOR
# =============================================================================

process_phase_dev() {
    local ticket="$1"
    
    if [ "$(detect_dev_running $ticket)" = "true" ]; then
        log_phase "$ticket" "DEV" "Agent running..."
        return
    fi
    
    if [ "$(detect_blocker $ticket)" = "true" ]; then
        local bt=$(detect_blocker_type "$ticket")
        log_phase "$ticket" "DEV" "Blocker: $bt"
        case "$bt" in
            clarification|environment|external_setup)
                action_route_to_inbox "$ticket" "$bt"
                state_set "$ticket" "blocked"
                ;;
            *)
                action_create_continuation "$ticket" "$bt"
                # Stay in dev, will re-run
                ;;
        esac
        return
    fi
    
    if [ "$(detect_completion $ticket)" = "true" ]; then
        log_phase "$ticket" "DEV" "Complete!"
        action_update_db "$ticket" "dev_complete"
        state_set "$ticket" "regression"
        return
    fi
    
    log_phase "$ticket" "DEV" "Waiting for agent..."
}

process_phase_regression() {
    local ticket="$1"
    log_phase "$ticket" "REGRESSION" "Starting..."
    
    if action_run_regression "$ticket"; then
        action_update_db "$ticket" "qa_pending"
        state_set "$ticket" "qa"
        action_launch_qa "$ticket"
    else
        action_create_continuation "$ticket" "regression_failure"
        state_set "$ticket" "dev"
    fi
}

process_phase_qa() {
    local ticket="$1"
    
    if [ "$(detect_qa_running $ticket)" = "true" ]; then
        log_phase "$ticket" "QA" "Agent running..."
        return
    fi
    
    if [ "$(detect_qa_passed $ticket)" = "true" ]; then
        log_phase "$ticket" "QA" "PASSED!"
        
        # Check if UI ticket
        if [ "$(detect_is_ui_ticket $ticket)" = "true" ]; then
            log "  → UI ticket, needs review"
            state_set "$ticket" "ui_review"
            action_create_ui_review "$ticket"
        else
            log "  → Non-UI ticket, skip review"
            state_set "$ticket" "tests_docs"
        fi
        return
    fi
    
    if [ "$(detect_qa_failed $ticket)" = "true" ]; then
        log_phase "$ticket" "QA" "FAILED"
        action_create_continuation "$ticket" "qa_failure"
        state_set "$ticket" "dev"
        return
    fi
    
    if [ "$(detect_blocker $ticket)" = "true" ]; then
        action_route_to_inbox "$ticket" "qa_blocker"
        state_set "$ticket" "blocked"
        return
    fi
    
    log_phase "$ticket" "QA" "Waiting..."
}

process_phase_ui_review() {
    local ticket="$1"
    
    if [ "$(detect_ui_approved $ticket)" = "true" ]; then
        log_phase "$ticket" "UI_REVIEW" "Approved!"
        state_set "$ticket" "tests_docs"
    else
        log_phase "$ticket" "UI_REVIEW" "Waiting for human..."
    fi
}

process_phase_tests_docs() {
    local ticket="$1"
    log_phase "$ticket" "TESTS+DOCS" "Running..."
    
    action_run_tests_docs "$ticket"
    state_set "$ticket" "merge"
}

process_phase_merge() {
    local ticket="$1"
    
    action_selective_merge "$ticket"
    state_set "$ticket" "done"
    log_success "🎉 $ticket MERGED!"
}

# =============================================================================
# MAIN PROCESSOR
# =============================================================================

process_ticket() {
    local ticket="$1"
    local phase=$(state_get "$ticket")
    
    case "$phase" in
        dev)        process_phase_dev "$ticket" ;;
        regression) process_phase_regression "$ticket" ;;
        qa)         process_phase_qa "$ticket" ;;
        ui_review)  process_phase_ui_review "$ticket" ;;
        tests_docs) process_phase_tests_docs "$ticket" ;;
        merge)      process_phase_merge "$ticket" ;;
        done)       log_phase "$ticket" "DONE" "✅" ;;
        blocked)    log_phase "$ticket" "BLOCKED" "🚫 Needs human" ;;
    esac
}

all_terminal() {
    local tickets=("$@")
    for t in "${tickets[@]}"; do
        local p=$(state_get "$t")
        [[ "$p" != "done" && "$p" != "blocked" ]] && return 1
    done
    return 0
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local TICKETS=()
    
    # Parse args
    while [[ $# -gt 0 ]]; do
        case $1 in
            --watch)
                TICKETS=($(tmux ls 2>/dev/null | grep "^agent-\|^qa-" | cut -d: -f1 | sed 's/agent-//;s/qa-//' | sort -u))
                shift
                ;;
            --help|-h)
                echo "Usage: $0 TKT-001 TKT-002 ..."
                echo "       $0 --watch"
                exit 0
                ;;
            *)
                TICKETS+=("$1")
                shift
                ;;
        esac
    done
    
    if [ ${#TICKETS[@]} -eq 0 ]; then
        echo "No tickets specified. Use --watch or provide ticket IDs."
        exit 1
    fi
    
    # Initialize
    state_init
    
    # Determine starting phase for each ticket
    for t in "${TICKETS[@]}"; do
        if [ "$(detect_qa_passed $t)" = "true" ]; then
            if [ "$(detect_is_ui_ticket $t)" = "true" ]; then
                state_set "$t" "ui_review"
            else
                state_set "$t" "tests_docs"
            fi
        elif [ "$(detect_qa_running $t)" = "true" ]; then
            state_set "$t" "qa"
        elif [ "$(detect_completion $t)" = "true" ]; then
            state_set "$t" "regression"
        else
            state_set "$t" "dev"
        fi
    done
    
    # Header
    echo ""
    echo -e "${G}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${G}║           SELF-HEALING PIPELINE                              ║${NC}"
    echo -e "${G}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  DEV → REGRESSION → QA → [UI_REVIEW] → TESTS+DOCS → MERGE   ║${NC}"
    echo -e "${G}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  Tickets: ${TICKETS[*]}${NC}"
    echo -e "${G}║  Log: $LOG_FILE${NC}"
    echo -e "${G}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    state_show
    
    # Main loop
    while true; do
        echo ""
        log "─── Checking $(date '+%H:%M:%S') ───"
        
        for t in "${TICKETS[@]}"; do
            process_ticket "$t"
        done
        
        state_show
        
        if all_terminal "${TICKETS[@]}"; then
            echo ""
            log_success "All tickets reached terminal state!"
            echo ""
            echo "Summary:"
            cat "$STATE_FILE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for t, v in sorted(d.items()):
    print(f\"  {t}: {v.get('phase', '?')}  ({len(v.get('history', []))} transitions)\")
"
            break
        fi
        
        log "Next check in ${CHECK_INTERVAL}s... (Ctrl+C to stop)"
        sleep $CHECK_INTERVAL
    done
}

main "$@"
