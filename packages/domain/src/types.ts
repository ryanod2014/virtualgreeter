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
  lastActivityAt: number; // Last heartbeat/activity timestamp for staleness detection
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
  matchedPoolId?: string | null; // Pool ID matched via path routing (for missed opportunity tracking)
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
  /** Token for reconnecting to this call after server restart */
  reconnectToken?: string;
}

// ----------------------------------------------------------------------------
// SOCKET EVENT TYPES
// ----------------------------------------------------------------------------

/** Client-to-Server events emitted by the Widget */
export interface WidgetToServerEvents {
  "visitor:join": (data: VisitorJoinPayload) => void;
  "visitor:interaction": (data: VisitorInteractionPayload) => void;
  "widget:pageview": (data: WidgetPageviewPayload) => void;
  "widget:missed_opportunity": (data: WidgetMissedOpportunityPayload) => void;
  "call:request": (data: CallRequestPayload) => void;
  "call:cancel": (data: CallCancelPayload) => void;
  "call:end": (data: CallEndPayload) => void;
  "call:heartbeat": (data: CallHeartbeatPayload) => void;
  "call:reconnect": (data: CallReconnectPayload) => void;
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
  "agent:away": (data: AgentAwayPayload, ack?: (response: StatusAckPayload) => void) => void;
  "agent:back": (ack?: (response: StatusAckPayload) => void) => void;
  "call:accept": (data: CallAcceptPayload) => void;
  "call:reject": (data: CallRejectPayload) => void;
  "call:end": (data: CallEndPayload) => void;
  "call:heartbeat": (data: CallHeartbeatPayload) => void;
  "call:reconnect": (data: CallReconnectPayload) => void;
  "webrtc:signal": (data: WebRTCSignalPayload) => void;
  "agent:logout": () => void;
  "heartbeat": (data: { timestamp: number }) => void;
}

/** Server-to-Client events sent to the Widget */
export interface ServerToWidgetEvents {
  "agent:assigned": (data: AgentAssignedPayload) => void;
  "agent:reassigned": (data: AgentReassignedPayload) => void;
  "agent:unavailable": (data: AgentUnavailablePayload) => void;
  "call:accepted": (data: CallAcceptedPayload) => void;
  "call:rejected": (data: CallRejectedPayload) => void;
  "call:ended": (data: CallEndedPayload) => void;
  "call:reconnecting": (data: CallReconnectingPayload) => void;
  "call:reconnected": (data: CallReconnectedPayload) => void;
  "call:reconnect_failed": (data: CallReconnectFailedPayload) => void;
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
  "call:reconnecting": (data: CallReconnectingPayload) => void;
  "call:reconnected": (data: CallReconnectedPayload) => void;
  "call:reconnect_failed": (data: CallReconnectFailedPayload) => void;
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

export interface WidgetMissedOpportunityPayload {
  triggerDelaySeconds: number; // The delay that was configured when this was triggered
  poolId: string | null; // Pool ID if matched to one
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

/** Heartbeat during active call - sent periodically by both parties */
export interface CallHeartbeatPayload {
  callId: string;
  reconnectToken: string;
}

/** Request to reconnect to an interrupted call */
export interface CallReconnectPayload {
  reconnectToken: string;
  role: "agent" | "visitor";
}

export interface AgentAwayPayload {
  reason: "idle" | "manual";
}

/** Acknowledgment payload for status change operations */
export interface StatusAckPayload {
  success: boolean;
  status: AgentStatus;
  error?: string;
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
  /** When visitor first connected - used to calculate remaining trigger delay when widget reappears */
  visitorConnectedAt?: number;
}

export interface AgentReassignedPayload {
  previousAgentId: string;
  newAgent: Pick<AgentProfile, "id" | "displayName" | "avatarUrl" | "waveVideoUrl" | "introVideoUrl" | "connectVideoUrl" | "loopVideoUrl">;
  reason: "agent_busy" | "agent_offline" | "agent_away";
  widgetSettings?: WidgetSettings; // Optional - only included if settings changed
}

export interface AgentUnavailablePayload {
  visitorId: string;
  widgetSettings: WidgetSettings; // Always send settings so widget can track trigger_delay
  poolId: string | null; // Pool ID if matched to one
  previousAgentName?: string; // Name of agent who became unavailable (for "got pulled away" message)
  reason?: "agent_away" | "agent_offline" | "rna_timeout" | "no_agents"; // Why the agent became unavailable
}

export interface CallAcceptedPayload {
  callId: string;
  agentId: string;
  /** Token for reconnecting to this call after page navigation or disconnect */
  reconnectToken: string;
}

export interface CallRejectedPayload {
  requestId: string;
  reason?: string;
}

export interface CallEndedPayload {
  callId: string;
  reason: "agent_ended" | "visitor_ended" | "timeout" | "error" | "reconnect_failed" | "max_duration";
  message?: string;
}

/** Server notifying that a call is being reconnected */
export interface CallReconnectingPayload {
  callId: string;
  message: string;
  /** How many seconds until reconnect times out */
  timeoutSeconds: number;
}

/** Server notifying that both parties have successfully reconnected */
export interface CallReconnectedPayload {
  callId: string;
  /** New reconnect token for future reconnections */
  reconnectToken: string;
  /** The ID of the other party (agent or visitor) */
  peerId: string;
  /** Agent profile (only sent to visitor) - needed for WebRTC re-establishment */
  agent?: Pick<AgentProfile, "id" | "displayName" | "avatarUrl" | "waveVideoUrl" | "introVideoUrl" | "connectVideoUrl" | "loopVideoUrl">;
}

/** Server notifying that reconnection failed (timed out or one party didn't reconnect) */
export interface CallReconnectFailedPayload {
  callId: string;
  reason: "timeout" | "other_party_disconnected" | "error";
  message: string;
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
  isCompressed?: boolean; // If true, html is base64-encoded gzipped data
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

