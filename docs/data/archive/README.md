# Archived JSON Files

This directory is for archiving the legacy JSON files after fully transitioning to the SQLite database.

## When to Archive

Archive the JSON files ONLY after:
1. The database migration has completed successfully
2. The dashboard server has been tested with `?source=db` parameter
3. All agent SOPs and scripts have been updated to use the CLI
4. You're confident the database is working correctly

## Files to Archive

Run these commands to archive the old JSON files:

```bash
cd docs/data

# Archive workflow state files (now in database)
mv tickets.json archive/
mv findings.json archive/
mv findings-staging.json archive/
mv decisions.json archive/
mv dev-status.json archive/
mv doc-status.json archive/

# Keep these files (not migrated)
# - .agent-credentials.json (secrets - never migrate)
# - findings-summary.json (derived data, can be regenerated)
```

## Rollback

If you need to rollback to JSON files:

1. Move files back from archive: `mv archive/*.json .`
2. Restart the dashboard server without `?source=db`
3. The dashboard will automatically use JSON files

## Database Location

The SQLite database is at: `data/workflow.db`

To query it directly:
```bash
sqlite3 data/workflow.db
```
