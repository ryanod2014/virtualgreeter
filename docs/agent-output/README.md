# Agent Output Directory

> **Purpose:** Per-agent output files to prevent race conditions when multiple agents run in parallel.

## How It Works

Instead of multiple agents appending to shared files (which causes lost updates), each agent writes to its own unique file in the appropriate subdirectory.

The PM Dashboard server automatically aggregates these files when displaying data.

## Directory Structure

```
docs/agent-output/
├── started/          # Dev agent start signals (per-agent JSON files) - tracks active agents + file locks
├── completions/      # Dev agent completion reports (per-agent MD files)
├── blocked/          # Dev agent blocker reports (per-agent JSON files)
├── findings/         # Dev agent out-of-scope findings (per-agent JSON files)
├── reviews/          # Review agent findings (per-agent JSON files)
├── doc-tracker/      # Doc agent completion entries (per-agent MD files)
└── archive/          # Processed files moved here after PM review
```

## File Naming Convention

Files should be named: `[ID]-[TIMESTAMP].ext`

Examples:
- `started/TKT-001-2025-12-04T1430.json` - Dev agent started work
- `completions/TKT-001-2025-12-04T1500.md` - Dev agent completed
- `blocked/BLOCKED-TKT-001-2025-12-04T1445.json` - Dev agent blocked
- `findings/F-DEV-TKT-001-2025-12-04T1450.json` - Dev agent found issue
- `reviews/D-routing-rules-2025-12-04T1430.md` - Review agent output
- `doc-tracker/SA1-2025-12-04T1420.md` - Doc agent completed

## Lifecycle

### Dev Agent Lifecycle

```
Agent starts work → writes to started/TKT-XXX-[TIMESTAMP].json (includes file locks)
       ↓
Agent works on ticket...
       ↓
Agent completes → writes to completions/TKT-XXX-[TIMESTAMP].md
       OR
Agent blocked → writes to blocked/BLOCKED-TKT-XXX-[TIMESTAMP].json
       OR
Agent finds issue → writes to findings/F-DEV-TKT-XXX-[TIMESTAMP].json
       ↓
PM processes → archives start file + completion/blocker to archive/
```

### Stall Detection

PM compares `started/` vs `completions/` + `blocked/`:
- If start file exists but no completion/blocker after 4+ hours → Agent may be stalled
- Check git branch activity to confirm

### File Locks

Files in `started/*.json` contain `files_locking` arrays. PM checks these before launching new agents to prevent conflicts.

## Why This Pattern?

When 5+ agents run simultaneously and all append to `REVIEW_FINDINGS.md`:
1. Agent A reads file
2. Agent B reads file (same content)
3. Agent A appends and saves
4. Agent B appends and saves → **Agent A's work is lost!**

With per-agent files, each agent writes to its own file. Zero conflicts.

