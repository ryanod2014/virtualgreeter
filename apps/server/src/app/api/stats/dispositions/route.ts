import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface DispositionValue {
  disposition_id: string;
  disposition_name: string;
  disposition_color: string;
  disposition_value: number;
  call_count: number;
  total_value: number;
}

interface AgentDispositionValue {
  agent_id: string;
  agent_name: string;
  disposition_id: string;
  disposition_name: string;
  disposition_color: string;
  disposition_value: number;
  call_count: number;
  total_value: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Date range (default: last 30 days)
    const parseDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const toDate = searchParams.get("to")
      ? parseDate(searchParams.get("to")!)
      : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromDate = searchParams.get("from")
      ? parseDate(searchParams.get("from")!)
      : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);

    // Fetch all calls with dispositions that have values in the date range
    const { data: callLogs } = await supabase
      .from("call_logs")
      .select(
        `
        id,
        disposition_id,
        agent_id,
        created_at,
        agent:agent_profiles(id, display_name),
        disposition:dispositions(id, name, color, value)
      `
      )
      .eq("organization_id", auth.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString())
      .not("disposition_id", "is", null);

    if (!callLogs) {
      return NextResponse.json({
        totalValue: 0,
        totalCalls: 0,
        byDisposition: [],
        byAgent: [],
      });
    }

    // Transform array relations to single objects
    const calls = callLogs.map((call) => ({
      ...call,
      agent: Array.isArray(call.agent) ? call.agent[0] ?? null : call.agent,
      disposition: Array.isArray(call.disposition)
        ? call.disposition[0] ?? null
        : call.disposition,
    }));

    // Filter calls with dispositions that have values
    const callsWithValue = calls.filter(
      (c) => c.disposition && c.disposition.value != null
    );

    // Calculate total value
    const totalValue = callsWithValue.reduce(
      (sum, c) => sum + Number(c.disposition!.value),
      0
    );

    // Group by disposition
    const dispositionMap = new Map<string, DispositionValue>();
    callsWithValue.forEach((call) => {
      const disp = call.disposition!;
      const key = disp.id;

      if (!dispositionMap.has(key)) {
        dispositionMap.set(key, {
          disposition_id: disp.id,
          disposition_name: disp.name,
          disposition_color: disp.color,
          disposition_value: Number(disp.value),
          call_count: 0,
          total_value: 0,
        });
      }

      const entry = dispositionMap.get(key)!;
      entry.call_count++;
      entry.total_value += Number(disp.value);
    });

    // Group by agent and disposition
    const agentDispositionMap = new Map<string, AgentDispositionValue>();
    callsWithValue.forEach((call) => {
      if (!call.agent) return;

      const disp = call.disposition!;
      const key = `${call.agent.id}-${disp.id}`;

      if (!agentDispositionMap.has(key)) {
        agentDispositionMap.set(key, {
          agent_id: call.agent.id,
          agent_name: call.agent.display_name,
          disposition_id: disp.id,
          disposition_name: disp.name,
          disposition_color: disp.color,
          disposition_value: Number(disp.value),
          call_count: 0,
          total_value: 0,
        });
      }

      const entry = agentDispositionMap.get(key)!;
      entry.call_count++;
      entry.total_value += Number(disp.value);
    });

    return NextResponse.json({
      totalValue,
      totalCalls: callsWithValue.length,
      byDisposition: Array.from(dispositionMap.values()).sort(
        (a, b) => b.total_value - a.total_value
      ),
      byAgent: Array.from(agentDispositionMap.values()).sort(
        (a, b) => b.total_value - a.total_value
      ),
    });
  } catch (error) {
    console.error("Error fetching disposition values:", error);
    return NextResponse.json(
      { error: "Failed to fetch disposition values" },
      { status: 500 }
    );
  }
}
