import type { VisitorLocation } from "@ghost-greeter/domain";
import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import * as fs from "fs";
import * as path from "path";

// Cache for IP lookups to avoid repeated database reads
const locationCache = new Map<string, { location: VisitorLocation | null; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

// MaxMind database reader (singleton)
let dbReader: ReaderModel | null = null;
let dbLoadAttempted = false;

/**
 * Get the MaxMind database path from environment or default location
 *
 * @returns Path to GeoLite2-City.mmdb file
 *
 * @example
 * // Default: apps/server/data/GeoLite2-City.mmdb
 * // Override: MAXMIND_DB_PATH=/custom/path/GeoLite2-City.mmdb
 */
function getDbPath(): string {
  if (process.env.MAXMIND_DB_PATH) {
    return process.env.MAXMIND_DB_PATH;
  }
  return path.join(process.cwd(), "data", "GeoLite2-City.mmdb");
}

/**
 * Initialize the MaxMind database reader
 * Uses GeoLite2-City database for IP geolocation
 *
 * Implements singleton pattern - database is loaded once and cached.
 * If database file is missing, logs warning and returns null.
 *
 * @returns MaxMind reader instance or null if database unavailable
 *
 * @remarks
 * - Database file (~60MB) is loaded into memory once
 * - Subsequent calls return cached reader
 * - Failed load attempts are cached to avoid repeated filesystem checks
 */
async function initReader(): Promise<ReaderModel | null> {
  if (dbLoadAttempted) {
    return dbReader;
  }

  dbLoadAttempted = true;
  const dbPath = getDbPath();

  if (!fs.existsSync(dbPath)) {
    console.warn("[Geolocation] MaxMind database not found at: " + dbPath);
    console.warn("[Geolocation] Download GeoLite2-City.mmdb from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data");
    return null;
  }

  try {
    dbReader = await Reader.open(dbPath);
    console.log("[Geolocation] MaxMind database loaded successfully");
    return dbReader;
  } catch (error) {
    console.error("[Geolocation] Failed to load MaxMind database:", error);
    return null;
  }
}

/**
 * Look up location from IP address using MaxMind GeoLite2 database
 *
 * Resolves public IP addresses to geographic location data including city, region,
 * country name, and ISO country code. Results are cached for 1 hour to minimize
 * database reads.
 *
 * @param ipAddress - IPv4 or IPv6 address to look up
 * @returns Location data or null if IP is private/not found/database unavailable
 *
 * @remarks
 * - Private/localhost IPs return null immediately (no database query)
 * - Results cached for 1 hour (both successful and failed lookups)
 * - Failed lookups are cached as null to prevent repeated attempts
 * - Gracefully handles missing/corrupted database (returns null)
 *
 * @example
 * ```typescript
 * const location = await getLocationFromIP("8.8.8.8");
 * // Returns: { city: "Mountain View", region: "California", country: "United States", countryCode: "US" }
 *
 * const privateIP = await getLocationFromIP("192.168.1.1");
 * // Returns: null (private IP, no lookup performed)
 * ```
 */
export async function getLocationFromIP(ipAddress: string): Promise<VisitorLocation | null> {
  const cached = locationCache.get(ipAddress);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location;
  }

  if (isPrivateIP(ipAddress)) {
    console.log("[Geolocation] Skipping private IP: " + ipAddress);
    return null;
  }

  const reader = await initReader();
  if (!reader) {
    return null;
  }

  try {
    const response = reader.city(ipAddress);

    const location: VisitorLocation = {
      city: response.city?.names?.en || null,
      region: response.subdivisions?.[0]?.names?.en || null,
      country: response.country?.names?.en || null,
      countryCode: response.country?.isoCode || null,
    };

    locationCache.set(ipAddress, { location, expiresAt: Date.now() + CACHE_TTL_MS });
    console.log("[Geolocation] Resolved " + ipAddress + " -> " + location.city + ", " + location.region + ", " + location.countryCode);
    return location;
  } catch (error) {
    console.log("[Geolocation] IP not found in MaxMind database: " + ipAddress);
    locationCache.set(ipAddress, { location: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }
}

/**
 * Check if IP is private/localhost
 *
 * Detects private IP ranges that should not be sent to geolocation services:
 * - IPv4 localhost: 127.0.0.1, "localhost"
 * - IPv4 private ranges: 10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12
 * - IPv6 localhost: ::1, ::ffff:127.0.0.1
 *
 * @param ip - IP address to check (IPv4 or IPv6)
 * @returns true if IP is private/localhost, false if public
 *
 * @example
 * ```typescript
 * isPrivateIP("127.0.0.1");        // true
 * isPrivateIP("192.168.1.1");      // true
 * isPrivateIP("172.20.0.1");       // true
 * isPrivateIP("8.8.8.8");          // false (public Google DNS)
 * isPrivateIP("::1");              // true (IPv6 localhost)
 * ```
 */
export function isPrivateIP(ip: string): boolean {
  if (
    ip === "127.0.0.1" ||
    ip === "localhost" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  ) {
    return true;
  }
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return true;
  }
  return false;
}

/**
 * Extract client IP from socket handshake, handling proxies
 *
 * Checks proxy headers in order:
 * 1. x-forwarded-for (load balancers/CDNs) - uses first IP in chain
 * 2. x-real-ip (nginx reverse proxy)
 * 3. socket.address (direct connection)
 *
 * @param handshake - Socket.io handshake object with headers and address
 * @returns Client IP address (first non-proxy IP from chain)
 *
 * @remarks
 * - Trusts x-forwarded-for header (assumes behind trusted proxy)
 * - For multi-hop proxies, uses leftmost IP (original client)
 * - Falls back to direct socket address if no proxy headers present
 *
 * @example
 * ```typescript
 * // Behind CDN: x-forwarded-for = "203.0.113.1, 198.51.100.1"
 * getClientIP(handshake); // Returns: "203.0.113.1" (original client)
 *
 * // Behind nginx: x-real-ip = "203.0.113.1"
 * getClientIP(handshake); // Returns: "203.0.113.1"
 *
 * // Direct connection
 * getClientIP(handshake); // Returns: socket.address
 * ```
 */
export function getClientIP(handshake: { headers: Record<string, string | string[] | undefined>; address: string }): string {
  const forwardedFor = handshake.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = typeof forwardedFor === "string" ? forwardedFor : forwardedFor[0];
    const clientIP = ips?.split(",")[0]?.trim();
    if (clientIP) {
      return clientIP;
    }
  }
  const realIP = handshake.headers["x-real-ip"];
  if (realIP) {
    return typeof realIP === "string" ? realIP : realIP[0] || handshake.address;
  }
  return handshake.address;
}
