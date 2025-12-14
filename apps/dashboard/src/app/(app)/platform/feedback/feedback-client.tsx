"use client";

import { useState, useMemo } from "react";
import {
  Bug,
  Lightbulb,
  Search,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronUp,
  MessageCircle,
  Building2,
  Mail,
  User,
  X,
  Image,
  Video,
  ExternalLink,
  Target,
  Heart,
  Meh,
  Frown,
} from "lucide-react";
import { subDays } from "date-fns";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import type { FeedbackStatus, FeedbackType, FeedbackPriority, SubscriptionPlan, SubscriptionStatus } from "@ghost-greeter/domain/database.types";

interface FeedbackItem {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_plan: SubscriptionPlan;
  organization_status: SubscriptionStatus;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  vote_count: number;
  comment_count: number;
  screenshot_url: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PmfSurvey {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_plan: SubscriptionPlan;
  organization_status: SubscriptionStatus;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  disappointment_level: "very_disappointed" | "somewhat_disappointed" | "not_disappointed" | null;
  follow_up_text: string | null;
  page_url: string | null;
  dismissed: boolean;
  created_at: string;
}

interface FeedbackClientProps {
  feedbackItems: FeedbackItem[];
  pmfSurveys: PmfSurvey[];
}

type TabType = "bug" | "feature" | "pmf";

const statusConfig: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-blue-500 bg-blue-500/10" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-amber-500 bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground bg-muted/50" },
  declined: { label: "Declined", icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
};

const priorityColors: Record<FeedbackPriority, string> = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-amber-500/10 text-amber-500",
  critical: "bg-red-500/10 text-red-500",
};

