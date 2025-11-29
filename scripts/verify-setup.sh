#!/bin/bash

# =============================================================================
# Ghost-Greeter Setup Verification Script
# =============================================================================
# This script verifies that your local development environment is set up correctly.
# Run with: ./scripts/verify-setup.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Ghost-Greeter Setup Verification                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is missing"
        return 1
    fi
}

# Function to check env var in file
check_env_var() {
    local file=$1
    local var=$2
    if grep -q "^${var}=" "$file" 2>/dev/null; then
        local value=$(grep "^${var}=" "$file" | cut -d'=' -f2)
        if [[ "$value" == *"your"* ]] || [[ "$value" == *"placeholder"* ]] || [[ -z "$value" ]]; then
            echo -e "${YELLOW}⚠${NC} $var is not configured in $file"
            return 1
        else
            echo -e "${GREEN}✓${NC} $var is configured"
            return 0
        fi
    else
        echo -e "${RED}✗${NC} $var is missing from $file"
        return 1
    fi
}

# =============================================================================
# Check Prerequisites
# =============================================================================
echo -e "${BLUE}Checking Prerequisites...${NC}"
echo ""

check_command "node" || ((ERRORS++))
check_command "pnpm" || ((ERRORS++))
check_command "git" || ((ERRORS++))

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo -e "${GREEN}✓${NC} Node.js version is 20+ ($(node -v))"
else
    echo -e "${YELLOW}⚠${NC} Node.js version is $(node -v), recommend 20+"
    ((WARNINGS++))
fi

# Check pnpm version
PNPM_VERSION=$(pnpm -v | cut -d'.' -f1)
if [ "$PNPM_VERSION" -ge 8 ]; then
    echo -e "${GREEN}✓${NC} pnpm version is 8+ ($(pnpm -v))"
else
    echo -e "${YELLOW}⚠${NC} pnpm version is $(pnpm -v), recommend 8+"
    ((WARNINGS++))
fi

echo ""

# =============================================================================
# Check Project Structure
# =============================================================================
echo -e "${BLUE}Checking Project Structure...${NC}"
echo ""

check_file "package.json" || ((ERRORS++))
check_file "pnpm-workspace.yaml" || ((ERRORS++))
check_file "turbo.json" || ((ERRORS++))
check_file "apps/dashboard/package.json" || ((ERRORS++))
check_file "apps/server/package.json" || ((ERRORS++))
check_file "apps/widget/package.json" || ((ERRORS++))
check_file "packages/domain/package.json" || ((ERRORS++))

echo ""

# =============================================================================
# Check Environment Files
# =============================================================================
echo -e "${BLUE}Checking Environment Configuration...${NC}"
echo ""

# Dashboard env
if [ -f "apps/dashboard/.env.local" ]; then
    echo -e "${GREEN}✓${NC} apps/dashboard/.env.local exists"
    check_env_var "apps/dashboard/.env.local" "NEXT_PUBLIC_SUPABASE_URL" || ((WARNINGS++))
    check_env_var "apps/dashboard/.env.local" "NEXT_PUBLIC_SUPABASE_ANON_KEY" || ((WARNINGS++))
    check_env_var "apps/dashboard/.env.local" "NEXT_PUBLIC_SIGNALING_SERVER" || ((WARNINGS++))
else
    echo -e "${RED}✗${NC} apps/dashboard/.env.local is missing"
    echo -e "   Run: ${YELLOW}cp apps/dashboard/.env.example apps/dashboard/.env.local${NC}"
    ((ERRORS++))
fi

# Server env
if [ -f "apps/server/.env" ]; then
    echo -e "${GREEN}✓${NC} apps/server/.env exists"
    check_env_var "apps/server/.env" "SUPABASE_URL" || ((WARNINGS++))
    check_env_var "apps/server/.env" "SUPABASE_SERVICE_ROLE_KEY" || ((WARNINGS++))
else
    echo -e "${RED}✗${NC} apps/server/.env is missing"
    echo -e "   Run: ${YELLOW}cp apps/server/.env.example apps/server/.env${NC}"
    ((ERRORS++))
fi

echo ""

# =============================================================================
# Check Dependencies
# =============================================================================
echo -e "${BLUE}Checking Dependencies...${NC}"
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${RED}✗${NC} node_modules is missing"
    echo -e "   Run: ${YELLOW}pnpm install${NC}"
    ((ERRORS++))
fi

echo ""

# =============================================================================
# Check Built Packages
# =============================================================================
echo -e "${BLUE}Checking Built Packages...${NC}"
echo ""

if [ -d "packages/domain/dist" ]; then
    echo -e "${GREEN}✓${NC} packages/domain is built"
else
    echo -e "${YELLOW}⚠${NC} packages/domain needs to be built"
    echo -e "   Run: ${YELLOW}pnpm build --filter=@ghost-greeter/domain${NC}"
    ((WARNINGS++))
fi

if [ -d "packages/config/dist" ] || [ -f "packages/config/tsconfig.base.json" ]; then
    echo -e "${GREEN}✓${NC} packages/config is available"
else
    echo -e "${YELLOW}⚠${NC} packages/config may need to be built"
    ((WARNINGS++))
fi

echo ""

# =============================================================================
# Check Git Configuration
# =============================================================================
echo -e "${BLUE}Checking Git Configuration...${NC}"
echo ""

CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"

if git remote get-url origin &>/dev/null; then
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓${NC} Remote origin: $REMOTE_URL"
else
    echo -e "${YELLOW}⚠${NC} No remote origin configured"
    ((WARNINGS++))
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! You're ready to develop.${NC}"
    echo ""
    echo -e "Start development with: ${YELLOW}pnpm dev${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup complete with $WARNINGS warning(s).${NC}"
    echo ""
    echo -e "You can start development, but consider fixing the warnings."
    echo -e "Start with: ${YELLOW}pnpm dev${NC}"
else
    echo -e "${RED}❌ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo -e "Please fix the errors above before starting development."
fi

echo ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "  • Onboarding:    docs/ONBOARDING.md"
echo -e "  • Contributing:  CONTRIBUTING.md"
echo -e "  • Environments:  ENVIRONMENTS.md"
echo ""

exit $ERRORS

