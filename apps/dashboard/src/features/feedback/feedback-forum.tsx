"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bug,
  Lightbulb,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FeatureRequestCard } from "./feature-request-card";
import { FeatureRequestDetail } from "./feature-request-detail";
import { FeedbackSubmitForm } from "./feedback-submit-form";
import type {
  FeedbackItemWithAuthor,
  FeedbackType,
  FeedbackStatus,
} from "@ghost-greeter/domain/database.types";

interface FeedbackForumProps {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
}

type SortOption = "votes" | "recent" | "comments";
type TabType = "features" | "bugs";

const statusFilters: { value: FeedbackStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "declined", label: "Declined" },
];

export function FeedbackForum({
  organizationId,
  userId,
  isAdmin,
}: FeedbackForumProps) {
  const [activeTab, setActiveTab] = useState<TabType>("features");
  const [items, setItems] = useState<FeedbackItemWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackItemWithAuthor | null>(null);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setIsLoading(true);

    const feedbackType: FeedbackType = activeTab === "features" ? "feature" : "bug";

    let query = supabase
      .from("feedback_items")
      .select(`
        *,
        user:users(full_name, avatar_url, role)
      `)
      .eq("organization_id", organizationId)
      .eq("type", feedbackType);

    // Apply status filter
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case "votes":
        query = query.order("vote_count", { ascending: false });
        break;
      case "recent":
        query = query.order("created_at", { ascending: false });
        break;
      case "comments":
        query = query.order("comment_count", { ascending: false });
        break;
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
    })) as FeedbackItemWithAuthor[];

    setItems(itemsWithVotes);
    setIsLoading(false);
  }, [supabase, organizationId, userId, activeTab, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmitSuccess = () => {
    setShowSubmitForm(false);
    fetchItems();
  };

  const featureCount = items.length;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-amber-500/5 border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative px-8 py-12 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                Feedback & Ideas
              </h1>
              <p className="text-muted-foreground">
                Help us improve by reporting bugs or suggesting new features
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setActiveTab("features")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "features"
                  ? "bg-amber-500/10 text-amber-500 ring-2 ring-amber-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Lightbulb className="w-5 h-5" />
              Feature Requests
            </button>
            <button
              onClick={() => setActiveTab("bugs")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "bugs"
                  ? "bg-red-500/10 text-red-500 ring-2 ring-red-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bug className="w-5 h-5" />
              Bug Reports
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === "features" ? "feature requests" : "bug reports"}...`}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {activeTab === "features" ? "Request Feature" : "Report Bug"}
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
            <div className={`p-4 rounded-2xl mb-4 ${activeTab === "features" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
              {activeTab === "features" ? (
                <Lightbulb className="w-10 h-10 text-amber-500" />
              ) : (
                <Bug className="w-10 h-10 text-red-500" />
              )}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery
                ? "No results found"
                : activeTab === "features"
                ? "No feature requests yet"
                : "No bug reports yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery
                ? "Try adjusting your search or filters"
                : activeTab === "features"
                ? "Be the first to suggest a feature! Your ideas help shape the product."
                : "Great news - no bugs reported! If you find one, let us know."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {activeTab === "features" ? "Request Feature" : "Report Bug"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {featureCount} {featureCount === 1 ? "item" : "items"}
              </span>
            </div>
            {items.map((item) => (
              <FeatureRequestCard
                key={item.id}
                item={item}
                currentUserId={userId}
                onClick={() => setSelectedItem(item)}
                onVoteChange={fetchItems}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl bg-background rounded-2xl border border-border shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <FeedbackSubmitForm
              organizationId={organizationId}
              userId={userId}
              type={activeTab === "features" ? "feature" : "bug"}
              onSuccess={handleSubmitSuccess}
              onCancel={() => setShowSubmitForm(false)}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <FeatureRequestDetail
          item={selectedItem}
          currentUserId={userId}
          isAdmin={isAdmin}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => {
            fetchItems();
            // Refresh selected item
            const updated = items.find((i) => i.id === selectedItem.id);
            if (updated) setSelectedItem(updated);
          }}
        />
      )}
    </div>
  );
}

