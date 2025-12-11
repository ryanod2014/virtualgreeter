"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, User, BarChart3, Loader2 } from "lucide-react";

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

interface DispositionValueData {
  totalValue: number;
  totalCalls: number;
  byDisposition: DispositionValue[];
  byAgent: AgentDispositionValue[];
}

interface Props {
  dateRange: { from: string; to: string };
}

export function DispositionValueReport({ dateRange }: Props) {
  const [data, setData] = useState<DispositionValueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fromDate = new Date(dateRange.from).toISOString().split("T")[0];
        const toDate = new Date(dateRange.to).toISOString().split("T")[0];

        const response = await fetch(
          `/api/stats/dispositions?from=${fromDate}&to=${toDate}`
        );

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching disposition values:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mb-6 hover-lift">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.totalCalls === 0) {
    return null; // Don't show card if no conversion values
  }

  // Calculate average value per call
  const avgValue = data.totalValue / data.totalCalls;

  // Group agent data by agent for display
  const agentTotals = new Map<string, { name: string; total: number; calls: number }>();
  data.byAgent.forEach((entry) => {
    const existing = agentTotals.get(entry.agent_id);
    if (existing) {
      existing.total += entry.total_value;
      existing.calls += entry.call_count;
    } else {
      agentTotals.set(entry.agent_id, {
        name: entry.agent_name,
        total: entry.total_value,
        calls: entry.call_count,
      });
    }
  });

  const topAgents = Array.from(agentTotals.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 mb-6 hover-lift">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500/10">
            <DollarSign className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">Conversion Value</h3>
            <p className="text-muted-foreground mb-3 max-w-xl">
              Total value from calls with conversion dispositions
            </p>

            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span>
                  <span className="font-bold text-2xl text-green-500">
                    ${data.totalValue.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground ml-1">total value</span>
                </span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span>
                  <span className="font-semibold">{data.totalCalls}</span> conversion calls
                </span>
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span>
                  <span className="font-semibold">${avgValue.toFixed(2)}</span> avg per call
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disposition Breakdown */}
      {data.byDisposition.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Value by Disposition
          </h4>
          <div className="space-y-2">
            {data.byDisposition.map((disp) => (
              <div
                key={disp.disposition_id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: disp.disposition_color }}
                  />
                  <span className="font-medium">{disp.disposition_name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({disp.call_count} calls)
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-500">
                    ${disp.total_value.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${disp.disposition_value.toFixed(2)} each
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Agents */}
      {topAgents.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Top Performing Agents
          </h4>
          <div className="space-y-2">
            {topAgents.map((agent, index) => (
              <div
                key={agent.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      #{index + 1}
                    </span>
                  </div>
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({agent.calls} calls)
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-500">
                    ${agent.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${(agent.total / agent.calls).toFixed(2)} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
