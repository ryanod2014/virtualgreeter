# Feature: PM Dashboard Ticket Counting (TKT-004C)

## Quick Summary
The PM Dashboard accurately counts unique tickets across agent outputs, properly handling ticket IDs with letter suffixes (e.g., TKT-004C, TKT-005E) and deduplicating blocked entries to count tickets rather than files.

## Affected Users
- [x] Agent (dev and QA agents)
- [x] Platform Admin
- [ ] Admin
- [ ] Website Visitor

---

## 1. WHAT IT DOES

### Purpose
Ensures the PM Dashboard displays accurate ticket counts by:
1. Supporting ticket IDs with letter suffixes (cleanup/variant tickets)
2. Deduplicating blocked entries by ticket ID (not file count)
3. Providing correct metrics for project management decisions

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | Accurate count of merged vs blocked tickets | Deduplicated counts show unique tickets, not duplicate files |
| Platform Admin | Track cleanup tickets (TKT-004C) separately | Regex captures letter suffixes in ticket IDs |
| Dev/QA Agents | Proper tracking of ticket status | Dashboard correctly identifies and counts their work |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Dashboard scans agent-output directories across all git branches
2. For each file, extract ticket ID using improved regex: `([A-Z]+-\d+[a-zA-Z]?)`
3. Collect all blocked entries into a list
4. Deduplicate blocked entries by ticket ID (keep most recent per ticket)
5. Display counts: completions, started, blocked (unique tickets)

