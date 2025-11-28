/**
 * Widget Settings Fetcher
 * 
 * Fetches widget settings from Supabase for a given organization and pool.
 * Pool-specific settings override organization defaults.
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";
import type { WidgetSettings } from "@ghost-greeter/domain";

// Default widget settings (used if Supabase is not configured or fetch fails)
const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  size: "medium",
  position: "bottom-right",
  devices: "all",
  trigger_delay: 3,
  auto_hide_delay: null,
  show_minimize_button: false,
  theme: "dark",
};

// Cache for org default settings (expires after 10 seconds in dev, 5 minutes in prod)
const orgSettingsCache = new Map<string, { settings: WidgetSettings; expiresAt: number }>();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 10 * 1000; // 5 min prod, 10 sec dev

// Cache for pool settings (expires after 5 minutes)
const poolSettingsCache = new Map<string, { settings: WidgetSettings | null; expiresAt: number }>();

/**
 * Get widget settings for a visitor based on their organization and matched pool.
 * Pool-specific settings override organization defaults.
 * 
 * @param orgId - Organization ID
 * @param poolId - Optional pool ID (if visitor matched to a specific pool)
 * @returns Widget settings to apply
 */
export async function getWidgetSettings(
  orgId: string,
  poolId: string | null
): Promise<WidgetSettings> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[WidgetSettings] Supabase not configured, using defaults");
    return DEFAULT_WIDGET_SETTINGS;
  }

  try {
    // If we have a pool ID, check for pool-specific settings first
    if (poolId) {
      const poolSettings = await getPoolSettings(poolId);
      if (poolSettings) {
        console.log(`[WidgetSettings] Using pool settings for pool ${poolId}`);
        return poolSettings;
      }
    }

    // Fall back to organization default settings
    const orgSettings = await getOrgDefaultSettings(orgId);
    console.log(`[WidgetSettings] Using org default settings for org ${orgId}`);
    return orgSettings;
  } catch (error) {
    console.error("[WidgetSettings] Error fetching settings:", error);
    return DEFAULT_WIDGET_SETTINGS;
  }
}

/**
 * Get organization default widget settings with caching
 */
async function getOrgDefaultSettings(orgId: string): Promise<WidgetSettings> {
  // Check cache first
  const cached = orgSettingsCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  if (!supabase) {
    return DEFAULT_WIDGET_SETTINGS;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("default_widget_settings")
    .eq("id", orgId)
    .single();

  if (error || !data?.default_widget_settings) {
    console.warn(`[WidgetSettings] Failed to fetch org settings for ${orgId}:`, error?.message);
    return DEFAULT_WIDGET_SETTINGS;
  }

  const settings = data.default_widget_settings as WidgetSettings;
  
  // Cache the result
  orgSettingsCache.set(orgId, {
    settings,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return settings;
}

/**
 * Get pool-specific widget settings with caching
 * Returns null if pool uses organization defaults
 */
async function getPoolSettings(poolId: string): Promise<WidgetSettings | null> {
  // Check cache first
  const cached = poolSettingsCache.get(poolId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("agent_pools")
    .select("widget_settings")
    .eq("id", poolId)
    .single();

  if (error) {
    console.warn(`[WidgetSettings] Failed to fetch pool settings for ${poolId}:`, error?.message);
    return null;
  }

  // widget_settings can be null if pool uses org defaults
  const settings = data?.widget_settings as WidgetSettings | null;
  
  // Cache the result
  poolSettingsCache.set(poolId, {
    settings,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return settings;
}

/**
 * Clear the settings cache for an organization (call when settings are updated)
 */
export function clearOrgSettingsCache(orgId: string): void {
  orgSettingsCache.delete(orgId);
}

/**
 * Clear the settings cache for a pool (call when pool settings are updated)
 */
export function clearPoolSettingsCache(poolId: string): void {
  poolSettingsCache.delete(poolId);
}

/**
 * Clear all settings caches
 */
export function clearAllSettingsCaches(): void {
  orgSettingsCache.clear();
  poolSettingsCache.clear();
}

