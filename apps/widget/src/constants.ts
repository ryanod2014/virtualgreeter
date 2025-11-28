/**
 * Widget Constants
 * 
 * All magic numbers and timing values are documented here for maintainability.
 * These values have been tuned based on UX research and browser behavior.
 */

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

/**
 * Video timing thresholds
 */
export const VIDEO_TIMING = {
  /**
   * Minimum time (ms) that must pass after intro starts before we accept "ended" event.
   * Prevents spurious ended events from triggering premature transition to loop.
   * 500ms chosen because even the shortest valid intro would be at least this long.
   */
  INTRO_MIN_PLAY_DURATION: 500,

  /**
   * Tolerance (seconds) for detecting if video has reached the end.
   * If currentTime is within this many seconds of duration, we consider it "at end".
   * 0.5s accounts for browser timing imprecision and buffering delays.
   */
  END_DETECTION_TOLERANCE: 0.5,

  /**
   * Delay (ms) before retrying intro video play after initial failure.
   * Short delay allows browser to recover from transient audio context issues.
   */
  INTRO_RETRY_DELAY: 100,
} as const;

/**
 * Co-browsing timing
 */
export const COBROWSE_TIMING = {
  /**
   * Interval (ms) between periodic DOM snapshots.
   * 2000ms balances real-time feel with bandwidth usage.
   * More frequent snapshots didn't improve perceived responsiveness.
   */
  SNAPSHOT_INTERVAL: 2000,

  /**
   * Throttle (ms) for mouse position updates.
   * 50ms = ~20fps which is smooth enough for cursor following.
   * Higher rate didn't improve UX but increased bandwidth significantly.
   */
  MOUSE_THROTTLE: 50,

  /**
   * Throttle (ms) for scroll position updates.
   * 100ms = 10fps, sufficient for scroll sync since scrolling is inherently chunky.
   */
  SCROLL_THROTTLE: 100,

  /**
   * Delay (ms) before capturing DOM after form input.
   * Allows the DOM to settle after input changes before snapshotting.
   */
  INPUT_CAPTURE_DELAY: 100,

  /**
   * Delay (ms) before capturing DOM after window resize.
   * Allows layout to complete before taking snapshot.
   */
  RESIZE_CAPTURE_DELAY: 200,
} as const;

/**
 * Animation and transition timing
 */
export const ANIMATION_TIMING = {
  /**
   * Duration (ms) for widget slide-up entrance animation.
   */
  WIDGET_ENTRANCE: 400,

  /**
   * Duration (ms) for handoff message display before auto-dismiss.
   */
  HANDOFF_MESSAGE_DURATION: 5000,

  /**
   * Delay (ms) after call ends before checking for waiting visitors.
   * Allows UI to update before potentially showing next call.
   */
  POST_CALL_QUEUE_CHECK_DELAY: 1000,
} as const;

/**
 * Connection timing
 */
export const CONNECTION_TIMING = {
  /**
   * Timeout (ms) for WebRTC connection to establish.
   * If no connection after this time, show error and allow retry.
   */
  WEBRTC_CONNECTION_TIMEOUT: 30000,

  /**
   * Timeout (ms) for call request to be answered by agent.
   * If no agent answers within this time, show timeout UI with retry option.
   * 45s allows for RNA timeout (30s) + some buffer.
   */
  CALL_REQUEST_TIMEOUT: 45000,

  /**
   * Delay (ms) between WebSocket reconnection attempts.
   * Uses exponential backoff: attempt * this value.
   */
  RECONNECT_BASE_DELAY: 1000,

  /**
   * Maximum number of WebSocket reconnection attempts.
   */
  MAX_RECONNECT_ATTEMPTS: 5,

  /**
   * Delay (ms) before showing widget after agent is assigned.
   * Allows time for video to preload.
   */
  DEFAULT_TRIGGER_DELAY: 500,
} as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================

/**
 * Widget dimensions by size
 */
export const SIZE_DIMENSIONS = {
  small: {
    widgetWidth: 260,
    selfViewSize: 60,
    selfViewSizeFullscreen: 160,
    controlButtonSize: 40,
    videoControlButtonSize: 28,
    minimizedButtonSize: 48,
    borderRadius: 16,
    borderRadiusSm: 10,
    agentNameSize: 14,
    agentStatusSize: 12,
  },
  medium: {
    widgetWidth: 320,
    selfViewSize: 80,
    selfViewSizeFullscreen: 200,
    controlButtonSize: 48,
    videoControlButtonSize: 32,
    minimizedButtonSize: 60,
    borderRadius: 20,
    borderRadiusSm: 12,
    agentNameSize: 16,
    agentStatusSize: 13,
  },
  large: {
    widgetWidth: 380,
    selfViewSize: 100,
    selfViewSizeFullscreen: 240,
    controlButtonSize: 56,
    videoControlButtonSize: 36,
    minimizedButtonSize: 72,
    borderRadius: 24,
    borderRadiusSm: 14,
    agentNameSize: 18,
    agentStatusSize: 14,
  },
} as const;

