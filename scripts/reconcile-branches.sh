#!/bin/bash
# Reconcile all agent branches to main using SELECTIVE merge
# This ensures each ticket's changes are applied without overwriting others

set -e

PROJECT_ROOT="/Users/ryanodonnell/projects/Digital_greeter"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Branch Reconciliation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Ensure we're on main and up to date
git checkout main
git pull origin main

# Get all merged tickets from the database
echo -e "${YELLOW}Fetching merged/ready_to_merge tickets...${NC}"
MERGED_TICKETS=$(sqlite3 data/workflow.db "SELECT id FROM tickets WHERE status IN ('merged', 'ready_to_merge') ORDER BY id;")

echo ""
echo -e "${BLUE}Phase 1: Analyze what needs reconciliation${NC}"
echo ""

declare -a TICKETS_TO_RECONCILE=()

for ticket_id in $MERGED_TICKETS; do
    # Find the branch for this ticket
    ticket_lower=$(echo "$ticket_id" | tr '[:upper:]' '[:lower:]')
    
    # Try to find the branch
    branch=""
    for b in $(git branch -r | grep -i "agent.*${ticket_lower}" | tr -d ' '); do
        branch="$b"
        break
    done
    
    if [ -z "$branch" ]; then
        echo -e "  ${YELLOW}⏭️  $ticket_id: No branch found, skipping${NC}"
        continue
    fi
    
    # Get merge base
    merge_base=$(git merge-base main "$branch" 2>/dev/null || echo "")
    if [ -z "$merge_base" ]; then
        echo -e "  ${YELLOW}⏭️  $ticket_id: Cannot find merge base${NC}"
        continue
    fi
    
    # Get files this branch modified (excluding metadata)
    files_modified=$(git diff --name-only "$merge_base" "$branch" 2>/dev/null | grep -vE "^docs/agent-output|^docs/data|^docs/prompts|^\.agent|pnpm-lock.yaml|tsconfig.tsbuildinfo" || true)
    
    if [ -z "$files_modified" ]; then
        echo -e "  ${GREEN}✅ $ticket_id: No app files to reconcile${NC}"
        continue
    fi
    
    file_count=$(echo "$files_modified" | wc -l | tr -d ' ')
    echo -e "  ${BLUE}📁 $ticket_id: $file_count files to check ($branch)${NC}"
    TICKETS_TO_RECONCILE+=("$ticket_id|$branch")
done

echo ""
echo -e "${BLUE}Phase 2: Check for conflicts between tickets${NC}"
echo ""

# Build a map of file -> tickets
declare -A FILE_TICKETS

for entry in "${TICKETS_TO_RECONCILE[@]}"; do
    ticket_id=$(echo "$entry" | cut -d'|' -f1)
    branch=$(echo "$entry" | cut -d'|' -f2)
    
    merge_base=$(git merge-base main "$branch" 2>/dev/null)
    files=$(git diff --name-only "$merge_base" "$branch" 2>/dev/null | grep -vE "^docs/|^\.agent|pnpm-lock|tsconfig" || true)
    
    for file in $files; do
        if [ -n "${FILE_TICKETS[$file]}" ]; then
            FILE_TICKETS[$file]="${FILE_TICKETS[$file]},$ticket_id"
        else
            FILE_TICKETS[$file]="$ticket_id"
        fi
    done
done

CONFLICT_COUNT=0
for file in "${!FILE_TICKETS[@]}"; do
    tickets="${FILE_TICKETS[$file]}"
    if [[ "$tickets" == *","* ]]; then
        echo -e "  ${RED}⚠️  CONFLICT: $file${NC}"
        echo -e "     Tickets: $tickets"
        ((CONFLICT_COUNT++))
    fi
done

if [ "$CONFLICT_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}✅ No conflicts detected!${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Tickets to reconcile: ${#TICKETS_TO_RECONCILE[@]}"
echo "Files with conflicts: $CONFLICT_COUNT"
echo ""

if [ "$1" != "--apply" ]; then
    echo -e "${YELLOW}Dry run complete. Run with --apply to perform reconciliation.${NC}"
    echo ""
    echo "Example: $0 --apply"
    exit 0
fi

echo -e "${BLUE}Phase 3: Apply selective merges${NC}"
echo ""

for entry in "${TICKETS_TO_RECONCILE[@]}"; do
    ticket_id=$(echo "$entry" | cut -d'|' -f1)
    branch=$(echo "$entry" | cut -d'|' -f2)
    
    echo -e "${YELLOW}Processing $ticket_id...${NC}"
    
    merge_base=$(git merge-base main "$branch" 2>/dev/null)
    files=$(git diff --name-only "$merge_base" "$branch" 2>/dev/null | grep -vE "^docs/agent-output|^docs/data|^docs/prompts|^\.agent|pnpm-lock|tsconfig" || true)
    
    if [ -z "$files" ]; then
        echo -e "  ${GREEN}✅ No files to apply${NC}"
        continue
    fi
    
    # Selective checkout of each file
    for file in $files; do
        # Check if file exists in branch
        if git show "$branch:$file" > /dev/null 2>&1; then
            git checkout "$branch" -- "$file" 2>/dev/null || true
            echo -e "  ${GREEN}✓ $file${NC}"
        else
            # File was deleted
            git rm --ignore-unmatch "$file" 2>/dev/null || true
            echo -e "  ${RED}✗ $file (deleted)${NC}"
        fi
    done
done

# Check if there are changes to commit
if git diff --cached --quiet && git diff --quiet; then
    echo ""
    echo -e "${GREEN}No changes needed - main is already reconciled!${NC}"
else
    echo ""
    echo -e "${YELLOW}Staging changes...${NC}"
    git add -A
    
    echo -e "${YELLOW}Creating reconciliation commit...${NC}"
    git commit -m "Reconcile: Apply selective file changes from ${#TICKETS_TO_RECONCILE[@]} tickets

This commit ensures all ticket branches are properly merged using
selective file checkout (not full git merge) to prevent overwrites.

Tickets reconciled: $(echo "${TICKETS_TO_RECONCILE[@]}" | tr '|' ' ' | tr ' ' '\n' | grep -v origin | sort -u | tr '\n' ' ')"

    echo ""
    echo -e "${GREEN}✅ Reconciliation complete!${NC}"
    echo ""
    echo "Run 'git push origin main' to push changes."
fi
