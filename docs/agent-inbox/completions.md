# Agent Completions Inbox

> **Purpose:** Agents append here when they complete work. PM reads and updates AGENT_TASKS.md.
> **Rule:** Append only. PM clears processed entries.

---

## Pending Completions

*(PM processed entries on 2024-12-03)*

---

## Format for Agents

When you START or COMPLETE work, append this to the bottom:

```markdown
### [TIMESTAMP]
- **Agent:** [Your agent type and number]
- **Ticket:** [Ticket ID]
- **Status:** STARTED / COMPLETE / BLOCKED / NEEDS_REVIEW
- **Branch:** [git branch name if applicable]
- **Files Locking:** [files being modified - for STARTED status]
- **Output:** [file path if applicable]
- **Notes:** [any important notes]
```

### Status Definitions

| Status | When to Use | PM Action |
|--------|-------------|-----------|
| **STARTED** | Beginning work on a ticket | Lock files, track active agent |
| **COMPLETE** | Work finished successfully | Unlock files, move to next phase |
| **BLOCKED** | Waiting on human decision | Alert human, create continuation spec |
| **NEEDS_REVIEW** | Ready for review phase | Spin up review agent |
| **APPROVED** | Review/QA passed | Move to next phase or merge |
| **REJECTED** | Review/QA failed | Return to dev agent |

---
