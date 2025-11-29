"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Loader2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { FeedbackStatus } from "@ghost-greeter/domain/database.types";

interface PublicFeedbackClientProps {
  userId: string;
  isAdmin: boolean;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  vote_count: number;
  comment_count: number;
  created_at: string;
  has_voted?: boolean;
}

type SortOption = "votes" | "recent";

const statusConfig: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-blue-500 bg-blue-500/10" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-amber-500 bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground bg-muted/50" },
  declined: { label: "Declined", icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
};

const statusFilters: { value: FeedbackStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function PublicFeedbackClient({ userId, isAdmin }: PublicFeedbackClientProps) {
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeatureRequest | null>(null);

  // Submit form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setIsLoading(true);

    // Fetch all feature requests (cross-org, anonymous)
    let query = supabase
      .from("feedback_items")
      .select("id, title, description, status, vote_count, comment_count, created_at")
      .eq("type", "feature");

    // Apply status filter
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply sorting
    if (sortBy === "votes") {
      query = query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching feedback:", error);
      setIsLoading(false);
      return;
    }

    // Check if current user has voted on each item
    const itemIds = data.map((item) => item.id);
    const { data: votes } = await supabase
      .from("feedback_votes")
      .select("feedback_item_id")
      .eq("user_id", userId)
      .in("feedback_item_id", itemIds);

    const votedItemIds = new Set(votes?.map((v) => v.feedback_item_id) || []);

    const itemsWithVotes = data.map((item) => ({
      ...item,
      has_voted: votedItemIds.has(item.id),
    }));

    setItems(itemsWithVotes);
    setIsLoading(false);
  }, [supabase, userId, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleVote = async (itemId: string, hasVoted: boolean) => {
    try {
      if (hasVoted) {
        await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_item_id", itemId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("feedback_votes")
          .insert({ feedback_item_id: itemId, user_id: userId });
      }
      fetchItems();
    } catch (err) {
      console.error("Vote error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim() || !newDescription.trim()) {
      setSubmitError("Please fill in the title and description");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get user's org for the record (even though it won't be displayed)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        throw new Error("Could not find user organization");
      }

      const { error } = await supabase
        .from("feedback_items")
        .insert({
          organization_id: userData.organization_id,
          user_id: userId,
          type: "feature",
          title: newTitle.trim(),
          description: newDescription.trim(),
          status: "open",
          priority: "medium",
        });

      if (error) {
        console.error("Insert error:", error);
        throw new Error(error.message);
      }

      setShowSubmitForm(false);
      setNewTitle("");
      setNewDescription("");
      fetchItems();
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-background to-primary/5 border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="relative px-8 py-10 max-w-5xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Feature Requests</h1>
              <p className="text-muted-foreground">
                Vote for features you want · Top voted get built first
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-5xl mx-auto">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feature requests..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "all")}
                className="pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex rounded-xl bg-muted/50 border border-border p-1">
              <button
                onClick={() => setSortBy("votes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === "votes"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Top
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === "recent"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-4 h-4" />
                New
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Request
            </button>
          </div>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 mb-4">
              <Lightbulb className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No results found" : "No feature requests yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery
                ? "Try adjusting your search"
                : "Be the first to suggest a feature! Your ideas help shape the product."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Request
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              {items.length} {items.length === 1 ? "request" : "requests"}
            </div>
            {items.map((item) => {
              const status = statusConfig[item.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative bg-card/50 hover:bg-card border border-border hover:border-primary/30 rounded-xl p-3 transition-all cursor-pointer"
                >
                  <div className="flex gap-3">
                    {/* Reddit-style Vote Buttons */}
                    <div className="flex flex-col items-center flex-shrink-0 w-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.has_voted) {
                            handleVote(item.id, false);
                          } else {
                            handleVote(item.id, true);
                          }
                        }}
                        title={item.has_voted ? "Remove vote" : "Upvote"}
                        className={`p-1 rounded transition-colors ${
                          item.has_voted
                            ? "text-orange-500 hover:bg-orange-500/10"
                            : "text-muted-foreground/50 hover:text-orange-500 hover:bg-orange-500/10"
                        }`}
                      >
                        <ChevronUp className="w-6 h-6" strokeWidth={item.has_voted ? 3 : 2} />
                      </button>
                      <span className={`text-xs font-bold tabular-nums py-0.5 ${
                        item.has_voted ? "text-orange-500" : "text-muted-foreground"
                      }`}>
                        {item.vote_count}
                      </span>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground/30 cursor-not-allowed"
                        disabled
                        title="Downvoting disabled"
                      >
                        <ChevronDown className="w-6 h-6" strokeWidth={2} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <div
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{timeAgo(item.created_at)}</span>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{item.comment_count} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSubmitForm(false)}
        >
          <div
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-semibold">Request a Feature</h3>
              </div>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {submitError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What feature would you like?
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief title for your idea"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the feature and why it would be helpful..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newDescription.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Reddit-style Vote in Detail */}
                <div className="flex flex-col items-center flex-shrink-0 w-12">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(selectedItem.id, selectedItem.has_voted || false);
                      setSelectedItem({
                        ...selectedItem,
                        has_voted: !selectedItem.has_voted,
                        vote_count: selectedItem.has_voted
                          ? selectedItem.vote_count - 1
                          : selectedItem.vote_count + 1,
                      });
                    }}
                    title={selectedItem.has_voted ? "Remove vote" : "Upvote"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      selectedItem.has_voted
                        ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20"
                        : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                    }`}
                  >
                    <ChevronUp className="w-7 h-7" strokeWidth={selectedItem.has_voted ? 3 : 2} />
                  </button>
                  <span className={`text-base font-bold tabular-nums py-1 ${
                    selectedItem.has_voted ? "text-orange-500" : "text-muted-foreground"
                  }`}>
                    {selectedItem.vote_count}
                  </span>
                  <button
                    className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                    disabled
                    title="Downvoting disabled"
                  >
                    <ChevronDown className="w-7 h-7" strokeWidth={2} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const st = statusConfig[selectedItem.status];
                      const StIcon = st.icon;
                      return (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon className="w-3.5 h-3.5" />
                          {st.label}
                        </div>
                      );
                    })()}
                  </div>
                  <h2 className="text-xl font-bold mb-2">{selectedItem.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{timeAgo(selectedItem.created_at)}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{selectedItem.comment_count} comments</span>
                    </div>
                  </div>
                </div>
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
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-foreground whitespace-pre-wrap">{selectedItem.description}</p>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ChevronUp className="w-4 h-4 text-orange-500" />
                  <span>Upvote to help prioritize this feature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

