#!/bin/bash
# =============================================================================
# Regression Test Runner
# =============================================================================
# Runs unit tests to check for regressions after dev completes.
# 
# Logic:
#   - Tests for files the dev MODIFIED are EXPECTED to fail (behavior changed)
#   - Tests for files the dev DID NOT MODIFY must ALL PASS (no regressions)
#
# Usage:
#   ./scripts/run-regression-tests.sh <TICKET_ID> [BRANCH]
#
# Example:
#   ./scripts/run-regression-tests.sh TKT-006
#   ./scripts/run-regression-tests.sh TKT-006 agent/TKT-006-fix-button
#
# Exit codes:
#   0 - Regression tests passed (no unintended breakage)
#   1 - Regression tests failed (broke something outside ticket scope)
#   2 - Error running tests
# =============================================================================

set -e

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
CLI_SCRIPT="$MAIN_REPO_DIR/scripts/agent-cli.sh"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[REGRESSION]${NC} $1"; }
log_success() { echo -e "${GREEN}[REGRESSION] ✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}[REGRESSION] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[REGRESSION] ✗${NC} $1"; }

# =============================================================================
# Arguments
# =============================================================================

TICKET_ID="$1"
BRANCH="$2"

if [ -z "$TICKET_ID" ]; then
    echo "Usage: $0 <TICKET_ID> [BRANCH]"
    echo ""
    echo "Example: $0 TKT-006"
    exit 2
fi

# Normalize ticket ID
TICKET_ID=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')

# Default branch if not provided
if [ -z "$BRANCH" ]; then
    BRANCH="agent/${TICKET_ID,,}"  # lowercase
fi

log "Running regression tests for $TICKET_ID on branch $BRANCH"

# =============================================================================
# Determine working directory
# =============================================================================

WORKTREE_DIR="$WORKTREE_BASE/$TICKET_ID"

if [ -d "$WORKTREE_DIR" ]; then
    WORK_DIR="$WORKTREE_DIR"
    log "Using worktree: $WORK_DIR"
else
    # Fall back to main repo with branch checkout
    WORK_DIR="$MAIN_REPO_DIR"
    log "Using main repo with branch checkout"
    
    # Stash any uncommitted changes
    cd "$WORK_DIR"
    STASH_NEEDED=false
    if [ -n "$(git status --porcelain)" ]; then
        STASH_NEEDED=true
        git stash push -m "Regression test stash for $TICKET_ID"
    fi
    
    # Checkout the branch
    git fetch origin "$BRANCH" 2>/dev/null || true
    git checkout "$BRANCH" 2>/dev/null || git checkout "origin/$BRANCH" 2>/dev/null || {
        log_error "Could not checkout branch $BRANCH"
        if [ "$STASH_NEEDED" = true ]; then
            git stash pop
        fi
        exit 2
    }
fi

cd "$WORK_DIR"

# =============================================================================
# Find modified files
# =============================================================================

log "Finding modified files..."

# Get files modified compared to main
MODIFIED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only main...HEAD 2>/dev/null || echo "")

if [ -z "$MODIFIED_FILES" ]; then
    log_warning "No modified files found"
    MODIFIED_FILES_ARRAY=()
else
    # macOS bash compatibility: use while loop instead of readarray
    MODIFIED_FILES_ARRAY=()
    while IFS= read -r line; do
        MODIFIED_FILES_ARRAY+=("$line")
    done <<< "$MODIFIED_FILES"
    log "Modified files (${#MODIFIED_FILES_ARRAY[@]}):"
    for f in "${MODIFIED_FILES_ARRAY[@]}"; do
        echo "  - $f"
    done
fi

# =============================================================================
# Find test files to exclude
# =============================================================================

log "Identifying test files to exclude..."

EXCLUDE_PATTERNS=()
EXCLUDED_TESTS=()

