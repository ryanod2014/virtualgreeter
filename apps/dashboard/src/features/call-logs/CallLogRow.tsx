"use client";

import { useState } from "react";
import {
  Phone,
  PhoneMissed,
  PhoneOff,
  Clock,
  User,
  CheckCircle,
  Play,
  Pause,
  Download,
  ExternalLink,
  FileText,
  Video,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { formatShortDuration } from "@/lib/stats/agent-stats";
import { formatLocationWithFlag } from "@/lib/utils/country-flag";

interface Agent {
  id: string;
  display_name: string;
}

interface Disposition {
  id: string;
  name: string;
  color: string;
}

interface CallLogWithRelations {
  id: string;
  created_at: string;
  status: string;
  duration_seconds: number | null;
  page_url: string;
  recording_url: string | null;
  agent: Agent | null;
  site: { id: string; name: string; domain: string } | null;
  disposition: Disposition | null;
  visitor_city: string | null;
  visitor_region: string | null;
  visitor_country: string | null;
  visitor_country_code: string | null;
  transcription: string | null;
  transcription_status: "pending" | "processing" | "completed" | "failed" | null;
  transcription_error?: string | null;
  transcription_retry_count?: number | null;
  ai_summary: string | null;
  ai_summary_status: "pending" | "processing" | "completed" | "failed" | null;
}

interface CallLogRowProps {
  call: CallLogWithRelations;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onDownload: (url: string, filename?: string) => void;
  onTranscriptionRetry?: (callId: string) => Promise<void>;
}

export function CallLogRow({
  call,
  isPlaying,
  onPlayToggle,
  onDownload,
  onTranscriptionRetry,
}: CallLogRowProps) {
  const [showTranscription, setShowTranscription] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const hasTranscription = call.transcription_status === "completed" && call.transcription;
  const hasSummary = call.ai_summary_status === "completed" && call.ai_summary;
  const canRetry = call.transcription_status === "failed" && call.recording_url && onTranscriptionRetry;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "accepted": return <Phone className="w-4 h-4 text-blue-500" />;
      case "missed": return <PhoneMissed className="w-4 h-4 text-red-500" />;
      case "rejected": return <PhoneOff className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  const handleRetry = async () => {
    if (!onTranscriptionRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onTranscriptionRetry(call.id);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/20">
        <td className="px-6 py-4">
          <div className="text-sm font-medium">
            {new Date(call.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(call.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{call.agent?.display_name ?? "Unknown"}</span>
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
            <span className="text-sm">{call.duration_seconds ? formatShortDuration(call.duration_seconds) : "-"}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          {call.visitor_city ? (
            <div className="flex items-center gap-2">
              {(() => {
                const { flag, text } = formatLocationWithFlag(call.visitor_city, call.visitor_region, call.visitor_country_code);
                return (
                  <>
                    <span className="text-base flex-shrink-0">{flag}</span>
                    <span className="text-sm" title={`${call.visitor_city}, ${call.visitor_region}, ${call.visitor_country}`}>{text}</span>
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
            <span className="text-sm text-muted-foreground truncate" title={call.page_url}>{call.page_url}</span>
            <a href={call.page_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </td>
        <td className="px-6 py-4">
          {call.disposition ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${call.disposition.color}20`, color: call.disposition.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: call.disposition.color }} />
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
                <button onClick={(e) => { e.stopPropagation(); onPlayToggle(); }} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center gap-1.5" title="Play video recording">
                  <Video className="w-4 h-4" /><Play className="w-3 h-3" />
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onPlayToggle(); }} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title={isPlaying ? "Pause audio" : "Play audio recording"}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDownload(call.recording_url!, `call-recording-${call.id}.webm`); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Download recording">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-6 py-4">
          {call.transcription_status === "processing" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" />Processing
            </span>
          )}
          {call.transcription_status === "completed" && (
            <button onClick={(e) => { e.stopPropagation(); setShowTranscription(!showTranscription); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors cursor-pointer">
              <FileText className="w-3 h-3" />Transcribed{showTranscription ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {call.transcription_status === "failed" && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500" title={call.transcription_error || "Transcription failed"}>
                <AlertTriangle className="w-3 h-3" />Failed
              </span>
              {canRetry && (
                <button onClick={(e) => { e.stopPropagation(); handleRetry(); }} disabled={isRetrying} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50" title="Retry transcription">
                  {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Retry
                </button>
              )}
            </div>
          )}
          {!call.transcription_status && <span className="text-sm text-muted-foreground">—</span>}
        </td>
        <td className="px-6 py-4">
          {call.ai_summary_status === "processing" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
              <Loader2 className="w-3 h-3 animate-spin" />Summarizing
            </span>
          )}
          {call.ai_summary_status === "completed" && (
            <button onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors cursor-pointer">
              <Sparkles className="w-3 h-3" />AI Summary{showSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {call.ai_summary_status === "failed" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">
              <AlertTriangle className="w-3 h-3" />Failed
            </span>
          )}
          {!call.ai_summary_status && <span className="text-sm text-muted-foreground">—</span>}
        </td>
      </tr>
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
