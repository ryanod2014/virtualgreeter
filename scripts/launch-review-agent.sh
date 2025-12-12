#!/bin/bash
# =============================================================================
# Launch Review Agent
# =============================================================================
# Launches a Review Agent to analyze merged documentation and create findings.
# Called by pipeline-runner.js after successful merge.
#
# Usage:
#   ./scripts/launch-review-agent.sh TKT-XXX
# =============================================================================

set -e

TICKET_ID="$1"
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"
SESSION_NAME="review-$TICKET_ID"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

if [ -z "$TICKET_ID" ]; then
    print_error "Ticket ID required"
    echo "Usage: $0 TKT-XXX"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Launching Review Agent for: $TICKET_ID${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    print_warning "Session '$SESSION_NAME' already exists"
    echo -e "  Attach with: ${BLUE}tmux attach -t $SESSION_NAME${NC}"
    exit 0
fi

# Get ticket info
TICKET_INFO=$(curl -s "$DASHBOARD_URL/api/v2/tickets/$TICKET_ID" 2>/dev/null)
if [ -z "$TICKET_INFO" ] || echo "$TICKET_INFO" | grep -q '"error"'; then
    print_error "Could not get ticket info for $TICKET_ID"
    exit 1
fi

FEATURE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('feature',''))" 2>/dev/null)
TITLE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)

# Register session
DB_SESSION_ID=$(curl -s -X POST "$DASHBOARD_URL/api/v2/agents/start" \
    -H "Content-Type: application/json" \
    -d "{\"ticket_id\": \"$TICKET_ID\", \"agent_type\": \"review\", \"tmux_session\": \"$SESSION_NAME\"}" \
    2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -n "$DB_SESSION_ID" ]; then
    print_success "Registered session: $DB_SESSION_ID"
fi

# Find doc file
DOC_FILE=""
if [ -n "$FEATURE" ]; then
    DOC_FILE=$(find "$MAIN_REPO_DIR/docs/features" -name "*.md" -type f 2>/dev/null | xargs grep -l "$FEATURE" 2>/dev/null | head -1)
fi

# Create prompt
CLAUDE_PROMPT="You are a Review Agent. Your job is to review the documentation changes for ticket $TICKET_ID.

Read docs/workflow/REVIEW_AGENT_SOP.md first, then:

1. Check existing findings for this feature:
   ./scripts/agent-cli.sh list-findings --feature \"$FEATURE\"

2. Read the documentation:
   - Feature: $FEATURE
   - Title: $TITLE
   ${DOC_FILE:+- Doc file: $DOC_FILE}

3. Look for issues, inconsistencies, missing scenarios

4. For EACH finding, add to staging:
   ./scripts/agent-cli.sh add-finding --title \"...\" --severity \"...\" --feature \"$FEATURE\" --description \"...\"

5. Write summary to:
   docs/agent-output/reviews/$TICKET_ID-\$(date +%Y%m%dT%H%M).md

Session ID: $DB_SESSION_ID
When done: ./scripts/agent-cli.sh complete"

# Create wrapper script
WRAPPER_SCRIPT="/tmp/review-$TICKET_ID-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << WRAPPER_EOF
#!/bin/bash
cd '$MAIN_REPO_DIR'
export AGENT_SESSION_ID='$DB_SESSION_ID'

echo '=== Review Agent: $TICKET_ID ==='
echo 'Started: \$(date)'
echo ''

claude --dangerously-skip-permissions -p "$CLAUDE_PROMPT"

echo ''
echo '=== Completed: \$(date) ==='
sleep 3600
WRAPPER_EOF
chmod +x "$WRAPPER_SCRIPT"

# Launch in tmux
tmux new-session -d -s "$SESSION_NAME" "$WRAPPER_SCRIPT"

print_success "Review Agent launched: $SESSION_NAME"
echo -e "  Attach: ${BLUE}tmux attach -t $SESSION_NAME${NC}"

