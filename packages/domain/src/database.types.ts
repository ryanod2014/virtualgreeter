// ============================================================================
// SUPABASE DATABASE TYPES
// ============================================================================
// These types match the database schema and are used for type-safe queries.
// ============================================================================

export type UserRole = "admin" | "agent";

export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";

export type AgentStatus = "offline" | "idle" | "in_simulation" | "in_call";

export type CallStatus = "pending" | "accepted" | "rejected" | "completed" | "missed";

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

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
export type RuleConditionType = "domain" | "path" | "query_param";

// Recording settings for organization
export interface RecordingSettings {
  enabled: boolean;
  retention_days: number;
}

// Widget settings for organization (defaults) and pools (overrides)
export type WidgetSize = "small" | "medium" | "large";
export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
export type WidgetDevices = "all" | "desktop" | "mobile";

export interface WidgetSettings {
  size: WidgetSize;
  position: WidgetPosition;
  devices: WidgetDevices;
  trigger_delay: number; // seconds before widget appears
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
          // Stripe billing fields
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_item_id: string | null;
          billing_email: string | null;
          seat_count: number;
          // Subscription pause fields
          subscription_status: SubscriptionStatus;
          paused_at: string | null;
          pause_ends_at: string | null;
          pause_months: number | null;
          pause_reason: string | null;
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
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at">;
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

