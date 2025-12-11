// ============================================================================
// SUPABASE DATABASE TYPES
// ============================================================================
// These types match the database schema and are used for type-safe queries.
// ============================================================================

export type UserRole = "admin" | "agent";

export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";

export type AgentStatus = "offline" | "idle" | "in_simulation" | "in_call";

export type CallStatus = "pending" | "accepted" | "rejected" | "completed" | "missed";

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";
export type AISummaryStatus = "pending" | "processing" | "completed" | "failed";
export type UsageType = "transcription" | "ai_summary";

export type CancellationReason = 
  | "reps_not_using"
  | "not_enough_reps"
  | "low_website_traffic"
  | "low_roi_per_call"
  | "too_expensive"
  | "not_enough_features"
  | "switched_to_competitor"
  | "technical_issues"
  | "difficult_to_use"
  | "business_closed"
  | "other";

export type FeedbackType = "bug" | "feature";
export type FeedbackStatus = "open" | "in_progress" | "completed" | "closed" | "declined";
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

// PMF Survey types
export type DisappointmentLevel = "very_disappointed" | "somewhat_disappointed" | "not_disappointed" | null;

export type SubscriptionStatus = "active" | "paused" | "cancelled" | "trialing" | "past_due";

export type BillingFrequency = "monthly" | "annual" | "six_month";

export type CountryListMode = "blocklist" | "allowlist";

export type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
export type RuleConditionType = "domain" | "path" | "query_param";

// Call settings for organization (includes recording + call behavior)
export interface RecordingSettings {
  enabled: boolean;
  retention_days: number;
  // Transcription settings (charged per transcription)
  transcription_enabled: boolean;
  // AI Summary settings (requires transcription)
  ai_summary_enabled: boolean;
  ai_summary_prompt_format: string | null; // User-editable format for AI summaries
  // Call behavior settings
  rna_timeout_seconds: number; // Ring-No-Answer timeout (default 15 seconds)
  max_call_duration_minutes: number; // Maximum call duration (default 120 minutes / 2 hours)
}

// Pricing constants (2x API costs)
export const TRANSCRIPTION_COST_PER_MIN = 0.01; // ~2x Deepgram Nova-2 ($0.0043/min)
export const AI_SUMMARY_COST_PER_MIN = 0.02; // ~2x estimated LLM token costs

// Default AI summary format for sales calls
export const DEFAULT_AI_SUMMARY_FORMAT = `## Summary
Brief 2-3 sentence overview of the call.

## Customer Interest
- What product/service were they interested in?
- What problem are they trying to solve?
- Budget or timeline mentioned?

## Key Discussion Points
1. 
2. 
3. 

## Objections & Concerns
- List any objections or hesitations raised

## Action Items
- [ ] Follow-up tasks for the sales rep
- [ ] Next steps discussed with customer

## Call Outcome
(Qualified Lead / Needs Follow-up / Not Interested / Scheduled Demo / Closed Deal)

## Notes
Any additional context or observations`;

// Backend prompt template for AI summaries
export const AI_SUMMARY_SYSTEM_PROMPT = `Your job is to summarize this call following the EXACT format given. Fill in each section based on the call transcription. If a section doesn't apply or information wasn't discussed, write "N/A" or "Not discussed".`;

export const buildAISummaryPrompt = (transcription: string, format: string): string => {
  return `Call transcription:
${transcription}

Summary format:
${format}`;
};

// Widget settings for organization (defaults) and pools (overrides)
export type WidgetSize = "small" | "medium" | "large";
export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
export type WidgetDevices = "all" | "desktop" | "mobile";
export type WidgetTheme = "light" | "dark" | "liquid-glass";

export interface WidgetSettings {
  size: WidgetSize;
  position: WidgetPosition;
  devices: WidgetDevices;
  trigger_delay: number; // seconds before widget appears
  auto_hide_delay: number | null; // seconds before widget auto-hides (null = never)
  show_minimize_button: boolean; // whether to show minimize/collapse button on widget
  theme: WidgetTheme; // widget color theme - auto follows user's system preference
  cobrowse_enabled: boolean; // whether co-browse screen sharing is enabled
}

