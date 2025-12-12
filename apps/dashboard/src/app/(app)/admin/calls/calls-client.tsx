"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  TrendingUp,
  Timer,
  BarChart3,
  Filter,
  X as XIcon,
  User,
  CheckCircle,
  Play,
  Pause,
  Download,
  ExternalLink,
  FileText,
  Video,
  Users,
  Eye,
  ArrowRightLeft,
  FileDown,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import {
  calculateAgentStats,
  formatDuration,
  formatShortDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "@/lib/stats/agent-stats";
import { type HourlyStats } from "@/lib/stats/coverage-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import { MultiSelectDropdown } from "@/lib/components/multi-select-dropdown";
import { CountrySelector } from "@/lib/components/country-selector";
import { 
  CallLogFilterConditions, 
  type FilterCondition,
  deserializeConditions,
  serializeConditions,
} from "@/lib/components/call-log-filter-conditions";
import { formatLocationWithFlag } from "@/lib/utils/country-flag";
import { getCountryByCode } from "@/lib/utils/countries";
import { RecordingPlayer } from "@/features/recordings/RecordingPlayer";

interface Agent {
  id: string;
  display_name: string;
}

interface Disposition {
  id: string;
  name: string;
  color: string;
}

interface Pool {
  id: string;
  name: string;
}

interface CallLogWithRelations extends CallLogForStats {
  page_url: string;
  recording_url: string | null;
  agent: Agent | null;
  site: { id: string; name: string; domain: string } | null;
  disposition: Disposition | null;
  visitor_city: string | null;
  visitor_region: string | null;
  visitor_country: string | null;
  visitor_country_code: string | null;
  // Transcription fields
  transcription: string | null;
  transcription_status: "pending" | "processing" | "completed" | "failed" | null;
  // AI Summary fields
  ai_summary: string | null;
  ai_summary_status: "pending" | "processing" | "completed" | "failed" | null;
}

interface FilterParams {
  from?: string;
  to?: string;
  agent?: string;
  status?: string;
  disposition?: string;
  pool?: string;
  urlConditions?: string; // JSON-encoded filter conditions
  minDuration?: string;
  maxDuration?: string;
  country?: string; // ISO country codes, comma-separated
}

interface CoverageStats {
  pageviewsWithAgent: number;
  missedOpportunities: number;
  coverageRate: number;
}

interface Props {
  calls: CallLogWithRelations[];
  dispositions: DispositionForStats[];
  agents: Agent[];
  pools: Pool[];
  dateRange: { from: string; to: string };
  currentFilters: FilterParams;
  teamActivity: {
    activeSeconds: number;
    inCallSeconds: number;
  };
  pageviewCount: number;
  coverageStats: CoverageStats;
  hourlyCoverage: HourlyStats[];
}

export function CallsClient({
  calls,
  dispositions,
  agents,
  pools,
  dateRange,
  currentFilters,
  teamActivity,
  pageviewCount,
  coverageStats,
  hourlyCoverage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [videoModalRecordingId, setVideoModalRecordingId] = useState<string | null>(null);
  const [videoModalCallId, setVideoModalCallId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter state - multi-select fields use arrays
  const [filters, setFilters] = useState({
    dispositions: currentFilters.disposition?.split(",").filter(Boolean) ?? [],
    agents: currentFilters.agent?.split(",").filter(Boolean) ?? [],
    statuses: currentFilters.status?.split(",").filter(Boolean) ?? [],
    pools: currentFilters.pool?.split(",").filter(Boolean) ?? [],
    urlConditions: deserializeConditions(currentFilters.urlConditions),
    countries: currentFilters.country?.split(",").filter(Boolean) ?? [],
    minDuration: currentFilters.minDuration ?? "",
    maxDuration: currentFilters.maxDuration ?? "",
  });

  // Apply URL conditions filtering client-side
  const filteredCalls = useMemo(() => {
    if (filters.urlConditions.length === 0) return calls;
    
    return calls.filter((call) => {
      // All conditions must match (AND logic)
      return filters.urlConditions.every((condition: FilterCondition) => {
        const url = call.page_url || "";
        let valueToCheck = "";
        
        try {
          const parsedUrl = new URL(url);
          switch (condition.type) {
            case "domain":
              valueToCheck = parsedUrl.hostname;
              break;
            case "path":
              valueToCheck = parsedUrl.pathname;
              break;
            case "query_param":
              valueToCheck = parsedUrl.searchParams.get(condition.paramName || "") || "";
              break;
          }
        } catch {
          // If URL parsing fails, use the raw URL for matching
          valueToCheck = url;
        }
        
        const searchValue = condition.value.toLowerCase();
        const checkValue = valueToCheck.toLowerCase();
        
        switch (condition.matchType) {
          case "is_exactly":
            return checkValue === searchValue;
          case "contains":
            return checkValue.includes(searchValue);
          case "does_not_contain":
            return !checkValue.includes(searchValue);
          case "starts_with":
            return checkValue.startsWith(searchValue);
          case "ends_with":
            return checkValue.endsWith(searchValue);
          default:
            return true;
        }
      });
    });
  }, [calls, filters.urlConditions]);

  const stats = calculateAgentStats(filteredCalls, dispositions);

  const applyFilters = () => {
    const params = new URLSearchParams();

    // Always include date range
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);

    // Multi-select filters are comma-separated
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
    if (filters.pools.length > 0) params.set("pool", filters.pools.join(","));
    const serializedConditions = serializeConditions(filters.urlConditions);
    if (serializedConditions) params.set("urlConditions", serializedConditions);
    if (filters.countries.length > 0) params.set("country", filters.countries.join(","));
    if (filters.minDuration) params.set("minDuration", filters.minDuration);
    if (filters.maxDuration) params.set("maxDuration", filters.maxDuration);

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      dispositions: [],
      agents: [],
      statuses: [],
      pools: [],
      urlConditions: [],
      countries: [],
      minDuration: "",
      maxDuration: "",
    });
    const params = new URLSearchParams();
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    filters.dispositions.length > 0 ||
    filters.agents.length > 0 ||
    filters.statuses.length > 0 ||
    filters.pools.length > 0 ||
    filters.urlConditions.some((c: FilterCondition) => c.value.trim() !== "") ||
    filters.countries.length > 0 ||
    filters.minDuration ||
    filters.maxDuration;

  // Check if current filter state differs from what's applied (URL params)
  const hasUnsavedChanges = useMemo(() => {
    const appliedDispositions = currentFilters.disposition?.split(",").filter(Boolean) ?? [];
    const appliedAgents = currentFilters.agent?.split(",").filter(Boolean) ?? [];
    const appliedStatuses = currentFilters.status?.split(",").filter(Boolean) ?? [];
    const appliedPools = currentFilters.pool?.split(",").filter(Boolean) ?? [];
    const appliedConditions = deserializeConditions(currentFilters.urlConditions);
    const appliedCountries = currentFilters.country?.split(",").filter(Boolean) ?? [];
    const appliedMinDuration = currentFilters.minDuration ?? "";
    const appliedMaxDuration = currentFilters.maxDuration ?? "";

    // Compare arrays (order doesn't matter)
    const arraysEqual = (a: string[], b: string[]) => 
      a.length === b.length && a.every(v => b.includes(v)) && b.every(v => a.includes(v));
    
    // Compare URL conditions
    const conditionsEqual = (a: FilterCondition[], b: FilterCondition[]) => {
      const validA = a.filter(c => c.value.trim() !== "");
      const validB = b.filter(c => c.value.trim() !== "");
      if (validA.length !== validB.length) return false;
      return validA.every((cA, i) => 
        cA.type === validB[i]?.type && 
        cA.matchType === validB[i]?.matchType && 
        cA.value === validB[i]?.value &&
        cA.paramName === validB[i]?.paramName
      );
    };

    return (
      !arraysEqual(filters.dispositions, appliedDispositions) ||
      !arraysEqual(filters.agents, appliedAgents) ||
      !arraysEqual(filters.statuses, appliedStatuses) ||
      !arraysEqual(filters.pools, appliedPools) ||
      !arraysEqual(filters.countries, appliedCountries) ||
      !conditionsEqual(filters.urlConditions, appliedConditions) ||
      filters.minDuration !== appliedMinDuration ||
      filters.maxDuration !== appliedMaxDuration
    );
  }, [filters, currentFilters]);

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);

    // Preserve other filters
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
    if (filters.pools.length > 0) params.set("pool", filters.pools.join(","));
    const serializedConditions = serializeConditions(filters.urlConditions);
    if (serializedConditions) params.set("urlConditions", serializedConditions);
    if (filters.countries.length > 0) params.set("country", filters.countries.join(","));
    if (filters.minDuration) params.set("minDuration", filters.minDuration);
    if (filters.maxDuration) params.set("maxDuration", filters.maxDuration);

    router.push(`${pathname}?${params.toString()}`);
  };

  // Options for multi-select dropdowns
  const statusOptions = [
    { value: "completed", label: "Completed", icon: <CheckCircle className="w-3 h-3 text-green-500" /> },
    { value: "accepted", label: "Accepted", icon: <Phone className="w-3 h-3 text-blue-500" /> },
    { value: "missed", label: "Missed", icon: <PhoneMissed className="w-3 h-3 text-red-500" /> },
    { value: "rejected", label: "Rejected", icon: <PhoneOff className="w-3 h-3 text-orange-500" /> },
    { value: "pending", label: "Pending", icon: <Clock className="w-3 h-3 text-yellow-500" /> },
  ];

  const dispositionOptions = dispositions.map((d) => ({
    value: d.id,
    label: d.name,
    color: d.color,
  }));

  const agentOptions = agents.map((a) => ({
    value: a.id,
    label: a.display_name,
    icon: <User className="w-3 h-3 text-primary" />,
  }));

  const handlePlayRecording = (callId: string, recordingId: string) => {
    // In the new system, recording_url stores the recordingId (a UUID), not a full URL
    // RecordingPlayer will fetch the signed URL from the API
    setVideoModalRecordingId(recordingId);
    setVideoModalCallId(callId);
  };

  const closeVideoModal = () => {
    setVideoModalRecordingId(null);
    setVideoModalCallId(null);
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `recording-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  // Auto-open recording modal from URL params
  useEffect(() => {
    const callId = searchParams.get("callId");
    const autoplay = searchParams.get("autoplay");
    
    if (callId && autoplay === "true") {
      const call = calls.find((c) => c.id === callId);
      if (call?.recording_url) {
        setVideoModalRecordingId(call.recording_url);
        setVideoModalCallId(call.id);
      }
    }
  }, [searchParams, calls]);

  // Download filtered calls as CSV
  const downloadCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Agent",
      "Status",
      "Duration (seconds)",
      "City",
      "Region",
      "Country",
      "Page URL",
      "Disposition",
      "Recording",
    ];

    const escapeCSV = (value: string | null | undefined): string => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredCalls.map((call) => {
      const date = new Date(call.created_at);
      const recordingLink = call.recording_url
        ? `${window.location.origin}/admin/calls?callId=${call.id}&autoplay=true`
        : "";

      return [
        date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
        date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        call.agent?.display_name ?? "",
        call.status,
        call.duration_seconds?.toString() ?? "",
        call.visitor_city ?? "",
        call.visitor_region ?? "",
        call.visitor_country ?? "",
        call.page_url ?? "",
        call.disposition?.name ?? "",
        recordingLink,
      ].map(escapeCSV).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fromDate = dateRange.from.split("T")[0];
    const toDate = dateRange.to.split("T")[0];
    link.download = `call-logs_${fromDate}_to_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Video Recording Modal */}
      {videoModalRecordingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeVideoModal}
          />
          <div className="relative glass rounded-2xl p-6 max-w-4xl w-full mx-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Video className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Call Recording</h3>
                  <p className="text-sm text-muted-foreground">
                    Replay the recorded video call
                  </p>
                </div>
              </div>
              <button
                onClick={closeVideoModal}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <RecordingPlayer
              recordingId={videoModalRecordingId}
              autoplay={true}
              className="aspect-video"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Calls</h1>
        <p className="text-muted-foreground">
          Track performance metrics and view call history
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Date Range Picker */}
          <DateRangePicker
            from={new Date(dateRange.from)}
            to={new Date(dateRange.to)}
            onRangeChange={handleDateRangeChange}
          />

          <div className="flex items-center gap-2">
            {/* CSV Download */}
            {filteredCalls.length > 0 && (
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="Download filtered calls as CSV"
              >
                <FileDown className="w-4 h-4" />
                Export CSV
              </button>
            )}

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
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Pool & URL */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Pool & URL</label>
                <CallLogFilterConditions
                  pools={pools}
                  selectedPools={filters.pools}
                  conditions={filters.urlConditions}
                  onPoolsChange={(selected) => setFilters({ ...filters, pools: selected })}
                  onConditionsChange={(conditions) => setFilters({ ...filters, urlConditions: conditions })}
                />
              </div>

              {/* Agent */}
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <MultiSelectDropdown
                  options={agentOptions}
                  selected={filters.agents}
                  onChange={(selected) => setFilters({ ...filters, agents: selected })}
                  placeholder="All Agents"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <MultiSelectDropdown
                  options={statusOptions}
                  selected={filters.statuses}
                  onChange={(selected) => setFilters({ ...filters, statuses: selected })}
                  placeholder="All Statuses"
                />
              </div>

              {/* Disposition */}
              <div>
                <label className="block text-sm font-medium mb-1">Disposition</label>
                <MultiSelectDropdown
                  options={dispositionOptions}
                  selected={filters.dispositions}
                  onChange={(selected) => setFilters({ ...filters, dispositions: selected })}
                  placeholder="All Dispositions"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <CountrySelector
                  selected={filters.countries}
                  onChange={(selected) => setFilters({ ...filters, countries: selected })}
                  placeholder="All Countries"
                />
              </div>

              {/* Duration Range */}
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
                    className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxDuration}
                    onChange={(e) =>
                      setFilters({ ...filters, maxDuration: e.target.value })
                    }
                    className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  disabled={!hasUnsavedChanges}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    hasUnsavedChanges
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-default opacity-50"
                  }`}
                >
                  {hasUnsavedChanges ? "Apply" : "Applied"}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coverage Card - Shows visitor coverage based on agent availability */}
      <div className={`rounded-2xl p-6 mb-6 hover-lift border ${
        coverageStats.missedOpportunities > 0 
          ? "bg-amber-500/10 border-amber-500/30" 
          : "bg-primary/10 border-primary/30"
      }`}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              coverageStats.missedOpportunities > 0 
                ? "bg-amber-500/10" 
                : "bg-primary/10"
            }`}>
              {coverageStats.missedOpportunities > 0 ? (
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              ) : (
                <CheckCircle className="w-7 h-7 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">
                {coverageStats.missedOpportunities > 0 
                  ? `${coverageStats.missedOpportunities} Missed Opportunities`
                  : "Full Coverage"
                }
              </h3>
              <p className="text-muted-foreground mb-3 max-w-xl">
                {coverageStats.missedOpportunities > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{coverageStats.missedOpportunities} visitors</span> arrived when no agent was available — either offline or all agents were busy on other calls.
                  </>
                ) : (
                  <>Every visitor had at least one agent available to take their call.</>
                )}
              </p>
              
              {/* Coverage breakdown - visual stats */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span><span className="font-semibold">{pageviewCount}</span> visitors</span>
                </div>
                <div className="w-px h-4 bg-border hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span><span className="font-semibold text-primary">{coverageStats.pageviewsWithAgent}</span> had agent available</span>
                </div>
                {coverageStats.missedOpportunities > 0 && (
                  <>
                    <div className="w-px h-4 bg-border hidden sm:block" />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span><span className="font-semibold text-amber-500">{coverageStats.missedOpportunities}</span> no agent</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Explainer text */}
              <p className="text-xs text-muted-foreground mt-3 max-w-lg">
                💡 <span className="font-medium">How this works:</span> When a visitor lands on your site, they&apos;re assigned to an available agent. 
                If all agents are offline or busy in calls, that&apos;s a missed opportunity — they couldn&apos;t connect even if they wanted to.
              </p>
            </div>
          </div>
          
          {/* CTA */}
          {coverageStats.missedOpportunities > 0 ? (
            <Link
              href="/admin/agents"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all hover:shadow-xl hover:shadow-amber-500/30"
            >
              <UserPlus className="w-5 h-5" />
              Add More Agents
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 text-primary font-semibold">
              <TrendingUp className="w-5 h-5" />
              Great Coverage!
            </div>
          )}
        </div>
        
        {/* Progress bar showing coverage */}
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Coverage Rate</span>
            <span className={`font-bold ${coverageStats.missedOpportunities > 0 ? "text-amber-500" : "text-primary"}`}>
              {coverageStats.coverageRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                coverageStats.missedOpportunities > 0 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                  : "bg-gradient-to-r from-primary to-purple-500"
              }`}
              style={{ width: `${coverageStats.coverageRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5 text-muted-foreground">
            <span>0%</span>
            <span>100% of visitors covered</span>
          </div>
        </div>
      </div>


      {/* Call Stats Grid - 2 rows of 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {teamActivity.activeSeconds > 0 && (
          <StatCard
            title="Active Hours"
            value={formatDuration(teamActivity.activeSeconds)}
            subtitle="Total logged-in time"
            icon={Users}
          />
        )}
        <StatCard
          title="Total Rings"
          value={stats.totalRings}
          icon={PhoneIncoming}
        />
        <StatCard
          title="Total Answers"
          value={stats.totalAnswers}
          icon={Phone}
        />
        <StatCard
          title="Missed Calls"
          value={stats.totalMissed}
          icon={PhoneMissed}
        />
        <StatCard
          title="Answer Rate"
          value={`${stats.answerPercentage.toFixed(1)}%`}
          subtitle="Rings → Answers"
          icon={TrendingUp}
        />
        <StatCard
          title="Conversion"
          value={coverageStats.pageviewsWithAgent > 0 ? `${((stats.totalAnswers / coverageStats.pageviewsWithAgent) * 100).toFixed(1)}%` : "0%"}
          subtitle="Popups → Answered"
          icon={ArrowRightLeft}
        />
        <StatCard
          title="Rejected"
          value={stats.totalRejected}
          subtitle="Declined by agents"
          icon={PhoneOff}
        />
        <StatCard
          title="Avg. Answer Time"
          value={formatDuration(stats.avgAnswerTime)}
          subtitle="Time to click answer"
          icon={Timer}
        />
        <StatCard
          title="Avg. Call Duration"
          value={formatDuration(stats.avgCallDuration)}
          subtitle="For completed calls"
          icon={Clock}
        />
        <StatCard
          title="Total Talk Time"
          value={formatDuration(stats.totalTalkTime)}
          subtitle="All time on calls"
          icon={BarChart3}
        />
      </div>

          {/* Disposition Breakdown */}
          {stats.dispositionBreakdown.length > 0 && (
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mb-6 hover-lift">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Disposition Breakdown
              </h2>

              <div className="space-y-4">
                {stats.dispositionBreakdown.map((d) => (
                  <div key={d.dispositionId} className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{d.dispositionName}</span>
                        <span className="text-muted-foreground">
                          {d.count} ({d.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${d.percentage}%`,
                            backgroundColor: d.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCalls.length} calls
          {filteredCalls.length === 500 && " (limit reached)"}
        </p>
      </div>

      {/* Call Logs Table */}
      <div className="bg-muted/30 border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Date/Time
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Agent
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Location
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
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Transcription
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  AI Summary
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map((call) => (
                <CallLogRow
                  key={call.id}
                  call={call}
                  isPlaying={playingCallId === call.id}
                  onPlayToggle={() => {
                    if (call.recording_url) {
                      handlePlayRecording(call.id, call.recording_url);
                    }
                  }}
                  onDownload={handleDownload}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredCalls.length === 0 && (
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
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string; // kept for backwards compatibility but not used
}) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-5 hover-lift">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </div>
  );
}

// Call Log Row Component
function CallLogRow({
  call,
  isPlaying,
  onPlayToggle,
  onDownload,
}: {
  call: CallLogWithRelations;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onDownload: (url: string, filename?: string) => void;
}) {
  const [showTranscription, setShowTranscription] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const hasTranscription = call.transcription_status === "completed" && call.transcription;
  const hasSummary = call.ai_summary_status === "completed" && call.ai_summary;

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

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTranscriptionStatusBadge = () => {
    if (!call.transcription_status) return null;
    
    switch (call.transcription_status) {
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500">
            <FileText className="w-3 h-3" />
            Transcribed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const getSummaryStatusBadge = () => {
    if (!call.ai_summary_status) return null;
    
    switch (call.ai_summary_status) {
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Summarizing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
            <Sparkles className="w-3 h-3" />
            AI Summary
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            Summary Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
    <tr className="border-b border-border/50 hover:bg-muted/20">
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
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium">
            {call.agent?.display_name ?? "Unknown"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {getStatusIcon(call.status)}
          <span className="text-sm">{getStatusLabel(call.status)}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {call.duration_seconds
              ? formatShortDuration(call.duration_seconds)
              : "-"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {call.visitor_city ? (
          <div className="flex items-center gap-2">
            {(() => {
              const { flag, text } = formatLocationWithFlag(
                call.visitor_city,
                call.visitor_region,
                call.visitor_country_code
              );
              return (
                <>
                  <span className="text-base flex-shrink-0">{flag}</span>
                  <span className="text-sm" title={`${call.visitor_city}, ${call.visitor_region}, ${call.visitor_country}`}>
                    {text}
                  </span>
                </>
              );
            })()}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
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
              onClick={(e) => { e.stopPropagation(); onPlayToggle(); }}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center gap-1.5"
              title="Play video recording"
            >
              <Video className="w-4 h-4" />
              <Play className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
      {/* Transcription column */}
      <td className="px-6 py-4">
        {call.transcription_status === "processing" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        )}
        {call.transcription_status === "completed" && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowTranscription(!showTranscription); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            Transcribed
            {showTranscription ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
        {call.transcription_status === "failed" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        )}
        {!call.transcription_status && <span className="text-sm text-muted-foreground">—</span>}
      </td>
      {/* AI Summary column */}
      <td className="px-6 py-4">
        {call.ai_summary_status === "processing" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Summarizing
          </span>
        )}
        {call.ai_summary_status === "completed" && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            AI Summary
            {showSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
        {call.ai_summary_status === "failed" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        )}
        {!call.ai_summary_status && <span className="text-sm text-muted-foreground">—</span>}
      </td>
    </tr>
    {/* Expandable Transcription Section */}
    {showTranscription && hasTranscription && (
      <tr className="bg-muted/10">
        <td colSpan={10} className="px-6 py-4">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquareText className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-semibold">Transcription</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.transcription}</p>
            </div>
          </div>
        </td>
      </tr>
    )}
    {/* Expandable AI Summary Section */}
    {showSummary && hasSummary && (
      <tr className="bg-muted/10">
        <td colSpan={10} className="px-6 py-4">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h4 className="font-semibold text-purple-500">AI Summary</h4>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{call.ai_summary}</div>
            </div>
          </div>
        </td>
      </tr>
    )}
    </>
  );
}


