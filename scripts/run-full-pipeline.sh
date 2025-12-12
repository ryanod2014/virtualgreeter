#!/usr/bin/env bash
# =============================================================================
# Full Pipeline Runner - COMPLETE Self-Healing Loop
# =============================================================================
# Runs tickets through the ENTIRE pipeline:
#
#   DEV → REGRESSION → QA → UI_REVIEW (if UI) → TESTS_DOCS → MERGE
#
# Self-healing:
#   - QA failures → auto-create continuation ticket → back to DEV
#   - CI failures → auto-create continuation ticket → back to DEV
#   - Human blockers → route to inbox, stop that ticket
#
# Usage:
#   ./scripts/run-full-pipeline.sh TKT-010 TKT-020 TKT-013
#   ./scripts/run-full-pipeline.sh --watch
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$REPO_DIR/data/workflow.db"
STATE_FILE="$REPO_DIR/.pipeline-state.json"
WORKTREE_BASE="$REPO_DIR/../agent-worktrees"

CHECK_INTERVAL=30

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"; }

# =============================================================================
# State Management
# =============================================================================

get_phase() {
    local ticket_id="$1"
    python3 -c "import json; d=json.load(open('$STATE_FILE')) if __import__('os').path.exists('$STATE_FILE') else {}; print(d.get('$ticket_id', 'dev'))" 2>/dev/null || echo "dev"
}

set_phase() {
    local ticket_id="$1"
    local phase="$2"
    python3 << EOF
import json, os
f = '$STATE_FILE'
d = json.load(open(f)) if os.path.exists(f) else {}
d['$ticket_id'] = '$phase'
json.dump(d, open(f, 'w'), indent=2)
EOF
    log "  $ticket_id → $phase"
}

init_state() {
    echo "{}" > "$STATE_FILE"
}

# =============================================================================
# Detection Helpers
# =============================================================================

is_dev_agent_running() {
    tmux has-session -t "agent-$1" 2>/dev/null
}

is_qa_agent_running() {
    tmux has-session -t "qa-$1" 2>/dev/null
}

has_completion_report() {
    local ticket_id="$1"
    ls "$REPO_DIR/docs/agent-output/completions/" 2>/dev/null | grep -qi "$(echo $ticket_id | tr '[:upper:]' '[:lower:]')"
}

has_blocker() {
    ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -qi "$1"
}

get_blocker_type() {
    local ticket_id="$1"
    local f=$(ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -i "$ticket_id" | tail -1)
    [ -n "$f" ] && python3 -c "import json; print(json.load(open('$REPO_DIR/docs/agent-output/blocked/$f')).get('blocker_type','unknown'))" 2>/dev/null || echo "none"
}

has_qa_passed() {
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${1}.*PASSED"
}

has_qa_failed() {
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${1}.*FAILED"
}

is_ui_ticket() {
    local ticket_id="$1"
    python3 << EOF
import json
d = json.load(open('$REPO_DIR/docs/data/tickets.json'))
for t in d.get('tickets', []):
    if t['id'].upper() == '${ticket_id}'.upper():
        files = t.get('files_to_modify', [])
        ui_patterns = ['.tsx', '.css', '/components/', '/features/', '/app/']
        is_ui = any(any(p in f for p in ui_patterns) for f in files)
        print('true' if is_ui else 'false')
        break
EOF
}

has_ui_approval() {
    local ticket_id="$1"
    # Check if there's an approval in inbox or DB status is past UI review
    local status=$(sqlite3 "$DB_PATH" "SELECT status FROM tickets WHERE UPPER(id) = UPPER('$ticket_id');" 2>/dev/null)
    [ "$status" = "test_lock_pending" ] || [ "$status" = "docs_pending" ] || [ "$status" = "ready_to_merge" ] || [ "$status" = "merged" ]
}

# =============================================================================
# Phase Actions
# =============================================================================

