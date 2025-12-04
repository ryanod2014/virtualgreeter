# Agent Output Directory

> **Purpose:** Per-agent output files to prevent race conditions when multiple agents run in parallel.

## How It Works

Instead of multiple agents appending to shared files (which causes lost updates), each agent writes to its own unique file in the appropriate subdirectory.

The PM Dashboard server automatically aggregates these files when displaying data.

## Directory Structure

```
docs/agent-output/
├── reviews/          # Review agent findings
├── completions/      # Dev agent completion reports
├── blocked/          # Dev agent blocker reports (legacy - now use findings.json)
└── doc-tracker/      # Doc agent completion entries
```

## File Naming Convention

Files should be named: `[ID]-[TIMESTAMP].md`

Examples:
- `reviews/D-routing-rules-2025-12-04T1430.md`
- `completions/TKT-001-2025-12-04T1500.md`
- `doc-tracker/SA1-2025-12-04T1420.md`

## Lifecycle

1. **Agent writes** → Creates file in appropriate subdirectory
2. **Dashboard reads** → Auto-aggregates all files for display
3. **PM processes** → Reviews via dashboard
4. **PM archives** → Moves processed files to `docs/agent-output/archive/` or deletes

## Why This Pattern?

When 5+ agents run simultaneously and all append to `REVIEW_FINDINGS.md`:
1. Agent A reads file
2. Agent B reads file (same content)
3. Agent A appends and saves
4. Agent B appends and saves → **Agent A's work is lost!**

With per-agent files, each agent writes to its own file. Zero conflicts.

