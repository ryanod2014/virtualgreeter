# Merge Queue

> Branches that have passed QA Review and are ready for merge to main.
> 
> **Process:** Human reviews and executes merge commands below.

---

## Ready for Merge

<!-- QA Review Agent adds entries here when tickets pass -->

*No branches currently queued for merge.*

---

## Template

When QA Review Agent passes a ticket, add an entry like this:

```markdown
## TKT-XXX - [Title]

**Branch:** `agent/TKT-XXX-description`
**QA Passed:** [date]
**QA Report:** `docs/agent-output/qa-results/QA-TKT-XXX-PASSED-[timestamp].md`

### Merge Command

\`\`\`bash
git checkout main
git pull origin main
git merge --squash agent/TKT-XXX-description
git commit -m "feat([scope]): TKT-XXX - [Title]"
git push origin main
\`\`\`

### Post-Merge Cleanup

\`\`\`bash
# Delete the branch
git branch -d agent/TKT-XXX-description
git push origin --delete agent/TKT-XXX-description

# Update ticket status in tickets.json → "done"
# Archive the QA prompt and completion files
\`\`\`
```

---

## Merge History

<!-- Move merged entries here with date -->

*No merges completed yet.*

