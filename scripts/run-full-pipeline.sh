#!/usr/bin/env bash
# =============================================================================
# Full Pipeline Runner - Autonomous Loop
# =============================================================================
# Watches dev agents and automatically chains through the full pipeline:
#   DEV → REGRESSION → QA → MERGE
#
# Usage:
#   ./scripts/run-full-pipeline.sh TKT-010 TKT-020 TKT-013
#   ./scripts/run-full-pipeline.sh --watch  # Watch already-running agents
# =============================================================================

# Colors
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

CHECK_INTERVAL=30

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"; }

# =============================================================================
# State Management (using file instead of associative array)
# =============================================================================

get_phase() {
    local ticket_id="$1"
    if [ -f "$STATE_FILE" ]; then
        python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('$ticket_id', 'dev'))" 2>/dev/null || echo "dev"
    else
        echo "dev"
    fi
}

set_phase() {
    local ticket_id="$1"
    local phase="$2"
    
    if [ -f "$STATE_FILE" ]; then
        python3 -c "
import json
d = json.load(open('$STATE_FILE'))
d['$ticket_id'] = '$phase'
json.dump(d, open('$STATE_FILE', 'w'))
"
    else
        echo "{\"$ticket_id\": \"$phase\"}" > "$STATE_FILE"
    fi
}

init_state() {
    echo "{}" > "$STATE_FILE"
}

# =============================================================================
# Phase Detection
# =============================================================================

is_dev_agent_running() {
    local ticket_id="$1"
    tmux has-session -t "agent-$ticket_id" 2>/dev/null
}

is_qa_agent_running() {
    local ticket_id="$1"
    tmux has-session -t "qa-$ticket_id" 2>/dev/null
}

has_completion_report() {
    local ticket_id="$1"
    ls "$REPO_DIR/docs/agent-output/completions/" 2>/dev/null | grep -qi "$(echo $ticket_id | tr '[:upper:]' '[:lower:]')"
}

has_blocker() {
    local ticket_id="$1"
    ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -qi "$ticket_id"
}

get_blocker_type() {
    local ticket_id="$1"
    local blocker_file=$(ls "$REPO_DIR/docs/agent-output/blocked/" 2>/dev/null | grep -i "$ticket_id" | tail -1)
    if [ -n "$blocker_file" ]; then
        python3 -c "import json; print(json.load(open('$REPO_DIR/docs/agent-output/blocked/$blocker_file')).get('blocker_type','unknown'))" 2>/dev/null || echo "unknown"
    else
        echo "none"
    fi
}

has_qa_passed() {
    local ticket_id="$1"
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${ticket_id}.*PASSED"
}

has_qa_failed() {
    local ticket_id="$1"
    ls "$REPO_DIR/docs/agent-output/qa-results/" 2>/dev/null | grep -qi "${ticket_id}.*FAILED"
}

# =============================================================================
# Phase Transitions
# =============================================================================

launch_qa() {
    local ticket_id="$1"
    log "Launching QA agent for $ticket_id..."
    
    "$SCRIPT_DIR/launch-qa-agents.sh" "$ticket_id" 2>&1 | tail -5
    
    if is_qa_agent_running "$ticket_id"; then
        log_success "QA agent launched for $ticket_id"
        return 0
    else
        log_warning "QA agent may have launched - check tmux"
        return 0
    fi
}

run_dispatch() {
    local ticket_id="$1"
    log "Creating continuation ticket for $ticket_id..."
    
    local current_version=$(ls "$REPO_DIR/docs/prompts/active/" 2>/dev/null | grep -i "dev-agent-$ticket_id" | grep -oE 'v[0-9]+' | sort -V | tail -1 | tr -d 'v')
    local next_version=$((${current_version:-1} + 1))
    
    local continuation_file="$REPO_DIR/docs/prompts/active/dev-agent-$ticket_id-v${next_version}.md"
    
    cat > "$continuation_file" << EOF
# Dev Agent Continuation: $ticket_id-v${next_version}

> **Type:** Continuation (QA FAILED)
> **Previous:** v${current_version:-1}
> **Created:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Instructions

QA found issues. Check the QA report and fix them.

## QA Report

See: docs/agent-output/qa-results/ (look for FAILED report)

## Your Branch

Continue on: agent/$(echo $ticket_id | tr '[:upper:]' '[:lower:]')
EOF
    
    log_success "Created: $continuation_file"
    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'ready' WHERE UPPER(id) = UPPER('$ticket_id');"
}

