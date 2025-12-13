#!/bin/bash
# -----------------------------------------------------------------------------
# DEPRECATED: Dispatch Agent batched launcher
# -----------------------------------------------------------------------------
# Dispatch Agent has been replaced by:
# - pipeline runner: scripts/pipeline-runner.js
# - Inbox Agent: docs/workflow/INBOX_AGENT_SOP.md
# - Ticket Agent: docs/workflow/TICKET_AGENT_SOP.md
#
# See: docs/workflow/archive/ARCHIVE_README.md
# -----------------------------------------------------------------------------

set -e

echo "ERROR: ./scripts/launch-dispatch-agents.sh is deprecated."
echo ""
echo "Use the DB-driven workflow instead:"
echo "  - Read: docs/workflow/README.md"
echo "  - Run pipeline: node scripts/pipeline-runner.js --watch"
echo "  - Use Inbox Agent: docs/workflow/INBOX_AGENT_SOP.md"
echo "  - Use Ticket Agent: docs/workflow/TICKET_AGENT_SOP.md"
exit 1

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

BATCH_SIZE=5  # Blockers per agent
MAX_PARALLEL=6  # Max concurrent agents

echo "╔════════════════════════════════════════════════════════╗"
echo "║         DISPATCH AGENTS - BATCHED PARALLEL             ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║  $BATCH_SIZE blockers per agent, up to $MAX_PARALLEL agents in parallel    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Get all auto-handleable blockers (QA failures and CI failures)
BLOCKERS=()
shopt -s nullglob  # Don't error on no matches
for f in docs/agent-output/blocked/QA-*.json docs/agent-output/blocked/CI-*.json; do
    if [ -f "$f" ]; then
        BLOCKERS+=("$(basename "$f")")
    fi
done
shopt -u nullglob

TOTAL=${#BLOCKERS[@]}
echo "📊 Found $TOTAL auto-handleable blockers"

if [ $TOTAL -eq 0 ]; then
    echo "✅ No blockers to process!"
    exit 0
fi

# Calculate number of batches
NUM_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
echo "📦 Creating $NUM_BATCHES batches of ~$BATCH_SIZE blockers each"
echo ""

# Ensure archive folder exists
mkdir -p docs/agent-output/archive

# Create batches
declare -a BATCHES
for ((i=0; i<TOTAL; i++)); do
    batch_idx=$((i / BATCH_SIZE))
    BATCHES[$batch_idx]+="${BLOCKERS[$i]} "
done

# Function to get running dispatch agent count (check for claude processes)
get_running_count() {
    pgrep -f "dispatch-batch" 2>/dev/null | wc -l | tr -d ' '
}

# Function to launch a batch
launch_batch() {
    local batch_num=$1
    local blockers=$2
    local session="dispatch-batch-$batch_num"
    
    # Create blocker list for prompt
    local blocker_list=$(echo "$blockers" | tr ' ' '\n' | grep -v '^$' | sed 's/^/- /' | tr '\n' ' ')
    
    echo "🚀 Launching batch $batch_num: $blockers"
    
    # Create temp script for this batch
    cat > "/tmp/dispatch-batch-$batch_num.sh" << SCRIPT
#!/bin/bash
cd "$PROJECT_ROOT"

claude --model claude-opus-4-20250514 --dangerously-skip-permissions --permission-mode bypassPermissions "You are a Dispatch Agent processing a batch of blockers.

Read docs/workflow/DISPATCH_AGENT_SOP.md for context.

YOUR BATCH (process these $BATCH_SIZE blockers):
$blocker_list

For EACH blocker in your batch:
1. Read the blocker JSON from docs/agent-output/blocked/[filename]
2. Extract: ticket_id, branch, summary, failures, recommendation
3. Create continuation ticket prompt at docs/prompts/active/dev-agent-[TICKET]-v2.md
4. Update ticket status in docs/data/tickets.json to 'in_progress'
5. Move blocker to docs/agent-output/archive/

Use the QA Continuation template from the SOP.

After ALL blockers processed, write summary to:
docs/agent-output/dispatch-batch-$batch_num-report.md

GO!"
SCRIPT
    
    chmod +x "/tmp/dispatch-batch-$batch_num.sh"
    
    # Launch in background with nohup (no interactive prompt needed)
    nohup /tmp/dispatch-batch-$batch_num.sh > "/tmp/dispatch-batch-$batch_num.log" 2>&1 &
    local pid=$!
    echo "   ✓ Launched batch $batch_num (PID: $pid)"
}

# Launch batches with parallelism control
launched=0
for ((batch=0; batch<NUM_BATCHES; batch++)); do
    # Wait if at max parallel
    while [ $(get_running_count) -ge $MAX_PARALLEL ]; do
        echo "⏳ Waiting for slot... ($(get_running_count)/$MAX_PARALLEL running)"
        sleep 10
    done
    
    # Launch this batch
    launch_batch $batch "${BATCHES[$batch]}"
    launched=$((launched + 1))
    
    # Small delay between launches
    sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Launched $launched dispatch agent batches"
echo ""
echo "Monitor progress:"
echo "  tmux list-sessions | grep dispatch"
echo "  ls docs/agent-output/archive/    # Processed blockers"
echo "  ls docs/prompts/active/          # New continuation tickets"
echo ""
echo "View a specific batch:"
echo "  tmux attach -t dispatch-batch-0"
echo ""
