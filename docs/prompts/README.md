# Agent Prompts

## Directory Structure

```
prompts/
├── PM-AGENT.md           # PM agent system prompt (your main chat)
├── templates/            # Reusable templates (don't edit directly)
│   ├── DOC-AGENT.md
│   ├── DEV-AGENT.md
│   └── QA-AGENT.md
└── active/               # Current session specs (PM writes here)
    ├── doc-agent-1-P2.md
    ├── doc-agent-2-V3.md
    └── ...
```

## How It Works

1. **You** tell PM what work to start
2. **PM** writes customized specs to `active/` folder
3. **You** spawn agents with a simple one-liner referencing the spec file
4. **Agents** read their spec and execute

## Spawning Agents

When PM says "specs ready", spawn agents with:

```
Read and execute the spec in docs/prompts/active/[filename].md
```

That's it. The spec file has everything the agent needs.

## Active Specs

| File | Agent | Feature | Status |
|------|-------|---------|--------|
| `doc-agent-1-P2.md` | Doc Agent 1 | Agent Assignment | 🟡 Active |
| `doc-agent-2-V3.md` | Doc Agent 2 | Visitor Call | 🟡 Active |

## Templates

Templates in `templates/` are the base patterns. PM customizes these for each specific task.

| Template | When Used |
|----------|-----------|
| `DOC-AGENT.md` | Documenting a feature |
| `DEV-AGENT.md` | Implementing a fix (includes git workflow) |
| `REVIEW-AGENT.md` | Code review before QA |
| `QA-AGENT.md` | Testing a fix (automated) |
| `STRATEGY-AGENT.md` | Paranoid risk hunter - finds ways we could die |
| `CONTINUATION-SPEC.md` | **Resuming work after question answered** |

## Continuation Specs (Important!)

When an agent stops with questions and you answer them, PM creates a **continuation spec** so a new agent can pick up where the previous one left off.

### How It Works

```
Agent stops with Q-XXX → You answer → PM creates CONTINUED spec → You spawn new agent
```

### Naming Convention

| Original | Continuation |
|----------|--------------|
| `doc-agent-10-V4.md` | `doc-agent-10-V4-CONTINUED.md` |

### What's Included

- ✅ What previous agent completed
- ✅ The question + your answer
- ✅ What action the answer requires
- ✅ Remaining phases to complete
- ✅ Original context for reference

### Example

See `docs/prompts/active/doc-agent-10-V4-CONTINUED.md` for a real example.

## Pipeline Order

```
Dev Agent → Review Agent → QA Agent → Human Review → Merge
```

PM enforces this order. Don't skip code review.

**Don't give agents the template directly** - always use a customized spec in `active/`.

## QA Output

QA agents save human test checklists to: `docs/qa-checklists/[TICKET-ID]-human-qa.md`
