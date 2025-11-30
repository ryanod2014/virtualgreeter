// ============================================================================
// GHOST-GREETER DOMAIN TYPES
// ============================================================================
// This is the SOURCE OF TRUTH for all shared types across the monorepo.
// All apps must import types from this package.
// ============================================================================

// ----------------------------------------------------------------------------
// AGENT TYPES
// ----------------------------------------------------------------------------

/** Agent availability status */
export type AgentStatus = "offline" | "idle" | "in_simulation" | "in_call" | "away";

/** Agent profile stored in database */
export interface AgentProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  waveVideoUrl: string | null;
  introVideoUrl: string;
  connectVideoUrl: string | null;
  loopVideoUrl: string;
  status: AgentStatus;
  maxSimultaneousSimulations: number;
  createdAt: string;
  updatedAt: string;
}

/** Agent state tracked by the signaling server */
export interface AgentState {
  agentId: string;
  socketId: string;
  profile: AgentProfile;
  currentSimulations: string[]; // visitor IDs watching this agent's simulation
  currentCallVisitorId: string | null;
  connectedAt: number;
}

// ----------------------------------------------------------------------------
// VISITOR TYPES
// ----------------------------------------------------------------------------

/** Visitor session state */
export type VisitorState = "browsing" | "watching_simulation" | "call_requested" | "in_call";

/** Visitor location resolved from IP address */
export interface VisitorLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
}

/** Visitor tracked by the signaling server */
export interface VisitorSession {
  visitorId: string;
  socketId: string;
  assignedAgentId: string | null;
  state: VisitorState;
  orgId: string;
  pageUrl: string;
  connectedAt: number;
  interactedAt: number | null;
  ipAddress: string | null;
  location: VisitorLocation | null;
}

// ----------------------------------------------------------------------------
// CALL TYPES
// ----------------------------------------------------------------------------

/** Call request from visitor to agent */
export interface CallRequest {
  requestId: string;
  visitorId: string;
  agentId: string;
  orgId: string;
  pageUrl: string;
  requestedAt: number;
}

/** Active call between visitor and agent */
export interface ActiveCall {
  callId: string;
  callLogId?: string | null; // Database call_logs.id for disposition updates
  visitorId: string;
  agentId: string;
  startedAt: number;
  endedAt: number | null;
}

// ----------------------------------------------------------------------------
// SOCKET EVENT TYPES
// ----------------------------------------------------------------------------

/** Client-to-Server events emitted by the Widget */
export interface WidgetToServerEvents {
  "visitor:join": (data: VisitorJoinPayload) => void;
  "visitor:interaction": (data: VisitorInteractionPayload) => void;
  "widget:pageview": (data: WidgetPageviewPayload) => void;
  "call:request": (data: CallRequestPayload) => void;
  "call:cancel": (data: CallCancelPayload) => void;
  "call:end": (data: CallEndPayload) => void;
  "webrtc:signal": (data: WebRTCSignalPayload) => void;
  "cobrowse:snapshot": (data: CobrowseSnapshotPayload) => void;
  "cobrowse:mouse": (data: CobrowseMousePayload) => void;
  "cobrowse:scroll": (data: CobrowseScrollPayload) => void;
  "cobrowse:selection": (data: CobrowseSelectionPayload) => void;
  "visitor:disconnect": () => void;
}

/** Client-to-Server events emitted by the Dashboard */
export interface DashboardToServerEvents {
  "agent:login": (data: AgentLoginPayload) => void;
  "agent:status": (data: AgentStatusPayload) => void;
  "agent:away": (data: AgentAwayPayload) => void;
  "agent:back": () => void;
  "call:accept": (data: CallAcceptPayload) => void;
  "call:reject": (data: CallRejectPayload) => void;
  "call:end": (data: CallEndPayload) => void;
  "webrtc:signal": (data: WebRTCSignalPayload) => void;
  "agent:logout": () => void;
}

/** Server-to-Client events sent to the Widget */
export interface ServerToWidgetEvents {
  "agent:assigned": (data: AgentAssignedPayload) => void;
  "agent:reassigned": (data: AgentReassignedPayload) => void;
  "call:accepted": (data: CallAcceptedPayload) => void;
  "call:rejected": (data: CallRejectedPayload) => void;
  "call:ended": (data: CallEndedPayload) => void;
  "webrtc:signal": (data: WebRTCSignalPayload) => void;
  "error": (data: ErrorPayload) => void;
}

/** Server-to-Client events sent to the Dashboard */
export interface ServerToDashboardEvents {
  "login:success": (data: LoginSuccessPayload) => void;
  "call:incoming": (data: CallIncomingPayload) => void;
  "call:cancelled": (data: CallCancelledPayload) => void;
  "call:started": (data: CallStartedPayload) => void;
  "call:ended": (data: CallEndedPayload) => void;
  "call:rna_timeout": (data: CallRNATimeoutPayload) => void;
  "agent:marked_away": (data: AgentMarkedAwayPayload) => void;
  "webrtc:signal": (data: WebRTCSignalPayload) => void;
  "cobrowse:snapshot": (data: CobrowseSnapshotPayload & { visitorId: string }) => void;
  "cobrowse:mouse": (data: CobrowseMousePayload & { visitorId: string }) => void;
  "cobrowse:scroll": (data: CobrowseScrollPayload & { visitorId: string }) => void;
  "cobrowse:selection": (data: CobrowseSelectionPayload & { visitorId: string }) => void;
  "stats:update": (data: StatsUpdatePayload) => void;
  "error": (data: ErrorPayload) => void;
}

