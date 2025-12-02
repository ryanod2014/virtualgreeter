/**
 * Country List Management
 * 
 * Fetches and caches country lists for organizations.
 * Supports two modes:
 * - blocklist: Block visitors from listed countries (default)
 * - allowlist: Only allow visitors from listed countries
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

type CountryListMode = "blocklist" | "allowlist";

interface CountryListSettings {
  countries: string[];
  mode: CountryListMode;
}

// Cache for country list settings (expires after 60 seconds in dev, 5 minutes in prod)
const countryListCache = new Map<string, { settings: CountryListSettings; expiresAt: number }>();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;

/**
 * Get the country list settings for an organization
 * 
 * @param orgId - Organization ID
 * @returns Country list settings including mode and countries
 */
export async function getCountryListSettings(orgId: string): Promise<CountryListSettings> {
  // Check cache first
  const cached = countryListCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log("[CountryList] Supabase not configured, allowing all countries");
    return { countries: [], mode: "blocklist" };
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("blocked_countries, country_list_mode")
      .eq("id", orgId)
      .single();

    if (error) {
      console.warn(`[CountryList] Failed to fetch country list for ${orgId}:`, error.message);
      return { countries: [], mode: "blocklist" };
    }

    const settings: CountryListSettings = {
      countries: (data?.blocked_countries as string[]) || [],
      mode: (data?.country_list_mode as CountryListMode) || "blocklist",
    };
    
    // Cache the result
    countryListCache.set(orgId, {
      settings,
      expiresAt: Date.now() + CACHE_TTL,
    });

    const modeStr = settings.mode === "allowlist" ? "ONLY allowing" : "blocking";
    console.log(`[CountryList] Org ${orgId} ${modeStr} countries:`, settings.countries.length > 0 ? settings.countries.join(', ') : 'none');
    return settings;
  } catch (error) {
    console.error("[CountryList] Error fetching country list settings:", error);
    return { countries: [], mode: "blocklist" };
  }
}

/**
 * Get the blocked countries list for an organization (legacy function for backwards compatibility)
 * 
 * @param orgId - Organization ID
 * @returns Array of ISO 3166-1 alpha-2 country codes that are blocked
 */
export async function getBlockedCountries(orgId: string): Promise<string[]> {
  const settings = await getCountryListSettings(orgId);
  return settings.countries;
}

/**
 * Check if a visitor's country should be blocked by the organization
 * 
 * @param orgId - Organization ID
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'CN')
 * @returns true if the country should be blocked, false otherwise
 */
export async function isCountryBlocked(orgId: string, countryCode: string | null): Promise<boolean> {
  const settings = await getCountryListSettings(orgId);
  
  // If no countries in list
  if (settings.countries.length === 0) {
    // Blocklist mode with empty list = allow everyone
    // Allowlist mode with empty list = block everyone (but we'll be lenient and allow)
    return false;
  }

  // If we don't know the country (geolocation failed)
  if (!countryCode) {
    // Blocklist mode: allow unknown countries through
    // Allowlist mode: block unknown countries (they're not in the allow list)
    if (settings.mode === "allowlist") {
      console.log(`[CountryList] Blocking unknown country for org ${orgId} (allowlist mode)`);
      return true;
    }
    return false;
  }

  // Case-insensitive comparison
  const normalizedCountryCode = countryCode.toUpperCase();
  const isInList = settings.countries.some(
    (c) => c.toUpperCase() === normalizedCountryCode
  );

  if (settings.mode === "allowlist") {
    // Allowlist mode: block if NOT in the list
    const shouldBlock = !isInList;
    if (shouldBlock) {
      console.log(`[CountryList] Blocking visitor from ${countryCode} for org ${orgId} (not in allowlist)`);
    }
    return shouldBlock;
  } else {
    // Blocklist mode: block if IN the list
    if (isInList) {
      console.log(`[CountryList] Blocking visitor from ${countryCode} for org ${orgId} (in blocklist)`);
    }
    return isInList;
  }
}

/**
 * Clear the country list cache for an organization (call when settings are updated)
 */
export function clearBlocklistCache(orgId: string): void {
  countryListCache.delete(orgId);
}

/**
 * Clear all country list caches
 */
export function clearAllBlocklistCaches(): void {
  countryListCache.clear();
}

