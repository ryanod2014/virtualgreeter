/**
 * Country Blocklist Management
 * 
 * Fetches and caches blocked country lists for organizations.
 * Checks if a visitor should be blocked based on their resolved country.
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

// Cache for blocked countries (expires after 60 seconds in dev, 5 minutes in prod)
const blockedCountriesCache = new Map<string, { countries: string[]; expiresAt: number }>();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;

/**
 * Get the blocked countries list for an organization
 * 
 * @param orgId - Organization ID
 * @returns Array of ISO 3166-1 alpha-2 country codes that are blocked
 */
export async function getBlockedCountries(orgId: string): Promise<string[]> {
  // Check cache first
  const cached = blockedCountriesCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.countries;
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log("[CountryBlocklist] Supabase not configured, no countries blocked");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("blocked_countries")
      .eq("id", orgId)
      .single();

    if (error) {
      console.warn(`[CountryBlocklist] Failed to fetch blocked countries for ${orgId}:`, error.message);
      return [];
    }

    const countries = (data?.blocked_countries as string[]) || [];
    
    // Cache the result
    blockedCountriesCache.set(orgId, {
      countries,
      expiresAt: Date.now() + CACHE_TTL,
    });

    console.log(`[CountryBlocklist] Org ${orgId} blocked countries:`, countries.length > 0 ? countries.join(', ') : 'none');
    return countries;
  } catch (error) {
    console.error("[CountryBlocklist] Error fetching blocked countries:", error);
    return [];
  }
}

/**
 * Check if a visitor's country is blocked by the organization
 * 
 * @param orgId - Organization ID
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'CN')
 * @returns true if the country is blocked, false otherwise
 */
export async function isCountryBlocked(orgId: string, countryCode: string | null): Promise<boolean> {
  // If we don't know the country, allow them through (geolocation may have failed)
  if (!countryCode) {
    return false;
  }

  const blockedCountries = await getBlockedCountries(orgId);
  
  // Case-insensitive comparison
  const normalizedCountryCode = countryCode.toUpperCase();
  const isBlocked = blockedCountries.some(
    (blocked) => blocked.toUpperCase() === normalizedCountryCode
  );

  if (isBlocked) {
    console.log(`[CountryBlocklist] Blocking visitor from ${countryCode} for org ${orgId}`);
  }

  return isBlocked;
}

/**
 * Clear the blocklist cache for an organization (call when settings are updated)
 */
export function clearBlocklistCache(orgId: string): void {
  blockedCountriesCache.delete(orgId);
}

/**
 * Clear all blocklist caches
 */
export function clearAllBlocklistCaches(): void {
  blockedCountriesCache.clear();
}

