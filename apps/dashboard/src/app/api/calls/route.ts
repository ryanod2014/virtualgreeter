/**
 * API Route: Fetch Call Logs with Pagination
 * GET /api/calls
 *
 * Returns paginated call logs with cursor-based pagination.
 * Query params:
 *  - cursor: ISO timestamp to fetch records before (for "Load More")
 *  - pageSize: number of records to return (default 50, max 100)
 *  - from/to: date range filters
 *  - agent/status/disposition/pool: filter params
 *  - minDuration/maxDuration: duration filters
 *  - country: country code filters
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/actions";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!auth.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Pagination params
    const cursor = searchParams.get("cursor"); // ISO timestamp
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)),
      MAX_PAGE_SIZE
    );

    // Date range params
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const toDateStr = searchParams.get("to");
    const toDate = toDateStr ? parseLocalDate(toDateStr) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromDateStr = searchParams.get("from");
    const fromDate = fromDateStr
      ? parseLocalDate(fromDateStr)
      : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);

    // Filter params
    const agentParam = searchParams.get("agent");
    const statusParam = searchParams.get("status");
    const dispositionParam = searchParams.get("disposition");
    const poolParam = searchParams.get("pool");
    const minDurationParam = searchParams.get("minDuration");
    const maxDurationParam = searchParams.get("maxDuration");
    const countryParam = searchParams.get("country");

    const supabase = await createClient();

    // Build query with full data
    let query = supabase
      .from("call_logs")
      .select(
        `
        id,
        status,
        page_url,
        duration_seconds,
        recording_url,
        created_at,
        ring_started_at,
        answered_at,
        answer_time_seconds,
        disposition_id,
        pool_id,
        visitor_city,
        visitor_region,
        visitor_country,
        visitor_country_code,
        transcription,
        transcription_status,
        ai_summary,
        ai_summary_status,
        agent:agent_profiles(id, display_name),
        site:sites(id, name, domain),
        disposition:dispositions(id, name, color)
      `
      )
      .eq("organization_id", auth.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString())
      .order("created_at", { ascending: false });

    // Apply cursor for pagination (fetch records before cursor)
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    // Apply filters
    if (agentParam) {
      const agentIds = agentParam.split(",").filter(Boolean);
      if (agentIds.length > 0) {
        query = query.in("agent_id", agentIds);
      }
    }
    if (statusParam) {
      const statuses = statusParam.split(",").filter(Boolean);
      if (statuses.length > 0) {
        query = query.in("status", statuses);
      }
    }
    if (dispositionParam) {
      const dispositionIds = dispositionParam.split(",").filter(Boolean);
      if (dispositionIds.length > 0) {
        query = query.in("disposition_id", dispositionIds);
      }
    }
    if (poolParam) {
      const poolIds = poolParam.split(",").filter(Boolean);
      if (poolIds.length > 0) {
        query = query.in("pool_id", poolIds);
      }
    }
    if (minDurationParam) {
      query = query.gte("duration_seconds", parseInt(minDurationParam));
    }
    if (maxDurationParam) {
      query = query.lte("duration_seconds", parseInt(maxDurationParam));
    }
    if (countryParam) {
      const countryCodes = countryParam.split(",").filter(Boolean).map(c => c.toUpperCase());
      if (countryCodes.length > 0) {
        query = query.in("visitor_country_code", countryCodes);
      }
    }

    // Fetch one extra record to determine if there are more pages
    const { data: rawCalls, error } = await query.limit(pageSize + 1);

    if (error) {
      console.error("[API /calls] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }

    // Check if there are more pages
    const hasMore = rawCalls && rawCalls.length > pageSize;
    const calls = hasMore ? rawCalls.slice(0, pageSize) : rawCalls || [];

    // Transform Supabase array relations to single objects
    const transformedCalls = calls.map((call) => ({
      ...call,
      agent: Array.isArray(call.agent) ? call.agent[0] ?? null : call.agent,
      site: Array.isArray(call.site) ? call.site[0] ?? null : call.site,
      disposition: Array.isArray(call.disposition) ? call.disposition[0] ?? null : call.disposition,
    }));

    // Determine next cursor (created_at of last record)
    const nextCursor = hasMore && transformedCalls.length > 0
      ? transformedCalls[transformedCalls.length - 1].created_at
      : null;

    return NextResponse.json({
      calls: transformedCalls,
      pagination: {
        pageSize,
        hasMore,
        nextCursor,
      },
    });

  } catch (error) {
    console.error("[API /calls] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
