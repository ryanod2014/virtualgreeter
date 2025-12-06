#!/bin/bash
# =============================================================================
# Test Scope Analyzer (with Main Branch Comparison)
# =============================================================================
# Runs tests and categorizes failures as:
#   - PRE-EXISTING: Already failing on main (not your fault)
#   - IN-SCOPE: New failure, but in ticket's files_to_modify (expected)
#   - REGRESSION: New failure OUTSIDE ticket scope (must fix!)
#
# Usage: 
#   ./scripts/analyze-test-scope.sh <TICKET_ID>                    # Run from main repo
#   ./scripts/analyze-test-scope.sh <TICKET_ID> <WORKTREE_DIR>     # Run in worktree
#
# Example:
#   ./scripts/analyze-test-scope.sh TKT-014
#   ./scripts/analyze-test-scope.sh TKT-014 /path/to/agent-worktrees/TKT-014
# =============================================================================

set -e

TICKET_ID="$1"
WORKTREE_DIR="${2:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_REPO="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

if [ -z "$TICKET_ID" ]; then
    echo "Usage: $0 <TICKET_ID> [WORKTREE_DIR]"
    echo "Example: $0 TKT-014"
    exit 1
fi

# =============================================================================
# Step 1: Get ticket's files_to_modify from tickets.json
# =============================================================================
TICKETS_JSON="$MAIN_REPO/docs/data/tickets.json"

