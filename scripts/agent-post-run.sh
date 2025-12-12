#!/bin/bash
# =============================================================================
# Agent Post-Run Failsafe
# =============================================================================
# Runs after a Claude agent exits (success or failure).
# Ensures all work is committed and pushed to GitHub.
# Reports completion/failure to the v2 API.
#
# Usage: Called automatically by launch-agents.sh wrapper
#        ./scripts/agent-post-run.sh <TICKET_ID> <WORKTREE_DIR> [SESSION_ID]
# =============================================================================

TICKET_ID="$1"
WORKTREE_DIR="$2"
SESSION_ID="${3:-$AGENT_SESSION_ID}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H%M")
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${CYAN}[FAILSAFE]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[FAILSAFE]${NC} ✓ $1"
}

log_warning() {
    echo -e "${YELLOW}[FAILSAFE]${NC} ⚠ $1"
}

log_error() {
    echo -e "${RED}[FAILSAFE]${NC} ✗ $1"
}

# =============================================================================
# Main
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Agent finished. Running post-run failsafe for $TICKET_ID..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "$WORKTREE_DIR" ]; then
    log_error "Worktree not found: $WORKTREE_DIR"
    exit 1
fi

cd "$WORKTREE_DIR"

BRANCH=$(git branch --show-current)
log "Branch: $BRANCH"

# -----------------------------------------------------------------------------
# Step 1: Check for uncommitted changes
# -----------------------------------------------------------------------------
UNCOMMITTED=$(git status --porcelain)

if [ -n "$UNCOMMITTED" ]; then
    log_warning "Found uncommitted changes:"
    echo "$UNCOMMITTED" | head -20
    
    # Stage all changes
    git add -A
    
    # Create commit
    COMMIT_MSG="$TICKET_ID: Auto-commit by failsafe (agent did not commit)

Files changed:
$(echo "$UNCOMMITTED" | head -10)

Timestamp: $TIMESTAMP"
    
    git commit -m "$COMMIT_MSG" 2>/dev/null && log_success "Auto-committed uncommitted changes" || log "Nothing to commit"
else
    log_success "No uncommitted changes"
fi

# -----------------------------------------------------------------------------
# Step 2: Check for unpushed commits
# -----------------------------------------------------------------------------
# Fetch to make sure we have latest remote state
git fetch origin 2>/dev/null || true

# Check if remote branch exists
REMOTE_BRANCH="origin/$BRANCH"
if git rev-parse --verify "$REMOTE_BRANCH" >/dev/null 2>&1; then
    # Remote exists - check for unpushed commits
    UNPUSHED=$(git log "$REMOTE_BRANCH".."$BRANCH" --oneline 2>/dev/null)
else
    # Remote doesn't exist - all local commits are unpushed
    UNPUSHED=$(git log origin/main.."$BRANCH" --oneline 2>/dev/null)
fi

if [ -n "$UNPUSHED" ]; then
    log_warning "Found unpushed commits:"
    echo "$UNPUSHED" | head -10
    
    # Push to remote
    log "Pushing to origin/$BRANCH..."
    if git push origin "$BRANCH" 2>&1; then
        log_success "Pushed all commits to GitHub"
    else
        log_error "Failed to push. Trying with --set-upstream..."
        git push --set-upstream origin "$BRANCH" 2>&1 && log_success "Pushed with upstream" || log_error "Push failed!"
    fi
else
    log_success "All commits already pushed"
fi

# -----------------------------------------------------------------------------
# Step 3: Verify completion file exists
# -----------------------------------------------------------------------------
COMPLETION_FILE=$(ls docs/agent-output/completions/${TICKET_ID}*.md 2>/dev/null | head -1)

if [ -z "$COMPLETION_FILE" ]; then
    log_warning "No completion file found. Agent may not have finished properly."
    log "Expected: docs/agent-output/completions/${TICKET_ID}-*.md"
    
    # Check if there's a started file (indicates agent began work)
    STARTED_FILE=$(ls docs/agent-output/started/${TICKET_ID}*.json 2>/dev/null | head -1)
    if [ -n "$STARTED_FILE" ]; then
        log "Found started file: $STARTED_FILE"
        log "Agent started but did not complete. May need manual review."
    fi
else
    log_success "Completion file exists: $COMPLETION_FILE"
fi

# -----------------------------------------------------------------------------
# Step 4: Create PR (triggers CI to run full test suite)
# -----------------------------------------------------------------------------
log "Checking for existing PR..."

