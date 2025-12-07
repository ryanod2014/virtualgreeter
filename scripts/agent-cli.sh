#!/bin/bash
# =============================================================================
# Agent CLI - Interface for agents to interact with the workflow database
# =============================================================================
# 
# Usage:
#   agent-cli.sh start --ticket TKT-006 --type dev
#   agent-cli.sh heartbeat --session <session_id>
#   agent-cli.sh complete --session <session_id> --report <path>
#   agent-cli.sh block --session <session_id> --reason "..." --type clarification
#   agent-cli.sh add-finding --type bug --severity high --description "..."
#   agent-cli.sh get-ticket TKT-006
#   agent-cli.sh list-tickets --status ready
#
# Environment:
#   AGENT_SESSION_ID - If set, used as default session ID
#   DASHBOARD_URL - API URL (default: http://localhost:3456)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_BACKEND="$SCRIPT_DIR/agent-cli.js"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3456}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not installed${NC}" >&2
    exit 1
fi

# Check if backend exists
if [ ! -f "$CLI_BACKEND" ]; then
    echo -e "${RED}Error: CLI backend not found at $CLI_BACKEND${NC}" >&2
    exit 1
fi

# Run the Node.js CLI backend with all arguments
exec node "$CLI_BACKEND" "$@"
