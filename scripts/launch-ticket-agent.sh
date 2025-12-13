#!/bin/bash
# =============================================================================
# Launch Ticket Agent
# =============================================================================
# Launches a Claude Code agent to create tickets from blockers or decisions.
# Follows TICKET_AGENT_SOP.md
#
# Usage: 
#   ./scripts/launch-ticket-agent.sh TKT-001
#   ./scripts/launch-ticket-agent.sh TKT-001 --blocker QA-TKT-001-xxx.json
#   ./scripts/launch-ticket-agent.sh --decision THREAD-123
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"

# Parse arguments
TICKET_ID=""
BLOCKER_FILE=""
DECISION_THREAD=""
BLOCKER_TYPE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --blocker)
            BLOCKER_FILE="$2"
            shift 2
            ;;
        --decision)
            DECISION_THREAD="$2"
            shift 2
            ;;
        --type)
            BLOCKER_TYPE="$2"
            shift 2
            ;;
        *)
            if [ -z "$TICKET_ID" ]; then
                TICKET_ID="$1"
            fi
            shift
            ;;
    esac
done

# Need either ticket ID or decision thread
if [ -z "$TICKET_ID" ] && [ -z "$DECISION_THREAD" ]; then
    echo -e "${RED}Usage: $0 TKT-XXX [--blocker FILE] [--type TYPE]${NC}"
    echo -e "${RED}   or: $0 --decision THREAD-ID${NC}"
    exit 1
fi

TICKET_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
TICKET_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')
SESSION_NAME="ticket-$TICKET_UPPER"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Launching Ticket Agent: $TICKET_UPPER${NC}"
echo -e "${CYAN}============================================${NC}"

# Check if tmux session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Session $SESSION_NAME already exists${NC}"
    echo -e "Attach with: tmux attach -t $SESSION_NAME"
    exit 0
fi

# Get ticket info from database
TICKET_INFO=$(curl -s --max-time 5 "$DASHBOARD_URL/api/v2/tickets/$TICKET_UPPER" 2>/dev/null || echo "{}")
TICKET_TITLE=$(echo "$TICKET_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','$TICKET_UPPER'))" 2>/dev/null || echo "$TICKET_UPPER")
TICKET_BRANCH=$(echo "$TICKET_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('branch','') or 'agent/$TICKET_LOWER')" 2>/dev/null || echo "agent/$TICKET_LOWER")
CURRENT_ITERATION=$(echo "$TICKET_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('iteration', 1))" 2>/dev/null || echo "1")
NEXT_ITERATION=$((CURRENT_ITERATION + 1))
FILES_TO_MODIFY=$(echo "$TICKET_INFO" | python3 -c "import sys,json; files=json.load(sys.stdin).get('files_to_modify',[]); print('\\n'.join(['- \`'+f+'\`' for f in files]) if files else 'See original ticket')" 2>/dev/null || echo "See original ticket")

# Get blocker info if specified
BLOCKER_CONTEXT=""
if [ -n "$BLOCKER_FILE" ]; then
    BLOCKER_PATH="$MAIN_REPO_DIR/docs/agent-output/blocked/$BLOCKER_FILE"
    if [ -f "$BLOCKER_PATH" ]; then
        BLOCKER_CONTEXT=$(cat "$BLOCKER_PATH")
        echo -e "${GREEN}✓ Found blocker: $BLOCKER_FILE${NC}"
    else
        # Try to find latest blocker for this ticket
        BLOCKER_PATH=$(ls -t "$MAIN_REPO_DIR/docs/agent-output/blocked/"*"$TICKET_UPPER"*.json 2>/dev/null | head -1)
        if [ -n "$BLOCKER_PATH" ]; then
            BLOCKER_CONTEXT=$(cat "$BLOCKER_PATH")
            BLOCKER_FILE=$(basename "$BLOCKER_PATH")
            echo -e "${GREEN}✓ Found blocker: $BLOCKER_FILE${NC}"
        else
            echo -e "${YELLOW}⚠ No blocker file found for $TICKET_UPPER${NC}"
        fi
    fi
fi

# Register session in database
echo "Registering session..."
DB_SESSION_ID=""
REGISTER_RESULT=$(curl -s --max-time 10 -X POST "$DASHBOARD_URL/api/v2/agents/start" \
    -H "Content-Type: application/json" \
    -d "{\"ticket_id\": \"$TICKET_UPPER\", \"agent_type\": \"ticket\"}" 2>/dev/null)

