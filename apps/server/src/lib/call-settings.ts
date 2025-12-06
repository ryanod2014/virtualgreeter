/**
 * Call Settings Fetcher
 * 
 * Fetches call behavior settings from Supabase for a given organization.
 * Includes RNA timeout and max call duration settings.
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";
import type { RecordingSettings } from "@ghost-greeter/domain";

// Default call settings (used if Supabase is not configured or fetch fails)
const DEFAULT_CALL_SETTINGS = {
  rna_timeout_seconds: 15, // 15 seconds default
  max_call_duration_minutes: 120, // 2 hours default
  is_recording_enabled: false, // Recording disabled by default
};

// Cache for org call settings (expires after 60 seconds in dev, 5 minutes in prod)
const callSettingsCache = new Map<string, { settings: typeof DEFAULT_CALL_SETTINGS; expiresAt: number }>();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;

export interface CallSettings {
  rna_timeout_seconds: number;
  max_call_duration_minutes: number;
  is_recording_enabled: boolean;
}

/**
 * Get call settings for an organization
 * 
 * @param orgId - Organization ID
 * @returns Call settings including RNA timeout and max call duration
 */
export async function getCallSettings(orgId: string): Promise<CallSettings> {
  // Check cache first
  const cached = callSettingsCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log("[CallSettings] Supabase not configured, using defaults");
    return DEFAULT_CALL_SETTINGS;
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("recording_settings")
      .eq("id", orgId)
      .single();

    if (error) {
      console.warn(`[CallSettings] Failed to fetch call settings for ${orgId}:`, error.message);
      return DEFAULT_CALL_SETTINGS;
    }

    const recordingSettings = data?.recording_settings as RecordingSettings | null;

    const settings: CallSettings = {
      rna_timeout_seconds: recordingSettings?.rna_timeout_seconds ?? DEFAULT_CALL_SETTINGS.rna_timeout_seconds,
      max_call_duration_minutes: recordingSettings?.max_call_duration_minutes ?? DEFAULT_CALL_SETTINGS.max_call_duration_minutes,
      is_recording_enabled: recordingSettings?.enabled ?? DEFAULT_CALL_SETTINGS.is_recording_enabled,
    };
    
    // Cache the result
    callSettingsCache.set(orgId, {
      settings,
      expiresAt: Date.now() + CACHE_TTL,
    });

    console.log(`[CallSettings] Org ${orgId}: RNA timeout=${settings.rna_timeout_seconds}s, max duration=${settings.max_call_duration_minutes}min`);
    return settings;
  } catch (error) {
    console.error("[CallSettings] Error fetching call settings:", error);
    return DEFAULT_CALL_SETTINGS;
  }
}

/**
 * Clear the call settings cache for an organization (call when settings are updated)
 */
export function clearCallSettingsCache(orgId: string): void {
  callSettingsCache.delete(orgId);
}

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

