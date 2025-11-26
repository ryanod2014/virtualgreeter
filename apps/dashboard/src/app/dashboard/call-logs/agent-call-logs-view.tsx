"use client";

import { useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Filter,
  Clock,
  Phone,
  Play,
  Pause,
  Download,
  ExternalLink,
  FileText,
  X,
  CheckCircle,
  PhoneMissed,
  PhoneOff,
} from "lucide-react";
import { formatShortDuration } from "@/lib/stats/agent-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";

interface Disposition {
  id: string;
  name: string;
  color: string;
}

interface CallLogWithRelations {
  id: string;
  status: string;
  page_url: string;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
  site: { id: string; name: string; domain: string } | null;
  disposition: Disposition | null;
}

interface FilterParams {
  from?: string;
  to?: string;
  url?: string;
  minDuration?: string;
  maxDuration?: string;
  disposition?: string;
  status?: string;
}

interface Props {
  calls: CallLogWithRelations[];
  dispositions: Disposition[];
  dateRange: { from: string; to: string };
  currentFilters: FilterParams;
}

export function AgentCallLogsView({
  calls,
  dispositions,
  dateRange,
  currentFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [showFilters, setShowFilters] = useState(false);
  const [urlSearch, setUrlSearch] = useState(currentFilters.url ?? "");
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    url: currentFilters.url ?? "",
    minDuration: currentFilters.minDuration ?? "",
    maxDuration: currentFilters.maxDuration ?? "",
    disposition: currentFilters.disposition ?? "",
    status: currentFilters.status ?? "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);
    if (filters.url) params.set("url", filters.url);
    if (filters.minDuration) params.set("minDuration", filters.minDuration);
    if (filters.maxDuration) params.set("maxDuration", filters.maxDuration);
    if (filters.disposition) params.set("disposition", filters.disposition);
    if (filters.status) params.set("status", filters.status);
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      url: "",
      minDuration: "",
      maxDuration: "",
      disposition: "",
      status: "",
    });
    setUrlSearch("");
    const params = new URLSearchParams();
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    filters.url ||
    filters.minDuration ||
    filters.maxDuration ||
    filters.disposition ||
    filters.status;

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    if (filters.url) params.set("url", filters.url);
    if (filters.disposition) params.set("disposition", filters.disposition);
    if (filters.status) params.set("status", filters.status);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePlayRecording = (callId: string, recordingUrl: string) => {
    if (playingCallId === callId) {
      audioRef.current?.pause();
      setPlayingCallId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(recordingUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingCallId(null);
      setPlayingCallId(callId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "accepted":
        return <Phone className="w-4 h-4 text-blue-500" />;
      case "missed":
        return <PhoneMissed className="w-4 h-4 text-red-500" />;
      case "rejected":
        return <PhoneOff className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <>
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold">My Call Logs</h1>
          <p className="text-muted-foreground">
            View your call history and recordings
          </p>
        </div>
      </header>

      <div className="p-8">
        {/* Filters Bar */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Date Range Picker */}
            <DateRangePicker
              from={new Date(dateRange.from)}
              to={new Date(dateRange.to)}
              onRangeChange={handleDateRangeChange}
            />

            {/* URL Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by URL..."
                value={urlSearch}
                onChange={(e) => {
                  setUrlSearch(e.target.value);
                  setFilters({ ...filters, url: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duration (sec)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minDuration}
                      onChange={(e) =>
                        setFilters({ ...filters, minDuration: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxDuration}
                      onChange={(e) =>
                        setFilters({ ...filters, maxDuration: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="accepted">Accepted</option>
                    <option value="missed">Missed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Disposition */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Disposition
                  </label>
                  <select
                    value={filters.disposition}
                    onChange={(e) =>
                      setFilters({ ...filters, disposition: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                  >
                    <option value="">All</option>
                    {dispositions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                  >
                    Apply
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {calls.length} calls
          </p>
        </div>

        {/* Call Logs Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Date/Time
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Duration
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    URL
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Disposition
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Recording
                  </th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    className="border-b border-border/50 hover:bg-muted/20"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {new Date(call.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(call.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(call.status)}
                        <span className="text-sm capitalize">{call.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {call.duration_seconds
                          ? formatShortDuration(call.duration_seconds)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span
                          className="text-sm text-muted-foreground truncate"
                          title={call.page_url}
                        >
                          {call.page_url}
                        </span>
                        <a
                          href={call.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {call.disposition ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${call.disposition.color}20`,
                            color: call.disposition.color,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: call.disposition.color }}
                          />
                          {call.disposition.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {call.recording_url ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handlePlayRecording(call.id, call.recording_url!)
                            }
                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          >
                            {playingCallId === call.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={call.recording_url}
                            download
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {calls.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No calls found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