if echo "$REGISTER_RESULT" | grep -q '"id"'; then
    DB_SESSION_ID=$(echo "$REGISTER_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    echo -e "${GREEN}✓ Registered session: $DB_SESSION_ID${NC}"
else
    echo -e "${YELLOW}⚠ Could not register session (server may be down)${NC}"
    DB_SESSION_ID="ticket-$TICKET_UPPER-$(date +%s)"
fi

# Create the prompt file
PROMPT_FILE="$MAIN_REPO_DIR/.agent-prompt-ticket-$TICKET_UPPER.md"
cat > "$PROMPT_FILE" << EOF
# EXECUTE IMMEDIATELY: Create Continuation for $TICKET_UPPER

**DO NOT ASK QUESTIONS. EXECUTE THESE STEPS IN ORDER.**

---

## Context

- **Ticket:** $TICKET_UPPER - "$TICKET_TITLE"
- **Branch:** \`$TICKET_BRANCH\` (already exists)
- **Current Iteration:** $CURRENT_ITERATION → creating v$NEXT_ITERATION
- **Blocker File:** \`$BLOCKER_FILE\`

### Blocker Details

\`\`\`json
$BLOCKER_CONTEXT
\`\`\`

---

## STEP 1: Analyze the Blocker

Run these commands to understand what happened:

\`\`\`bash
# See what the previous dev attempt changed
git fetch origin
git log --oneline -5 origin/$TICKET_BRANCH

# Check if there are build errors
cd apps/dashboard && pnpm build 2>&1 | head -50
\`\`\`

---

## STEP 2: Create the Continuation Prompt

Write this file: \`docs/prompts/active/dev-agent-$TICKET_UPPER-v$NEXT_ITERATION.md\`

Use this template:

\`\`\`markdown
# Dev Agent Continuation: $TICKET_UPPER-v$NEXT_ITERATION

> **Type:** Continuation (retry from blocker)
> **Original Ticket:** $TICKET_UPPER
> **Branch:** \\\`$TICKET_BRANCH\\\` (ALREADY EXISTS)
> **Attempt:** v$NEXT_ITERATION

---

## PREVIOUS ATTEMPT FAILED

[Summarize the blocker - what went wrong, why it failed]

---

## YOUR TASK

1. [Fix step 1 based on blocker analysis]
2. [Fix step 2]
3. Verify with: \\\`pnpm typecheck && pnpm build\\\`
4. Commit and push

---

## Verification

After fixes:
\\\`\\\`\\\`bash
curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_UPPER \\\\
  -H 'Content-Type: application/json' \\\\
  -d '{"status": "dev_complete"}'
\\\`\\\`\\\`
\`\`\`

---

## STEP 3: Update Ticket Status

\`\`\`bash
curl -X PUT http://localhost:3456/api/v2/tickets/$TICKET_UPPER \\
  -H "Content-Type: application/json" \\
  -d '{"status": "continuation_ready", "iteration": $NEXT_ITERATION}'
\`\`\`

---

## STEP 4: Archive Blocker (if exists)

\`\`\`bash
if [ -f "docs/agent-output/blocked/$BLOCKER_FILE" ]; then
  mkdir -p docs/agent-output/archive
  mv "docs/agent-output/blocked/$BLOCKER_FILE" docs/agent-output/archive/
fi
\`\`\`

---

## STEP 5: Done

Print this report and exit:

\`\`\`
✅ Ticket Agent Complete
- Created: docs/prompts/active/dev-agent-$TICKET_UPPER-v$NEXT_ITERATION.md  
- Status: continuation_ready
- Next: Dev Agent will pick up automatically
\`\`\`
EOF

echo -e "${GREEN}✓ Created prompt: $PROMPT_FILE${NC}"

# Create log directory
mkdir -p "$MAIN_REPO_DIR/.agent-logs"
LOG_FILE="$MAIN_REPO_DIR/.agent-logs/ticket-$TICKET_UPPER-$(date +%Y%m%dT%H%M%S).log"

# Launch Claude in tmux
echo -e "${BLUE}Launching Claude Code in tmux session: $SESSION_NAME${NC}"

# Create a temp script for tmux to run (avoids quoting issues)
TMUX_SCRIPT="/tmp/ticket-agent-$TICKET_UPPER.sh"
cat > "$TMUX_SCRIPT" << 'SCRIPT_EOF'
#!/bin/bash
cd "$1"
echo "=== Ticket Agent: $2 ==="
echo "Session ID: $3"
echo "Blocker: $4"
echo "Started: $(date)"
echo ""
claude -p "$5" --dangerously-skip-permissions 2>&1 | tee "$6"
echo ""
echo "Signaling completion..."
curl -s -X POST "$7/api/v2/agents/$3/complete" \
  -H "Content-Type: application/json" \
  -d '{"success": true}' || echo "Could not signal completion"
echo ""
echo "Agent finished. Press Enter to close."
read
SCRIPT_EOF
chmod +x "$TMUX_SCRIPT"

tmux new-session -d -s "$SESSION_NAME" -c "$MAIN_REPO_DIR" \
    "$TMUX_SCRIPT '$MAIN_REPO_DIR' '$TICKET_UPPER' '$DB_SESSION_ID' '$BLOCKER_FILE' '$PROMPT_FILE' '$LOG_FILE' '$DASHBOARD_URL'"

echo -e "${GREEN}✓ Ticket Agent launched: $SESSION_NAME${NC}"
echo -e "  Session:  ${BLUE}$DB_SESSION_ID${NC}"
echo -e "  Attach:   ${BLUE}tmux attach -t $SESSION_NAME${NC}"