for file in "${MODIFIED_FILES_ARRAY[@]}"; do
    # Skip non-source files
    if [[ ! "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
        continue
    fi
    
    # Skip test files themselves
    if [[ "$file" =~ \.test\.(ts|tsx|js|jsx)$ ]]; then
        EXCLUDED_TESTS+=("$file")
        continue
    fi
    
    # Find corresponding test file
    base="${file%.*}"
    for ext in ".test.ts" ".test.tsx" ".test.js" ".test.jsx"; do
        test_file="${base}${ext}"
        if [ -f "$test_file" ]; then
            EXCLUDED_TESTS+=("$test_file")
            break
        fi
    done
done

# Build exclude patterns for vitest/jest
EXCLUDE_ARGS=""
for test_file in "${EXCLUDED_TESTS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --testPathIgnorePatterns=$test_file"
done

if [ ${#EXCLUDED_TESTS[@]} -gt 0 ]; then
    log "Excluding ${#EXCLUDED_TESTS[@]} test files (expected to fail):"
    for f in "${EXCLUDED_TESTS[@]}"; do
        echo "  - $f"
    done
else
    log "No test files to exclude"
fi

# =============================================================================
# Run regression tests
# =============================================================================

log "Running regression tests (excluding modified file tests)..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create temp file for output
OUTPUT_FILE=$(mktemp)
trap "rm -f $OUTPUT_FILE" EXIT

# Run tests
REGRESSION_PASSED=false
TEST_EXIT_CODE=0

# Try vitest first (pnpm test), then jest
if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    # Vitest - use exclude flag
    EXCLUDE_VITEST=""
    for test_file in "${EXCLUDED_TESTS[@]}"; do
        EXCLUDE_VITEST="$EXCLUDE_VITEST --exclude=$test_file"
    done
    
    pnpm test $EXCLUDE_VITEST 2>&1 | tee "$OUTPUT_FILE" || TEST_EXIT_CODE=$?
else
    # Jest - use testPathIgnorePatterns
    pnpm test $EXCLUDE_ARGS 2>&1 | tee "$OUTPUT_FILE" || TEST_EXIT_CODE=$?
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Parse results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Try to parse test counts from output
if grep -q "Tests:" "$OUTPUT_FILE"; then
    # Vitest format
    PASSED_TESTS=$(grep -oP '\d+(?= passed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    FAILED_TESTS=$(grep -oP '\d+(?= failed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
elif grep -q "Test Suites:" "$OUTPUT_FILE"; then
    # Jest format
    PASSED_TESTS=$(grep -oP '\d+(?= passed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    FAILED_TESTS=$(grep -oP '\d+(?= failed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
fi

# Determine if regression tests passed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    REGRESSION_PASSED=true
    log_success "Regression tests PASSED"
else
    REGRESSION_PASSED=false
    log_error "Regression tests FAILED"
    
    # Show failed test files
    echo ""
    log_error "Failed tests (regressions detected):"
    grep -E "FAIL|✗|×|failed" "$OUTPUT_FILE" | head -20 || true
fi

# =============================================================================
# Run modified file tests (informational only)
# =============================================================================

MODIFIED_OUTPUT=""
if [ ${#EXCLUDED_TESTS[@]} -gt 0 ]; then
    echo ""
    log "Running modified file tests (informational - expected to fail)..."
    echo ""
    
    MODIFIED_OUTPUT_FILE=$(mktemp)
    trap "rm -f $MODIFIED_OUTPUT_FILE" EXIT
    
    # Run only the excluded tests
    if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
        pnpm test "${EXCLUDED_TESTS[@]}" 2>&1 | tee "$MODIFIED_OUTPUT_FILE" || true
    else
        pnpm test -- "${EXCLUDED_TESTS[@]}" 2>&1 | tee "$MODIFIED_OUTPUT_FILE" || true
    fi
    
    MODIFIED_OUTPUT=$(cat "$MODIFIED_OUTPUT_FILE")
fi

# =============================================================================
# Report results via API
# =============================================================================

log "Recording results..."

# Call the API to record results
REGRESSION_OUTPUT=$(cat "$OUTPUT_FILE" | head -c 50000)  # Limit size

curl -s -X POST "$DASHBOARD_URL/api/v2/tests/regression" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
        --arg ticket_id "$TICKET_ID" \
        --arg branch "$BRANCH" \
        --argjson modified_files "$(printf '%s\n' "${MODIFIED_FILES_ARRAY[@]}" | jq -R . | jq -s .)" \
        --argjson excluded_tests "$(printf '%s\n' "${EXCLUDED_TESTS[@]}" | jq -R . | jq -s .)" \
        --argjson regression_passed "$REGRESSION_PASSED" \
        --arg regression_output "$REGRESSION_OUTPUT" \
        --arg modified_tests_output "${MODIFIED_OUTPUT:0:10000}" \
        --argjson total_tests "$TOTAL_TESTS" \
        --argjson passed_tests "$PASSED_TESTS" \
        --argjson failed_tests "$FAILED_TESTS" \
        '{
            ticket_id: $ticket_id,
            branch: $branch,
            modified_files: $modified_files,
            excluded_tests: $excluded_tests,
            regression_passed: $regression_passed,
            regression_output: $regression_output,
            modified_tests_output: $modified_tests_output,
            total_tests: $total_tests,
            passed_tests: $passed_tests,
            failed_tests: $failed_tests
        }'
    )" > /dev/null 2>&1 || log_warning "Could not record results to API"

# =============================================================================
# Cleanup
# =============================================================================

# If we stashed changes, restore them
if [ "$WORK_DIR" = "$MAIN_REPO_DIR" ] && [ "$STASH_NEEDED" = true ]; then
    git checkout - 2>/dev/null || true
    git stash pop 2>/dev/null || true
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    REGRESSION TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ticket:          $TICKET_ID"
echo "Branch:          $BRANCH"
echo "Modified files:  ${#MODIFIED_FILES_ARRAY[@]}"
echo "Excluded tests:  ${#EXCLUDED_TESTS[@]}"
echo ""
echo "Total tests:     $TOTAL_TESTS"
echo "Passed:          $PASSED_TESTS"
echo "Failed:          $FAILED_TESTS"
echo ""

if [ "$REGRESSION_PASSED" = true ]; then
    echo -e "${GREEN}RESULT: PASSED${NC}"
    echo "  No regressions detected outside ticket scope."
    echo "  Ticket status updated to: qa_pending"
    echo ""
    exit 0
else
    echo -e "${RED}RESULT: FAILED${NC}"
    echo "  Regressions detected! Dev broke something outside ticket scope."
    echo "  Ticket status updated to: unit_test_failed"
    echo "  A blocker should be created for the dispatch agent."
    echo ""
    exit 1
fi