### State Machine
```
Agent Output Files → Extract Ticket IDs → Deduplicate Blocked → Display Counts
                          ↓                      ↓                    ↓
                   Supports suffixes      Keep most recent     Show unique tickets
                   (TKT-004C)            per ticket ID        (not file count)
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| File Scan | Reading files from git branches | `scanAgentOutputs()` called | All branches scanned |
| Ticket Extraction | Parsing ticket IDs from filenames | Regex match on filename | Ticket ID extracted or fallback used |
| Deduplication | Removing duplicate blocked entries | Multiple files for same ticket | Single entry per ticket retained |
| Display | Showing counts in dashboard | Deduplication complete | User refreshes page |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Dashboard API request | `/api/dev-status` endpoint | Scans agent outputs and builds status | Triggers ticket counting logic |
| Blocked file created | Agent writes to `docs/agent-output/blocked/` | File added to scan results | May create duplicate entries for same ticket |
| QA report created | Agent writes to `docs/agent-output/qa-results/` | PASSED reports identified for merge count | Updates merged ticket list |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `scanAgentOutputs()` | `docs/pm-dashboard-ui/server.js:1480` | Scans git branches for agent outputs, supports suffix IDs |
| `buildDevStatusFromOutputs()` | `docs/pm-dashboard-ui/server.js:1703` | Builds dev status from outputs, deduplicates merged tickets |
| Ticket ID regex | Lines 1524, 1729 | `([A-Z]+-\d+[a-zA-Z]?)` - captures letter suffixes |
| Blocked deduplication | Lines 1575-1583 | Maps blocked entries by ticket ID, keeps most recent |

### Data Flow
```
Git Branches (origin/main + origin/agent/*)
    ↓
Scan agent-output directories
    ↓
Extract ticket IDs with regex: ([A-Z]+-\d+[a-zA-Z]?)
    │
    ├─→ completions[] (no deduplication needed)
    ├─→ started[] (no deduplication needed)
    └─→ blocked[]
        ↓
    Deduplicate by ticket ID (Map<ticketId, mostRecentEntry>)
        ↓
    Return counts: completions.length, started.length, blocked.length
        ↓
    Display in dashboard: "17 completions, 12 started, 27 blocked (unique tickets)"
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Ticket with letter suffix (TKT-004C) | Filename contains TKT-004C | Regex captures it correctly | ✅ | Fixed by improved regex |
| 2 | Multiple blocked files for same ticket | Agent retries and creates new blocked files | Only most recent file counted | ✅ | Deduplication logic added |
| 3 | Ticket ID without suffix (TKT-010) | Standard ticket format | Works as before | ✅ | Backward compatible |
| 4 | Mixed case ticket IDs | TKT-004c vs TKT-004C | Normalized to uppercase | ✅ | `.toUpperCase()` applied |
| 5 | QA report with suffix (QA-TKT-004C-PASSED) | PASSED report filename | Regex captures TKT-004C | ✅ | Also fixed in buildDevStatusFromOutputs |
| 6 | Ticket blocked multiple times in different branches | Files exist on origin/main and origin/agent/tkt-004c | Deduplication keeps most recent | ✅ | Works across branches |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Regex mismatch | Ticket ID format unexpected | Fallback to filename parsing | Ticket still tracked, just might have imperfect ID |
| Missing modifiedAt | Timestamp missing from entry | Uses current time | Deduplication still works |
| Empty branch list | No agent branches found | Scans only origin/main | Still shows main branch data |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View dashboard | Shows "27 blocked (unique tickets)" | ✅ | Clear indication of deduplication |
| 2 | Agent creates multiple blocked files | Dashboard count doesn't increase | ✅ | Prevents confusion from duplicate counts |
| 3 | Ticket uses letter suffix | Dashboard recognizes and tracks it | ✅ | Seamless handling of cleanup tickets |

### Accessibility
- Keyboard navigation: N/A (server-side logic)
- Screen reader support: N/A (server-side logic)
- Color contrast: N/A (server-side logic)
- Loading states: Dashboard has loading indicators

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Git operations slow | 30-second cache on scan results | ✅ Mitigated |
| Large number of branches | Sequential branch scanning | ⚠️ Could be optimized with parallel processing |
| Regex performance | Simple regex, compiled once per file | ✅ Fast |

### Security
| Concern | Mitigation |
|---------|------------|
| Arbitrary file reads | Only scans specific subdirectories in agent-output | ✅ |
| Branch enumeration | Only lists origin branches | ✅ |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Stale cache | 30-second TTL, ?refresh=true bypasses | ✅ |
| Missing files | Try-catch around git operations | ✅ |
| Branch deleted | Scan continues with remaining branches | ✅ |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** Yes - one ticket should count as one, even with multiple files
2. **Is the control intuitive?** Yes - counts are automatic, no user configuration needed
3. **Is feedback immediate?** Mostly - 30-second cache means up to 30s delay, but acceptable
4. **Is the flow reversible?** N/A - read-only operation
5. **Are errors recoverable?** Yes - individual file/branch failures don't break entire scan
6. **Is the complexity justified?** Yes - accurate counts are critical for PM decisions

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Sequential branch scanning | Slow with many branches | 🟡 | Could parallelize git reads |
| No notification of deduplication | PM doesn't know files were merged | 🟢 | Log message already indicates "unique tickets" |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Ticket ID regex (scan) | docs/pm-dashboard-ui/server.js | 1524-1528 | Changed from `[a-z]?` to `[a-zA-Z]?` |
| Blocked deduplication | docs/pm-dashboard-ui/server.js | 1575-1583 | Map by ticket ID, keep most recent |
| Ticket ID regex (QA) | docs/pm-dashboard-ui/server.js | 1729 | Added `[a-zA-Z]?` suffix support |
| Console log | docs/pm-dashboard-ui/server.js | 1590 | Now says "blocked (unique tickets)" |
| Function JSDoc | docs/pm-dashboard-ui/server.js | 1458-1479 | Documents deduplication behavior |

---

## 9. RELATED FEATURES
- [Error Tracking](./error-tracking.md) - Uses similar scanning patterns for error logs
- PM Dashboard Job Queue (not yet documented) - Consumes these counts for automation decisions
- Agent Workflow (docs/workflow/DEV_AGENT_SOP.md) - Creates the blocked files being counted

---

## 10. OPEN QUESTIONS
1. Should deduplication also apply to completions and started? (Currently only blocks are deduplicated)
2. Should dashboard show a "Files vs Tickets" breakdown for transparency?
3. What happens if a ticket has files on multiple branches with different timestamps?
   - Current behavior: Most recent modifiedAt wins (uses `new Date().toISOString()` per file scan)
   - This might not be accurate if branches are scanned in different orders

---

## Impact

### Before Fix
- Regex: `[A-Z]+-\d+[a-z]?` - only lowercase suffixes
- Blocked count: 33 (counting files, not tickets)
- Merged count: 17 (missing tickets with suffixes)

### After Fix
- Regex: `[A-Z]+-\d+[a-zA-Z]?` - any letter suffixes
- Blocked count: 27 (unique tickets only)
- Merged count: 19 (includes tickets with suffixes)

### Commit Reference
- Commit: `216f837`
- Message: "fix: Dashboard now counts unique tickets correctly"
- Date: Sun Dec 7 02:36:30 2025 -0700
- Files changed: `docs/pm-dashboard-ui/server.js`
