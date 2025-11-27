import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { VideoSequencer } from "./features/simulation/VideoSequencer";
import { LiveCallView } from "./features/webrtc/LiveCallView";
import { useSignaling } from "./features/signaling/useSignaling";
import { useWebRTC } from "./features/webrtc/useWebRTC";
import { useCobrowse } from "./features/cobrowse/useCobrowse";
import type { AgentAssignedPayload } from "@ghost-greeter/domain";
import { ARIA_LABELS, ANIMATION_TIMING, ERROR_MESSAGES, CONNECTION_TIMING } from "./constants";

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

export function Widget({ config }: WidgetProps) {
  const [state, setState] = useState<WidgetState>("hidden");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [agent, setAgent] = useState<AgentAssignedPayload["agent"] | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Media state - starts as muted/off
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);

  // Drag and fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
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
    isReconnecting,
    callAccepted,
    currentCallId,
    connectionError,
    socket,
  } = useSignaling({
    serverUrl: config.serverUrl ?? "http://localhost:3001",
    orgId: config.orgId,
    onAgentAssigned: (data) => {
      console.log("[Widget] ✅ Agent assigned:", data.agent.id, data.agent.displayName);
      setAgent(data.agent);
    },
    onAgentReassigned: (data) => {
      const previousName = agent?.displayName ?? "Your assistant";
      const newName = data.newAgent.displayName;
      setHandoffMessage(`${previousName} got pulled away. ${newName} is taking over.`);
      setAgent(data.newAgent);

      // Clear message after timeout
      if (handoffTimeoutRef.current) {
        clearTimeout(handoffTimeoutRef.current);
      }
      handoffTimeoutRef.current = setTimeout(() => {
        setHandoffMessage(null);
      }, ANIMATION_TIMING.HANDOFF_MESSAGE_DURATION);
    },
    onAgentUnavailable: () => {
      console.log("[Widget] No agents available - hiding widget");
      setAgent(null);
      setState("hidden");
    },
    onCallAccepted: () => setState("in_call"),
    onCallRejected: () => {
      // Agent temporarily unavailable - visitor keeps waiting
      console.log("[Widget] Call rejected - but visitor keeps waiting");
    },
    onCallEnded: () => {
      console.log("[Widget] Call ended - resetting state");
      setState("open");
      setIsCameraOn(false);
      setIsMicOn(false);
      cleanupPreviewStream();
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

  // Show widget only when an agent is available/assigned
  useEffect(() => {
    if (agent && state === "hidden") {
      const timer = setTimeout(() => {
        if (!isUnmountingRef.current) {
          setState("open");
        }
      }, config.triggerDelay ?? CONNECTION_TIMING.DEFAULT_TRIGGER_DELAY);
      return () => clearTimeout(timer);
    }
  }, [agent, state, config.triggerDelay]);

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
      };

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

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    },
    [isDragging, isFullscreen]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);

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
    setState("open");
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

  // Don't render if hidden
  if (state === "hidden") return null;

  const configPosition = config.position ?? "bottom-right";

  // Calculate widget style for positioning
  const widgetStyle: Record<string, string> = {};
  if (!isFullscreen && position) {
    widgetStyle.left = `${position.x}px`;
    widgetStyle.top = `${position.y}px`;
    widgetStyle.right = "auto";
    widgetStyle.bottom = "auto";
  }

  return (
    <div
      ref={widgetRef}
      className={`gg-widget ${configPosition} ${isFullscreen ? "gg-fullscreen" : ""} ${isDragging ? "gg-dragging" : ""}`}
      style={widgetStyle}
      role="dialog"
      aria-label={ARIA_LABELS.WIDGET}
      aria-modal={isFullscreen}
    >
      {state === "minimized" ? (
        <button
          className="gg-minimized"
          onClick={handleExpand}
          aria-label={ARIA_LABELS.EXPAND}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      ) : (
        <div
          className="gg-container"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* Error Toast */}
          {errorMessage && <ErrorToast message={errorMessage} onDismiss={dismissError} />}

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
            href="https://ghostgreeter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gg-powered-by"
            aria-label="Powered by GhostGreeter"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Powered by <strong>GhostGreeter</strong></span>
          </a>
        </div>
      )}
    </div>
  );
}