// Facebook integration settings for organization
export interface FacebookSettings {
  pixel_id: string | null;
  capi_access_token: string | null;
  test_event_code: string | null;
  enabled: boolean;
  pixel_base_code: string | null; // Full pixel init code for client-side
  dataset_id: string | null; // For CAPI (usually same as pixel_id)
}

// Facebook standard event names
export type FacebookEventName = 
  | "Lead"
  | "Purchase"
  | "CompleteRegistration"
  | "Contact"
  | "Schedule"
  | "SubmitApplication"
  | "Subscribe"
  | "ViewContent"
  | "InitiateCheckout"
  | "AddToCart"
  | "Search"
  | "FindLocation"
  | "StartTrial"
  | "CustomEvent";

// GreetNow's own Facebook pixel settings (for B2B retargeting)
// Stored in platform_settings table with key 'greetnow_facebook_pixel'
export interface GreetNowFacebookPixelSettings {
  enabled: boolean;
  pixel_id: string | null;
  access_token: string | null;
  test_event_code: string | null; // For testing in Facebook Events Manager
}

// Custom parameters for Facebook events
export interface FacebookEventParams {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  status?: string;
  [key: string]: unknown;
}

export interface RuleCondition {
  type: RuleConditionType;
  matchType: RuleMatchType;
  value: string;
  paramName?: string; // For query_param type: the parameter name (e.g., "utm_source")
}

// Condition groups allow OR logic between groups
// All conditions within a group use AND logic
// Multiple groups use OR logic between them
export interface RuleConditionGroup {
  conditions: RuleCondition[];
}