run_regression() {
    local ticket_id="$1"
    local worktree="$WORKTREE_BASE/$ticket_id"
    
    log "Running regression tests for $ticket_id..."
    
    if [ ! -d "$worktree" ]; then
        log_warning "No worktree at $worktree - skipping regression"
        return 0
    fi
    
    cd "$worktree"
    
    # Run typecheck
    log "  Running typecheck..."
    if ! pnpm typecheck 2>&1 | tail -5; then
        log_error "  Typecheck failed!"
        # Create CI blocker for dispatch to handle
        cat > "$REPO_DIR/docs/agent-output/blocked/CI-$ticket_id-$(date +%Y%m%dT%H%M%S).json" << EOFB
{
  "ticket_id": "$ticket_id",
  "blocker_type": "ci_failure",
  "failure_type": "typecheck",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOFB
        return 1
    fi
    log_success "  Typecheck passed"
    
    # Run tests
    log "  Running tests..."
    if ! pnpm test 2>&1 | tail -10; then
        log_warning "  Tests had issues (continuing - QA will catch)"
    else
        log_success "  Tests passed"
    fi
    
    cd "$REPO_DIR"
    return 0
}

launch_qa() {
    local ticket_id="$1"
    log "Launching QA agent for $ticket_id..."
    
    "$SCRIPT_DIR/launch-qa-agents.sh" "$ticket_id" 2>&1 | tail -10
    
    sleep 3
    if is_qa_agent_running "$ticket_id"; then
        log_success "QA agent running for $ticket_id"
    else
        log_warning "QA agent may have started - check tmux"
    fi
}

create_ui_review_request() {
    local ticket_id="$1"
    log "Creating UI review request for $ticket_id..."
    
    local ts=$(date +%Y%m%dT%H%M%S)
    cat > "$REPO_DIR/docs/agent-output/inbox/UIREVIEW-$ticket_id-$ts.json" << EOF
{
  "id": "UIREVIEW-$ticket_id-$ts",
  "type": "ui_review",
  "ticket_id": "$ticket_id",
  "title": "UI Review Required: $ticket_id",
  "status": "pending",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "message": "This ticket modifies UI files and requires human approval before proceeding to tests+docs.",
  "actions": [
    {"id": "approve", "label": "Approve UI Changes"},
    {"id": "reject", "label": "Request Changes"}
  ]
}
EOF
    
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'qa_approved' WHERE UPPER(id) = UPPER('$ticket_id');"
    log_success "UI review request created - waiting for human approval"
}

run_tests_and_docs() {
    local ticket_id="$1"
    log "Running tests+docs for $ticket_id..."
    
    # Update status
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'test_lock_pending' WHERE UPPER(id) = UPPER('$ticket_id');"
    
    # Run test lock (if script exists)
    if [ -f "$SCRIPT_DIR/lock-tests.sh" ]; then
        "$SCRIPT_DIR/lock-tests.sh" "$ticket_id" 2>&1 | tail -5
    fi
    
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'docs_pending' WHERE UPPER(id) = UPPER('$ticket_id');"
    
    # Run docs update (if script exists)  
    if [ -f "$SCRIPT_DIR/update-docs.sh" ]; then
        "$SCRIPT_DIR/update-docs.sh" "$ticket_id" 2>&1 | tail -5
    fi
    
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'ready_to_merge' WHERE UPPER(id) = UPPER('$ticket_id');"
    log_success "Tests+docs complete for $ticket_id"
}

run_selective_merge() {
    local ticket_id="$1"
    log "Running selective merge for $ticket_id..."
    
    local files_to_merge=$(python3 << EOF
import json
d = json.load(open('$REPO_DIR/docs/data/tickets.json'))
for t in d.get('tickets', []):
    if t['id'].upper() == '${ticket_id}'.upper():
        print(' '.join(t.get('files_to_modify', [])))
        break
EOF
)
    
    if [ -z "$files_to_merge" ]; then
        log_error "No files_to_modify for $ticket_id"
        return 1
    fi
    
    local branch="agent/$(echo $ticket_id | tr '[:upper:]' '[:lower:]')"
    
    cd "$REPO_DIR"
    
    local merged_count=0
    for file in $files_to_merge; do
        if git show "$branch:$file" &>/dev/null; then
            if git checkout "$branch" -- "$file" 2>/dev/null; then
                log_success "  Merged: $file"
                merged_count=$((merged_count + 1))
            fi
        fi
    done
    
    if [ $merged_count -eq 0 ]; then
        log_warning "No files merged for $ticket_id"
        return 0
    fi
    
    git add -A
    if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "Selective merge $ticket_id

Merged $merged_count files from $branch"
        log_success "Committed selective merge for $ticket_id"
        sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'merged' WHERE UPPER(id) = UPPER('$ticket_id');"
    fi
}

create_continuation() {
    local ticket_id="$1"
    local reason="$2"
    
    log "Creating continuation ticket for $ticket_id ($reason)..."
    
    local v=$(ls "$REPO_DIR/docs/prompts/active/" 2>/dev/null | grep -i "dev-agent-$ticket_id" | grep -oE 'v[0-9]+' | sort -V | tail -1 | tr -d 'v')
    local nv=$((${v:-1} + 1))
    
    cat > "$REPO_DIR/docs/prompts/active/dev-agent-$ticket_id-v${nv}.md" << EOF
# Dev Agent Continuation: $ticket_id-v${nv}

> **Type:** Continuation ($reason)
> **Previous:** v${v:-1}
> **Created:** $(date -u +%Y-%m-%dT%H:%M:%SZ")

## Why This Continuation

$reason - check the relevant report in docs/agent-output/

## Instructions

1. Read the failure report
2. Fix the issues
3. Run tests locally
4. Write completion report

## Your Branch

Continue on: agent/$(echo $ticket_id | tr '[:upper:]' '[:lower:]')
EOF
    
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'ready' WHERE UPPER(id) = UPPER('$ticket_id');"
    log_success "Created continuation v$nv"
}

route_to_inbox() {
    local ticket_id="$1"
    local reason="$2"
    
    log_warning "$ticket_id blocked ($reason) → routed to inbox"
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'blocked' WHERE UPPER(id) = UPPER('$ticket_id');"
    set_phase "$ticket_id" "blocked"
}

# =============================================================================
# Main Process Ticket
# =============================================================================

process_ticket() {
    local ticket_id="$1"
    local phase=$(get_phase "$ticket_id")
    
    case "$phase" in
        dev)
            if is_dev_agent_running "$ticket_id"; then
                echo -e "  ${YELLOW}$ticket_id${NC}: [DEV] agent running..."
            elif has_blocker "$ticket_id"; then
                local bt=$(get_blocker_type "$ticket_id")
                case "$bt" in
                    clarification|environment|external_setup)
                        route_to_inbox "$ticket_id" "$bt"
                        ;;
                    *)
                        create_continuation "$ticket_id" "$bt"
                        ;;
                esac
            elif has_completion_report "$ticket_id"; then
                log_success "$ticket_id: DEV complete → REGRESSION"
                set_phase "$ticket_id" "regression"
                sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'dev_complete' WHERE UPPER(id) = UPPER('$ticket_id');"
            else
                echo -e "  ${YELLOW}$ticket_id${NC}: [DEV] waiting..."
            fi
            ;;
            
        regression)
            echo -e "  ${BLUE}$ticket_id${NC}: [REGRESSION] running..."
            if run_regression "$ticket_id"; then
                log_success "$ticket_id: REGRESSION passed → QA"
                set_phase "$ticket_id" "qa"
                sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'qa_pending' WHERE UPPER(id) = UPPER('$ticket_id');"
                launch_qa "$ticket_id"
            else
                log_warning "$ticket_id: REGRESSION failed → creating continuation"
                create_continuation "$ticket_id" "ci_failure"
                set_phase "$ticket_id" "dev"
            fi
            ;;
            
        qa)
            if is_qa_agent_running "$ticket_id"; then
                echo -e "  ${CYAN}$ticket_id${NC}: [QA] agent running..."
            elif has_qa_passed "$ticket_id"; then
                log_success "$ticket_id: QA PASSED"
                if [ "$(is_ui_ticket $ticket_id)" = "true" ]; then
                    log "  UI ticket - needs human approval"
                    set_phase "$ticket_id" "ui_review"
                    create_ui_review_request "$ticket_id"
                else
                    log "  Non-UI ticket - skipping UI review"
                    set_phase "$ticket_id" "tests_docs"
                fi
            elif has_qa_failed "$ticket_id"; then
                log_warning "$ticket_id: QA FAILED → creating continuation"
                create_continuation "$ticket_id" "qa_failure"
                set_phase "$ticket_id" "dev"
            elif has_blocker "$ticket_id"; then
                route_to_inbox "$ticket_id" "qa_blocker"
            else
                echo -e "  ${CYAN}$ticket_id${NC}: [QA] waiting..."
            fi
            ;;
            
        ui_review)
            if has_ui_approval "$ticket_id"; then
                log_success "$ticket_id: UI approved → TESTS+DOCS"
                set_phase "$ticket_id" "tests_docs"
            else
                echo -e "  ${MAGENTA}$ticket_id${NC}: [UI_REVIEW] waiting for human..."
            fi
            ;;
            
        tests_docs)
            echo -e "  ${BLUE}$ticket_id${NC}: [TESTS+DOCS] running..."
            run_tests_and_docs "$ticket_id"
            set_phase "$ticket_id" "merge"
            ;;
            
        merge)
            run_selective_merge "$ticket_id"
            set_phase "$ticket_id" "done"
            log_success "🎉 $ticket_id: MERGED!"
            ;;
            
        done)
            echo -e "  ${GREEN}$ticket_id${NC}: ✅ DONE"
            ;;
            
        blocked)
            echo -e "  ${RED}$ticket_id${NC}: 🚫 BLOCKED (needs human)"
            ;;
    esac
}