// ----------------------------------------------------------------------------
// EVENT PAYLOADS
// ----------------------------------------------------------------------------

// Widget -> Server Payloads
export interface VisitorJoinPayload {
  orgId: string;
  pageUrl: string;
  visitorId?: string; // Optional for returning visitors
}

export interface VisitorInteractionPayload {
  interactionType: "click" | "scroll" | "mousemove";
  timestamp: number;
}

export interface WidgetPageviewPayload {
  agentId: string;
}

export interface CallRequestPayload {
  agentId: string;
}

export interface CallCancelPayload {
  requestId: string;
}

// Dashboard -> Server Payloads
export interface AgentLoginPayload {
  agentId: string;
  token: string; // Supabase JWT for verification
  profile: {
    displayName: string;
    avatarUrl: string | null;
    waveVideoUrl: string | null;
    introVideoUrl: string | null;
    connectVideoUrl: string | null;
    loopVideoUrl: string | null;
  };
}

export interface AgentStatusPayload {
  status: AgentStatus;
}

export interface CallAcceptPayload {
  requestId: string;
}

export interface CallRejectPayload {
  requestId: string;
  reason?: string;
}

export interface CallEndPayload {
  callId: string;
}

export interface AgentAwayPayload {
  reason: "idle" | "manual";
}

// Shared Payloads
export interface WebRTCSignalPayload {
  targetId: string; // visitorId or agentId
  signal: unknown; // SimplePeer signal data
}

// Widget Settings (re-export for convenience)
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
}

// Server -> Widget Payloads
export interface AgentAssignedPayload {
  agent: Pick<AgentProfile, "id" | "displayName" | "avatarUrl" | "waveVideoUrl" | "introVideoUrl" | "connectVideoUrl" | "loopVideoUrl">;
  visitorId: string;
  widgetSettings: WidgetSettings;
}

export interface AgentReassignedPayload {
  previousAgentId: string;
  newAgent: Pick<AgentProfile, "id" | "displayName" | "avatarUrl" | "waveVideoUrl" | "introVideoUrl" | "connectVideoUrl" | "loopVideoUrl">;
  reason: "agent_busy" | "agent_offline" | "agent_away";
  widgetSettings?: WidgetSettings; // Optional - only included if settings changed
}

export interface CallAcceptedPayload {
  callId: string;
  agentId: string;
}

export interface CallRejectedPayload {
  requestId: string;
  reason?: string;
}

export interface CallEndedPayload {
  callId: string;
  reason: "agent_ended" | "visitor_ended" | "timeout" | "error";
}

// Server -> Dashboard Payloads
export interface LoginSuccessPayload {
  agentState: AgentState;
}

export interface CallIncomingPayload {
  request: CallRequest;
  visitor: Pick<VisitorSession, "visitorId" | "pageUrl" | "connectedAt" | "location">;
}

export interface CallCancelledPayload {
  requestId: string;
}

export interface CallStartedPayload {
  call: ActiveCall;
  visitor: Pick<VisitorSession, "visitorId" | "pageUrl">;
}

export interface StatsUpdatePayload {
  poolVisitors: number; // All active page views in the agent's pool(s)
}

/** Payload when server marks agent as away due to RNA timeout */
export interface CallRNATimeoutPayload {
  requestId: string;
  visitorId: string;
  reason: "ring_no_answer";
}

/** Payload when agent is marked away by the server */
export interface AgentMarkedAwayPayload {
  reason: "idle" | "ring_no_answer";
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

// Co-browsing Payloads
export interface CobrowseSnapshotPayload {
  html: string;
  url: string;
  title: string;
  viewport: { width: number; height: number };
  timestamp: number;
}

export interface CobrowseMousePayload {
  x: number;
  y: number;
  timestamp: number;
}

export interface CobrowseScrollPayload {
  scrollX: number;
  scrollY: number;
  timestamp: number;
}

export interface CobrowseSelectionPayload {
  text: string;
  rect: { x: number; y: number; width: number; height: number } | null;
  timestamp: number;
}

// ----------------------------------------------------------------------------
// SITE / ORGANIZATION TYPES
// ----------------------------------------------------------------------------

/** Site configuration for embedding the widget */
export interface Site {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  widgetConfig: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

/** Widget appearance and behavior configuration */
export interface WidgetConfig {
  position: "bottom-right" | "bottom-left";
  triggerDelay: number; // ms after interaction to show widget
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  showAgentName: boolean;
  customCss?: string;
}

/** Organization (B2B customer) */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  maxAgents: number;
  maxSites: number;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// DATABASE TYPES (Supabase)
// ----------------------------------------------------------------------------

/** Database table names */
export type TableName = 
  | "organizations"
  | "sites"
  | "agent_profiles"
  | "call_logs"
  | "visitor_sessions";

/** Insert type for agent profiles */
export type AgentProfileInsert = Omit<AgentProfile, "id" | "createdAt" | "updatedAt">;

/** Update type for agent profiles */
export type AgentProfileUpdate = Partial<Omit<AgentProfile, "id" | "userId" | "createdAt" | "updatedAt">>;

// ----------------------------------------------------------------------------
// API RESPONSE TYPES
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

