# Server Setup Guide

## MaxMind GeoLite2 Database Setup

The server uses MaxMind's GeoLite2-City database for IP geolocation. This database is required for the IP blocklist feature to determine visitor locations.

### Prerequisites

The MaxMind license key is stored in `docs/data/.agent-credentials.json` at the project root. This file should already exist with the following structure:

```json
{
  "maxmind": {
    "license_key": "your-license-key-here",
    "account_id": "1266030",
    "email": "ryanod2014@gmail.com"
  }
}
```

### Setup Steps

1. **Run the setup script:**
   ```bash
   cd apps/server
   ./scripts/setup-maxmind.sh
   ```

   The script will:
   - Read the license key from `docs/data/.agent-credentials.json`
   - Download the latest GeoLite2-City database (~60MB)
   - Extract it to `apps/server/data/GeoLite2-City.mmdb`
   - Verify the database is valid

2. **Verify the setup:**
   ```bash
   # Check the database file exists
   ls -lh data/GeoLite2-City.mmdb

   # Run the test script to verify geolocation works
   npx tsx scripts/test-geolocation.ts
   ```

### Troubleshooting

**Database not found error:**
- Make sure you've run the setup script: `./scripts/setup-maxmind.sh`
- Check that the database file exists: `ls -la data/GeoLite2-City.mmdb`

**Download failed:**
- Verify the credentials file exists: `cat ../../docs/data/.agent-credentials.json`
- Check your internet connection
- Verify the license key is valid at https://www.maxmind.com/en/account/login

**Geolocation not working:**
- Run the test script: `npx tsx scripts/test-geolocation.ts`
- Check server logs for "[Geolocation] MaxMind database loaded successfully"
- Ensure the database file is ~60MB (not a small error page)

### Fresh Checkout Setup

When setting up a fresh checkout of the repository:

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Run the MaxMind setup: `cd apps/server && ./scripts/setup-maxmind.sh`
4. Start the server: `pnpm dev`

The database file is gitignored (as it should be) to avoid bloating the repository.

### Environment Variables

You can optionally override the database path:

```bash
export MAXMIND_DB_PATH=/path/to/your/GeoLite2-City.mmdb
```

By default, it looks for the database at `apps/server/data/GeoLite2-City.mmdb`.

### How It Works

The geolocation service (`src/lib/geolocation.ts`):
1. Loads the MaxMind database on first use (singleton pattern)
2. Caches IP lookups for 1 hour to reduce database reads
3. Skips private/localhost IPs automatically
4. Returns null for IPs not found in the database
5. Extracts city, region, country, and country code from the database

### Testing

Test with real IPs:

```bash
npx tsx scripts/test-geolocation.ts
```

This will test lookups for:
- 8.8.8.8 (Google DNS)
- 1.1.1.1 (Cloudflare DNS)
- 208.67.222.222 (OpenDNS)
- 127.0.0.1 (Localhost - should be skipped)

### License

The GeoLite2 database is provided by MaxMind under the Creative Commons Attribution-ShareAlike 4.0 International License. See https://dev.maxmind.com/geoip/geolite2-free-geolocation-data for more information.
