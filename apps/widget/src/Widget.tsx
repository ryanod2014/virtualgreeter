import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { VideoSequencer } from "./features/simulation/VideoSequencer";
import { LiveCallView } from "./features/webrtc/LiveCallView";
import { useSignaling, shouldSkipIntroForAgent, storeWidgetState, clearStoredWidgetState } from "./features/signaling/useSignaling";
import { useWebRTC } from "./features/webrtc/useWebRTC";
import { useCobrowse } from "./features/cobrowse/useCobrowse";
import type { AgentAssignedPayload, AgentUnavailablePayload, OrgPausedPayload, WidgetSettings } from "@ghost-greeter/domain";
import { ARIA_LABELS, ANIMATION_TIMING, ERROR_MESSAGES, CONNECTION_TIMING, SIZE_DIMENSIONS, IDLE_TIMING } from "./constants";

/**
 * Default widget settings (used until server sends actual settings)
 */
const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  size: "medium",
  position: "bottom-right",
  devices: "all",
  trigger_delay: 3,
  auto_hide_delay: null,
  show_minimize_button: false,
  theme: "dark",
};

/**
 * Detect if the current device is mobile based on screen width and touch capability
 */
function isMobileDevice(): boolean {
  // Check screen width (768px is a common mobile breakpoint)
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check for touch capability
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  // Consider it mobile if small screen OR touch-only device
  return isSmallScreen || (hasTouch && !window.matchMedia("(pointer: fine)").matches);
}

/**
 * Unlocks browser audio permission by creating and resuming an AudioContext.
 * Must be called during a user gesture (click/touch/keydown).
 * Returns a promise that resolves when audio is unlocked.
 */
async function unlockAudio(): Promise<boolean> {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    const audioCtx = new AudioContextClass();

    // Resume if suspended (Chrome requires this)
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    // Play a silent buffer to fully unlock on some browsers
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);

    console.log("[Widget] 🔊 Audio permission unlocked");
    return true;
  } catch (err) {
    console.warn("[Widget] Failed to unlock audio:", err);
    return false;
  }
}

interface WidgetConfig {
  orgId: string;
  serverUrl?: string;
  position?: "bottom-right" | "bottom-left";
  triggerDelay?: number;
}

interface WidgetProps {
  config: WidgetConfig;
}

type WidgetState = "hidden" | "minimized" | "open" | "waiting_for_agent" | "call_timeout" | "in_call";

/**
 * ErrorToast - Displays dismissible error messages to the user
 */
function ErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="gg-error-toast" role="alert" aria-live="polite">
      <span>{message}</span>
      <button
        className="gg-error-toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * IdleWarningToast - Displays warning when visitor is about to be disconnected due to inactivity
 */
function IdleWarningToast({
  onStayConnected,
}: {
  onStayConnected: () => void;
}) {
  return (
    <div 
      className="gg-idle-warning-toast" 
      role="alert" 
      aria-live="assertive"
      onClick={onStayConnected}
    >
      <div className="gg-idle-warning-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>Still there? Tap to stay connected</span>
      </div>
    </div>
  );
}

