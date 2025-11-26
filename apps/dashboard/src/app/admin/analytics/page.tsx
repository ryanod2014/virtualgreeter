import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Phone, Clock, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";

export default async function AnalyticsPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch call stats
  const { data: calls } = await supabase
    .from("call_logs")
    .select("*")
    .eq("organization_id", auth!.organization.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Calculate stats
  const totalCalls = calls?.length ?? 0;
  const completedCalls = calls?.filter((c) => c.status === "completed").length ?? 0;
  const avgDuration =
    calls?.reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0) /
      (completedCalls || 1) ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your conversion performance and call metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Calls"
          value={totalCalls}
          icon={Phone}
          color="primary"
        />
        <StatCard
          title="Completed"
          value={completedCalls}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(avgDuration)}
          icon={Clock}
          color="accent"
        />
        <StatCard
          title="Conversion Rate"
          value={`${totalCalls ? Math.round((completedCalls / totalCalls) * 100) : 0}%`}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* Recent Calls Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Recent Calls</h2>
        </div>

        {calls && calls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Visitor
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Duration
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Page
                  </th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-6 py-4 text-sm">
                      {new Date(call.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                      {call.visitor_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {call.duration_seconds
                        ? formatDuration(call.duration_seconds)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground truncate max-w-[200px]">
                      {call.page_url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No calls yet</h3>
            <p className="text-muted-foreground">
              Calls will appear here once visitors start connecting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "success" | "accent" | "warning";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    success: "text-green-500 bg-green-500/10",
    accent: "text-purple-500 bg-purple-500/10",
    warning: "text-amber-500 bg-amber-500/10",
  };

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap = {
    pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500" },
    accepted: { label: "Accepted", color: "bg-blue-500/10 text-blue-500" },
    rejected: { label: "Rejected", color: "bg-red-500/10 text-red-500" },
    completed: { label: "Completed", color: "bg-green-500/10 text-green-500" },
    missed: { label: "Missed", color: "bg-gray-500/10 text-gray-500" },
  };

  const { label, color } = statusMap[status as keyof typeof statusMap] ?? {
    label: status,
    color: "bg-muted text-muted-foreground",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

