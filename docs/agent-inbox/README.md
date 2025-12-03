# Agent Inbox System

This folder contains inbox files for async communication with worker agents.

## How It Works

1. **PM Agent** writes messages to worker inboxes
2. **Worker Agents** check their inbox when blocked or periodically
3. **Messages are timestamped** for tracking

## Naming Convention

- `doc-agent-1.md` - Documentation agent working on first feature
- `doc-agent-2.md` - Documentation agent working on second feature
- `dev-agent-1.md` - Dev agent working on first fix
- `qa-agent-1.md` - QA agent

## Message Format

```markdown
### [YYYY-MM-DD HH:MM] From: PM Agent
**Re: [Task/Feature ID]**

[Message content]

---
```

## For Workers

When you see a message in your inbox:
1. Read and understand it
2. Move it to "## Acknowledged" section
3. Act on the information