/**
 * Widget dimensions (medium size is default)
 */
export const DIMENSIONS = {
  /** Default widget width in pixels */
  WIDGET_WIDTH: SIZE_DIMENSIONS.medium.widgetWidth,

  /** Self-view PiP dimensions (normal mode) */
  SELF_VIEW_SIZE: SIZE_DIMENSIONS.medium.selfViewSize,

  /** Self-view PiP dimensions (fullscreen mode) */
  SELF_VIEW_SIZE_FULLSCREEN: SIZE_DIMENSIONS.medium.selfViewSizeFullscreen,

  /** Control button size in pixels */
  CONTROL_BUTTON_SIZE: SIZE_DIMENSIONS.medium.controlButtonSize,

  /** Video control button size in pixels */
  VIDEO_CONTROL_BUTTON_SIZE: SIZE_DIMENSIONS.medium.videoControlButtonSize,

  /** Minimized button size in pixels */
  MINIMIZED_BUTTON_SIZE: SIZE_DIMENSIONS.medium.minimizedButtonSize,
} as const;

/**
 * Z-index values (widget uses maximum to overlay everything)
 */
export const Z_INDEX = {
  /** Widget container - maximum possible z-index */
  WIDGET: 2147483647,

  /** Video controls overlay */
  VIDEO_CONTROLS: 10,

  /** Connecting overlay */
  CONNECTING_OVERLAY: 15,

  /** Handoff message */
  HANDOFF_MESSAGE: 20,
} as const;

// =============================================================================
// ERROR MESSAGES
// Friendly, non-technical messages that blame the network, not the user or system
// =============================================================================

export const ERROR_MESSAGES = {
  // Camera/mic permissions - guide user to fix
  CAMERA_DENIED: "We need camera access for video. Click the 🔒 icon in your browser's address bar to allow it.",
  MIC_DENIED: "We need microphone access. Click the 🔒 icon in your browser's address bar to allow it.",
  NO_CAMERA: "We couldn't find a camera on this device. Try connecting one and refreshing the page.",
  NO_MIC: "We couldn't find a microphone on this device.",
  MEDIA_ERROR: "Having trouble accessing your camera. Try closing other apps that might be using it.",
  
  // Connection issues - blame the internet, offer hope
  CONNECTION_FAILED: "Your internet connection seems unstable. We'll keep trying to connect you.",
  WEBRTC_FAILED: "Video connection dropped. This usually happens with slow internet – let's try again!",
  WEBSOCKET_DISCONNECTED: "Connection hiccup – reconnecting you now...",
  CALL_TIMEOUT: "Connection is taking longer than usual. Your internet might be slow.",
  
  // Availability - friendly and helpful
  NO_AGENTS: "Our team is busy helping others right now. Please try again in a moment!",
  AGENT_BUSY: "They're finishing up another call. Hang tight – usually just a few seconds!",
  
  // System errors - vague but reassuring
  INVALID_CONFIG: "Something went wrong on our end. Please refresh and try again.",
  UNKNOWN_ERROR: "Oops! Something didn't work. Let's try that again.",
} as const;

// =============================================================================
// CONFIGURATION DEFAULTS
// =============================================================================

export const CONFIG_DEFAULTS = {
  position: "bottom-right" as const,
  triggerDelay: CONNECTION_TIMING.DEFAULT_TRIGGER_DELAY,
  serverUrl: "http://localhost:3001",
} as const;

// =============================================================================
// ARIA LABELS
// =============================================================================

export const ARIA_LABELS = {
  WIDGET: "Live support widget",
  MINIMIZE: "Minimize support widget",
  EXPAND: "Expand support widget",
  FULLSCREEN: "Toggle fullscreen",
  EXIT_FULLSCREEN: "Exit fullscreen",
  MIC_ON: "Mute microphone",
  MIC_OFF: "Unmute microphone",
  CAMERA_ON: "Turn off camera",
  CAMERA_OFF: "Turn on camera",
  END_CALL: "End call",
  CANCEL_CALL: "Cancel call request",
} as const;