# Check if gh CLI is available
if command -v gh &> /dev/null; then
    # Check if PR already exists for this branch
    EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null)
    
    if [ -n "$EXISTING_PR" ] && [ "$EXISTING_PR" != "null" ]; then
        log_success "PR #$EXISTING_PR already exists"
        PR_URL=$(gh pr view "$EXISTING_PR" --json url --jq '.url' 2>/dev/null)
    else
        log "Creating PR to trigger CI tests..."
        
        # Get ticket title from prompt file if it exists
        PROMPT_FILE="docs/prompts/active/dev-agent-${TICKET_ID}-v1.md"
        if [ -f "$PROMPT_FILE" ]; then
            TICKET_TITLE=$(head -5 "$PROMPT_FILE" | grep -E "^#|Title:" | head -1 | sed 's/^#\s*//' | sed 's/Title:\s*//')
        fi
        TICKET_TITLE="${TICKET_TITLE:-$TICKET_ID work}"
        
        # Create the PR
        PR_URL=$(gh pr create \
            --title "$TICKET_ID: $TICKET_TITLE" \
            --body "## Summary
- Automated PR from Dev Agent
- Ticket: $TICKET_ID
- Branch: $BRANCH

## CI Tests
⏳ Waiting for CI to run full test suite...

> **Note:** Review CI results to ensure no unintended regressions outside ticket scope.

## Files Changed
\`\`\`
$(git diff --stat origin/main..HEAD 2>/dev/null | tail -20)
\`\`\`
" \
            --draft \
            --base main \
            2>&1)
        
        if [ $? -eq 0 ]; then
            log_success "Created draft PR: $PR_URL"
            log "CI will now run. Check GitHub for test results."
        else
            log_warning "Could not create PR: $PR_URL"
            log "You may need to create PR manually or run: gh auth login"
        fi
    fi
else
    log_warning "gh CLI not installed. PR not created."
    log "Install with: brew install gh && gh auth login"
fi

# -----------------------------------------------------------------------------
# Step 5: Run Regression Tests (CRITICAL - catches unintended breakage)
# -----------------------------------------------------------------------------
REGRESSION_PASSED=true
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log "Running regression tests to check for unintended breakage..."

# Run regression tests if script exists
if [ -f "$MAIN_REPO_DIR/scripts/run-regression-tests.sh" ]; then
    # Run regression tests and capture result
    REGRESSION_OUTPUT=$("$MAIN_REPO_DIR/scripts/run-regression-tests.sh" "$TICKET_ID" "$BRANCH" 2>&1)
    REGRESSION_EXIT_CODE=$?
    
    if [ $REGRESSION_EXIT_CODE -eq 0 ]; then
        log_success "Regression tests PASSED - no unintended breakage"
        REGRESSION_PASSED=true
    else
        log_error "Regression tests FAILED - dev broke something outside ticket scope!"
        REGRESSION_PASSED=false
        
        # Create blocker file for dispatch agent
        BLOCKER_FILE="$MAIN_REPO_DIR/docs/agent-output/blocked/REGRESSION-${TICKET_ID}-$(date +%Y%m%dT%H%M).json"
        
        cat > "$BLOCKER_FILE" << EOF
{
  "ticket_id": "$TICKET_ID",
  "ticket_title": "Regression failure - unintended breakage",
  "branch": "$BRANCH",
  "blocked_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "blocker_type": "regression_failure",
  "summary": "Dev agent broke tests outside ticket scope. Must fix before QA.",
  "failures": [
    {
      "category": "regression",
      "criterion": "No tests outside ticket scope should fail",
      "expected": "All non-modified file tests pass",
      "actual": "Tests failed in files dev did NOT modify",
      "evidence": "See regression test output below"
    }
  ],
  "regression_output": $(echo "$REGRESSION_OUTPUT" | tail -100 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""'),
  "recommendation": "Fix the regressions WITHOUT breaking the original feature. Run pnpm test to identify failing tests.",
  "dispatch_action": "create_continuation_ticket"
}
EOF
        
        log_error "Created blocker: $BLOCKER_FILE"
        log "Dispatch agent will create continuation ticket for regression fix"
    fi
else
    log_warning "Regression test script not found. Skipping regression check."
    log_warning "Expected: $MAIN_REPO_DIR/scripts/run-regression-tests.sh"
fi

# -----------------------------------------------------------------------------
# Step 6: Report to API (v2)
# -----------------------------------------------------------------------------
if [ -n "$SESSION_ID" ]; then
    log "Reporting session status to API..."
    
    if [ -n "$COMPLETION_FILE" ]; then
        if [ "$REGRESSION_PASSED" = true ]; then
            # Regression passed - mark as ready for QA review
            curl -s -X POST "$DASHBOARD_URL/api/v2/agents/$SESSION_ID/complete" \
                -H "Content-Type: application/json" \
                -d "{\"completion_file\": \"$COMPLETION_FILE\"}" > /dev/null 2>&1 \
                && log_success "Session marked as completed" \
                || log_warning "Could not update session status"
            
            # Update ticket status to in_review (ready for QA) - include branch for merge later
            curl -s -X PUT "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"in_review\", \"branch\": \"$BRANCH\"}" > /dev/null 2>&1 \
                && log_success "Ticket status: in_review (waiting for QA)" \
                || log_warning "Could not update ticket status"
        else
            # Regression failed - mark as blocked
            curl -s -X POST "$DASHBOARD_URL/api/v2/agents/$SESSION_ID/block" \
                -H "Content-Type: application/json" \
                -d '{"blocker_type": "regression_failure", "summary": "Regression tests failed - broke code outside ticket scope"}' > /dev/null 2>&1 \
                && log_warning "Session marked as blocked (regression failure)" \
                || log_warning "Could not update session status"
            
            # Update ticket status to blocked - include branch for retry later
            curl -s -X PUT "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"blocked\", \"branch\": \"$BRANCH\"}" > /dev/null 2>&1 \
                || log_warning "Could not update ticket status"
        fi
    else
        # No completion file - mark as potentially crashed
        curl -s -X POST "$DASHBOARD_URL/api/v2/agents/$SESSION_ID/block" \
            -H "Content-Type: application/json" \
            -d '{"blocker_type": "incomplete", "summary": "Agent exited without completion file"}' > /dev/null 2>&1 \
            && log_warning "Session marked as incomplete (no completion file)" \
            || log_warning "Could not update session status"
    fi
else
    log_warning "No session ID - skipping API update"
fi

# -----------------------------------------------------------------------------
# Step 7: Trigger Pipeline Runner (advances ticket through next stages)
# -----------------------------------------------------------------------------
if [ "$REGRESSION_PASSED" = true ]; then
    log "Triggering pipeline runner for next steps..."
    
    # Update ticket to dev_complete status (pipeline will handle unit tests → QA → merge)
    curl -s -X PUT "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" \
        -H "Content-Type: application/json" \
        -d "{\"status\": \"dev_complete\", \"branch\": \"$BRANCH\"}" > /dev/null 2>&1
    
    # Trigger pipeline runner asynchronously (handles unit tests, QA launch, etc.)
    if [ -f "$MAIN_REPO_DIR/scripts/pipeline-runner.js" ]; then
        nohup node "$MAIN_REPO_DIR/scripts/pipeline-runner.js" --event dev_complete "$TICKET_ID" > /dev/null 2>&1 &
        log_success "Pipeline runner triggered for $TICKET_ID"
    else
        log_warning "Pipeline runner not found - manual intervention needed"
    fi
fi

# -----------------------------------------------------------------------------
# Step 8: Final status
# -----------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Post-run complete for $TICKET_ID"
echo ""
echo "Branch:     $BRANCH"
echo "Remote:     $(git remote get-url origin)"
echo "Commit:     $(git log -1 --oneline)"

if [ "$REGRESSION_PASSED" = true ]; then
    echo -e "Regression: ${GREEN}✓ PASSED${NC}"
    echo -e "Status:     ${GREEN}dev_complete${NC} → pipeline running"
else
    echo -e "Regression: ${RED}✗ FAILED${NC}"
    echo -e "Status:     ${RED}blocked${NC} (dispatch will create continuation)"
fi

if [ -n "$SESSION_ID" ]; then
    echo "Session:    $SESSION_ID"
fi
if [ -n "$PR_URL" ]; then
    echo "PR:         $PR_URL"
fi

echo ""
if [ "$REGRESSION_PASSED" = true ]; then
    echo "✅ Dev work complete. Pipeline will:"
    echo "   1. Run unit tests"
    echo "   2. Launch QA agent (if tests pass)"
    echo "   3. Run test-lock/doc agents (if needed)"
    echo "   4. Auto-merge when all gates pass"
else
    echo "❌ REGRESSION DETECTED! Dev broke tests outside ticket scope."
    echo "   Dispatch agent will create continuation ticket for fix."
    echo "   See blocker: docs/agent-output/blocked/REGRESSION-${TICKET_ID}-*.json"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
