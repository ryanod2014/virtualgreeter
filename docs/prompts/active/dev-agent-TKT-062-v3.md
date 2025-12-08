# Dev Agent Task: TKT-062-v3 - Add MaxMind Setup Script

## Status: CONTINUATION (QA Failed - Missing Setup Automation)

**Original Ticket:** TKT-062 - ip-api.com Rate Limit Risk at Scale
**Previous Work:** v1 implemented code, v2 set up MaxMind account/credentials
**QA Finding:** Database file not present in fresh checkouts (gitignored, 60MB)
**Branch:** `agent/tkt-062-maxmind-geolocation`

---

## 🎯 Your Mission

Add automation so the MaxMind database can be downloaded in fresh checkouts. The credentials already exist in `.agent-credentials.json`.

**What's Already Done:**
- ✅ MaxMind account created (Account ID: 1266030)
- ✅ License key generated and stored
- ✅ Code implementation complete
- ✅ Credentials saved to `docs/data/.agent-credentials.json`

**What's Missing (Why QA Failed):**
- ❌ No setup script to download the database
- ❌ Fresh checkouts can't get the database file
- ❌ Integration can't be verified without the file

---

## 📋 Tasks

### 1. Create Setup Script

Create `apps/server/scripts/setup-maxmind.sh`:

```bash
#!/bin/bash
# Download MaxMind GeoLite2-City database using stored license key

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$SERVER_DIR/data"
CREDENTIALS_FILE="$SCRIPT_DIR/../../../docs/data/.agent-credentials.json"

# Check for credentials
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "❌ Credentials file not found: $CREDENTIALS_FILE"
  echo "Please ensure .agent-credentials.json exists with maxmind.license_key"
  exit 1
fi

# Extract license key
LICENSE_KEY=$(cat "$CREDENTIALS_FILE" | grep -o '"license_key"[^,]*' | cut -d'"' -f4)

if [ -z "$LICENSE_KEY" ]; then
  echo "❌ No MaxMind license key found in credentials file"
  exit 1
fi

# Create data directory
mkdir -p "$DATA_DIR"

# Download database
echo "📥 Downloading GeoLite2-City database..."
curl -sS -o "/tmp/GeoLite2-City.tar.gz" \
  "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$LICENSE_KEY&suffix=tar.gz"

# Extract
echo "📦 Extracting..."
tar -xzf /tmp/GeoLite2-City.tar.gz -C /tmp/
cp /tmp/GeoLite2-City_*/GeoLite2-City.mmdb "$DATA_DIR/"

# Verify
if [ -f "$DATA_DIR/GeoLite2-City.mmdb" ]; then
  SIZE=$(ls -lh "$DATA_DIR/GeoLite2-City.mmdb" | awk '{print $5}')
  echo "✅ Database installed: $DATA_DIR/GeoLite2-City.mmdb ($SIZE)"
else
  echo "❌ Failed to install database"
  exit 1
fi

# Cleanup
rm -rf /tmp/GeoLite2-City*
echo "🎉 MaxMind setup complete!"
```

### 2. Make Script Executable
```bash
chmod +x apps/server/scripts/setup-maxmind.sh
```

### 3. Update README or Add SETUP.md

Add to `apps/server/README.md` or create `apps/server/SETUP.md`:

```markdown
## MaxMind GeoLite2 Setup

The geolocation service uses MaxMind's GeoLite2-City database (not committed due to size).

### Automatic Setup
```bash
./scripts/setup-maxmind.sh
```

### Requirements
- `.agent-credentials.json` must exist with `maxmind.license_key`
- Internet access to download ~15MB archive

### Manual Setup
1. Get license key from `.agent-credentials.json`
2. Download from MaxMind dashboard
3. Place at `apps/server/data/GeoLite2-City.mmdb`
```

### 4. Verify Script Works

```bash
cd apps/server
./scripts/setup-maxmind.sh
ls -la data/GeoLite2-City.mmdb  # Should exist, ~60MB
```

---

## ✅ Acceptance Criteria

- [ ] Setup script created at `apps/server/scripts/setup-maxmind.sh`
- [ ] Script is executable
- [ ] Script successfully downloads database using stored license key
- [ ] Documentation added
- [ ] Fresh checkout can run script and get database

---

## 📝 Completion Report

When done, write to: `docs/agent-output/completed/TKT-062-v3-DONE-{timestamp}.md`

---

## ⚠️ Notes

- Work in the existing branch: `agent/tkt-062-maxmind-geolocation`
- The license key is already stored - just read it from the credentials file
- Don't hardcode the license key in the script!