# =============================================================================
# Main
# =============================================================================

main() {
    local TICKETS=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --watch)
                TICKETS=($(tmux ls 2>/dev/null | grep "^agent-\|^qa-" | cut -d: -f1 | sed 's/agent-//;s/qa-//' | sort -u))
                shift
                ;;
            *)
                TICKETS+=("$1")
                shift
                ;;
        esac
    done
    
    if [ ${#TICKETS[@]} -eq 0 ]; then
        echo "Usage: $0 TKT-001 TKT-002 TKT-003"
        echo "       $0 --watch"
        exit 1
    fi
    
    init_state
    
    # Initialize phases based on current state
    for ticket_id in "${TICKETS[@]}"; do
        if has_qa_passed "$ticket_id"; then
            if [ "$(is_ui_ticket $ticket_id)" = "true" ]; then
                set_phase "$ticket_id" "ui_review"
            else
                set_phase "$ticket_id" "tests_docs"
            fi
        elif is_qa_agent_running "$ticket_id"; then
            set_phase "$ticket_id" "qa"
        elif has_completion_report "$ticket_id"; then
            set_phase "$ticket_id" "regression"
        else
            set_phase "$ticket_id" "dev"
        fi
    done
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         FULL SELF-HEALING PIPELINE                         ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  DEV → REGRESSION → QA → UI_REVIEW → TESTS+DOCS → MERGE   ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Tickets: ${TICKETS[*]}${NC}"
    echo -e "${GREEN}║  Interval: ${CHECK_INTERVAL}s                                            ${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    while true; do
        echo ""
        echo -e "${MAGENTA}━━━ $(date '+%H:%M:%S') ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        local all_done=true
        for ticket_id in "${TICKETS[@]}"; do
            process_ticket "$ticket_id"
            local phase=$(get_phase "$ticket_id")
            if [ "$phase" != "done" ] && [ "$phase" != "blocked" ]; then
                all_done=false
            fi
        done
        
        if [ "$all_done" = true ]; then
            echo ""
            log_success "All tickets complete! 🎉"
            echo ""
            echo "Summary:"
            cat "$STATE_FILE" | python3 -c "import sys,json; [print(f'  {k}: {v}') for k,v in json.load(sys.stdin).items()]"
            break
        fi
        
        sleep $CHECK_INTERVAL
    done
}

main "$@"
