// ============================================================================
// GHOST-GREETER CONSTANTS
// ============================================================================

/** Socket.io event names */
export const SOCKET_EVENTS = {
  // Widget -> Server
  VISITOR_JOIN: "visitor:join",
  VISITOR_INTERACTION: "visitor:interaction",
  VISITOR_DISCONNECT: "visitor:disconnect",
  
  // Dashboard -> Server
  AGENT_LOGIN: "agent:login",
  AGENT_LOGOUT: "agent:logout",
  AGENT_STATUS: "agent:status",
  
  // Shared
  CALL_REQUEST: "call:request",
  CALL_ACCEPT: "call:accept",
  CALL_REJECT: "call:reject",
  CALL_CANCEL: "call:cancel",
  CALL_END: "call:end",
  WEBRTC_SIGNAL: "webrtc:signal",
  
  // Co-browsing (Widget -> Server -> Dashboard)
  COBROWSE_SNAPSHOT: "cobrowse:snapshot",
  COBROWSE_MOUSE: "cobrowse:mouse",
  COBROWSE_SCROLL: "cobrowse:scroll",
  COBROWSE_SELECTION: "cobrowse:selection",
  
  // Server -> Widget
  AGENT_ASSIGNED: "agent:assigned",
  AGENT_REASSIGNED: "agent:reassigned",
  CALL_ACCEPTED: "call:accepted",
  CALL_REJECTED: "call:rejected",
  CALL_ENDED: "call:ended",
  
  // Server -> Dashboard
  LOGIN_SUCCESS: "login:success",
  CALL_INCOMING: "call:incoming",
  CALL_CANCELLED: "call:cancelled",
  CALL_STARTED: "call:started",
  STATS_UPDATE: "stats:update",
  
  // Shared
  ERROR: "error",
} as const;

/** Default widget configuration */
export const DEFAULT_WIDGET_CONFIG = {
  position: "bottom-right" as const,
  triggerDelay: 500,
  primaryColor: "#6366f1",
  accentColor: "#22c55e",
  borderRadius: 16,
  showAgentName: true,
};

/** Timing constants */
export const TIMING = {
  /** How long to wait for agent response before auto-rejecting call */
  CALL_REQUEST_TIMEOUT: 30_000,
  /** How long before considering a connection stale */
  CONNECTION_TIMEOUT: 60_000,
  /** Heartbeat interval for socket connections */
  HEARTBEAT_INTERVAL: 25_000,
  /** Delay before widget appears after page interaction */
  DEFAULT_TRIGGER_DELAY: 500,
  /** Video preload buffer time in ms */
  VIDEO_PRELOAD_BUFFER: 2000,
} as const;

/** Error codes */
export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  
  // Agent errors
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  AGENT_UNAVAILABLE: "AGENT_UNAVAILABLE",
  AGENT_ALREADY_CONNECTED: "AGENT_ALREADY_CONNECTED",
  
  // Visitor errors
  VISITOR_NOT_FOUND: "VISITOR_NOT_FOUND",
  VISITOR_ALREADY_IN_CALL: "VISITOR_ALREADY_IN_CALL",
  
  // Call errors
  CALL_NOT_FOUND: "CALL_NOT_FOUND",
  CALL_ALREADY_ACCEPTED: "CALL_ALREADY_ACCEPTED",
  CALL_TIMEOUT: "CALL_TIMEOUT",
  
  // WebRTC errors
  WEBRTC_CONNECTION_FAILED: "WEBRTC_CONNECTION_FAILED",
  WEBRTC_PEER_NOT_FOUND: "WEBRTC_PEER_NOT_FOUND",
  
  // General errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
} as const;

/** Video states */
export const VIDEO_STATE = {
  IDLE: "idle",
  LOADING: "loading",
  PLAYING_INTRO: "playing_intro",
  PLAYING_LOOP: "playing_loop",
  LIVE_CALL: "live_call",
  ERROR: "error",
} as const;

/** Agent status display labels */
export const AGENT_STATUS_LABELS = {
  offline: "Offline",
  idle: "Available",
  in_simulation: "Broadcasting",
  in_call: "In Call",
} as const;

/** Plan limits */
export const PLAN_LIMITS = {
  free: {
    maxAgents: 1,
    maxSites: 1,
    maxSimultaneousSimulations: 5,
  },
  starter: {
    maxAgents: 3,
    maxSites: 3,
    maxSimultaneousSimulations: 25,
  },
  pro: {
    maxAgents: 10,
    maxSites: 10,
    maxSimultaneousSimulations: 100,
  },
  enterprise: {
    maxAgents: -1, // unlimited
    maxSites: -1,
    maxSimultaneousSimulations: -1,
  },
} as const;

