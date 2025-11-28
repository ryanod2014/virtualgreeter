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
  ChevronDown,
  ChevronUp,
  Users,
  Eye,
  ArrowRightLeft,
  FileDown,
} from "lucide-react";
import {
  calculateAgentStats,
  formatDuration,
  formatShortDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "@/lib/stats/agent-stats";
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
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
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

  const handlePlayRecording = (callId: string, recordingUrl: string) => {
    const isVideo = recordingUrl.includes('.webm') || recordingUrl.includes('video');
    
    if (isVideo) {
      setVideoModalUrl(recordingUrl);
      setVideoModalCallId(callId);
    } else {
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
    }
  };

  const closeVideoModal = () => {
    setVideoModalUrl(null);
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
        setVideoModalUrl(call.recording_url);
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
      {videoModalUrl && (
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
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <video
                src={videoModalUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => handleDownload(videoModalUrl, `call-recording-${videoModalCallId}.webm`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calls</h1>
        <p className="text-muted-foreground">
          Track performance metrics and view call history
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass rounded-2xl p-4 mb-6">
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

      {/* Team Activity Summary */}
      {teamActivity.activeSeconds > 0 && (
        <div className="glass rounded-xl p-5 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Team Active Hours</div>
                <div className="text-2xl font-bold">
                  {formatDuration(teamActivity.activeSeconds)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Time on Calls</div>
                <div className="text-xl font-semibold text-green-500">
                  {formatDuration(teamActivity.inCallSeconds)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Utilization</div>
                <div className="text-xl font-semibold">
                  {teamActivity.activeSeconds > 0
                    ? `${((teamActivity.inCallSeconds / teamActivity.activeSeconds) * 100).toFixed(0)}%`
                    : "0%"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <StatCard
          title="Pageviews"
          value={pageviewCount}
          subtitle="Widget popups shown"
          icon={Eye}
          color="slate"
        />
        <StatCard
          title="Total Rings"
          value={stats.totalRings}
          icon={PhoneIncoming}
          color="blue"
        />
        <StatCard
          title="Total Answers"
          value={stats.totalAnswers}
          icon={Phone}
          color="green"
        />
        <StatCard
          title="Missed Calls"
          value={stats.totalMissed}
          icon={PhoneMissed}
          color="red"
        />
        <StatCard
          title="Answer Rate"
          value={`${stats.answerPercentage.toFixed(1)}%`}
          subtitle="Rings → Answers"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Conversion Rate"
          value={pageviewCount > 0 ? `${((stats.totalRings / pageviewCount) * 100).toFixed(1)}%` : "0%"}
          subtitle="Pageviews → Calls"
          icon={ArrowRightLeft}
          color="cyan"
        />
      </div>

      {/* Collapsible Detailed Stats */}
      <button
        onClick={() => setShowDetailedStats(!showDetailedStats)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        {showDetailedStats ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        {showDetailedStats ? "Hide" : "Show"} detailed stats
      </button>

      {showDetailedStats && (
        <>
          {/* Time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatCard
              title="Avg. Answer Time"
              value={formatDuration(stats.avgAnswerTime)}
              subtitle="Time to click answer"
              icon={Timer}
              color="amber"
            />
            <StatCard
              title="Avg. Call Duration"
              value={formatDuration(stats.avgCallDuration)}
              subtitle="For completed calls"
              icon={Clock}
              color="cyan"
            />
            <StatCard
              title="Total Talk Time"
              value={formatDuration(stats.totalTalkTime)}
              subtitle="All time on calls"
              icon={BarChart3}
              color="indigo"
            />
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <StatCard
              title="Rejected Calls"
              value={stats.totalRejected}
              subtitle="Calls declined by agents"
              icon={PhoneOff}
              color="orange"
            />
          </div>

          {/* Disposition Breakdown */}
          {stats.dispositionBreakdown.length > 0 && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
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
        </>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCalls.length} calls
          {filteredCalls.length === 500 && " (limit reached)"}
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
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color:
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "amber"
    | "cyan"
    | "indigo"
    | "orange"
    | "slate";
}) {
  const colorClasses: Record<typeof color, string> = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    cyan: "text-cyan-500 bg-cyan-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    slate: "text-slate-500 bg-slate-500/10",
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
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

  return (
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
            {call.recording_url.includes('.webm') || call.recording_url.includes('video') ? (
              <button
                onClick={onPlayToggle}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center gap-1.5"
                title="Play video recording"
              >
                <Video className="w-4 h-4" />
                <Play className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={onPlayToggle}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                title={isPlaying ? "Pause audio" : "Play audio recording"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={() => onDownload(call.recording_url!, `call-recording-${call.id}.webm`)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Download recording"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}

