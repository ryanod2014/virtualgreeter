import { createClient } from "@/lib/supabase/server";
import { FunnelDashboardClient } from "./funnel-client";
import { subDays, startOfDay, endOfDay } from "date-fns";

export default async function PlatformFunnelPage() {
  const supabase = await createClient();

  // Default to last 30 days
  const now = new Date();
  const defaultStart = startOfDay(subDays(now, 30));
  const defaultEnd = endOfDay(now);

  // Fetch funnel events
  const { data: funnelEvents } = await supabase
    .from("funnel_events")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch organizations with user info for buyer list
  const { data: organizations } = await supabase
    .from("organizations")
    .select(`
      id, 
      name,
      plan, 
      subscription_status, 
      seat_count, 
      mrr, 
      created_at,
      users!inner (
        email,
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <FunnelDashboardClient
      funnelEvents={funnelEvents ?? []}
      organizations={organizations ?? []}
      defaultStartDate={defaultStart.toISOString()}
      defaultEndDate={defaultEnd.toISOString()}
    />
  );
}
