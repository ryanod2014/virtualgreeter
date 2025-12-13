#!/bin/bash
# =============================================================================
# Launch Inbox Agent
# =============================================================================
# Launches an Inbox Agent focused on a single finding/thread.
# The agent gets a focused prompt with all the context it needs.
#
# Usage:
#   ./scripts/launch-inbox-agent.sh <FINDING_ID or THREAD_ID>
#   ./scripts/launch-inbox-agent.sh F-042
#   ./scripts/launch-inbox-agent.sh --thread THREAD-123
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INBOX-LAUNCHER]${NC} $1"; }
log_success() { echo -e "${GREEN}[INBOX-LAUNCHER]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[INBOX-LAUNCHER]${NC} $1"; }
log_error() { echo -e "${RED}[INBOX-LAUNCHER]${NC} $1"; }

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------

FINDING_ID=""
THREAD_ID=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --finding|-f)
            FINDING_ID="$2"
            shift 2
            ;;
        --thread|-t)
            THREAD_ID="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: launch-inbox-agent.sh [OPTIONS] <FINDING_ID>"
            echo ""
            echo "Options:"
            echo "  --finding, -f   Finding ID to create prompt for"
            echo "  --thread, -t    Thread ID to create prompt for"
            echo "  --dry-run       Generate prompt but don't launch agent"
            echo "  --help, -h      Show this help"
            exit 0
            ;;
        *)
            # Assume it's a finding ID if no flag
            if [[ -z "$FINDING_ID" && -z "$THREAD_ID" ]]; then
                FINDING_ID="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$FINDING_ID" && -z "$THREAD_ID" ]]; then
    log_error "Either a Finding ID or Thread ID is required"
    echo "Usage: launch-inbox-agent.sh <FINDING_ID>"
    echo "       launch-inbox-agent.sh --thread <THREAD_ID>"
    exit 1
fi

# -----------------------------------------------------------------------------
# Generate Prompt
# -----------------------------------------------------------------------------

log "Generating inbox prompt..."

cd "$PROJECT_ROOT"

if [[ -n "$THREAD_ID" ]]; then
    PROMPT_RESULT=$(node scripts/agent-cli.js generate-inbox-prompt --thread "$THREAD_ID")
else
    PROMPT_RESULT=$(node scripts/agent-cli.js generate-inbox-prompt --finding "$FINDING_ID")
fi

# Extract the prompt file path from the output
PROMPT_FILE=$(echo "$PROMPT_RESULT" | grep "Inbox prompt generated:" | sed 's/Inbox prompt generated: //')

if [[ -z "$PROMPT_FILE" || ! -f "$PROMPT_FILE" ]]; then
    log_error "Failed to generate prompt file"
    echo "$PROMPT_RESULT"
    exit 1
fi

log_success "Prompt file: $PROMPT_FILE"

# -----------------------------------------------------------------------------
# Display Prompt Summary
# -----------------------------------------------------------------------------

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -20 "$PROMPT_FILE"
echo "..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# -----------------------------------------------------------------------------
# Launch Agent (if not dry run)
# -----------------------------------------------------------------------------

if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "Dry run - not launching agent"
    echo "Prompt file ready at: $PROMPT_FILE"
    echo ""
    echo "To launch manually:"
    echo "  claude --prompt $PROMPT_FILE"
    exit 0
fi

log "Launching Inbox Agent..."

# Check if claude CLI is available
if ! command -v claude &> /dev/null; then
    log_warning "Claude CLI not found. You can launch manually:"
    echo ""
    echo "  claude --prompt $PROMPT_FILE"
    echo ""
    echo "Or read the prompt and respond to the human in the PM Dashboard."
    exit 0
fi

# Extract ID for tmux session name
ID="${THREAD_ID:-$FINDING_ID}"
TMUX_SESSION="inbox-$ID"

# Check if tmux session already exists
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    log_warning "Tmux session '$TMUX_SESSION' already exists"
    echo "Attach with: tmux attach -t $TMUX_SESSION"
    exit 1
fi

# Launch in tmux
log "Starting tmux session: $TMUX_SESSION"
tmux new-session -d -s "$TMUX_SESSION" "claude --model claude-opus-4-20250514 --prompt $PROMPT_FILE; echo 'Press Enter to exit...'; read"

log_success "Inbox Agent launched!"
echo ""
echo "Monitor with:   tmux attach -t $TMUX_SESSION"
echo "List sessions:  tmux ls"
echo ""

