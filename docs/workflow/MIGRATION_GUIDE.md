# Migration: JSON → Database-Only Workflow

> **Date:** 2025-12-12
> **Status:** ✅ Ready for migration

---

## Summary of Changes

### New Files Created

| File | Purpose |
|------|---------|
| `scripts/auto-merge.js` | Automated selective file merge to main |
| `scripts/pipeline-runner.js` | Orchestrates ticket through all stages |
| `docs/workflow/UNIFIED_WORKFLOW.md` | New DB-only workflow documentation |

### Modified Files

| File | Change |
|------|--------|
| `scripts/agent-post-run.sh` | Now triggers pipeline-runner instead of manual status |
| `scripts/agent-cli.js` | Added `trigger-pipeline` command |

---

## SOP Updates Required

The following SOPs still reference JSON files and need updating:

### High Priority (Agents Read These)

1. **`DEV_AGENT_SOP.md`** - 18 JSON references
   - Change: `docs/agent-output/started/*.json` → Use CLI `start` command
   - Change: `docs/data/dev-status.json` → CLI handles this automatically
   - Change: Blocker file writes → Use CLI `block` command

2. **`QA_REVIEW_AGENT_SOP.md`** - 14 JSON references
   - Change: `docs/data/tickets.json` → Use CLI `get-ticket`
   - Change: Blocker JSON creation → Use CLI `block` command

3. **`DISPATCH_AGENT_SOP.md`** - 14 JSON references
   - Change: Reading blockers from files → Query DB via API
   - Change: `decisions.json` → Use `/api/v2/decisions` endpoint

### Medium Priority

4. **`PM_DEV_SOP.md`** - 24 JSON references
5. **`PM_DOCS_SOP.md`** - 29 JSON references
6. **`TRIAGE_AGENT_SOP.md`** - 22 JSON references

### Lower Priority

7. Various templates in `docs/workflow/templates/`

---

## Quick Reference: JSON → CLI Mapping

### For Agents

| Old (JSON) | New (CLI) |
|------------|-----------|
| Write `docs/agent-output/started/TKT-*.json` | `./scripts/agent-cli.sh start --ticket TKT-001 --type dev` |
| Write `docs/agent-output/blocked/BLOCKED-*.json` | `./scripts/agent-cli.sh block --session $ID --reason "..." --type clarification` |
| Update `docs/data/dev-status.json` | Automatic on `complete` command |
| Read `docs/data/tickets.json` | `./scripts/agent-cli.sh get-ticket TKT-001` |
| Write `docs/agent-output/findings/*.json` | `./scripts/agent-cli.sh add-finding --title "..." --severity high` |

### For Pipeline

| Old (Manual) | New (Automatic) |
|--------------|-----------------|
| PM runs QA agent | Pipeline runner launches QA on `dev_complete` |
| Agent merges to main | `auto-merge.js` merges on `ready_to_merge` |
| Check for blockers in files | Pipeline checks DB status |

---

## Verification Commands

After migration, verify the system works:

```bash
# 1. Start the dashboard
node docs/pm-dashboard-ui/server.js &

# 2. Check database is working
curl -s http://localhost:3456/api/v2/tickets | jq '.count'

# 3. Start pipeline runner
node scripts/pipeline-runner.js --watch &

# 4. Test a single ticket through the pipeline
./scripts/agent-cli.sh update-ticket TKT-001 --status dev_complete

# 5. Watch it progress
watch -n 5 './scripts/agent-cli.sh get-ticket TKT-001'
```

---

## Rollback

If issues arise, the JSON files are still readable by the dashboard (fallback mode):

```bash
# Dashboard still reads from JSON if DB is unavailable
# Just restart without the DB module loaded
```

---

## Next Steps

1. ✅ Run `node scripts/db/migrate-from-json.js` to import existing data
2. ⏳ Update `DEV_AGENT_SOP.md` to remove JSON references
3. ⏳ Update `QA_REVIEW_AGENT_SOP.md` to remove JSON references  
4. ⏳ Update `DISPATCH_AGENT_SOP.md` to remove JSON references
5. ⏳ Update PM SOPs
6. ⏳ Archive JSON files after verification