// ----------------------------------------------------------------------------
// DATABASE TABLES
// ----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          plan: SubscriptionPlan;
          max_agents: number;
          max_sites: number;
          recording_settings: RecordingSettings;
          facebook_settings: FacebookSettings;
          default_widget_settings: WidgetSettings;
          blocked_countries: string[]; // ISO 3166-1 alpha-2 country codes (e.g., ['CN', 'RU'])
          country_list_mode: CountryListMode; // 'blocklist' = block listed countries, 'allowlist' = only allow listed countries
          geo_failure_handling: 'allow' | 'block'; // How to handle visitors when geolocation fails (default: blocklist='allow', allowlist='block')
          // Stripe billing fields
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_item_id: string | null;
          billing_email: string | null;
          seat_count: number;
          billing_frequency: BillingFrequency;
          has_six_month_offer: boolean;
          // Subscription pause fields
          subscription_status: SubscriptionStatus;
          paused_at: string | null;
          pause_ends_at: string | null;
          pause_months: number | null;
          pause_reason: string | null;
          // GreetNow retargeting (platform-admin controlled)
          greetnow_retargeting_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      
      users: {
        Row: {
          id: string; // References auth.users.id
          organization_id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at" | "is_platform_admin">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      
      sites: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          domain: string;
          widget_config: WidgetConfig;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sites"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sites"]["Insert"]>;
      };
      
      agent_profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          display_name: string;
          wave_video_url: string | null;
          intro_video_url: string | null;
          connect_video_url: string | null;
          loop_video_url: string | null;
          status: AgentStatus;
          max_simultaneous_simulations: number;
          is_available: boolean;
          // Soft delete fields
          is_active: boolean;
          deactivated_at: string | null;
          deactivated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_profiles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["agent_profiles"]["Insert"]>;
      };
      
      call_logs: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          agent_id: string | null; // Nullable - agent may be soft-deleted
          pool_id: string | null;
          visitor_id: string;
          status: CallStatus;
          page_url: string;
          duration_seconds: number | null;
          ring_started_at: string | null;
          answered_at: string | null;
          answer_time_seconds: number | null;
          recording_url: string | null;
          disposition_id: string | null;
          started_at: string | null;
          ended_at: string | null;
          // Transcription fields
          transcription: string | null;
          transcription_status: TranscriptionStatus | null;
          transcription_error: string | null;
          transcription_duration_seconds: number | null;
          transcription_cost: number | null;
          transcribed_at: string | null;
          // AI Summary fields
          ai_summary: string | null;
          ai_summary_status: AISummaryStatus | null;
          ai_summary_error: string | null;
          ai_summary_cost: number | null;
          summarized_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["call_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["call_logs"]["Insert"]>;
      };

      dispositions: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          color: string;
          icon: string | null;
          is_active: boolean;
          value: number | null;
          display_order: number;
          // Facebook event fields
          fb_event_name: string | null;
          fb_event_enabled: boolean;
          fb_event_params: FacebookEventParams | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["dispositions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["dispositions"]["Insert"]>;
      };

      agent_pools: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          intro_script: string;
          example_wave_video_url: string | null;
          example_intro_video_url: string | null;
          example_loop_video_url: string | null;
          is_default: boolean;
          is_catch_all: boolean;
          widget_settings: WidgetSettings | null; // null = use org defaults
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_pools"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["agent_pools"]["Insert"]>;
      };

      pool_routing_rules: {
        Row: {
          id: string;
          pool_id: string;
          name: string | null;
          domain_pattern: string;
          path_pattern: string;
          conditions: RuleCondition[];
          condition_groups: RuleConditionGroup[]; // For OR logic: groups are ORed, conditions within groups are ANDed
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pool_routing_rules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pool_routing_rules"]["Insert"]>;
      };

      agent_pool_members: {
        Row: {
          id: string;
          pool_id: string;
          agent_profile_id: string;
          priority_rank: number; // 1 = Primary (highest priority), 2+ = overflow/backup
          wave_video_url: string | null;
          intro_video_url: string | null;
          loop_video_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_pool_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["agent_pool_members"]["Insert"]>;
      };

      invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          full_name: string;
          role: UserRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invites"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
      };

      cancellation_feedback: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          primary_reason: CancellationReason;
          additional_reasons: CancellationReason[];
          detailed_feedback: string | null;
          competitor_name: string | null;
          would_return: boolean | null;
          return_conditions: string | null;
          agent_count: number;
          monthly_cost: number;
          subscription_duration_days: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cancellation_feedback"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["cancellation_feedback"]["Insert"]>;
      };

      pause_history: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          action: "paused" | "resumed" | "extended";
          pause_months: number | null;
          reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pause_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pause_history"]["Insert"]>;
      };

      agent_sessions: {
        Row: {
          id: string;
          agent_id: string;
          organization_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          idle_seconds: number;
          in_call_seconds: number;
          away_seconds: number;
          ended_reason: "logout" | "disconnect" | "idle_timeout" | "server_restart" | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["agent_sessions"]["Insert"]>;
      };

      agent_status_changes: {
        Row: {
          id: string;
          session_id: string;
          agent_id: string;
          from_status: string;
          to_status: "idle" | "in_call" | "away" | "offline";
          changed_at: string;
          reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_status_changes"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["agent_status_changes"]["Insert"]>;
      };

      widget_pageviews: {
        Row: {
          id: string;
          organization_id: string;
          pool_id: string | null;
          visitor_id: string;
          page_url: string;
          agent_id: string | null;
          visitor_country_code: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["widget_pageviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["widget_pageviews"]["Insert"]>;
      };

      feedback_items: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          type: FeedbackType;
          title: string;
          description: string;
          status: FeedbackStatus;
          priority: FeedbackPriority;
          // Bug-specific fields
          steps_to_reproduce: string | null;
          expected_behavior: string | null;
          actual_behavior: string | null;
          browser_info: string | null;
          page_url: string | null;
          screenshot_url: string | null;
          recording_url: string | null;
          // Feature-specific fields
          use_case: string | null;
          // Metadata
          vote_count: number;
          comment_count: number;
          admin_response: string | null;
          admin_responded_at: string | null;
          admin_responded_by: string | null;
          assignee_id: string | null;
          resolved_at: string | null;
          first_response_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feedback_items"]["Row"], "id" | "created_at" | "updated_at" | "vote_count" | "comment_count" | "resolved_at" | "first_response_at">;
        Update: Partial<Database["public"]["Tables"]["feedback_items"]["Insert"]>;
      };

      feedback_votes: {
        Row: {
          id: string;
          feedback_item_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feedback_votes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["feedback_votes"]["Insert"]>;
      };

      feedback_comments: {
        Row: {
          id: string;
          feedback_item_id: string;
          user_id: string;
          content: string;
          is_admin_comment: boolean;
          parent_comment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feedback_comments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["feedback_comments"]["Insert"]>;
      };

      pmf_surveys: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          user_role: string;
          disappointment_level: DisappointmentLevel;
          follow_up_text: string | null;
          triggered_by: string;
          page_url: string | null;
          dismissed: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pmf_surveys"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pmf_surveys"]["Insert"]>;
      };

      survey_cooldowns: {
        Row: {
          user_id: string;
          last_survey_at: string;
          total_surveys: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["survey_cooldowns"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["survey_cooldowns"]["Insert"]>;
      };

      usage_records: {
        Row: {
          id: string;
          organization_id: string;
          call_log_id: string | null;
          usage_type: UsageType;
          duration_seconds: number;
          cost: number;
          billed: boolean;
          billed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["usage_records"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["usage_records"]["Insert"]>;
      };

      platform_settings: {
        Row: {
          key: string;
          value: unknown; // JSONB - structure depends on key
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["platform_settings"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
    };
  };
}

// ----------------------------------------------------------------------------
// WIDGET CONFIG (JSON column)
// ----------------------------------------------------------------------------

export interface WidgetConfig {
  position: "bottom-right" | "bottom-left";
  trigger_delay: number;
  primary_color: string;
  accent_color: string;
  border_radius: number;
  show_agent_name: boolean;
  custom_css?: string;
}

// ----------------------------------------------------------------------------
// HELPER TYPES
// ----------------------------------------------------------------------------

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type SiteInsert = Database["public"]["Tables"]["sites"]["Insert"];

export type AgentProfile = Database["public"]["Tables"]["agent_profiles"]["Row"];
export type AgentProfileInsert = Database["public"]["Tables"]["agent_profiles"]["Insert"];

export type CallLog = Database["public"]["Tables"]["call_logs"]["Row"];
export type CallLogInsert = Database["public"]["Tables"]["call_logs"]["Insert"];

export type AgentPool = Database["public"]["Tables"]["agent_pools"]["Row"];
export type AgentPoolInsert = Database["public"]["Tables"]["agent_pools"]["Insert"];

export type AgentPoolMember = Database["public"]["Tables"]["agent_pool_members"]["Row"];
export type AgentPoolMemberInsert = Database["public"]["Tables"]["agent_pool_members"]["Insert"];

export type PoolRoutingRule = Database["public"]["Tables"]["pool_routing_rules"]["Row"];
export type PoolRoutingRuleInsert = Database["public"]["Tables"]["pool_routing_rules"]["Insert"];

export type Disposition = Database["public"]["Tables"]["dispositions"]["Row"];
export type DispositionInsert = Database["public"]["Tables"]["dispositions"]["Insert"];

export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type InviteInsert = Database["public"]["Tables"]["invites"]["Insert"];

export type CancellationFeedback = Database["public"]["Tables"]["cancellation_feedback"]["Row"];
export type CancellationFeedbackInsert = Database["public"]["Tables"]["cancellation_feedback"]["Insert"];

export type PauseHistory = Database["public"]["Tables"]["pause_history"]["Row"];
export type PauseHistoryInsert = Database["public"]["Tables"]["pause_history"]["Insert"];

export type AgentSession = Database["public"]["Tables"]["agent_sessions"]["Row"];
export type AgentSessionInsert = Database["public"]["Tables"]["agent_sessions"]["Insert"];

export type AgentStatusChange = Database["public"]["Tables"]["agent_status_changes"]["Row"];
export type AgentStatusChangeInsert = Database["public"]["Tables"]["agent_status_changes"]["Insert"];

export type WidgetPageview = Database["public"]["Tables"]["widget_pageviews"]["Row"];
export type WidgetPageviewInsert = Database["public"]["Tables"]["widget_pageviews"]["Insert"];

export type FeedbackItem = Database["public"]["Tables"]["feedback_items"]["Row"];
export type FeedbackItemInsert = Database["public"]["Tables"]["feedback_items"]["Insert"];

export type FeedbackVote = Database["public"]["Tables"]["feedback_votes"]["Row"];
export type FeedbackVoteInsert = Database["public"]["Tables"]["feedback_votes"]["Insert"];

export type FeedbackComment = Database["public"]["Tables"]["feedback_comments"]["Row"];
export type FeedbackCommentInsert = Database["public"]["Tables"]["feedback_comments"]["Insert"];

export type PmfSurvey = Database["public"]["Tables"]["pmf_surveys"]["Row"];
export type PmfSurveyInsert = Database["public"]["Tables"]["pmf_surveys"]["Insert"];

export type SurveyCooldown = Database["public"]["Tables"]["survey_cooldowns"]["Row"];
export type SurveyCooldownInsert = Database["public"]["Tables"]["survey_cooldowns"]["Insert"];

export type UsageRecord = Database["public"]["Tables"]["usage_records"]["Row"];
export type UsageRecordInsert = Database["public"]["Tables"]["usage_records"]["Insert"];

export type PlatformSetting = Database["public"]["Tables"]["platform_settings"]["Row"];
export type PlatformSettingInsert = Database["public"]["Tables"]["platform_settings"]["Insert"];

// MRR Tracking types
export type MrrChangeType = "new" | "expansion" | "contraction" | "churn" | "reactivation";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type CallsTrend = "increasing" | "stable" | "declining";

export interface MrrSnapshot {
  id: string;
  organization_id: string;
  mrr: number;
  seat_count: number;
  plan: string;
  subscription_status: string;
  snapshot_date: string;
  created_at: string;
}

export interface MrrChange {
  id: string;
  organization_id: string;
  change_type: MrrChangeType;
  mrr_before: number;
  mrr_after: number;
  mrr_delta: number;
  seat_count_before: number | null;
  seat_count_after: number | null;
  plan_before: string | null;
  plan_after: string | null;
  reason: string | null;
  changed_at: string;
  created_at: string;
}

export interface OrganizationHealth {
  organization_id: string;
  health_score: number;
  risk_level: RiskLevel;
  activity_score: number;
  engagement_score: number;
  coverage_score: number;
  growth_score: number;
  days_since_last_call: number | null;
  calls_trend: CallsTrend | null;
  coverage_rate: number | null;
  agent_utilization: number | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyMetrics {
  id: string;
  month_start: string;
  total_orgs: number;
  active_orgs: number;
  new_orgs: number;
  churned_orgs: number;
  reactivated_orgs: number;
  starting_mrr: number;
  ending_mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  reactivation_mrr: number;
  logo_churn_rate: number | null;
  revenue_churn_rate: number | null;
  net_revenue_retention: number | null;
  quick_ratio: number | null;
  total_calls: number;
  total_pageviews: number;
  avg_coverage_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface CohortRetention {
  id: string;
  cohort_month: string;
  months_since_signup: number;
  starting_count: number;
  retained_count: number;
  retained_mrr: number;
  starting_mrr: number;
  logo_retention_rate: number | null;
  revenue_retention_rate: number | null;
  calculated_at: string;
}

// Feedback item with author info for display
export interface FeedbackItemWithAuthor extends FeedbackItem {
  user: {
    full_name: string;
    avatar_url: string | null;
    role: UserRole;
  };
  has_voted?: boolean;
}

// Comment with author info for display
export interface FeedbackCommentWithAuthor extends FeedbackComment {
  user: {
    full_name: string;
    avatar_url: string | null;
    role: UserRole;
  };
}

// ----------------------------------------------------------------------------
// AUTH SESSION TYPES
// ----------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  user: User;
  organization: Organization;
  agentProfile?: AgentProfile;
}

export interface SessionContext {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
}