export function Widget({ config }: WidgetProps) {
  const [state, setState] = useState<WidgetState>("hidden");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [agent, setAgent] = useState<AgentAssignedPayload["agent"] | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCompletedIntroSequence, setHasCompletedIntroSequence] = useState(false);
  const [hasHadCall, setHasHadCall] = useState(false); // Track if visitor has had a call (enables minimize after)

  // Widget appearance settings (from server)
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [shouldHideForDevice, setShouldHideForDevice] = useState(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasInteractedRef = useRef(false); // Track if user has interacted with widget
  
  // Track "no agent available" state for missed opportunity tracking
  // When agent is unavailable, we wait for trigger_delay before recording as missed opportunity
  const [unavailableData, setUnavailableData] = useState<AgentUnavailablePayload | null>(null);
  const missedOpportunityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track org paused state - shows "temporarily unavailable" message
  const [orgPausedMessage, setOrgPausedMessage] = useState<string | null>(null);
  
  // Track when visitor connected (from server) to calculate remaining trigger delay
  // This allows widget to reappear correctly when agent becomes available
  const visitorConnectedAtRef = useRef<number>(Date.now());
  
  // Idle warning state - shows toast at 4:30 of inactivity before 5min disconnect
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const idleWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme class to shadow host
  // Needs to run when state changes (widget becomes visible) and when theme changes
  useEffect(() => {
    // Only apply when widget is visible (state !== "hidden")
    if (state === "hidden" || shouldHideForDevice) return;
    
    const theme = widgetSettings.theme ?? "dark";
    
    // Find the shadow host by traversing up from widget ref
    const widgetEl = widgetRef.current;
    if (!widgetEl) return;
    
    // Get the shadow root's host element
    const shadowRoot = widgetEl.getRootNode() as ShadowRoot;
    if (!shadowRoot || !shadowRoot.host) return;
    
    const host = shadowRoot.host;
    
    // Remove existing theme classes
    host.classList.remove("gg-theme-light", "gg-theme-dark", "gg-theme-auto", "gg-theme-liquid-glass");
    
    // Add new theme class
    host.classList.add(`gg-theme-${theme}`);
    
    console.log("[Widget] Applied theme:", theme);
  }, [widgetSettings.theme, state, shouldHideForDevice]);

  // Media state - starts as muted/off
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);

  // Drag and fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  // Track user's dragged position choice (overrides server setting while dragging)
  const [draggedPosition, setDraggedPosition] = useState<WidgetSettings["position"] | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const handoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountingRef = useRef(false);

  /**
   * Show error message to user
   */
  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  /**
   * Dismiss error message
   */
  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  /**
   * Clean up preview stream tracks
   */
  const cleanupPreviewStream = useCallback(() => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => {
        track.stop();
        previewStream.removeTrack(track);
      });
      setPreviewStream(null);
    }
  }, [previewStream]);

  const {
    connect,
    requestCall,
    cancelCall,
    endCall: endSignalingCall,
    trackPageview,
    trackMissedOpportunity,
    isReconnecting,
    callAccepted,
    currentCallId,
    connectionError,
    socket,
  } = useSignaling({
    serverUrl: config.serverUrl ?? "http://localhost:3001",
    orgId: config.orgId,
    onAgentAssigned: (data) => {
      console.log("[Widget] ✅ Agent assigned:", data.agent.id, data.agent.displayName, "settings:", data.widgetSettings);
      setAgent(data.agent);
      
      // Check if we should skip intro (same agent + same video sequence from previous page)
      // This handles the page navigation case where visitor sees same agent with same videos
      const skipIntro = shouldSkipIntroForAgent(data.agent);
      if (skipIntro) {
        setHasCompletedIntroSequence(true);
      } else {
        // Different agent or different video sequence - reset to play from beginning
        setHasCompletedIntroSequence(false);
      }
      
      // Clear any pending missed opportunity tracking (agent became available)
      setUnavailableData(null);
      if (missedOpportunityTimerRef.current) {
        clearTimeout(missedOpportunityTimerRef.current);
        missedOpportunityTimerRef.current = null;
      }
      
      // Store visitorConnectedAt from server if provided (used for trigger delay calculation)
      // This is set when widget reappears after agent becomes available
      if (data.visitorConnectedAt) {
        visitorConnectedAtRef.current = data.visitorConnectedAt;
        console.log("[Widget] Visitor connected at:", new Date(data.visitorConnectedAt).toISOString());
      }
      
      // Store widget settings from server
      if (data.widgetSettings) {
        setWidgetSettings(data.widgetSettings);
        
        // Check device visibility
        const isMobile = isMobileDevice();
        const devices = data.widgetSettings.devices;
        const shouldHide = 
          (devices === "desktop" && isMobile) || 
          (devices === "mobile" && !isMobile);
        setShouldHideForDevice(shouldHide);
        
        if (shouldHide) {
          console.log("[Widget] Hiding widget - device mismatch:", { devices, isMobile });
        }
      }
    },
    onAgentReassigned: (data) => {
      const previousName = agent?.displayName ?? "Your assistant";
      const newName = data.newAgent.displayName;
      setHandoffMessage(`${previousName} got pulled away. ${newName} is taking over.`);
      setAgent(data.newAgent);
      
      // Different agent means we should play intro for the new agent
      // Clear stored widget state and reset intro sequence
      clearStoredWidgetState();
      setHasCompletedIntroSequence(false);

      // Clear message after timeout
      if (handoffTimeoutRef.current) {
        clearTimeout(handoffTimeoutRef.current);
      }
      handoffTimeoutRef.current = setTimeout(() => {
        setHandoffMessage(null);
      }, ANIMATION_TIMING.HANDOFF_MESSAGE_DURATION);
    },
    onAgentUnavailable: (data: AgentUnavailablePayload) => {
      console.log("[Widget] No agents available, previousAgent:", data.previousAgentName);
      
      // Clean up any active camera/mic preview (visitor might have started call request)
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      }
      setIsCameraOn(false);
      setIsMicOn(false);
      
      // Clear stored widget state - if agent comes back later, show fresh intro
      clearStoredWidgetState();
      setHasCompletedIntroSequence(false);
      
      // Store the unavailable data - we'll track missed opportunity after trigger_delay
      setUnavailableData(data);
      
      // Also store widget settings in case we need them later (for potential reappearance)
      if (data.widgetSettings) {
        setWidgetSettings(data.widgetSettings);
      }
      
      // If we know the agent's name, show "got pulled away" message before hiding
      if (data.previousAgentName && state !== "hidden") {
        setHandoffMessage(`${data.previousAgentName} got pulled away.`);
        
        // Keep widget visible briefly to show the message, then hide
        if (handoffTimeoutRef.current) {
          clearTimeout(handoffTimeoutRef.current);
        }
        handoffTimeoutRef.current = setTimeout(() => {
          setHandoffMessage(null);
          setAgent(null);
          setState("hidden");
        }, ANIMATION_TIMING.HANDOFF_MESSAGE_DURATION);
      } else {
        // No agent name - just hide immediately
        setAgent(null);
        setState("hidden");
      }
    },
    onOrgPaused: (data: OrgPausedPayload) => {
      console.log("[Widget] ⏸️ Organization is paused:", data.message);
      setOrgPausedMessage(data.message);
      // Clear any active state
      setAgent(null);
      setState("hidden");
    },
    onCallAccepted: () => setState("in_call"),
    onCallRejected: () => {
      // Agent temporarily unavailable - visitor keeps waiting
      console.log("[Widget] Call rejected - but visitor keeps waiting");
    },
    onCallEnded: () => {
      console.log("[Widget] Call ended - minimizing widget");
      setState("minimized");
      setIsCameraOn(false);
      setIsMicOn(false);
      setHasHadCall(true); // Enable minimize button for future interactions
      cleanupPreviewStream();
    },
    // Call reconnection (after page navigation)
    onCallReconnecting: () => {
      console.log("[Widget] 🔄 Reconnecting to call...");
      // Could show a "Reconnecting..." UI state here if desired
    },
    onCallReconnected: (data) => {
      console.log("[Widget] ✅ Call reconnected:", data.callId);
      // Set agent profile if provided (needed for WebRTC)
      if (data.agent) {
        setAgent(data.agent);
      }
      setState("in_call");
      setHasHadCall(true);
      // WebRTC will be re-established now that callAccepted is true and agent is set
    },
    onCallReconnectFailed: (data) => {
      console.log("[Widget] ❌ Call reconnect failed:", data.reason);
      setState("minimized");
      showError(data.message);
    },
    onConnectionError: (error) => {
      showError(error);
    },
    onReconnecting: (attempt) => {
      console.log(`[Widget] Reconnecting... attempt ${attempt}`);
    },
    onReconnected: () => {
      dismissError();
    },
  });

  // WebRTC connection
  const {
    localStream,
    remoteStream,
    isConnecting: webrtcConnecting,
    isConnected: webrtcConnected,
    error: webrtcError,
    endCall: endWebRTCCall,
    retryConnection: retryWebRTCConnection,
  } = useWebRTC({
    socket,
    agentId: agent?.id ?? null,
    isCallAccepted: callAccepted,
    onConnectionTimeout: () => {
      showError(ERROR_MESSAGES.CALL_TIMEOUT);
    },
  });

  // Show WebRTC errors to user
  useEffect(() => {
    if (webrtcError) {
      showError(webrtcError);
    }
  }, [webrtcError, showError]);

  // Show connection errors to user
  useEffect(() => {
    if (connectionError) {
      showError(connectionError);
    }
  }, [connectionError, showError]);

  // Co-browsing - streams DOM/mouse/scroll to agent during calls
  useCobrowse({
    socket,
    isInCall: state === "in_call",
  });

  // Connect to signaling server immediately on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Listen for first click to unlock audio
  useEffect(() => {
    if (hasInteracted) return;

    const handleInteraction = async () => {
      if (isUnmountingRef.current) return;
      setHasInteracted(true);
      const unlocked = await unlockAudio();
      setAudioUnlocked(unlocked);
    };

    const events = ["click", "touchstart", "scroll"] as const;
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [hasInteracted]);

  // Show widget only when an agent is available/assigned (and device is not hidden)
  useEffect(() => {
    if (agent && state === "hidden" && !shouldHideForDevice) {
      // Calculate remaining trigger delay based on how long visitor has been on page
      // If visitor has been waiting longer than trigger_delay, show immediately
      const triggerDelayMs = (widgetSettings.trigger_delay ?? 3) * 1000;
      const timeOnPage = Date.now() - visitorConnectedAtRef.current;
      const remainingDelayMs = Math.max(0, triggerDelayMs - timeOnPage);
      
      console.log("[Widget] Trigger delay calculation:", {
        triggerDelayMs,
        timeOnPage,
        remainingDelayMs,
        showImmediately: remainingDelayMs === 0,
      });
      
      const timer = setTimeout(() => {
        if (!isUnmountingRef.current) {
          setState("open");
          // Track pageview when widget popup is shown to visitor
          trackPageview(agent.id);
        }
      }, remainingDelayMs);
      return () => clearTimeout(timer);
    }
  }, [agent, state, widgetSettings.trigger_delay, trackPageview, shouldHideForDevice]);

  // Track missed opportunities when trigger_delay passes but no agent was available
  // This ensures we only count visitors who would have actually seen the widget
  useEffect(() => {
    // Only track if we have unavailable data and no agent
    if (!unavailableData || agent) {
      // Clear timer if agent becomes available
      if (missedOpportunityTimerRef.current) {
        clearTimeout(missedOpportunityTimerRef.current);
        missedOpportunityTimerRef.current = null;
      }
      return;
    }

    const delayMs = (unavailableData.widgetSettings.trigger_delay ?? 3) * 1000;
    
    console.log("[Widget] Starting missed opportunity timer:", delayMs, "ms");
    
    missedOpportunityTimerRef.current = setTimeout(() => {
      if (!isUnmountingRef.current && !agent) {
        console.log("[Widget] ⚠️ Trigger delay passed with no agent - tracking missed opportunity");
        trackMissedOpportunity(
          unavailableData.widgetSettings.trigger_delay ?? 3,
          unavailableData.poolId
        );
        // Clear the data so we don't track again
        setUnavailableData(null);
      }
    }, delayMs);

    return () => {
      if (missedOpportunityTimerRef.current) {
        clearTimeout(missedOpportunityTimerRef.current);
        missedOpportunityTimerRef.current = null;
      }
    };
  }, [unavailableData, agent, trackMissedOpportunity]);

  // Auto-hide timer - minimizes widget after delay if no interaction
  useEffect(() => {
    // Only run when widget is open and auto_hide_delay is set
    if (state !== "open" || widgetSettings.auto_hide_delay === null) {
      // Clear any existing timer
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
      return;
    }

    // Don't auto-hide if user has already interacted
    if (userHasInteractedRef.current) {
      return;
    }

    // Start auto-hide timer (auto_hide_delay is in seconds)
    const delayMs = widgetSettings.auto_hide_delay * 1000;
    
    autoHideTimerRef.current = setTimeout(() => {
      if (!isUnmountingRef.current && state === "open" && !userHasInteractedRef.current) {
        console.log("[Widget] Auto-hiding after", widgetSettings.auto_hide_delay, "seconds");
        setState("minimized");
      }
    }, delayMs);

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [state, widgetSettings.auto_hide_delay]);

  /**
   * Reset idle warning timer - called when user interacts with the page
   */
  const resetIdleTimer = useCallback(() => {
    // Clear any existing warning
    setShowIdleWarning(false);
    
    // Clear existing timers
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }
    if (idleWarningDismissTimerRef.current) {
      clearTimeout(idleWarningDismissTimerRef.current);
      idleWarningDismissTimerRef.current = null;
    }
    
    // Only start idle timer when widget is open (not in call, not minimized)
    if (state !== "open" || !agent) {
      return;
    }
    
    // Start new timer for idle warning at 4:30
    idleWarningTimerRef.current = setTimeout(() => {
      if (!isUnmountingRef.current && state === "open") {
        console.log("[Widget] ⚠️ Showing idle warning at 4:30");
        setShowIdleWarning(true);
        
        // Auto-dismiss warning after duration (if user doesn't interact)
        idleWarningDismissTimerRef.current = setTimeout(() => {
          setShowIdleWarning(false);
        }, IDLE_TIMING.WARNING_DURATION);
      }
    }, IDLE_TIMING.WARNING_THRESHOLD);
  }, [state, agent]);

  /**
   * Handle "stay connected" click from idle warning toast
   */
  const handleStayConnected = useCallback(() => {
    console.log("[Widget] 👆 User clicked stay connected - resetting idle timer");
    setShowIdleWarning(false);
    
    // Clear dismiss timer
    if (idleWarningDismissTimerRef.current) {
      clearTimeout(idleWarningDismissTimerRef.current);
      idleWarningDismissTimerRef.current = null;
    }
    
    // Reset idle timer to start fresh
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Idle warning timer - shows toast at 4:30 of inactivity
  useEffect(() => {
    // Start idle timer when widget opens with an agent
    if (state === "open" && agent) {
      resetIdleTimer();
    } else {
      // Clear timers when widget is not in open state
      if (idleWarningTimerRef.current) {
        clearTimeout(idleWarningTimerRef.current);
        idleWarningTimerRef.current = null;
      }
      if (idleWarningDismissTimerRef.current) {
        clearTimeout(idleWarningDismissTimerRef.current);
        idleWarningDismissTimerRef.current = null;
      }
      setShowIdleWarning(false);
    }
    
    return () => {
      if (idleWarningTimerRef.current) {
        clearTimeout(idleWarningTimerRef.current);
      }
      if (idleWarningDismissTimerRef.current) {
        clearTimeout(idleWarningDismissTimerRef.current);
      }
    };
  }, [state, agent, resetIdleTimer]);

  // Listen for page interactions to reset idle timer
  useEffect(() => {
    if (state !== "open" || !agent) return;
    
    const handlePageInteraction = () => {
      // Hide warning immediately if showing
      if (showIdleWarning) {
        setShowIdleWarning(false);
      }
      // Reset the idle timer
      resetIdleTimer();
    };
    
    // Track common interaction events on the page
    window.addEventListener("click", handlePageInteraction, { passive: true });
    window.addEventListener("scroll", handlePageInteraction, { passive: true });
    window.addEventListener("keydown", handlePageInteraction, { passive: true });
    window.addEventListener("touchstart", handlePageInteraction, { passive: true });
    window.addEventListener("mousemove", handlePageInteraction, { passive: true, once: true });
    
    return () => {
      window.removeEventListener("click", handlePageInteraction);
      window.removeEventListener("scroll", handlePageInteraction);
      window.removeEventListener("keydown", handlePageInteraction);
      window.removeEventListener("touchstart", handlePageInteraction);
      window.removeEventListener("mousemove", handlePageInteraction);
    };
  }, [state, agent, showIdleWarning, resetIdleTimer]);

  // Update self video when preview stream changes
  useEffect(() => {
    if (selfVideoRef.current && previewStream) {
      selfVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;

      // Clean up handoff timeout
      if (handoffTimeoutRef.current) {
        clearTimeout(handoffTimeoutRef.current);
      }

      // Clean up auto-hide timer
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }

      // Clean up idle warning timers
      if (idleWarningTimerRef.current) {
        clearTimeout(idleWarningTimerRef.current);
      }
      if (idleWarningDismissTimerRef.current) {
        clearTimeout(idleWarningDismissTimerRef.current);
      }

      // Clean up preview stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewStream]);

  // Sync mic/camera state when call connects
  useEffect(() => {
    if (localStream && state === "in_call") {
      const hasEnabledVideo = localStream.getVideoTracks().some((t) => t.enabled);
      const hasEnabledAudio = localStream.getAudioTracks().some((t) => t.enabled);
      setIsCameraOn(hasEnabledVideo);
      setIsMicOn(hasEnabledAudio);
    }
  }, [localStream, state]);

  // Call request timeout - if waiting too long, show timeout UI
  useEffect(() => {
    if (state === "waiting_for_agent") {
      // Clear any existing timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      
      // Set timeout for call request
      callTimeoutRef.current = setTimeout(() => {
        if (!isUnmountingRef.current) {
          console.log("[Widget] Call request timeout - showing retry UI");
          setState("call_timeout");
        }
      }, CONNECTION_TIMING.CALL_REQUEST_TIMEOUT);

      return () => {
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
      };
    } else if (state === "in_call") {
      // Clear timeout when call is accepted
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    }
  }, [state]);

  // Drag handling
  const handleDragStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (isFullscreen) return;

      // Don't start drag if clicking on a button or interactive element
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("video") || target.closest(".gg-control-btn")) {
        return;
      }

      const touch = "touches" in e ? e.touches[0] : null;
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

      const widget = widgetRef.current;
      if (!widget) return;

      const rect = widget.getBoundingClientRect();

      dragRef.current = {
        startX: clientX,
        startY: clientY,
        initialX: rect.left,
        initialY: rect.top,
        currentX: rect.left,
        currentY: rect.top,
      };

      // OPTIMIZATION: Apply initial transform immediately and clear CSS positioning
      widget.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      widget.style.left = '0';
      widget.style.top = '0';
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';

      setIsDragging(true);
    },
    [isFullscreen]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragRef.current || isFullscreen) return;

      const touch = "touches" in e ? e.touches[0] : null;
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;

      const newX = dragRef.current.initialX + deltaX;
      const newY = dragRef.current.initialY + deltaY;

      // Keep widget within viewport bounds
      const widget = widgetRef.current;
      if (!widget) return;

      const maxX = window.innerWidth - widget.offsetWidth;
      const maxY = window.innerHeight - widget.offsetHeight;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      // OPTIMIZATION: Update DOM directly with transform3d instead of React state
      // This avoids React re-renders on every frame during drag for 60fps smoothness
      widget.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

      // Store current position for handleDragEnd
      dragRef.current.currentX = clampedX;
      dragRef.current.currentY = clampedY;
    },
    [isDragging, isFullscreen]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);

    // Snap to nearest preset position
    const widget = widgetRef.current;
    const currentDragRef = dragRef.current;
    if (!widget || !currentDragRef) {
      dragRef.current = null;
      return;
    }

    const widgetWidth = widget.offsetWidth;
    const widgetHeight = widget.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Use position from dragRef (set during drag) instead of React state
    const currentX = currentDragRef.currentX;
    const currentY = currentDragRef.currentY;

    // Calculate center of widget
    const widgetCenterX = currentX + widgetWidth / 2;
    const widgetCenterY = currentY + widgetHeight / 2;

    // Define snap positions (with 20px margin like CSS)
    const margin = 20;
    const snapPositions: { 
      name: WidgetSettings["position"]; 
      centerX: number; 
      centerY: number;
      targetX: number;
      targetY: number;
    }[] = [
      { 
        name: "top-left", 
        centerX: margin + widgetWidth / 2, 
        centerY: margin + widgetHeight / 2,
        targetX: margin,
        targetY: margin,
      },
      { 
        name: "top-right", 
        centerX: viewportWidth - margin - widgetWidth / 2, 
        centerY: margin + widgetHeight / 2,
        targetX: viewportWidth - margin - widgetWidth,
        targetY: margin,
      },
      { 
        name: "bottom-left", 
        centerX: margin + widgetWidth / 2, 
        centerY: viewportHeight - margin - widgetHeight / 2,
        targetX: margin,
        targetY: viewportHeight - margin - widgetHeight,
      },
      { 
        name: "bottom-right", 
        centerX: viewportWidth - margin - widgetWidth / 2, 
        centerY: viewportHeight - margin - widgetHeight / 2,
        targetX: viewportWidth - margin - widgetWidth,
        targetY: viewportHeight - margin - widgetHeight,
      },
      { 
        name: "center", 
        centerX: viewportWidth / 2, 
        centerY: viewportHeight / 2,
        targetX: (viewportWidth - widgetWidth) / 2,
        targetY: (viewportHeight - widgetHeight) / 2,
      },
    ];

    // Find nearest position
    let nearestPosition = snapPositions[0];
    let minDistance = Infinity;

    for (const pos of snapPositions) {
      const distance = Math.sqrt(
        Math.pow(widgetCenterX - pos.centerX, 2) + Math.pow(widgetCenterY - pos.centerY, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestPosition = pos;
      }
    }

    // Start snapping animation - keep current position class until animation completes
    setIsSnapping(true);
    
    // Safety check (snapPositions always has 5 elements, but satisfies TypeScript)
    if (!nearestPosition) {
      setIsSnapping(false);
      dragRef.current = null;
      return;
    }
    
    const targetPos = nearestPosition;
    
    // Wait for snapping class to be applied before animating
    requestAnimationFrame(() => {
      // Force a reflow to ensure transition is active
      widgetRef.current?.offsetHeight;
      
      // OPTIMIZATION: Animate to target using transform3d for GPU acceleration
      if (widgetRef.current) {
        widgetRef.current.style.transform = `translate3d(${targetPos.targetX}px, ${targetPos.targetY}px, 0)`;
      }
      
      // After animation completes, update the position class and clear transform
      setTimeout(() => {
        setDraggedPosition(targetPos.name);
        setPosition(null);
        // Reset inline styles so CSS positioning takes over
        if (widgetRef.current) {
          widgetRef.current.style.transform = '';
          widgetRef.current.style.left = '';
          widgetRef.current.style.top = '';
          widgetRef.current.style.right = '';
          widgetRef.current.style.bottom = '';
        }
        setIsSnapping(false);
        dragRef.current = null;
      }, 220); // Match the 0.2s CSS transition
    });
  }, []);

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      // OPTIMIZATION: passive: false needed to prevent scroll during drag
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd, { passive: true });

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    if (!isFullscreen) {
      setPosition(null);
    }
  }, [isFullscreen]);

  const handleMinimize = useCallback(() => {
    setState("minimized");
    setIsFullscreen(false);
  }, []);

  const handleExpand = useCallback(() => {
    setState("open");
  }, []);

  // Toggle camera
  const handleCameraToggle = useCallback(async () => {
    if (!agent) return;

    // During a call, toggle the localStream video tracks
    if (state === "in_call" && localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn(!isCameraOn);
      return;
    }

    if (isCameraOn) {
      // Turn off camera (pre-call)
      previewStream?.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsCameraOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isMicOn,
      });

      setPreviewStream(stream);
      setIsCameraOn(true);

      if (isMicOn) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      // Start the call if not already waiting
      if (state === "open") {
        console.log("[Widget] 📞 Starting call flow - agent:", agent?.id);
        setState("waiting_for_agent");
        requestCall(agent.id);
      }
    } catch (err) {
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        showError(ERROR_MESSAGES.CAMERA_DENIED);
      } else if (error.name === "NotFoundError") {
        showError(ERROR_MESSAGES.NO_CAMERA);
      } else {
        showError(ERROR_MESSAGES.MEDIA_ERROR);
      }
    }
  }, [agent, isCameraOn, isMicOn, previewStream, localStream, state, requestCall, showError]);

  // Toggle mic
  const handleMicToggle = useCallback(async () => {
    if (!agent) return;

    // During a call, toggle the localStream audio tracks
    if (state === "in_call" && localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
      return;
    }

    if (isMicOn) {
      // Turn off mic (pre-call)
      previewStream?.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsMicOn(false);
      return;
    }

    try {
      if (previewStream && isCameraOn) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach((track) => {
          previewStream.addTrack(track);
        });
        setIsMicOn(true);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOn,
          audio: true,
        });

        setPreviewStream(stream);
        setIsMicOn(true);

        // Start the call if not already waiting
        if (state === "open") {
          console.log("[Widget] 📞 Starting call flow (mic) - agent:", agent?.id);
          setState("waiting_for_agent");
          requestCall(agent.id);
        }
      }
    } catch (err) {
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        showError(ERROR_MESSAGES.MIC_DENIED);
      } else if (error.name === "NotFoundError") {
        showError(ERROR_MESSAGES.NO_MIC);
      } else {
        showError(ERROR_MESSAGES.MEDIA_ERROR);
      }
    }
  }, [agent, isMicOn, isCameraOn, previewStream, localStream, state, requestCall, showError]);

  const handleCancelWaiting = useCallback(() => {
    cancelCall();
    cleanupPreviewStream();
    setIsCameraOn(false);
    setIsMicOn(false);
    setState("open");
  }, [cancelCall, cleanupPreviewStream]);

  // Retry call after timeout
  const handleRetryCall = useCallback(() => {
    if (!agent) return;
    
    console.log("[Widget] 🔄 Retrying call request");
    setState("waiting_for_agent");
    requestCall(agent.id);
  }, [agent, requestCall]);

  // Go back to widget after timeout (without keeping media)
  const handleCancelTimeout = useCallback(() => {
    cancelCall();
    cleanupPreviewStream();
    setIsCameraOn(false);
    setIsMicOn(false);
    setState("open");
  }, [cancelCall, cleanupPreviewStream]);

  const handleEndCall = useCallback(() => {
    if (currentCallId) {
      endSignalingCall(currentCallId);
    }
    endWebRTCCall();
    cleanupPreviewStream();
    setIsCameraOn(false);
    setIsMicOn(false);
    setHasHadCall(true); // Enable minimize button for future interactions
    setState("minimized");
  }, [currentCallId, endSignalingCall, endWebRTCCall, cleanupPreviewStream]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (state === "open" || state === "in_call") {
          handleMinimize();
        }
      }
    },
    [isFullscreen, state, handleMinimize]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show org paused message if organization is paused
  if (orgPausedMessage) {
    return (
      <div
        ref={widgetRef}
        className="gg-widget bottom-right gg-theme-dark gg-org-paused"
        role="status"
        aria-label="Service temporarily unavailable"
      >
        <div className="gg-org-paused-container">
          <div className="gg-org-paused-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p className="gg-org-paused-message">{orgPausedMessage}</p>
        </div>
      </div>
    );
  }

  // Don't render if hidden or if device should be hidden
  if (state === "hidden" || shouldHideForDevice) return null;

  // Use dragged position if user has dragged, otherwise use server widget settings
  // When minimized, don't apply center positioning (it uses transform which breaks fixed positioning)
  const widgetPosition = state === "minimized" 
    ? "bottom-right" 
    : (draggedPosition ?? widgetSettings.position ?? "bottom-right");
  const widgetSize = widgetSettings.size ?? "medium";
  const dims = SIZE_DIMENSIONS[widgetSize];

  // Calculate widget style for positioning and apply size CSS variables
  const widgetStyle: Record<string, string> = {
    // Size-specific CSS variables
    "--gg-widget-width": `${dims.widgetWidth}px`,
    "--gg-border-radius": `${dims.borderRadius}px`,
    "--gg-border-radius-sm": `${dims.borderRadiusSm}px`,
    "--gg-control-size": `${dims.controlButtonSize}px`,
    "--gg-self-view-size": `${dims.selfViewSize}px`,
    "--gg-self-view-size-fs": `${dims.selfViewSizeFullscreen}px`,
    "--gg-video-control-size": `${dims.videoControlButtonSize}px`,
    "--gg-minimized-size": `${dims.minimizedButtonSize}px`,
    "--gg-agent-name-size": `${dims.agentNameSize}px`,
    "--gg-agent-status-size": `${dims.agentStatusSize}px`,
  };
  
  if (!isFullscreen && position) {
    widgetStyle.left = `${position.x}px`;
    widgetStyle.top = `${position.y}px`;
    widgetStyle.right = "auto";
    widgetStyle.bottom = "auto";
    widgetStyle.transform = "none"; // Override center's translate(-50%, -50%)
  }

  // Mark user interaction when they interact with the widget
  const markUserInteraction = () => {
    if (!userHasInteractedRef.current) {
      userHasInteractedRef.current = true;
      // Clear auto-hide timer when user interacts
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    }
  };

  // Get theme class for the widget
  const themeClass = `gg-theme-${widgetSettings.theme ?? "dark"}`;

  return (
    <div
      ref={widgetRef}
      className={`gg-widget ${widgetPosition} ${themeClass} ${isFullscreen ? "gg-fullscreen" : ""} ${isDragging ? "gg-dragging" : ""} ${isSnapping ? "gg-snapping" : ""}`}
      style={widgetStyle}
      role="dialog"
      aria-label={ARIA_LABELS.WIDGET}
      aria-modal={isFullscreen}
      onClick={markUserInteraction}
    >
      {state === "minimized" ? (
        <button
          className="gg-minimized gg-minimized-bottom-right"
          onClick={handleExpand}
          aria-label={ARIA_LABELS.EXPAND}
        >
          {agent?.loopVideoUrl ? (
            <video
              className="gg-minimized-video"
              src={agent.loopVideoUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : agent?.avatarUrl ? (
            <img 
              src={agent.avatarUrl} 
              alt={agent.displayName ?? "Agent"} 
              className="gg-minimized-avatar"
            />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
          <span className="gg-minimized-pulse" />
        </button>
      ) : (
        <div
          className="gg-container"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* Error Toast */}
          {errorMessage && <ErrorToast message={errorMessage} onDismiss={dismissError} />}

          {/* Idle Warning Toast */}
          {showIdleWarning && <IdleWarningToast onStayConnected={handleStayConnected} />}

          {/* Video Area */}
          <div className="gg-video-container">
            {/* Top right controls */}
            <div className="gg-video-controls">
              <button
                className="gg-video-control-btn"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? ARIA_LABELS.EXIT_FULLSCREEN : ARIA_LABELS.FULLSCREEN}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
              {/* Minimize button - shown when enabled in settings OR after a call has ended */}
              {(widgetSettings.show_minimize_button || hasHadCall) && !isFullscreen && (
                <button
                  className="gg-video-control-btn"
                  onClick={handleMinimize}
                  aria-label={ARIA_LABELS.MINIMIZE}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Agent Video - Main view */}
            {state === "in_call" ? (
              <LiveCallView
                localStream={localStream}
                remoteStream={remoteStream}
                isConnecting={webrtcConnecting}
                isConnected={webrtcConnected}
                error={webrtcError}
                onRetry={retryWebRTCConnection}
              />
            ) : (
              <VideoSequencer
                waveUrl={agent?.waveVideoUrl}
                introUrl={agent?.introVideoUrl}
                loopUrl={agent?.loopVideoUrl}
                isLive={false}
                audioUnlocked={audioUnlocked}
                onError={showError}
                skipToLoop={hasCompletedIntroSequence}
                onIntroComplete={() => {
                  setHasCompletedIntroSequence(true);
                  // Store widget state for page navigation persistence
                  // If visitor navigates to page with same agent + same videos, skip intro
                  if (agent) {
                    storeWidgetState({
                      agentId: agent.id,
                      waveVideoUrl: agent.waveVideoUrl ?? null,
                      introVideoUrl: agent.introVideoUrl ?? null,
                      loopVideoUrl: agent.loopVideoUrl ?? null,
                      introCompleted: true,
                    });
                  }
                }}
              />
            )}

            {/* Self-view Picture-in-Picture */}
            {state !== "in_call" && (
              <div className={`gg-self-view ${isCameraOn ? "gg-self-view-active" : ""}`}>
                {isCameraOn && previewStream ? (
                  <video
                    ref={selfVideoRef}
                    className="gg-self-video"
                    autoPlay
                    playsInline
                    muted
                    aria-label="Your camera preview"
                  />
                ) : (
                  <div className="gg-self-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                {/* Camera off indicator */}
                {!isCameraOn && (
                  <div className="gg-self-camera-off" aria-label="Camera is off">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Connecting indicator */}
            {state === "waiting_for_agent" && (
              <div className="gg-waiting-indicator" role="status" aria-live="polite">
                <div className="gg-waiting-spinner" />
                <span>Connecting you to {agent?.displayName ?? "an agent"}...</span>
              </div>
            )}

            {/* Call timeout - connection taking too long */}
            {state === "call_timeout" && (
              <div className="gg-timeout-overlay" role="alert" aria-live="assertive">
                <div className="gg-timeout-content">
                  <div className="gg-timeout-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <h3 className="gg-timeout-title">Taking longer than usual</h3>
                  <p className="gg-timeout-message">
                    Your internet connection might be slow. Let's try again!
                  </p>
                  <div className="gg-timeout-actions">
                    <button 
                      className="gg-btn gg-btn-primary" 
                      onClick={handleRetryCall}
                    >
                      Try Again
                    </button>
                    <button 
                      className="gg-btn gg-btn-secondary" 
                      onClick={handleCancelTimeout}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Agent handoff notification */}
            {handoffMessage && (
              <div className="gg-handoff-message" role="status" aria-live="polite">
                <span>{handoffMessage}</span>
              </div>
            )}

            {/* Reconnecting indicator */}
            {isReconnecting && (
              <div className="gg-waiting-indicator" role="status" aria-live="polite">
                <div className="gg-waiting-spinner" />
                <span>Reconnecting...</span>
              </div>
            )}
          </div>

          {/* Agent Info */}
          <div className="gg-agent-info">
            <div className="gg-agent-name">{agent?.displayName ?? "Support Team"}</div>
            <div className="gg-agent-status">
              <svg width="12" height="12" viewBox="0 0 12 12" fill={agent ? "currentColor" : "#888"}>
                <circle cx="6" cy="6" r="6" />
              </svg>
              {!agent
                ? "Connecting..."
                : state === "in_call"
                  ? "Live with you"
                  : state === "waiting_for_agent"
                    ? "Connecting..."
                    : "Joined you live"}
            </div>
          </div>

          {/* Call Controls */}
          <div className="gg-call-controls" role="toolbar" aria-label="Call controls">
            {/* Mic Toggle */}
            <button
              className={`gg-control-btn ${isMicOn ? "gg-control-on" : "gg-control-off"}`}
              onClick={handleMicToggle}
              disabled={!agent}
              aria-label={isMicOn ? ARIA_LABELS.MIC_ON : ARIA_LABELS.MIC_OFF}
              aria-pressed={isMicOn}
            >
              {isMicOn ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            {/* Camera Toggle */}
            <button
              className={`gg-control-btn ${isCameraOn ? "gg-control-on" : "gg-control-off"}`}
              onClick={handleCameraToggle}
              disabled={!agent}
              aria-label={isCameraOn ? ARIA_LABELS.CAMERA_ON : ARIA_LABELS.CAMERA_OFF}
              aria-pressed={isCameraOn}
            >
              {isCameraOn ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>

            {/* End Call / Disconnect */}
            {(state === "waiting_for_agent" || state === "in_call") && (
              <button
                className="gg-control-btn gg-control-end"
                onClick={state === "in_call" ? handleEndCall : handleCancelWaiting}
                aria-label={state === "in_call" ? ARIA_LABELS.END_CALL : ARIA_LABELS.CANCEL_CALL}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
              </button>
            )}
          </div>

          {/* Powered By Footer */}
          <a
            href="https://greetnow.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gg-powered-by"
            aria-label="Powered by GreetNow"
          >
            <span>Powered by</span>
            <span className="gg-logo">
              <span className="gg-logo-greet">GREET</span>
              <span className="gg-logo-now">NOW</span>
              <span className="gg-logo-dot"></span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
