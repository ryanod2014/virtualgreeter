/**
 * useCalls Hook
 *
 * Client-side hook for fetching paginated call logs with cursor-based pagination.
 * Supports filters, infinite scroll, and loading states.
 */

import { useState, useEffect, useCallback } from "react";

export interface CallLogWithRelations {
  id: string;
  status: string;
  page_url: string;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
  ring_started_at: string | null;
  answered_at: string | null;
  answer_time_seconds: number | null;
  disposition_id: string | null;
  pool_id: string | null;
  visitor_city: string | null;
  visitor_region: string | null;
  visitor_country: string | null;
  visitor_country_code: string | null;
  transcription: string | null;
  transcription_status: "pending" | "processing" | "completed" | "failed" | null;
  ai_summary: string | null;
  ai_summary_status: "pending" | "processing" | "completed" | "failed" | null;
  agent: {
    id: string;
    display_name: string;
  } | null;
  site: {
    id: string;
    name: string;
    domain: string;
  } | null;
  disposition: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface CallsFilterParams {
  from?: string;
  to?: string;
  agent?: string;
  status?: string;
  disposition?: string;
  pool?: string;
  minDuration?: string;
  maxDuration?: string;
  country?: string;
}

export interface UsCallsOptions {
  filters: CallsFilterParams;
  pageSize?: number;
  enabled?: boolean; // Whether to auto-fetch on mount
}

export interface UsCallsResult {
  calls: CallLogWithRelations[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCalls(options: UsCallsOptions): UsCallsResult {
  const { filters, pageSize = 50, enabled = true } = options;

  const [calls, setCalls] = useState<CallLogWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Build query string from filters
  const buildQueryString = useCallback((cursor?: string | null) => {
    const params = new URLSearchParams();

    if (cursor) {
      params.set("cursor", cursor);
    }
    params.set("pageSize", String(pageSize));

    // Add filters
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.agent) params.set("agent", filters.agent);
    if (filters.status) params.set("status", filters.status);
    if (filters.disposition) params.set("disposition", filters.disposition);
    if (filters.pool) params.set("pool", filters.pool);
    if (filters.minDuration) params.set("minDuration", filters.minDuration);
    if (filters.maxDuration) params.set("maxDuration", filters.maxDuration);
    if (filters.country) params.set("country", filters.country);

    return params.toString();
  }, [filters, pageSize]);

  // Fetch calls (initial or refresh)
  const fetchCalls = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsLoading(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const queryString = buildQueryString(null);
      const response = await fetch(`/api/calls?${queryString}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch calls: ${response.statusText}`);
      }

      const data = await response.json();

      setCalls(data.calls || []);
      setHasMore(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch calls");
      console.error("[useCalls] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  // Load more calls (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const queryString = buildQueryString(nextCursor);
      const response = await fetch(`/api/calls?${queryString}`);

      if (!response.ok) {
        throw new Error(`Failed to load more calls: ${response.statusText}`);
      }

      const data = await response.json();

      setCalls((prev) => [...prev, ...(data.calls || [])]);
      setHasMore(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more calls");
      console.error("[useCalls] Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, buildQueryString]);

  // Refresh (refetch from beginning)
  const refresh = useCallback(async () => {
    await fetchCalls(true);
  }, [fetchCalls]);

  // Auto-fetch on mount or when filters change
  useEffect(() => {
    if (enabled) {
      fetchCalls();
    }
  }, [enabled, fetchCalls]);

  return {
    calls,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
