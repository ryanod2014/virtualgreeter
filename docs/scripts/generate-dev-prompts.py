#!/usr/bin/env python3
"""
Generate dev agent prompt files from tickets.json

Usage: python3 docs/scripts/generate-dev-prompts.py
"""

import json
import os
from datetime import datetime

TICKETS_PATH = "docs/data/tickets.json"
PROMPTS_DIR = "docs/prompts/active"

PROMPT_TEMPLATE = '''# Dev Agent: {id} - {title}

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-{id}-v1.md`

---

You are a Dev Agent. Your job is to implement **{id}: {title}**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** {id}
**Priority:** {priority}
**Difficulty:** {difficulty}
**Branch:** `agent/{id_lower}-{branch_suffix}`
**Version:** v1

---

## The Problem

{issue}

---

## Files to Modify

| File | What to Change |
|------|----------------|
{files_table}

{feature_docs_section}
{similar_code_section}
---

## What to Implement

{fix_required_list}

---

## Acceptance Criteria

{acceptance_criteria_list}

---

## Out of Scope

{out_of_scope_list}

---

## Risks to Avoid

{risks_section}

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```
{dev_checks_section}

---
{qa_notes_section}
## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/{id}-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/{id}-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-{id}-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-{id}-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
'''

def generate_prompt(ticket):
    """Generate a prompt file content from a ticket."""
    
    id = ticket['id']
    title = ticket.get('title', 'Untitled')
    priority = ticket.get('priority', 'medium').capitalize()
    difficulty = ticket.get('difficulty', 'medium').capitalize()
    issue = ticket.get('issue', 'No issue description provided.')
    
    # Branch suffix from title
    branch_suffix = title.lower().replace(' ', '-')[:30].rstrip('-')
    
    # Files table
    files = ticket.get('files_to_modify', ticket.get('files', []))
    if files:
        files_table = '\n'.join([f'| `{f}` | Implement required changes |' for f in files])
    else:
        files_table = '| (see ticket for files) | |'
    
    # Feature docs section
    feature_docs = ticket.get('feature_docs', [])
    if feature_docs:
        docs_list = '\n'.join([f'- `{d}`' for d in feature_docs])
        feature_docs_section = f'''
**Feature Documentation:**
{docs_list}

'''
    else:
        feature_docs_section = ''
    
    # Similar code section
    similar_code = ticket.get('similar_code', [])
    if similar_code:
        code_list = '\n'.join([f'- {c}' for c in similar_code])
        similar_code_section = f'''
**Similar Code:**
{code_list}

'''
    else:
        similar_code_section = ''
    
    # Fix required list
    fix_required = ticket.get('fix_required', [])
    if fix_required:
        fix_required_list = '\n'.join([f'{i+1}. {f}' for i, f in enumerate(fix_required)])
    else:
        fix_required_list = '(See ticket for implementation details)'
    
    # Acceptance criteria
    criteria = ticket.get('acceptance_criteria', [])
    if criteria:
        acceptance_criteria_list = '\n'.join([f'- [ ] {c}' for c in criteria])
    else:
        acceptance_criteria_list = '- [ ] (See ticket for acceptance criteria)'
    
    # Out of scope
    out_of_scope = ticket.get('out_of_scope', [])
    if out_of_scope:
        out_of_scope_list = '\n'.join([f'- ❌ {o}' for o in out_of_scope])
    else:
        out_of_scope_list = '- (No explicit out-of-scope items listed)'
    
    # Risks
    risks = ticket.get('risks', ticket.get('risk_notes', []))
    if risks:
        risks_section = '| Risk | How to Avoid |\n|------|--------------|'
        for r in risks:
            risks_section += f'\n| {r} | Follow existing patterns |'
    else:
        risks_section = '| Risk | How to Avoid |\n|------|--------------|\n| (Low risk) | Follow existing patterns |'
    
    # Dev checks
    dev_checks = ticket.get('dev_checks', [])
    if dev_checks:
        extra_checks = [c for c in dev_checks if 'typecheck' not in c.lower() and 'build' not in c.lower()]
        if extra_checks:
            dev_checks_section = '\n\n**Additional checks:**\n' + '\n'.join([f'- {c}' for c in extra_checks])
        else:
            dev_checks_section = ''
    else:
        dev_checks_section = ''
    
    # QA notes
    qa_notes = ticket.get('qa_notes', '')
    if qa_notes:
        qa_notes_section = f'''
## QA Notes

{qa_notes}

---
'''
    else:
        qa_notes_section = ''
    
    return PROMPT_TEMPLATE.format(
        id=id,
        id_lower=id.lower(),
        title=title,
        priority=priority,
        difficulty=difficulty,
        branch_suffix=branch_suffix,
        issue=issue,
        files_table=files_table,
        feature_docs_section=feature_docs_section,
        similar_code_section=similar_code_section,
        fix_required_list=fix_required_list,
        acceptance_criteria_list=acceptance_criteria_list,
        out_of_scope_list=out_of_scope_list,
        risks_section=risks_section,
        dev_checks_section=dev_checks_section,
        qa_notes_section=qa_notes_section
    )


def main():
    # Load tickets
    with open(TICKETS_PATH, 'r') as f:
        data = json.load(f)
    
    # Get existing prompts
    existing = set()
    for f in os.listdir(PROMPTS_DIR):
        if f.startswith('dev-agent-') and f.endswith('.md'):
            parts = f.replace('dev-agent-', '').replace('.md', '').rsplit('-v', 1)
            if parts:
                existing.add(parts[0])
    
    # Filter to ready tickets without prompts
    ready = [t for t in data['tickets'] if t['status'] == 'ready']
    missing = [t for t in ready if t['id'] not in existing]
    
    print(f"Ready tickets: {len(ready)}")
    print(f"Existing prompts: {len(existing)}")
    print(f"Missing prompts: {len(missing)}")
    print()
    
    # Generate missing prompts
    created = 0
    skipped = 0
    for ticket in missing:
        ticket_id = ticket['id']
        
        # Validation: Skip tickets without files_to_modify
        files = ticket.get('files_to_modify', ticket.get('files', []))
        if not files:
            print(f"⚠️  Skipped {ticket_id}: No files_to_modify specified - ticket needs PM review")
            skipped += 1
            continue
        
        # Validation: Check for fix_required/title mismatch (basic sanity check)
        fix_required = ticket.get('fix_required', [])
        title = ticket.get('title', '').lower()
        issue = ticket.get('issue', '').lower()
        ticket_text = title + ' ' + issue
        
        # Suspicious terms that should match between fix_required and ticket
        suspicious_terms = ['sanitization', 'password', 'cache', 'ttl', 'webhook', 'stripe', 'auth', 'billing']
        has_mismatch = False
        for fix in fix_required:
            fix_lower = fix.lower()
            for term in suspicious_terms:
                if term in fix_lower and term not in ticket_text:
                    print(f"⚠️  Skipped {ticket_id}: fix_required mentions '{term}' but title/issue doesn't - possible data mismatch")
                    has_mismatch = True
                    break
            if has_mismatch:
                break
        
        if has_mismatch:
            skipped += 1
            continue
        
        prompt_path = os.path.join(PROMPTS_DIR, f"dev-agent-{ticket_id}-v1.md")
        content = generate_prompt(ticket)
        
        with open(prompt_path, 'w') as f:
            f.write(content)
        
        print(f"✅ Created: {prompt_path}")
        created += 1
    
    print()
    if skipped > 0:
        print(f"⚠️  Skipped {skipped} tickets due to validation issues - review manually")
    print(f"Done! Created {created} prompt files.")


if __name__ == '__main__':
    main()

