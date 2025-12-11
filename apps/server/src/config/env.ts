/**
 * Environment configuration
 * Centralizes environment variable access with type safety and defaults
 */

/**
 * Cache TTL in seconds (converts to milliseconds internally)
 * Default: 3600 seconds (1 hour)
 *
 * @remarks
 * Lower values = fresher data, higher database load
 * Higher values = stale data, lower database load
 *
 * Recommended ranges by environment:
 * - Development: 300-600 seconds (5-10 minutes) for faster iteration
 * - Production: 3600-7200 seconds (1-2 hours) for optimal balance
 *
 * @example
 * ```bash
 * # .env.local
 * CACHE_TTL_SECONDS=1800  # 30 minutes
 * ```
 */
export const CACHE_TTL_SECONDS = parseInt(
  process.env.CACHE_TTL_SECONDS ?? "3600",
  10
);

/**
 * Cache TTL in milliseconds (derived from CACHE_TTL_SECONDS)
 */
export const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
