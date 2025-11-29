"use client";

import { useState } from "react";
import { Send, Loader2, Shield, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FeedbackCommentWithAuthor } from "@ghost-greeter/domain/database.types";

interface CommentSectionProps {
  feedbackItemId: string;
  comments: FeedbackCommentWithAuthor[];
  currentUserId: string;
  isAdmin: boolean;
  onCommentAdded?: () => void;
}

export function CommentSection({
  feedbackItemId,
  comments,
  currentUserId,
  isAdmin,
  onCommentAdded,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("feedback_comments")
        .insert({
          feedback_item_id: feedbackItemId,
          user_id: currentUserId,
          content: newComment.trim(),
          is_admin_comment: isAdmin,
          parent_comment_id: null,
        });

      if (error) throw error;

      setNewComment("");
      onCommentAdded?.();
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    setDeletingId(commentId);

    try {
      const { error } = await supabase
        .from("feedback_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      onCommentAdded?.();
    } catch (err) {
      console.error("Delete comment error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => {
            const initials = comment.user.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const canDelete = comment.user_id === currentUserId;
            const timeAgo = getTimeAgo(new Date(comment.created_at));

            return (
              <div
                key={comment.id}
                className={`p-4 rounded-xl ${
                  comment.is_admin_comment
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-muted/30"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        comment.is_admin_comment
                          ? "bg-primary/20"
                          : "bg-muted"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          comment.is_admin_comment
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {initials}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">
                        {comment.user.full_name}
                      </span>
                      {comment.is_admin_comment && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                          <Shield className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="self-end px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

