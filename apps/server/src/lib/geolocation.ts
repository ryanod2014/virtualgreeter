import type { VisitorLocation } from "@ghost-greeter/domain";

// Cache for IP lookups to avoid excessive API calls
const locationCache = new Map<string, { location: VisitorLocation | null; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

// Response type from ip-api.com
interface IPApiResponse {
  status: "success" | "fail";
  message?: string;
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Look up location from IP address using ip-api.com (free, no API key required)
 * Rate limit: 45 requests/minute for free tier
 */
export async function getLocationFromIP(ipAddress: string): Promise<VisitorLocation | null> {
  // Check cache first
  const cached = locationCache.get(ipAddress);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location;
  }

  // Skip localhost/private IPs
  if (isPrivateIP(ipAddress)) {
    console.log(`[Geolocation] Skipping private IP: ${ipAddress}`);
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,city,regionName,country,countryCode`);
    
    if (!response.ok) {
      console.error(`[Geolocation] API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as IPApiResponse;

    if (data.status !== "success") {
      console.log(`[Geolocation] Lookup failed for ${ipAddress}: ${data.message || "unknown"}`);
      // Cache failure to avoid repeated lookups
      locationCache.set(ipAddress, { location: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const location: VisitorLocation = {
      city: data.city || null,
      region: data.regionName || null,
      country: data.country || null,
      countryCode: data.countryCode || null,
    };

    // Cache successful result
    locationCache.set(ipAddress, { location, expiresAt: Date.now() + CACHE_TTL_MS });
    
    console.log(`[Geolocation] Resolved ${ipAddress} -> ${location.city}, ${location.region}, ${location.countryCode}`);
    return location;
  } catch (error) {
    console.error(`[Geolocation] Error looking up ${ipAddress}:`, error);
    return null;
  }
}

/**
 * Check if IP is private/localhost
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
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

  // IPv6 localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return true;
  }

  return false;
}

/**
 * Extract client IP from socket handshake, handling proxies
 */
export function getClientIP(handshake: { headers: Record<string, string | string[] | undefined>; address: string }): string {
  // Check x-forwarded-for header (from proxies/load balancers)
  const forwardedFor = handshake.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = typeof forwardedFor === "string" ? forwardedFor : forwardedFor[0];
    // First IP in the list is the original client IP
    const clientIP = ips?.split(",")[0]?.trim();
    if (clientIP) {
      return clientIP;
    }
  }

  // Check x-real-ip header (nginx)
  const realIP = handshake.headers["x-real-ip"];
  if (realIP) {
    return typeof realIP === "string" ? realIP : realIP[0] || handshake.address;
  }

  // Fall back to socket address
  return handshake.address;
}