if [ ! -f "$TICKETS_JSON" ]; then
    echo -e "${RED}Error: tickets.json not found at $TICKETS_JSON${NC}"
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}TEST SCOPE ANALYZER - $TICKET_ID${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Extract files_to_modify for this ticket
FILES_IN_SCOPE=$(python3 -c "
import json
import sys

with open('$TICKETS_JSON') as f:
    data = json.load(f)

tickets = data.get('tickets', [])
ticket = next((t for t in tickets if t.get('id', '').upper() == '${TICKET_ID}'.upper()), None)

if not ticket:
    print('TICKET_NOT_FOUND', file=sys.stderr)
    sys.exit(1)

files = ticket.get('files_to_modify', [])
for f in files:
    print(f)
" 2>&1)
export FILES_IN_SCOPE

if [ "$FILES_IN_SCOPE" = "TICKET_NOT_FOUND" ]; then
    echo -e "${RED}Error: Ticket $TICKET_ID not found in tickets.json${NC}"
    exit 1
fi

echo -e "${BOLD}Files in ticket scope:${NC}"
if [ -z "$FILES_IN_SCOPE" ]; then
    echo "  (none specified - all failures will be marked as UNKNOWN)"
else
    echo "$FILES_IN_SCOPE" | while read -r f; do echo "  • $f"; done
fi
echo ""

# =============================================================================
# Step 2: Get baseline failures from main branch
# =============================================================================
cd "$WORKTREE_DIR"

MAIN_FAILURES_FILE=$(mktemp)
trap "rm -f $MAIN_FAILURES_FILE" EXIT

echo -e "${BOLD}Step 1: Getting baseline failures from main branch...${NC}"

# Check if we're in a worktree or main repo
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # Get the main branch test failures
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    # Stash any uncommitted changes
    git stash --include-untracked -q 2>/dev/null || true
    
    # Try to checkout main and run tests
    if git checkout main -q 2>/dev/null || git checkout origin/main -q 2>/dev/null; then
        echo -e "${CYAN}Running tests on main branch...${NC}"
        
        MAIN_OUTPUT=$(mktemp)
        (pnpm --filter=@ghost-greeter/server test -- --run 2>&1 || true) > "$MAIN_OUTPUT"
        (pnpm --filter=@ghost-greeter/dashboard test -- --run 2>&1 || true) >> "$MAIN_OUTPUT"
        
        # Extract failing tests from main
        python3 << MAIN_EOF > "$MAIN_FAILURES_FILE"
import re

with open('$MAIN_OUTPUT') as f:
    output = f.read()

fail_patterns = [
    r'FAIL\s+(\S+\.(?:test|spec)\.\w+)',
    r'^\s*FAIL\s+(.+?\.(?:test|spec)\.\w+)',
    r'([\w/.-]+\.(?:test|spec)\.tsx?)\s*\(\d+\)',
]

failed = set()
for pattern in fail_patterns:
    for match in re.finditer(pattern, output, re.MULTILINE):
        failed.add(match.group(1))

for f in sorted(failed):
    print(f)
MAIN_EOF
        
        rm -f "$MAIN_OUTPUT"
        
        MAIN_FAIL_COUNT=$(wc -l < "$MAIN_FAILURES_FILE" | tr -d ' ')
        echo -e "${BLUE}Baseline failures on main: $MAIN_FAIL_COUNT${NC}"
        
        # Return to original branch
        git checkout "$CURRENT_BRANCH" -q 2>/dev/null || git checkout - -q 2>/dev/null || true
        git stash pop -q 2>/dev/null || true
    else
        echo -e "${YELLOW}Could not checkout main branch - skipping baseline comparison${NC}"
    fi
else
    echo -e "${YELLOW}Not in a git repo - skipping baseline comparison${NC}"
fi
echo ""

# =============================================================================
# Step 3: Run tests on current branch
# =============================================================================
echo -e "${BOLD}Step 2: Running tests on current branch...${NC}"

TEST_OUTPUT=$(mktemp)
trap "rm -f $TEST_OUTPUT $MAIN_FAILURES_FILE" EXIT

(pnpm --filter=@ghost-greeter/server test -- --run 2>&1 || true) | tee "$TEST_OUTPUT"
(pnpm --filter=@ghost-greeter/dashboard test -- --run 2>&1 || true) | tee -a "$TEST_OUTPUT"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}SCOPE ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# Step 4: Analyze and categorize failures
# =============================================================================

export TEST_OUTPUT
export FILES_IN_SCOPE
export MAIN_FAILURES_FILE

python3 << 'PYTHON_SCRIPT'
import re
import sys
import os

# Read inputs
test_output_file = os.environ.get('TEST_OUTPUT', '')
main_failures_file = os.environ.get('MAIN_FAILURES_FILE', '')
files_in_scope_raw = os.environ.get('FILES_IN_SCOPE', '')

with open(test_output_file) as f:
    test_output = f.read()

main_failures = set()
if main_failures_file and os.path.exists(main_failures_file):
    with open(main_failures_file) as f:
        main_failures = set(line.strip().lower() for line in f if line.strip())

files_in_scope = [f.strip() for f in files_in_scope_raw.strip().split('\n') if f.strip()]

# Find failed tests on current branch
fail_patterns = [
    r'FAIL\s+(\S+\.(?:test|spec)\.\w+)',
    r'^\s*FAIL\s+(.+?\.(?:test|spec)\.\w+)',
    r'([\w/.-]+\.(?:test|spec)\.tsx?)\s*\(\d+\)',
]

branch_failures = set()
for pattern in fail_patterns:
    for match in re.finditer(pattern, test_output, re.MULTILINE):
        branch_failures.add(match.group(1))

def is_in_scope(test_path):
    """Check if test is in the ticket's scope"""
    if not files_in_scope:
        return False
    
    test_lower = test_path.lower()
    
    # Check app match
    test_app = None
    if 'apps/' in test_lower:
        try:
            test_app = test_lower.split('apps/')[1].split('/')[0]
        except:
            pass
    
    scope_apps = set()
    for f in files_in_scope:
        if f.startswith('apps/') and '/' in f[5:]:
            scope_apps.add(f.split('/')[1])
    
    if test_app and scope_apps and test_app not in scope_apps:
        return False
    
    # Check specific file matches
    for scope_file in files_in_scope:
        scope_lower = scope_file.lower()
        if scope_lower in test_lower:
            return True
        
        # Extract feature name
        parts = scope_file.split('/')
        filename = parts[-1].replace('.tsx', '').replace('.ts', '')
        if len(filename) > 3 and filename.lower() in test_lower:
            return True
    
    return False

def is_preexisting(test_path):
    """Check if test was already failing on main"""
    test_lower = test_path.lower().strip()
    return any(test_lower in m or m in test_lower for m in main_failures)

# Categorize
pre_existing = []
new_in_scope = []
new_regression = []

for test in sorted(branch_failures):
    if is_preexisting(test):
        pre_existing.append(test)
    elif is_in_scope(test):
        new_in_scope.append(test)
    else:
        new_regression.append(test)

# Colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
CYAN = '\033[0;36m'
BLUE = '\033[0;34m'
BOLD = '\033[1m'
NC = '\033[0m'

if not branch_failures:
    print(f"{GREEN}✅ ALL TESTS PASSED!{NC}")
    print(f"\nNo regressions detected. Safe to merge.")
    sys.exit(0)

print(f"{BOLD}Test Failure Summary:{NC}")
print(f"   Total failures:       {len(branch_failures)}")
print(f"   Pre-existing (main):  {len(pre_existing)}")
print(f"   New in-scope:         {len(new_in_scope)}")
print(f"   New regressions:      {len(new_regression)}")
print()

if pre_existing:
    print(f"{BLUE}⏭️  PRE-EXISTING (already failing on main - not your fault): {len(pre_existing)}{NC}")
    for t in pre_existing:
        print(f"   ○ {t}")
    print()

if new_in_scope:
    print(f"{YELLOW}📋 IN-SCOPE (new failure in ticket's area - expected): {len(new_in_scope)}{NC}")
    for t in new_in_scope:
        print(f"   • {t}")
    print()

if new_regression:
    print(f"{RED}🚨 REGRESSION (new failure OUTSIDE ticket scope): {len(new_regression)}{NC}")
    for t in new_regression:
        print(f"   ✗ {t}")
    print()

# Summary and recommendations
print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{NC}")

if new_regression:
    print(f"{RED}{BOLD}❌ REGRESSIONS DETECTED!{NC}")
    print(f"{RED}   {len(new_regression)} test(s) failed OUTSIDE your ticket scope.{NC}")
    print()
    print(f"{BOLD}What to do:{NC}")
    print(f"   1. {YELLOW}Fix the code{NC} - Your changes broke something unrelated")
    print(f"   2. {YELLOW}Fix the test{NC} - If the old test was wrong/outdated")
    print(f"   3. {YELLOW}Expand scope{NC} - Add file to files_to_modify if intentional")
    print(f"   4. {YELLOW}Revert changes{NC} - If you can't determine the cause")
    print()
    print(f"{RED}   DO NOT MERGE until regressions are resolved.{NC}")
    sys.exit(1)

elif new_in_scope:
    print(f"{YELLOW}{BOLD}⚠️  IN-SCOPE FAILURES{NC}")
    print(f"{YELLOW}   {len(new_in_scope)} test(s) failed in areas you're modifying.{NC}")
    print()
    print(f"{BOLD}This is expected! Review if:{NC}")
    print(f"   • Tests need updating for new behavior")
    print(f"   • Your implementation has a bug")
    print()
    print(f"{GREEN}   OK to merge once tests are intentionally passing or updated.{NC}")
    sys.exit(0)

elif pre_existing:
    print(f"{GREEN}{BOLD}✅ No new regressions!{NC}")
    print(f"{GREEN}   {len(pre_existing)} pre-existing failure(s) from main branch.{NC}")
    print(f"{GREEN}   Your changes didn't break anything new.{NC}")
    sys.exit(0)

else:
    print(f"{GREEN}✅ All tests passed! Safe to merge.{NC}")
    sys.exit(0)

PYTHON_SCRIPT

