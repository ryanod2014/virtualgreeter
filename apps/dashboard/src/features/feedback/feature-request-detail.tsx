"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronUp,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Shield,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CommentSection } from "./comment-section";
import type {
  FeedbackItemWithAuthor,
  FeedbackCommentWithAuthor,
  FeedbackStatus,
} from "@ghost-greeter/domain/database.types";

interface FeatureRequestDetailProps {
  item: FeedbackItemWithAuthor;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const statusConfig: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500 bg-green-500/10 border-green-500/30" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground bg-muted/50 border-border" },
  declined: { label: "Declined", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/30" },
};

const statusOptions: FeedbackStatus[] = ["open", "in_progress", "completed", "closed", "declined"];

export function FeatureRequestDetail({
  item,
  currentUserId,
  isAdmin,
  onClose,
  onUpdate,
}: FeatureRequestDetailProps) {
  const [comments, setComments] = useState<FeedbackCommentWithAuthor[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [hasVoted, setHasVoted] = useState(item.has_voted ?? false);
  const [voteCount, setVoteCount] = useState(item.vote_count);
  const [isVoting, setIsVoting] = useState(false);
  const [adminResponse, setAdminResponse] = useState(item.admin_response || "");
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(item.status);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("feedback_comments")
      .select(`
        *,
        user:users(full_name, avatar_url, role)
      `)
      .eq("feedback_item_id", item.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    setComments(data as FeedbackCommentWithAuthor[]);
    setIsLoadingComments(false);
  }, [supabase, item.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);

    try {
      if (hasVoted) {
        const { error } = await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_item_id", item.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setHasVoted(false);
        setVoteCount((c) => c - 1);
      } else {
        const { error } = await supabase
          .from("feedback_votes")
          .insert({
            feedback_item_id: item.id,
            user_id: currentUserId,
          });

        if (error) throw error;

        setHasVoted(true);
        setVoteCount((c) => c + 1);
      }

      onUpdate?.();
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleSaveAdminResponse = async () => {
    if (!isAdmin || isSaving) return;

    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {
        status: selectedStatus,
      };

      if (adminResponse.trim() !== (item.admin_response || "")) {
        updates.admin_response = adminResponse.trim() || null;
        updates.admin_responded_at = adminResponse.trim() ? new Date().toISOString() : null;
        updates.admin_responded_by = adminResponse.trim() ? currentUserId : null;
      }

      const { error } = await supabase
        .from("feedback_items")
        .update(updates)
        .eq("id", item.id);

      if (error) throw error;

      onUpdate?.();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = item.user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createdDate = new Date(item.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const hasAdminChanges =
    selectedStatus !== item.status ||
    adminResponse.trim() !== (item.admin_response || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex gap-4 flex-1 min-w-0">
            {/* Vote Button */}
            <button
              onClick={handleVote}
              disabled={isVoting}
              className={`flex flex-col items-center justify-center w-16 h-20 rounded-xl border-2 transition-all flex-shrink-0 ${
                hasVoted
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/30 border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
              }`}
            >
              {isVoting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ChevronUp className="w-6 h-6" />
                  <span className="text-lg font-bold tabular-nums">{voteCount}</span>
                  <span className="text-[10px] uppercase tracking-wide">votes</span>
                </>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{item.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-primary">{initials}</span>
                  </div>
                  <span>{item.user.full_name}</span>
                  {item.user.role === "admin" && (
                    <Shield className="w-3 h-3 text-primary" />
                  )}
                </div>
                <span>·</span>
                <span>{createdDate}</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{comments.length} comments</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Description
            </h3>
            <p className="text-foreground whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Use Case (for features) */}
          {item.use_case && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Use Case
              </h3>
              <p className="text-foreground whitespace-pre-wrap">{item.use_case}</p>
            </div>
          )}

          {/* Admin Response Section */}
          {isAdmin && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Response
              </h3>

              <div className="space-y-4">
                {/* Status Selector */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((s) => {
                      const cfg = statusConfig[s];
                      const Icon = cfg.icon;
                      const isSelected = selectedStatus === s;

                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedStatus(s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            isSelected
                              ? cfg.color + " border-current"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Response Text */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Response Message
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Write a response to the user (visible to everyone)..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none transition-colors resize-none"
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAdminResponse}
                    disabled={!hasAdminChanges || isSaving}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Response"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display Admin Response (for non-admins) */}
          {!isAdmin && item.admin_response && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Response
              </h3>
              <p className="text-foreground whitespace-pre-wrap">{item.admin_response}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Comments ({comments.length})
            </h3>
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommentSection
                feedbackItemId={item.id}
                comments={comments}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onCommentAdded={fetchComments}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

