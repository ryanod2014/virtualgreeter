// ============================================================================
// SUPABASE DATABASE TYPES
// ============================================================================
// These types match the database schema and are used for type-safe queries.
// ============================================================================

export type UserRole = "admin" | "agent";

export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";

export type AgentStatus = "offline" | "idle" | "in_simulation" | "in_call";

export type CallStatus = "pending" | "accepted" | "rejected" | "completed" | "missed";

export type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
export type RuleConditionType = "domain" | "path" | "query_param";

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
          default_pool_id: string | null;
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
          agent_id: string;
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
          display_order: number;
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
          example_loop_video_url: string | null;
          is_default: boolean;
          is_catch_all: boolean;
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

      site_path_rules: {
        Row: {
          id: string;
          site_id: string;
          path_pattern: string;
          pool_id: string;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["site_path_rules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["site_path_rules"]["Insert"]>;
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

export type SitePathRule = Database["public"]["Tables"]["site_path_rules"]["Row"];
export type SitePathRuleInsert = Database["public"]["Tables"]["site_path_rules"]["Insert"];

export type PoolRoutingRule = Database["public"]["Tables"]["pool_routing_rules"]["Row"];
export type PoolRoutingRuleInsert = Database["public"]["Tables"]["pool_routing_rules"]["Insert"];

export type Disposition = Database["public"]["Tables"]["dispositions"]["Row"];
export type DispositionInsert = Database["public"]["Tables"]["dispositions"]["Insert"];

export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type InviteInsert = Database["public"]["Tables"]["invites"]["Insert"];

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

