# Dev Agent Task: TKT-062-v2 - Complete MaxMind Setup

## Status: CONTINUATION (External Setup)

**Original Ticket:** TKT-062 - ip-api.com Rate Limit Risk at Scale
**Previous Work:** MaxMind implementation code complete, needs external setup
**Branch:** `agent/tkt-062-maxmind-geolocation`

---

## 🎯 Your Mission

Complete the MaxMind GeoLite2 setup using the provided credentials. Human has created the account, you need to:

1. **Log into MaxMind** using browser
2. **Generate a license key** (navigate to account → license keys)
3. **Download GeoLite2-City.mmdb** database
4. **Place the file** at `apps/server/data/GeoLite2-City.mmdb`
5. **Save credentials** to `.agent-credentials.json`
6. **Verify integration** works with real IP lookups

---

## 🔐 Provided Credentials

```
Email: ryanod2014@gmail.com
Password: Maximind1213!*
```

---

## 📋 Step-by-Step Instructions

### Step 1: Log into MaxMind
1. Navigate to https://www.maxmind.com/en/account/login
2. Enter email and password above
3. Complete login

### Step 2: Generate License Key
1. Go to Account → Manage License Keys (or similar)
2. Generate a new license key
3. Copy and save the license key

### Step 3: Download Database
You can either:
- **Option A (Browser):** Download from the MaxMind dashboard
- **Option B (Direct URL):** Use the license key with:
```bash
curl -o /tmp/GeoLite2-City.tar.gz "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_LICENSE_KEY&suffix=tar.gz"
tar -xzf /tmp/GeoLite2-City.tar.gz -C /tmp/
cp /tmp/GeoLite2-City_*/GeoLite2-City.mmdb apps/server/data/
```

### Step 4: Save Credentials
Add to `docs/data/.agent-credentials.json`:
```json
{
  "maxmind": {
    "email": "ryanod2014@gmail.com",
    "password": "Maximind1213!*",
    "license_key": "YOUR_GENERATED_KEY",
    "setup_date": "2025-12-07",
    "notes": "GeoLite2 Free tier"
  }
}
```

### Step 5: Verify Integration
```bash
# Check file exists
ls -la apps/server/data/GeoLite2-City.mmdb

# Test the geolocation service works
cd apps/server && npm test -- --grep "geolocation"
```

---

## ✅ Acceptance Criteria

- [ ] Successfully logged into MaxMind
- [ ] License key generated and saved
- [ ] GeoLite2-City.mmdb downloaded and placed correctly
- [ ] Credentials saved to .agent-credentials.json
- [ ] Geolocation lookup returns real country codes (not null)
- [ ] Tests pass

---

## 📝 Completion Report

When done, write to: `docs/agent-output/completed/TKT-062-v2-DONE-{timestamp}.md`

Include:
- License key location saved
- Database file size and location
- Test results showing real IP → country lookups work
- Any issues encountered

---

## ⚠️ Notes

- This is a BROWSER task - you'll need to use browser tools
- The password contains special characters - use it exactly as shown
- If 2FA is required, STOP and report back


