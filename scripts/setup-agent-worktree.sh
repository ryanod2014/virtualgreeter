#!/bin/bash
# =============================================================================
# Setup Agent Worktree
# =============================================================================
# Creates an isolated git worktree for a dev agent to work in.
# This prevents branch pollution when multiple agents run in parallel.
#
# Usage: ./scripts/setup-agent-worktree.sh TKT-XXX [--force]
#
# Scenarios handled:
#   1. New ticket: Creates worktree from origin/main with new branch
#   2. Continuation: Creates worktree from existing remote branch
#   3. Re-run: Resets existing worktree to clean state
#   4. Force: Removes and recreates worktree (--force flag)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TICKET_ID="$1"
FORCE_FLAG="$2"
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="$MAIN_REPO_DIR/../agent-worktrees"
WORKTREE_DIR="$WORKTREE_BASE/$TICKET_ID"

# Validate input
if [ -z "$TICKET_ID" ]; then
    echo -e "${RED}Error: Ticket ID required${NC}"
    echo "Usage: $0 TKT-XXX [--force]"
    exit 1
fi

# Normalize ticket ID (uppercase)
TICKET_ID_UPPER=$(echo "$TICKET_ID" | tr '[:lower:]' '[:upper:]')
TICKET_ID_LOWER=$(echo "$TICKET_ID" | tr '[:upper:]' '[:lower:]')

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting up worktree for: $TICKET_ID_UPPER${NC}"
echo -e "${BLUE}========================================${NC}"

# Ensure we're in the main repo
cd "$MAIN_REPO_DIR"

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREE_BASE"

# Fetch latest from origin
echo -e "${YELLOW}Fetching latest from origin...${NC}"
git fetch origin --prune

# Check if worktree already exists
if [ -d "$WORKTREE_DIR" ]; then
    if [ "$FORCE_FLAG" == "--force" ]; then
        echo -e "${YELLOW}Force flag set. Removing existing worktree...${NC}"
        git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"
    else
        echo -e "${YELLOW}Worktree already exists at: $WORKTREE_DIR${NC}"
        
        # Check if it's in a clean state
        cd "$WORKTREE_DIR"
        if [ -n "$(git status --porcelain)" ]; then
            echo -e "${YELLOW}Worktree has uncommitted changes.${NC}"
            echo -e "Options:"
            echo -e "  1. Run with --force to reset: $0 $TICKET_ID --force"
            echo -e "  2. Manually commit/stash changes in $WORKTREE_DIR"
            exit 1
        fi
        
        # Pull latest changes
        echo -e "${GREEN}Worktree is clean. Pulling latest...${NC}"
        git pull origin "$(git branch --show-current)" 2>/dev/null || true
        
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}Worktree ready at: $WORKTREE_DIR${NC}"
        echo -e "${GREEN}Branch: $(git branch --show-current)${NC}"
        echo -e "${GREEN}========================================${NC}"
        exit 0
    fi
fi

# Ensure worktree dir doesn't exist (might be leftover from removed worktree)
if [ -d "$WORKTREE_DIR" ]; then
    rm -rf "$WORKTREE_DIR"
fi

# Check if remote branch exists for this ticket
# Look for branches matching agent/tkt-xxx-* or agent/TKT-XXX-*
REMOTE_BRANCH=$(git branch -r | grep -iE "origin/agent/${TICKET_ID_LOWER}[^/]*$" | head -1 | xargs || true)

if [ -n "$REMOTE_BRANCH" ]; then
    # SCENARIO: Continuation - branch exists on remote
    echo -e "${YELLOW}Found existing remote branch: $REMOTE_BRANCH${NC}"
    
    LOCAL_BRANCH=$(echo "$REMOTE_BRANCH" | sed 's|origin/||')
    
    # Remove local branch if it exists (we'll recreate from remote)
    git branch -D "$LOCAL_BRANCH" 2>/dev/null || true
    
    echo -e "${YELLOW}Creating worktree from existing branch...${NC}"
    git worktree add "$WORKTREE_DIR" -b "$LOCAL_BRANCH" "$REMOTE_BRANCH"
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}CONTINUATION: Worktree created from existing branch${NC}"
    echo -e "${GREEN}Path: $WORKTREE_DIR${NC}"
    echo -e "${GREEN}Branch: $LOCAL_BRANCH${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    # SCENARIO: New ticket - create fresh branch from main
    echo -e "${YELLOW}No existing branch found. Creating new branch from main...${NC}"
    
    # Generate branch name (lowercase, sanitized)
    BRANCH_NAME="agent/${TICKET_ID_LOWER}"
    
    # Check if local branch exists and remove it
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    
    echo -e "${YELLOW}Creating worktree with new branch...${NC}"
    git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME" origin/main
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}NEW TICKET: Worktree created from main${NC}"
    echo -e "${GREEN}Path: $WORKTREE_DIR${NC}"
    echo -e "${GREEN}Branch: $BRANCH_NAME${NC}"
    echo -e "${GREEN}========================================${NC}"
fi

# Install dependencies in the worktree
cd "$WORKTREE_DIR"
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo -e "To start working, run:"
echo -e "  ${BLUE}cd $WORKTREE_DIR${NC}"


