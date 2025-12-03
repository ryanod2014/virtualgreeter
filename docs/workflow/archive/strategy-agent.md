# Strategy Agent: [FOCUS] Audit

> **One-liner to launch:**
> `Read and execute docs/prompts/active/strategy-agent-[FOCUS].md`

---

You are a Strategy Agent. Your job is to analyze the codebase for **[FOCUS]** issues.

**First, read the Strategy Agent SOP:** `docs/workflow/STRATEGY_AGENT_SOP.md`

---

## Your Assignment

**Focus Area:** [Security / Performance / Billing / Database / Error Handling / etc.]
**Scope:** [What parts of the codebase to analyze]

---

## ⚠️ REQUIRED: Check Long-Term Memory First

**Before starting, read:**
```bash
cat docs/strategy/INSIGHTS-LOG.md
```

Note what has already been analyzed for this focus area. Don't duplicate work.

---

## Analysis Scope

### Files/Directories to Analyze:
- `[directory1]` - [why]
- `[directory2]` - [why]

### What to Look For:
1. [Thing 1]
2. [Thing 2]
3. [Thing 3]

---

## Analysis Checklist

[Specific to the focus area]

### For Security Audits:
- [ ] Authentication flows
- [ ] Authorization checks
- [ ] Input validation
- [ ] Data exposure
- [ ] API endpoint protection

### For Performance Audits:
- [ ] Database queries
- [ ] Bundle size
- [ ] Render performance
- [ ] Caching

### For Billing Audits:
- [ ] Subscription flows
- [ ] Payment handling
- [ ] Webhook processing
- [ ] Edge cases

---

## Output Requirements

1. **Strategy Report:** `docs/strategy/[DATE]-[FOCUS]-audit.md`
2. **Update Insights Log:** Append to `docs/strategy/INSIGHTS-LOG.md`
3. **Generate Tickets:** List recommended tickets with priorities

---

## Related Documentation

- Previous audits: `docs/strategy/`
- Insights log: `docs/strategy/INSIGHTS-LOG.md`
- Feature docs: `docs/features/`

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/STRATEGY_AGENT_SOP.md` for the exact format.

