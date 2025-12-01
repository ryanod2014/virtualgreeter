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
  Send,
  Trash2,
  Reply,
  CornerDownRight,
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
  user_vote?: number | null; // 1 = upvote, -1 = downvote, null = no vote
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

type SortOption = "votes" | "recent";

const statusConfig: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-blue-400 bg-blue-500/20 border border-blue-500/30" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-amber-400 bg-amber-500/20 border border-amber-500/30" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/20 border border-emerald-500/30" },
  closed: { label: "Closed", icon: XCircle, color: "text-slate-400 bg-slate-500/20 border border-slate-500/30" },
  declined: { label: "Declined", icon: AlertCircle, color: "text-red-400 bg-red-500/20 border border-red-500/30" },
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

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string } | null>(null);

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

    // Check user's votes on each item
    const itemIds = data.map((item) => item.id);
    const { data: votes } = await supabase
      .from("feedback_votes")
      .select("feedback_item_id, vote_type")
      .eq("user_id", userId)
      .in("feedback_item_id", itemIds);

    const userVotes = new Map(votes?.map((v) => [v.feedback_item_id, v.vote_type]) || []);

    const itemsWithVotes = data.map((item) => ({
      ...item,
      user_vote: userVotes.get(item.id) || null,
    }));

    setItems(itemsWithVotes);
    setIsLoading(false);
  }, [supabase, userId, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Fetch comments for selected item and organize into threads
  const fetchComments = useCallback(async (itemId: string) => {
    setIsLoadingComments(true);
    const { data, error } = await supabase
      .from("feedback_comments")
      .select("id, user_id, content, parent_comment_id, created_at, updated_at")
      .eq("feedback_item_id", itemId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } else {
      // Organize into threaded structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create all comments with empty replies
      (data || []).forEach((c) => {
        commentMap.set(c.id, { ...c, replies: [] });
      });

      // Second pass: organize into tree
      (data || []).forEach((c) => {
        const comment = commentMap.get(c.id)!;
        if (c.parent_comment_id && commentMap.has(c.parent_comment_id)) {
          commentMap.get(c.parent_comment_id)!.replies!.push(comment);
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    }
    setIsLoadingComments(false);
  }, [supabase]);

  // Post a new comment or reply
  const handlePostComment = async (parentCommentId?: string) => {
    if (!newComment.trim() || !selectedItem || isPostingComment) return;

    setIsPostingComment(true);
    try {
      const { error } = await supabase
        .from("feedback_comments")
        .insert({
          feedback_item_id: selectedItem.id,
          user_id: userId,
          content: newComment.trim(),
          is_admin_comment: false,
          parent_comment_id: parentCommentId || null,
        });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      fetchComments(selectedItem.id);
      // Update comment count locally
      setSelectedItem({
        ...selectedItem,
        comment_count: selectedItem.comment_count + 1,
      });
      fetchItems(); // Refresh list to update comment counts
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedItem) return;

    setDeletingCommentId(commentId);
    try {
      const { error } = await supabase
        .from("feedback_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", userId);

      if (error) throw error;

      fetchComments(selectedItem.id);
      // Update comment count locally
      setSelectedItem({
        ...selectedItem,
        comment_count: Math.max(0, selectedItem.comment_count - 1),
      });
      fetchItems(); // Refresh list to update comment counts
    } catch (err) {
      console.error("Error deleting comment:", err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Load comments when selecting an item
  useEffect(() => {
    if (selectedItem) {
      fetchComments(selectedItem.id);
      setNewComment("");
    } else {
      setComments([]);
    }
  }, [selectedItem?.id, fetchComments]);

  const handleVote = async (itemId: string, voteType: 1 | -1, currentVote: number | null) => {
    try {
      if (currentVote === voteType) {
        // Clicking same vote again = remove vote
        await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_item_id", itemId)
          .eq("user_id", userId);
      } else if (currentVote === null) {
        // No existing vote = insert new vote
        await supabase
          .from("feedback_votes")
          .insert({ feedback_item_id: itemId, user_id: userId, vote_type: voteType });
      } else {
        // Switching vote (up to down or down to up) = update
        await supabase
          .from("feedback_votes")
          .update({ vote_type: voteType })
          .eq("feedback_item_id", itemId)
          .eq("user_id", userId);
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects - matching homepage */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[500px] h-[500px] -top-[200px] left-1/4 bg-primary/10" />
        <div className="glow-orb w-[400px] h-[400px] top-[40%] -right-[150px] bg-purple-600/8" />
        <div className="glow-orb w-[300px] h-[300px] bottom-[10%] -left-[100px] bg-fuchsia-600/6" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-600/5" />
          <div className="relative px-8 py-10 max-w-5xl mx-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 backdrop-blur-sm border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Feature Requests</h1>
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "all")}
                className="pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none transition-colors appearance-none cursor-pointer text-foreground"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value} className="bg-background">
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex rounded-full bg-muted/50 border border-border p-1">
              <button
                onClick={() => setSortBy("votes")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  sortBy === "votes"
                    ? "bg-primary text-primary-foreground"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Top
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  sortBy === "recent"
                    ? "bg-primary text-primary-foreground"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Clock className="w-4 h-4" />
                New
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitForm(true)}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              New Request
            </button>
          </div>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
            </div>
            <p className="text-muted-foreground mt-4">Loading requests...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl" />
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 relative">
                <Lightbulb className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {searchQuery ? "No results found" : "No feature requests yet"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              {searchQuery
                ? "Try adjusting your search"
                : "Be the first to suggest a feature! Your ideas help shape the product."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="group flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Submit First Request
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
                  className="group relative bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm border border-white/10 hover:border-primary/30 rounded-2xl p-4 transition-all cursor-pointer hover-lift"
                >
                  <div className="flex gap-4">
                    {/* Reddit-style Vote Buttons */}
                    <div className="flex flex-col items-center flex-shrink-0 w-12 bg-white/5 rounded-xl py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(item.id, 1, item.user_vote ?? null);
                        }}
                        title={item.user_vote === 1 ? "Remove upvote" : "Upvote"}
                        className={`p-1.5 rounded-lg transition-all ${
                          item.user_vote === 1
                            ? "text-primary bg-primary/20 hover:bg-primary/30"
                            : "text-white/40 hover:text-primary hover:bg-primary/10"
                        }`}
                      >
                        <ChevronUp className="w-5 h-5" strokeWidth={item.user_vote === 1 ? 3 : 2} />
                      </button>
                      <span className={`text-sm font-bold tabular-nums py-1 ${
                        item.user_vote === 1 
                          ? "text-primary" 
                          : item.user_vote === -1 
                            ? "text-blue-400" 
                            : "text-white/60"
                      }`}>
                        {item.vote_count}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(item.id, -1, item.user_vote ?? null);
                        }}
                        title={item.user_vote === -1 ? "Remove downvote" : "Downvote"}
                        className={`p-1.5 rounded-lg transition-all ${
                          item.user_vote === -1
                            ? "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"
                            : "text-white/40 hover:text-blue-400 hover:bg-blue-500/10"
                        }`}
                      >
                        <ChevronDown className="w-5 h-5" strokeWidth={item.user_vote === -1 ? 3 : 2} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <div
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>{timeAgo(item.created_at)}</span>
                        <div className="flex items-center gap-1.5">
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
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowSubmitForm(false)}
        >
          <div
            className="w-full max-w-lg bg-background/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-primary/5 to-purple-600/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/30">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Request a Feature</h3>
                  <p className="text-xs text-muted-foreground">Share your idea with the community</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {submitError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">
                  What feature would you like?
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief title for your idea"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-colors text-foreground placeholder:text-white/30"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the feature and why it would be helpful..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-colors resize-none text-foreground placeholder:text-white/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-5 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newDescription.trim()}
                  className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-background/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10 bg-gradient-to-r from-primary/5 to-purple-600/5">
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Reddit-style Vote in Detail */}
                <div className="flex flex-col items-center flex-shrink-0 w-14 bg-white/5 rounded-xl py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentVote = selectedItem.user_vote ?? null;
                      const newVote = currentVote === 1 ? null : 1;
                      const voteDiff = (newVote ?? 0) - (currentVote ?? 0);
                      handleVote(selectedItem.id, 1, currentVote);
                      setSelectedItem({
                        ...selectedItem,
                        user_vote: newVote,
                        vote_count: selectedItem.vote_count + voteDiff,
                      });
                    }}
                    title={selectedItem.user_vote === 1 ? "Remove upvote" : "Upvote"}
                    className={`p-1.5 rounded-lg transition-all ${
                      selectedItem.user_vote === 1
                        ? "text-primary bg-primary/20 hover:bg-primary/30"
                        : "text-white/40 hover:text-primary hover:bg-primary/10"
                    }`}
                  >
                    <ChevronUp className="w-7 h-7" strokeWidth={selectedItem.user_vote === 1 ? 3 : 2} />
                  </button>
                  <span className={`text-lg font-bold tabular-nums py-1 ${
                    selectedItem.user_vote === 1 
                      ? "text-primary" 
                      : selectedItem.user_vote === -1 
                        ? "text-blue-400" 
                        : "text-white/60"
                  }`}>
                    {selectedItem.vote_count}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentVote = selectedItem.user_vote ?? null;
                      const newVote = currentVote === -1 ? null : -1;
                      const voteDiff = (newVote ?? 0) - (currentVote ?? 0);
                      handleVote(selectedItem.id, -1, currentVote);
                      setSelectedItem({
                        ...selectedItem,
                        user_vote: newVote,
                        vote_count: selectedItem.vote_count + voteDiff,
                      });
                    }}
                    title={selectedItem.user_vote === -1 ? "Remove downvote" : "Downvote"}
                    className={`p-1.5 rounded-lg transition-all ${
                      selectedItem.user_vote === -1
                        ? "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"
                        : "text-white/40 hover:text-blue-400 hover:bg-blue-500/10"
                    }`}
                  >
                    <ChevronDown className="w-7 h-7" strokeWidth={selectedItem.user_vote === -1 ? 3 : 2} />
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
                  <h2 className="text-xl font-bold mb-2 text-foreground">{selectedItem.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    <span>{timeAgo(selectedItem.created_at)}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{selectedItem.comment_count} comments</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                  Description
                </h3>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{selectedItem.description}</p>
              </div>

              {/* Comments Section */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-4">
                  Comments ({selectedItem.comment_count})
                </h3>

                {/* Comment Input */}
                <div className="flex gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">You</span>
                  </div>
                  <div className="flex-1">
                    {replyingTo && (
                      <div className="flex items-center gap-2 mb-2 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                        <CornerDownRight className="w-4 h-4 text-white/40" />
                        <span className="text-white/40">Replying to:</span>
                        <span className="text-foreground truncate flex-1">{replyingTo.content.slice(0, 50)}...</span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Write a reply..." : "What are your thoughts?"}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-colors resize-none text-sm text-foreground placeholder:text-white/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handlePostComment(replyingTo?.id);
                        }
                      }}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-white/30">
                        {newComment.length > 0 && "⌘/Ctrl + Enter to submit"}
                      </span>
                      <button
                        onClick={() => handlePostComment(replyingTo?.id)}
                        disabled={!newComment.trim() || isPostingComment}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/20"
                      >
                        {isPostingComment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {replyingTo ? "Reply" : "Comment"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                {isLoadingComments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 bg-white/[0.02] border border-white/10 rounded-xl">
                    <MessageCircle className="w-10 h-10 mx-auto mb-3 text-white/20" />
                    <p className="text-sm text-white/40">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {comments.map((comment) => (
                      <CommentThread
                        key={comment.id}
                        comment={comment}
                        userId={userId}
                        depth={0}
                        onReply={(c) => setReplyingTo({ id: c.id, content: c.content })}
                        onDelete={handleDeleteComment}
                        deletingId={deletingCommentId}
                        timeAgo={timeAgo}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive comment thread component
function CommentThread({
  comment,
  userId,
  depth,
  onReply,
  onDelete,
  deletingId,
  timeAgo,
}: {
  comment: Comment;
  userId: string;
  depth: number;
  onReply: (comment: Comment) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  timeAgo: (date: string) => string;
}) {
  const isOwn = comment.user_id === userId;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 4; // Maximum nesting depth

  return (
    <div className={depth > 0 ? "ml-6 pl-4 border-l-2 border-primary/20" : ""}>
      <div className="group py-3">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
            isOwn ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/10"
          }`}>
            <span className={`text-[10px] font-bold ${isOwn ? "text-primary" : "text-white/40"}`}>
              {isOwn ? "You" : "U"}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-sm font-medium ${isOwn ? "text-primary" : "text-foreground"}`}>
                {isOwn ? "You" : "Anonymous"}
              </span>
              <span className="text-xs text-white/20">•</span>
              <span className="text-xs text-white/40">{timeAgo(comment.created_at)}</span>
            </div>
            
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mb-2 leading-relaxed">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {depth < maxDepth && (
                <button
                  onClick={() => onReply(comment)}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors"
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && (
        <div className="space-y-0">
          {comment.replies!.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              userId={userId}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              deletingId={deletingId}
              timeAgo={timeAgo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

