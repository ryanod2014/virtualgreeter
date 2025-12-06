# Claude Code Agent Instructions

> This file contains instructions for AI agents running in Claude Code (Anthropic's CLI tool).

---

## QA Review Agent

If you are a **QA Review Agent**, follow these steps:

### 1. Read Your SOP

```bash
cat docs/workflow/QA_REVIEW_AGENT_SOP.md
```

### 2. Read Your Prompt

Your specific assignment is in `docs/prompts/active/qa-review-[TICKET-ID].md`

### 3. Playwright MCP for Browser Testing

Since Claude Code doesn't have native browser tools, use **Playwright MCP** for browser testing.

#### Setup Check

Before testing, verify Playwright MCP is configured:

```bash
# Check if Playwright MCP is available
which npx && npx @playwright/mcp@latest --help
```

If not available, the human needs to install it:

```bash
npm install -g @playwright/mcp@latest
```

#### Using Playwright MCP Tools

Once configured, you have access to these MCP tools:

```typescript
// Navigate to a URL
playwright_navigate({ url: "http://localhost:3000" })

// Take a screenshot
playwright_screenshot({ path: "screenshot.png" })

// Click an element
playwright_click({ selector: "button[data-testid='submit']" })

// Type into an input
playwright_fill({ selector: "input[name='email']", value: "test@example.com" })

// Wait for element
playwright_wait({ selector: ".modal", state: "visible" })

// Get text content
playwright_get_text({ selector: ".message" })

// Assert element state
playwright_expect({ selector: "button", enabled: true })

// Run JavaScript on page
playwright_evaluate({ script: "document.title" })
```

### 4. Key Commands

```bash
# Build verification
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Start dev server (for browser tests)
pnpm dev

# Checkout branch
git checkout [branch-name]
git pull origin [branch-name]
```

### 5. Output Locations

- **Start signal:** `docs/agent-output/started/QA-[TICKET-ID]-[timestamp].json`
- **Pass report:** `docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md`
- **Fail report:** `docs/agent-output/qa-results/QA-[TICKET-ID]-FAILED-[timestamp].md`
- **Blocker (if fail):** `docs/agent-output/blocked/QA-[TICKET-ID]-FAILED-[timestamp].json`

---

## Dev Agent

If you are a **Dev Agent**, follow these steps:

### 1. Read Your SOP

```bash
cat docs/workflow/DEV_AGENT_SOP.md
```

### 2. Key Rules

- Create branch: `agent/TKT-XXX-short-description`
- Only modify files in `files_to_modify`
- Signal start in `docs/agent-output/started/`
- Write completion report when done
- If blocked, write to `docs/agent-output/blocked/`

---

## Common Paths

| Path | Purpose |
|------|---------|
| `docs/workflow/` | All agent SOPs |
| `docs/prompts/active/` | Current agent assignments |
| `docs/data/tickets.json` | Ticket specifications |
| `docs/features/` | Feature documentation |
| `docs/agent-output/` | Agent outputs (started, blocked, completions) |

---

## MCP Server Configuration

For Claude Code, ensure your MCP configuration includes Playwright:

**File:** `~/.claude/mcp.json` or project-level `.mcp.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

---

## Quick Reference

### Build Commands

```bash
pnpm install          # Install dependencies
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm dev              # Start dev server
```

### Git Commands

```bash
git fetch origin                    # Fetch latest
git checkout [branch]               # Switch branch
git pull origin [branch]            # Pull latest
git status                          # Check status
git log --oneline -5                # Recent commits
git diff main..[branch] --stat      # See changes
```

### Reading Tickets

```bash
# Get specific ticket
cat docs/data/tickets.json | jq '.tickets[] | select(.id == "TKT-XXX")'

# List all tickets by status
cat docs/data/tickets.json | jq '.tickets[] | {id, title, status}'
```

