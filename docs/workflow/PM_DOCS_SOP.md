# PM Documentation Workflow

> **Purpose:** Super simple PM workflow for documentation-only sprints.
> **One-liner to launch:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md`

---

## PM Responsibilities

1. Create doc-agent prompts for all features
2. Output launch commands for parallel execution
3. **Handle Git automatically** (commit docs without human asking)

---

## PM Workflow

### Phase 1: Setup & Prompt Generation

**1.1 Check Git Status**
```bash
git status
```
- Note any uncommitted doc changes
- If docs exist uncommitted, commit them first (see Git SOP below)

**1.2 Read Current State**
```bash
cat docs/FEATURE_INVENTORY.md   # What needs documenting
cat docs/DOC_TRACKER.md         # What's already done
ls docs/prompts/active/         # What prompts exist
```

**1.3 Create Missing Prompts**

For each undocumented feature in the inventory:
1. Create prompt file: `docs/prompts/active/doc-agent-[ID].md`
2. Use template from: `docs/workflow/templates/doc-agent.md`
3. Fill in: Feature ID, name, description, source files, key questions

**1.4 Commit Prompts**
```bash
git add docs/prompts/active/
git commit -m "docs: add doc-agent prompts for [list features]"
git push
```

---

### Phase 2: Output Launch Commands

Output ALL commands grouped by category:

```markdown
## 🚀 Documentation Sprint - Launch Commands

**Instructions:** Open separate Cursor chats, paste one command per chat. All run in parallel.

### Admin Features ([N] remaining)
1. `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D1.md`
2. ...

### Billing Features ([N])
1. `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B1.md`
2. ...

### Auth Features ([N])
...

**Total: [N] agents ready to launch**
```

---

### Phase 3: Monitor & Commit

**3.1 Check Progress**
```bash
cat docs/DOC_TRACKER.md | head -50   # Recent completions
find docs/features -name "*.md" -mmin -60  # Docs created in last hour
git status                            # Uncommitted changes
```

**3.2 Commit New Docs (AUTOMATIC)**

If there are uncommitted doc files:
```bash
git add docs/
git commit -m "docs: [list features documented]"
git push
```

**Do this automatically whenever you see uncommitted changes in `docs/`.**

---

## Git SOP (Automatic)

### When PM Starts
```bash
# Check for uncommitted work
git status

# If docs/ has changes, commit them
git add docs/
git commit -m "docs: batch update"
git push
```

### After Creating Prompts
```bash
git add docs/prompts/
git commit -m "docs: add prompts for [features]"
git push
```

### After Checking Progress (if new docs exist)
```bash
git add docs/features/
git commit -m "docs: [feature names] documentation complete"
git push
```

### When Sprint Complete
```bash
# Final commit
git add docs/
git commit -m "docs: documentation sprint complete"
git push

# Archive prompts
mv docs/prompts/active/doc-agent-*.md docs/prompts/archive/
git add docs/prompts/
git commit -m "docs: archive completed prompts"
git push
```

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/FEATURE_INVENTORY.md` | Master list - what needs documenting |
| `docs/DOC_TRACKER.md` | Completion log - agents post here |
| `docs/workflow/templates/doc-agent.md` | Template for prompts |
| `docs/prompts/active/` | Active prompts |
| `docs/features/` | Output documentation |

---

## Example PM Session

```
PM starts...

1. Check git status
   → Found 2 uncommitted docs in features/
   → Committing: "docs: B1, D1 documentation complete"
   → Pushed

2. Read inventory
   → 18 complete, 23 remaining

3. Check existing prompts
   → 3 prompts exist (B1, D1, AUTH1)
   → 20 prompts needed

4. Create 20 missing prompts
   → Created doc-agent-D4.md through doc-agent-STATS3.md
   → Committing: "docs: add 20 doc-agent prompts"
   → Pushed

5. Output launch commands
   → [23 launch commands grouped by category]

Done. Human copies commands into parallel Cursor chats.
```

---

## Troubleshooting

**Q: Agent produced bad output**
A: Re-launch that one agent. Check the doc it created, delete if needed.

**Q: Want to add a new feature to document**
A: Add to `FEATURE_INVENTORY.md`, create prompt, launch agent.

**Q: How do I know what's done?**
A: `cat docs/DOC_TRACKER.md` or `ls docs/features/*/`
