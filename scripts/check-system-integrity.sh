#!/bin/bash
# =============================================================================
# System Integrity Check
# =============================================================================
# Verifies that critical system components are correctly configured.
# Run this before starting the PM Dashboard server to catch regressions.
#
# Usage: ./scripts/check-system-integrity.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "🔍 Running system integrity check..."
echo ""

# =============================================================================
# Check 1: db.js doesn't have events.log bug
# =============================================================================
echo -n "Check 1: db.js uses logEvent (not events.log)... "
if grep -q "events\.log(" "$PROJECT_ROOT/scripts/db/db.js"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ Found 'events.log()' in db.js - should be 'logEvent()'"
  echo "   📍 Line: $(grep -n "events\.log(" "$PROJECT_ROOT/scripts/db/db.js" | head -1)"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 2: server.js has merge lock
# =============================================================================
echo -n "Check 2: server.js has merge lock... "
if ! grep -q "global.mergeInProgress" "$PROJECT_ROOT/docs/pm-dashboard-ui/server.js"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ Missing merge lock - race conditions possible during parallel QA"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 3: server.js has strict QA approval check
# =============================================================================
echo -n "Check 3: server.js has strict QA approval check... "
if ! grep -q "hasFailure" "$PROJECT_ROOT/docs/pm-dashboard-ui/server.js"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ Missing strict QA check - false positive merges possible"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 4: server.js has status downgrade protection
# =============================================================================
echo -n "Check 4: server.js has status downgrade protection... "
if ! grep -q "STATUS_ORDER" "$PROJECT_ROOT/docs/pm-dashboard-ui/server.js"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ Missing status protection - tickets.json may reset merged tickets"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 5: server.js calls handleTicketStatusChange after regression tests
# =============================================================================
echo -n "Check 5: server.js triggers QA after regression tests... "
if ! grep -A10 "Regression tests passed" "$PROJECT_ROOT/docs/pm-dashboard-ui/server.js" | grep -q "handleTicketStatusChange"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ Missing handleTicketStatusChange call - QA won't auto-launch"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 6: launch-qa-agents.sh uses absolute path for reports
# =============================================================================
echo -n "Check 6: launch-qa-agents.sh uses absolute path for reports... "
if ! grep -q 'MAIN_REPO_DIR.*qa-results' "$PROJECT_ROOT/scripts/launch-qa-agents.sh"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ QA reports may be written to worktree instead of main repo"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Check 7: launch-qa-agents.sh uses wrapper script for tmux
# =============================================================================
echo -n "Check 7: launch-qa-agents.sh uses wrapper script... "
if ! grep -q "WRAPPER_SCRIPT" "$PROJECT_ROOT/scripts/launch-qa-agents.sh"; then
  echo -e "${RED}FAIL${NC}"
  echo "   ❌ tmux sessions may die immediately due to shell escaping issues"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ System integrity check passed - all $((7 - ERRORS))/7 checks OK${NC}"
  exit 0
else
  echo -e "${RED}❌ System integrity check FAILED - $ERRORS error(s) found${NC}"
  echo ""
  echo -e "${YELLOW}These issues can break the autonomous agent loop.${NC}"
  echo -e "${YELLOW}Please fix them before starting the PM Dashboard.${NC}"
  exit 1
fi
