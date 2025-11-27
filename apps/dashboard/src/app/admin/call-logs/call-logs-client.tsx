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
  User,
  FileText,
  X as XIcon,
  CheckCircle,
  PhoneMissed,
  PhoneOff,
  Video,
} from "lucide-react";
import { formatShortDuration } from "@/lib/stats/agent-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import { MultiSelectDropdown } from "@/lib/components/multi-select-dropdown";

interface Disposition {
  id: string;
  name: string;
  color: string;
}

interface Agent {
  id: string;
  display_name: string;
}

interface CallLogWithRelations {
  id: string;
  status: string;
  page_url: string;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
  agent: Agent | null;
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
  agent?: string;
  status?: string;
}

interface Props {
  calls: CallLogWithRelations[];
  dispositions: Disposition[];
  agents: Agent[];
  uniqueUrls: string[];
  dateRange: { from: string; to: string };
  currentFilters: FilterParams;
}

export function CallLogsClient({
  calls,
  dispositions,
  agents,
  uniqueUrls,
  dateRange,
  currentFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [showFilters, setShowFilters] = useState(false);
  const [urlSearch, setUrlSearch] = useState(currentFilters.url ?? "");
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [videoModalCallId, setVideoModalCallId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter state - multi-select fields use arrays
  const [filters, setFilters] = useState({
    url: currentFilters.url ?? "",
    minDuration: currentFilters.minDuration ?? "",
    maxDuration: currentFilters.maxDuration ?? "",
    dispositions: currentFilters.disposition?.split(",").filter(Boolean) ?? [],
    agents: currentFilters.agent?.split(",").filter(Boolean) ?? [],
    statuses: currentFilters.status?.split(",").filter(Boolean) ?? [],
  });

  const applyFilters = () => {
    const params = new URLSearchParams();

    // Always include date range
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);

    // Add active filters
    if (filters.url) params.set("url", filters.url);
    if (filters.minDuration) params.set("minDuration", filters.minDuration);
    if (filters.maxDuration) params.set("maxDuration", filters.maxDuration);
    // Multi-select filters are comma-separated
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      url: "",
      minDuration: "",
      maxDuration: "",
      dispositions: [],
      agents: [],
      statuses: [],
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
    filters.dispositions.length > 0 ||
    filters.agents.length > 0 ||
    filters.statuses.length > 0;

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    
    // Preserve other filters
    if (filters.url) params.set("url", filters.url);
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
    
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
    icon: (
      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-2.5 h-2.5 text-primary" />
      </div>
    ),
  }));

  const handlePlayRecording = (callId: string, recordingUrl: string) => {
    // Check if it's a video recording (webm)
    const isVideo = recordingUrl.includes('.webm') || recordingUrl.includes('video');
    
    if (isVideo) {
      // Open video in modal
      setVideoModalUrl(recordingUrl);
      setVideoModalCallId(callId);
    } else {
      // Handle audio recordings
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
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-8">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Video Recording Modal */}
      {videoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeVideoModal}
          />

          {/* Modal */}
          <div className="relative glass rounded-2xl p-6 max-w-4xl w-full mx-4 animate-fade-in">
            {/* Header */}
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

            {/* Video Player */}
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <video
                src={videoModalUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>

            {/* Actions */}
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
        <h1 className="text-3xl font-bold mb-2">Call Logs</h1>
        <p className="text-muted-foreground">
          View and filter all call recordings and details
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

          {/* Quick URL Search */}
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
                if (e.key === "Enter") {
                  applyFilters();
                }
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Duration Range */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (seconds)
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

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <MultiSelectDropdown
                  options={statusOptions}
                  selected={filters.statuses}
                  onChange={(selected) => setFilters({ ...filters, statuses: selected })}
                  placeholder="All Statuses"
                />
              </div>

              {/* Disposition Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Disposition</label>
                <MultiSelectDropdown
                  options={dispositionOptions}
                  selected={filters.dispositions}
                  onChange={(selected) => setFilters({ ...filters, dispositions: selected })}
                  placeholder="All Dispositions"
                />
              </div>

              {/* Agent Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <MultiSelectDropdown
                  options={agentOptions}
                  selected={filters.agents}
                  onChange={(selected) => setFilters({ ...filters, agents: selected })}
                  placeholder="All Agents"
                />
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
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {calls.length} calls
          {calls.length === 500 && " (limit reached)"}
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
  );
}

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

