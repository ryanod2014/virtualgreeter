"use client";

import { useState } from "react";
import {
  ChevronUp,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  PlayCircle,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FeedbackItemWithAuthor, FeedbackStatus } from "@ghost-greeter/domain/database.types";

interface FeatureRequestCardProps {
  item: FeedbackItemWithAuthor;
  currentUserId: string;
  onClick?: () => void;
  onVoteChange?: () => void;
}

const statusConfig: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-blue-500 bg-blue-500/10" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-amber-500 bg-amber-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground bg-muted/50" },
  declined: { label: "Declined", icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
};

export function FeatureRequestCard({
  item,
  currentUserId,
  onClick,
  onVoteChange,
}: FeatureRequestCardProps) {
  const [hasVoted, setHasVoted] = useState(item.has_voted ?? false);
  const [voteCount, setVoteCount] = useState(item.vote_count);
  const [isVoting, setIsVoting] = useState(false);

  const supabase = createClient();
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isVoting) return;
    setIsVoting(true);

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_item_id", item.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        
        setHasVoted(false);
        setVoteCount((c) => c - 1);
      } else {
        // Add vote
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
      
      onVoteChange?.();
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const timeAgo = getTimeAgo(new Date(item.created_at));
  const initials = item.user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className="group relative bg-card/50 hover:bg-card border border-border hover:border-primary/30 rounded-xl p-4 transition-all cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Vote Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl border-2 transition-all ${
              hasVoted
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted/30 border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
            }`}
          >
            {isVoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronUp className={`w-5 h-5 ${hasVoted ? "text-primary" : ""}`} />
                <span className="text-sm font-bold tabular-nums">{voteCount}</span>
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {item.title}
            </h3>
            <div
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {item.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-medium text-primary">{initials}</span>
              </div>
              <span>{item.user.full_name}</span>
              {item.user.role === "admin" && (
                <Shield className="w-3 h-3 text-primary" title="Admin" />
              )}
            </div>

            {/* Time */}
            <span>{timeAgo}</span>

            {/* Comments */}
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{item.comment_count}</span>
            </div>
          </div>

          {/* Admin Response Preview */}
          {item.admin_response && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                <Shield className="w-3 h-3" />
                Admin Response
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.admin_response}
              </p>
            </div>
          )}
        </div>
      </div>
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