run_selective_merge() {
    local ticket_id="$1"
    log "Running selective merge for $ticket_id..."
    
    local files_to_merge=$(python3 -c "
import json
d = json.load(open('$REPO_DIR/docs/data/tickets.json'))
for t in d.get('tickets', []):
    if t['id'].upper() == '${ticket_id}'.upper():
        print(' '.join(t.get('files_to_modify', [])))
        break
" 2>/dev/null)
    
    if [ -z "$files_to_merge" ]; then
        log_warning "No files_to_modify found for $ticket_id"
        return 1
    fi
    
    local branch="agent/$(echo $ticket_id | tr '[:upper:]' '[:lower:]')"
    
    cd "$REPO_DIR"
    
    for file in $files_to_merge; do
        if git show "$branch:$file" &>/dev/null; then
            git checkout "$branch" -- "$file" 2>/dev/null && log_success "  Merged: $file" || log_warning "  Skip: $file"
        fi
    done
    
    git add -A
    if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "Selective merge $ticket_id

Files: $files_to_merge"
        log_success "Committed selective merge for $ticket_id"
        sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'merged' WHERE UPPER(id) = UPPER('$ticket_id');"
    else
        log_warning "No changes to commit for $ticket_id"
    fi
    
    return 0
}

# =============================================================================
# Process Ticket
# =============================================================================

process_ticket() {
    local ticket_id="$1"
    local phase=$(get_phase "$ticket_id")
    
    case "$phase" in
        dev)
            if is_dev_agent_running "$ticket_id"; then
                echo -e "  ${YELLOW}$ticket_id${NC}: dev agent running..."
            elif has_blocker "$ticket_id"; then
                local blocker_type=$(get_blocker_type "$ticket_id")
                if [ "$blocker_type" = "clarification" ] || [ "$blocker_type" = "environment" ] || [ "$blocker_type" = "external_setup" ]; then
                    log_warning "$ticket_id blocked ($blocker_type) → inbox"
                    set_phase "$ticket_id" "blocked"
                    sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'blocked' WHERE UPPER(id) = UPPER('$ticket_id');"
                else
                    run_dispatch "$ticket_id"
                fi
            elif has_completion_report "$ticket_id"; then
                log_success "$ticket_id: dev complete → QA"
                set_phase "$ticket_id" "qa"
                sqlite3 "$DB_PATH" "UPDATE tickets SET status = 'qa_pending' WHERE UPPER(id) = UPPER('$ticket_id');"
                launch_qa "$ticket_id"
            else
                echo -e "  ${YELLOW}$ticket_id${NC}: waiting for dev..."
            fi
            ;;
            
        qa)
            if is_qa_agent_running "$ticket_id"; then
                echo -e "  ${CYAN}$ticket_id${NC}: QA agent running..."
            elif has_qa_passed "$ticket_id"; then
                log_success "$ticket_id: QA PASSED → merge"
                set_phase "$ticket_id" "merge"
            elif has_qa_failed "$ticket_id"; then
                log_warning "$ticket_id: QA FAILED → dispatch"
                run_dispatch "$ticket_id"
                set_phase "$ticket_id" "dev"
            elif has_blocker "$ticket_id"; then
                log_warning "$ticket_id: QA blocked → inbox"
                set_phase "$ticket_id" "blocked"
            else
                echo -e "  ${CYAN}$ticket_id${NC}: waiting for QA..."
            fi
            ;;
            
        merge)
            run_selective_merge "$ticket_id"
            set_phase "$ticket_id" "done"
            log_success "$ticket_id: MERGED! ✅"
            ;;
            
        done)
            echo -e "  ${GREEN}$ticket_id${NC}: done ✅"
            ;;
            
        blocked)
            echo -e "  ${RED}$ticket_id${NC}: blocked (needs human)"
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
    
    # Initialize phases
    for ticket_id in "${TICKETS[@]}"; do
        if has_qa_passed "$ticket_id"; then
            set_phase "$ticket_id" "merge"
        elif is_qa_agent_running "$ticket_id"; then
            set_phase "$ticket_id" "qa"
        elif has_completion_report "$ticket_id"; then
            set_phase "$ticket_id" "qa"
        else
            set_phase "$ticket_id" "dev"
        fi
    done
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              AUTONOMOUS PIPELINE RUNNER                    ║${NC}"
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
            break
        fi
        
        sleep $CHECK_INTERVAL
    done
}

main "$@"
