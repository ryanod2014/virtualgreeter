#!/bin/bash
set -e

# MaxMind GeoLite2 Database Setup Script
# Downloads and extracts the GeoLite2-City database using credentials from .agent-credentials.json

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🌍 MaxMind GeoLite2 Database Setup"
echo "=================================="
echo ""

# Determine script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$SERVER_DIR/data"

# Find project root using git (works in main repo AND worktrees)
# First try to find the main worktree (where .git directory lives)
if git rev-parse --show-toplevel &>/dev/null; then
    GIT_ROOT="$(git rev-parse --show-toplevel)"
    
    # Check if we're in a worktree by looking for .git file (not directory)
    if [ -f "$GIT_ROOT/.git" ]; then
        # We're in a worktree - find the main repo
        MAIN_REPO="$(git rev-parse --git-common-dir | sed 's|/\.git$||')"
    else
        # We're in the main repo
        MAIN_REPO="$GIT_ROOT"
    fi
else
    # Fallback to relative path calculation
    MAIN_REPO="$(dirname "$(dirname "$SERVER_DIR")")"
fi

# Also check environment variable override
PROJECT_ROOT="${MAIN_REPO_PATH:-$MAIN_REPO}"

echo "📂 Directories:"
echo "   Project Root: $PROJECT_ROOT"
echo "   Server Dir:   $SERVER_DIR"
echo "   Data Dir:     $DATA_DIR"
echo ""

# Search for credentials in multiple locations (priority order)
CREDENTIALS_LOCATIONS=(
    "${AGENT_CREDENTIALS_PATH:-}"                           # 1. Environment variable
    "$PROJECT_ROOT/docs/data/.agent-credentials.json"       # 2. Main repo
    "$GIT_ROOT/docs/data/.agent-credentials.json"           # 3. Current git root (might be worktree)
    "$(dirname "$SERVER_DIR")/docs/data/.agent-credentials.json"  # 4. Relative fallback
)

CREDENTIALS_FILE=""
for loc in "${CREDENTIALS_LOCATIONS[@]}"; do
    if [ -n "$loc" ] && [ -f "$loc" ]; then
        CREDENTIALS_FILE="$loc"
        break
    fi
done

# Check if credentials file was found
if [ -z "$CREDENTIALS_FILE" ]; then
    echo -e "${RED}❌ Error: Could not find .agent-credentials.json${NC}"
    echo ""
    echo "Searched locations:"
    for loc in "${CREDENTIALS_LOCATIONS[@]}"; do
        if [ -n "$loc" ]; then
            echo "  - $loc"
        fi
    done
    echo ""
    echo "Options:"
    echo "  1. Create the file in the main repository"
    echo "  2. Set AGENT_CREDENTIALS_PATH environment variable"
    echo ""
    echo "File structure:"
    echo '{'
    echo '  "maxmind": {'
    echo '    "license_key": "your-license-key-here"'
    echo '  }'
    echo '}'
    exit 1
fi

echo -e "${GREEN}✓ Found credentials: $CREDENTIALS_FILE${NC}"

# Extract license key using jq if available, otherwise use grep/sed
if command -v jq &> /dev/null; then
    LICENSE_KEY=$(jq -r '.maxmind.license_key' "$CREDENTIALS_FILE")
else
    # Fallback to grep/sed if jq is not available
    LICENSE_KEY=$(grep -A 1 '"license_key"' "$CREDENTIALS_FILE" | tail -1 | sed 's/[^:]*: *"\([^"]*\)".*/\1/')
fi

# Validate license key
if [ -z "$LICENSE_KEY" ] || [ "$LICENSE_KEY" = "null" ]; then
    echo -e "${RED}❌ Error: Could not read license_key from credentials file${NC}"
    echo "   File: $CREDENTIALS_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Found license key: ${LICENSE_KEY:0:8}...${LICENSE_KEY: -4}${NC}"
echo ""

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"
echo -e "${GREEN}✓ Data directory ready: $DATA_DIR${NC}"

# Download URL for GeoLite2-City
DOWNLOAD_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${LICENSE_KEY}&suffix=tar.gz"
TEMP_FILE="$DATA_DIR/GeoLite2-City.tar.gz"
TARGET_FILE="$DATA_DIR/GeoLite2-City.mmdb"

# Check if database already exists
if [ -f "$TARGET_FILE" ]; then
    echo -e "${YELLOW}⚠️  Database file already exists: $TARGET_FILE${NC}"
    read -p "Do you want to re-download? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping download. Exiting."
        exit 0
    fi
    echo "Removing existing database..."
    rm -f "$TARGET_FILE"
fi

# Download the database
echo "📥 Downloading GeoLite2-City database..."
if curl -L -f -o "$TEMP_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
    echo -e "${GREEN}✓ Download complete${NC}"
else
    echo -e "${RED}❌ Download failed${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  1. Invalid license key"
    echo "  2. Network connection issues"
    echo "  3. MaxMind API is down"
    echo ""
    echo "Please verify your license key at: https://www.maxmind.com/en/account/login"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Check if downloaded file is valid (not an error page)
FILE_SIZE=$(stat -f%z "$TEMP_FILE" 2>/dev/null || stat -c%s "$TEMP_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -lt 1000000 ]; then
    echo -e "${RED}❌ Downloaded file is too small (${FILE_SIZE} bytes)${NC}"
    echo "This might be an error page instead of the database."
    echo ""
    echo "First few lines of the file:"
    head -5 "$TEMP_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Downloaded ${FILE_SIZE} bytes${NC}"

# Extract the database
echo "📦 Extracting database..."
tar -xzf "$TEMP_FILE" -C "$DATA_DIR" --strip-components=1 '*/GeoLite2-City.mmdb' 2>/dev/null || {
    echo -e "${RED}❌ Extraction failed${NC}"
    echo "The downloaded file might be corrupted."
    rm -f "$TEMP_FILE"
    exit 1
}

# Clean up
rm -f "$TEMP_FILE"

# Verify the extracted file exists
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}❌ Database file not found after extraction${NC}"
    exit 1
fi

# Get final file size
FINAL_SIZE=$(stat -f%z "$TARGET_FILE" 2>/dev/null || stat -c%s "$TARGET_FILE" 2>/dev/null)
FINAL_SIZE_MB=$((FINAL_SIZE / 1024 / 1024))

echo -e "${GREEN}✓ Database extracted successfully${NC}"
echo ""
echo "✅ Setup Complete!"
echo "=================="
echo "📍 Database location: $TARGET_FILE"
echo "📊 Database size: ${FINAL_SIZE_MB}MB"
echo ""
echo "You can now start the server. The geolocation service will use this database."
