#!/bin/bash
# -----------------------------------------------------------------------------
# DEPRECATED: Dispatch Agent launcher
# -----------------------------------------------------------------------------
# Dispatch Agent has been replaced by:
# - pipeline runner: scripts/pipeline-runner.js
# - Inbox Agent: docs/workflow/INBOX_AGENT_SOP.md
# - Ticket Agent: docs/workflow/TICKET_AGENT_SOP.md
#
# See: docs/workflow/archive/ARCHIVE_README.md
# -----------------------------------------------------------------------------

set -e

echo "ERROR: ./scripts/run-dispatch-agent.sh is deprecated."
echo ""
echo "Use the DB-driven workflow instead:"
echo "  - Read: docs/workflow/README.md"
echo "  - Run pipeline: node scripts/pipeline-runner.js --watch"
echo "  - Use Inbox Agent: docs/workflow/INBOX_AGENT_SOP.md"
echo "  - Use Ticket Agent: docs/workflow/TICKET_AGENT_SOP.md"
exit 1
