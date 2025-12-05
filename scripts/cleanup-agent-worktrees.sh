#!/bin/bash
# =============================================================================
# Cleanup Agent Worktrees
# =============================================================================
# Removes worktrees and branches for tickets that have been merged to main.
# Run this after reviewing and merging agent branches.
#
# Usage: ./scripts/cleanup-agent-worktrees.sh [--all] [--dry-run] [TICKET_ID...]
#
# Options:
#   --all       Clean up ALL worktrees (for merged branches only)
#   --dry-run   Show what would be cleaned up without doing it
#   TICKET_ID   Specific ticket(s) to clean up (e.g., TKT-001 TKT-002)
#
# Examples:
#   ./scripts/cleanup-agent-worktrees.sh TKT-001          # Clean one ticket
#   ./scripts/cleanup-agent-worktrees.sh TKT-001 TKT-002  # Clean multiple
#   ./scripts/cleanup-agent-worktrees.sh --all            # Clean all merged
#   ./scripts/cleanup-agent-worktrees.sh --all --dry-run  # Preview cleanup
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"

# Parse arguments
DRY_RUN=false
CLEAN_ALL=false
TICKET_IDS=()

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --all)
            CLEAN_ALL=true
            ;;
        *)
            TICKET_IDS+=("$arg")
            ;;
    esac
done

# Ensure we're in the main repo
cd "$MAIN_REPO_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Agent Worktree Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Function to check if a branch is merged to main
is_merged_to_main() {
    local branch=$1
    git merge-base --is-ancestor "$branch" origin/main 2>/dev/null
}

# Function to clean up a single ticket
cleanup_ticket() {
    local ticket_id=$1
    local worktree_dir="$WORKTREE_BASE/$ticket_id"
    
    echo -e "${YELLOW}Processing: $ticket_id${NC}"
    
    # Check if worktree exists
    if [ ! -d "$worktree_dir" ]; then
        echo -e "  ${YELLOW}No worktree found at $worktree_dir${NC}"
        return 0
    fi
    
    # Get the branch name from the worktree
    cd "$worktree_dir" 2>/dev/null || {
        echo -e "  ${RED}Cannot access worktree directory${NC}"
        return 1
    }
    
    local branch_name=$(git branch --show-current 2>/dev/null || echo "")
    cd "$MAIN_REPO_DIR"
    
    if [ -z "$branch_name" ]; then
        echo -e "  ${YELLOW}Could not determine branch name${NC}"
        return 1
    fi
    
    echo -e "  Branch: $branch_name"
    echo -e "  Worktree: $worktree_dir"
    
    # Check if branch is merged
    if is_merged_to_main "origin/$branch_name" 2>/dev/null || is_merged_to_main "$branch_name" 2>/dev/null; then
        echo -e "  ${GREEN}Branch is merged to main - safe to remove${NC}"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${YELLOW}[DRY RUN] Would remove worktree and branch${NC}"
        else
            # Remove worktree
            echo -e "  Removing worktree..."
            git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
            
            # Delete local branch
            echo -e "  Deleting local branch..."
            git branch -D "$branch_name" 2>/dev/null || true
            
            # Delete remote branch (optional - commented out for safety)
            # echo -e "  Deleting remote branch..."
            # git push origin --delete "$branch_name" 2>/dev/null || true
            
            echo -e "  ${GREEN}Cleaned up successfully${NC}"
        fi
    else
        echo -e "  ${RED}Branch is NOT merged to main - skipping${NC}"
        echo -e "  ${YELLOW}Merge the branch first, then run cleanup again${NC}"
    fi
    
    echo ""
}

# Function to find all worktrees
find_all_worktrees() {
    if [ ! -d "$WORKTREE_BASE" ]; then
        return
    fi
    
    for dir in "$WORKTREE_BASE"/*/; do
        if [ -d "$dir" ]; then
            basename "$dir"
        fi
    done
}

# Main logic
if [ "$CLEAN_ALL" = true ]; then
    echo -e "${YELLOW}Scanning all worktrees...${NC}"
    echo ""
    
    # Fetch latest
    git fetch origin --prune
    
    worktrees=($(find_all_worktrees))
    
    if [ ${#worktrees[@]} -eq 0 ]; then
        echo -e "${YELLOW}No worktrees found in $WORKTREE_BASE${NC}"
        exit 0
    fi
    
    for ticket_id in "${worktrees[@]}"; do
        cleanup_ticket "$ticket_id"
    done
    
elif [ ${#TICKET_IDS[@]} -gt 0 ]; then
    # Fetch latest
    git fetch origin --prune
    
    for ticket_id in "${TICKET_IDS[@]}"; do
        cleanup_ticket "$ticket_id"
    done
    
else
    echo -e "${RED}Error: No tickets specified${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 TKT-001 TKT-002    # Clean specific tickets"
    echo "  $0 --all              # Clean all merged worktrees"
    echo "  $0 --all --dry-run    # Preview what would be cleaned"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Cleanup complete!${NC}"
echo -e "${BLUE}========================================${NC}"

# Show remaining worktrees
remaining=$(find_all_worktrees | wc -l | xargs)
echo -e "Remaining worktrees: $remaining"

if [ "$remaining" -gt 0 ]; then
    echo -e "Worktrees still active:"
    find_all_worktrees | while read ticket; do
        echo -e "  - $ticket"
    done
fi