const planColors: Record<SubscriptionPlan, string> = {
  free: "bg-slate-500/10 text-slate-500",
  starter: "bg-blue-500/10 text-blue-500",
  pro: "bg-purple-500/10 text-purple-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

export function FeedbackClient({ feedbackItems, pmfSurveys }: FeedbackClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("bug");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<PmfSurvey | null>(null);
  
  // Date range state
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const handleDateRangeChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  // Filter feedback items by type, search, status, and date
  const filteredItems = useMemo(() => {
    if (activeTab === "pmf") return [];
    
    let result = feedbackItems.filter((item) => item.type === activeTab);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.organization_name.toLowerCase().includes(query) ||
          item.user_email.toLowerCase().includes(query) ||
          item.user_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Date filtering
    result = result.filter((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= dateFrom && itemDate <= dateTo;
    });

    return result;
  }, [feedbackItems, activeTab, searchQuery, statusFilter, dateFrom, dateTo]);

  // Filter PMF surveys by search and date
  const filteredSurveys = useMemo(() => {
    if (activeTab !== "pmf") return [];
    
    let result = [...pmfSurveys];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (survey) =>
          (survey.follow_up_text?.toLowerCase().includes(query) ?? false) ||
          survey.organization_name.toLowerCase().includes(query) ||
          survey.user_email.toLowerCase().includes(query) ||
          survey.user_name.toLowerCase().includes(query) ||
          survey.user_role.toLowerCase().includes(query)
      );
    }

    // Date filtering
    result = result.filter((survey) => {
      const surveyDate = new Date(survey.created_at);
      return surveyDate >= dateFrom && surveyDate <= dateTo;
    });

    return result;
  }, [pmfSurveys, activeTab, searchQuery, dateFrom, dateTo]);

  // Count by type
  const bugCount = feedbackItems.filter((item) => item.type === "bug").length;
  const featureCount = feedbackItems.filter((item) => item.type === "feature").length;
  const pmfCount = pmfSurveys.length;

  // PMF level configs
  const levelConfigs = {
    very_disappointed: {
      label: "Very disappointed",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    somewhat_disappointed: {
      label: "Somewhat disappointed",
      icon: Meh,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    not_disappointed: {
      label: "Not disappointed",
      icon: Frown,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
    },
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">All Feedback</h2>
        <p className="text-muted-foreground">
          Bug reports and feature requests from all organizations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("bug")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "bug"
              ? "bg-red-500/10 text-red-500 border border-red-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bug className="w-4 h-4" />
          Bug Reports
          <span className="px-2 py-0.5 rounded-full bg-background text-xs">
            {bugCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("feature")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "feature"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Feature Requests
          <span className="px-2 py-0.5 rounded-full bg-background text-xs">
            {featureCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("pmf")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "pmf"
              ? "bg-purple-500/10 text-purple-500 border border-purple-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="w-4 h-4" />
          PMF Surveys
          <span className="px-2 py-0.5 rounded-full bg-background text-xs">
            {pmfCount}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "pmf" ? "Search surveys, email, org..." : "Search feedback, email, org..."}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          />
        </div>

        {activeTab !== "pmf" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "all")}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="declined">Declined</option>
          </select>
        )}

        {/* Date Range Picker */}
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onRangeChange={handleDateRangeChange}
        />

        <span className="text-sm text-muted-foreground">
          {activeTab === "pmf" ? filteredSurveys.length : filteredItems.length} results
        </span>
      </div>

      {/* PMF Surveys List */}
      {activeTab === "pmf" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filteredSurveys.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No PMF survey responses found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSurveys.map((survey) => {
                const levelConfig = survey.disappointment_level ? levelConfigs[survey.disappointment_level] : levelConfigs.not_disappointed;
                const Icon = levelConfig.icon;

                return (
                  <div
                    key={survey.id}
                    onClick={() => setSelectedSurvey(survey)}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${levelConfig.bg}`}>
                        <Icon className={`w-5 h-5 ${levelConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${levelConfig.color}`}>
                            {levelConfig.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {survey.user_role}
                          </span>
                        </div>
                        {survey.follow_up_text && (
                          <p className="text-sm text-foreground line-clamp-2 mb-2">
                            &quot;{survey.follow_up_text}&quot;
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {survey.organization_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {survey.user_email}
                          </span>
                          <span>{timeAgo(survey.created_at)}</span>
                        </div>
                        {survey.page_url && (
                          <p className="text-xs text-muted-foreground mt-1">
                            From: {survey.page_url}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feedback List */}
      {activeTab !== "pmf" && (
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === "bug" ? (
              <Bug className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            ) : (
              <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            )}
            <p className="text-muted-foreground">
              No {activeTab === "bug" ? "bug reports" : "feature requests"} found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => {
              const status = statusConfig[item.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    {/* Vote Count (for features) */}
                    {item.type === "feature" && (
                      <div className="flex flex-col items-center flex-shrink-0 w-12 py-1">
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-bold">{item.vote_count}</span>
                      </div>
                    )}

                    {/* Icon (for bugs) */}
                    {item.type === "bug" && (
                      <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
                        <Bug className="w-5 h-5 text-red-500" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-medium text-foreground line-clamp-1">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(item.screenshot_url || item.recording_url) && (
                            <div className="flex items-center gap-1">
                              {item.screenshot_url && <Image className="w-3.5 h-3.5 text-muted-foreground" />}
                              {item.recording_url && <Video className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[item.priority]}`}>
                            {item.priority}
                          </span>
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {item.organization_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {item.user_email}
                        </span>
                        <span>{timeAgo(item.created_at)}</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {item.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {selectedItem.type === "bug" ? (
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <Bug className="w-4 h-4 text-red-500" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[selectedItem.priority]}`}>
                    {selectedItem.priority}
                  </span>
                  {(() => {
                    const st = statusConfig[selectedItem.status];
                    const StIcon = st.icon;
                    return (
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </div>
                    );
                  })()}
                </div>
                <h2 className="text-xl font-bold">{selectedItem.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedItem.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User & Org Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Submitted By</span>
                  </div>
                  <p className="font-medium">{selectedItem.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.user_email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs capitalize">
                    {selectedItem.user_role}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Organization</span>
                  </div>
                  <p className="font-medium">{selectedItem.organization_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${planColors[selectedItem.organization_plan]}`}>
                      {selectedItem.organization_plan}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                      selectedItem.organization_status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : selectedItem.organization_status === "paused"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {selectedItem.organization_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-foreground whitespace-pre-wrap">{selectedItem.description}</p>
              </div>

              {/* Attachments */}
              {(selectedItem.screenshot_url || selectedItem.recording_url) && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Attachments
                  </h3>
                  <div className="space-y-3">
                    {selectedItem.screenshot_url && (
                      <div className="relative group">
                        <img
                          src={selectedItem.screenshot_url}
                          alt="Screenshot"
                          className="w-full rounded-lg border border-border"
                        />
                        <a
                          href={selectedItem.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    {selectedItem.recording_url && (
                      <div className="relative">
                        <video
                          src={selectedItem.recording_url}
                          controls
                          className="w-full rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChevronUp className="w-4 h-4" />
                  <span>{selectedItem.vote_count} votes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{selectedItem.comment_count} comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PMF Survey Detail Modal */}
      {selectedSurvey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedSurvey(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const lc = selectedSurvey.disappointment_level ? levelConfigs[selectedSurvey.disappointment_level] : levelConfigs.not_disappointed;
                    const LcIcon = lc.icon;
                    return (
                      <>
                        <div className={`p-1.5 rounded-lg ${lc.bg}`}>
                          <LcIcon className={`w-4 h-4 ${lc.color}`} />
                        </div>
                        <span className={`text-sm font-medium ${lc.color}`}>
                          {lc.label}
                        </span>
                      </>
                    );
                  })()}
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs capitalize">
                    {selectedSurvey.user_role}
                  </span>
                </div>
                <h2 className="text-xl font-bold">PMF Survey Response</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedSurvey.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User & Org Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Submitted By</span>
                  </div>
                  <p className="font-medium">{selectedSurvey.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSurvey.user_email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs capitalize">
                    {selectedSurvey.user_role}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Organization</span>
                  </div>
                  <p className="font-medium">{selectedSurvey.organization_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${planColors[selectedSurvey.organization_plan]}`}>
                      {selectedSurvey.organization_plan}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                      selectedSurvey.organization_status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : selectedSurvey.organization_status === "paused"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {selectedSurvey.organization_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow-up Response */}
              {selectedSurvey.follow_up_text && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Response
                  </h3>
                  <p className="text-foreground whitespace-pre-wrap">&quot;{selectedSurvey.follow_up_text}&quot;</p>
                </div>
              )}

              {/* Page URL */}
              {selectedSurvey.page_url && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Submitted From
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedSurvey.page_url}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
