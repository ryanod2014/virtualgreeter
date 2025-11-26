import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { VideoSequencer } from "./features/simulation/VideoSequencer";
import { LiveCallView } from "./features/webrtc/LiveCallView";
import { useSignaling } from "./features/signaling/useSignaling";
import { useWebRTC } from "./features/webrtc/useWebRTC";
import { useCobrowse } from "./features/cobrowse/useCobrowse";
import type { AgentAssignedPayload } from "@ghost-greeter/domain";

interface WidgetConfig {
  siteId: string;
  serverUrl?: string;
  position?: "bottom-right" | "bottom-left";
  triggerDelay?: number;
}

interface WidgetProps {
  config: WidgetConfig;
}

type WidgetState = "hidden" | "minimized" | "open" | "waiting_for_agent" | "in_call";

export function Widget({ config }: WidgetProps) {
  const [state, setState] = useState<WidgetState>("hidden");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [agent, setAgent] = useState<AgentAssignedPayload["agent"] | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  
  // Media state - starts as muted/off
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);

  // Drag and fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const {
    connect,
    requestCall,
    cancelCall,
    endCall: endSignalingCall,
    isConnected,
    callAccepted,
    visitorId,
    currentCallId,
    socket,
  } = useSignaling({
    serverUrl: config.serverUrl ?? "http://localhost:3001",
    siteId: config.siteId,
    onAgentAssigned: (data) => {
      console.log("[Widget] ✅ Agent assigned:", data.agent.id, data.agent.displayName);
      setAgent(data.agent);
    },
    onAgentReassigned: (data) => {
      const previousName = agent?.displayName ?? "Your assistant";
      const newName = data.newAgent.displayName;
      setHandoffMessage(`${previousName} got pulled away. ${newName} is taking over.`);
      setAgent(data.newAgent);
      // Clear message after 5 seconds
      setTimeout(() => setHandoffMessage(null), 5000);
    },
    onAgentUnavailable: () => {
      // No agents available - hide the widget
      console.log("[Widget] No agents available - hiding widget");
      setAgent(null);
      setState("hidden");
    },
    onCallAccepted: () => setState("in_call"),
    onCallRejected: () => {
      // Agent temporarily unavailable - visitor keeps waiting
      // This shouldn't normally trigger anymore since we queue visitors
      console.log("[Widget] Call rejected - but visitor keeps waiting");
    },
    onCallEnded: () => {
      console.log("[Widget] Call ended - resetting state");
      setState("open");
      // Reset camera/mic state
      setIsCameraOn(false);
      setIsMicOn(false);
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
    },
  });

  // WebRTC connection
  const {
    localStream,
    remoteStream,
    screenStream,
    isConnecting: webrtcConnecting,
    isConnected: webrtcConnected,
    isScreenSharing,
    error: webrtcError,
    endCall: endWebRTCCall,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC({
    socket,
    agentId: agent?.id ?? null,
    isCallAccepted: callAccepted,
  });

  // Co-browsing - streams DOM/mouse/scroll to agent during calls
  useCobrowse({
    socket,
    isInCall: state === "in_call",
  });

  // Listen for page interactions - connect but don't show widget yet
  useEffect(() => {
    if (hasInteracted) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      
      // Connect to signaling server - widget will show when agent is assigned
      connect();
    };

    const events = ["click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [hasInteracted, connect]);

  // Show widget only when an agent is available/assigned
  useEffect(() => {
    if (agent && state === "hidden") {
      // Agent assigned - show widget after delay
      const timer = setTimeout(() => {
        setState("open");
      }, config.triggerDelay ?? 500);
      return () => clearTimeout(timer);
    }
  }, [agent, state, config.triggerDelay]);

  // Update self video when preview stream changes
  useEffect(() => {
    if (selfVideoRef.current && previewStream) {
      selfVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Cleanup preview stream on unmount
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [previewStream]);

  // Sync mic/camera state when call connects (localStream becomes available)
  useEffect(() => {
    if (localStream && state === "in_call") {
      // Check actual track states and sync UI
      const hasEnabledVideo = localStream.getVideoTracks().some(t => t.enabled);
      const hasEnabledAudio = localStream.getAudioTracks().some(t => t.enabled);
      setIsCameraOn(hasEnabledVideo);
      setIsMicOn(hasEnabledAudio);
    }
  }, [localStream, state]);

  // Drag handling - can drag from anywhere except buttons
  const handleDragStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (isFullscreen) return;
    
    // Don't start drag if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('video') || target.closest('.gg-control-btn')) {
      return;
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
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
  }, [isFullscreen]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragRef.current || isFullscreen) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
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
  }, [isDragging, isFullscreen]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Reset position when entering fullscreen
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

  // Toggle camera - requests permission and starts call flow, or toggles during call
  const handleCameraToggle = useCallback(async () => {
    if (!agent) return;

    // During a call, toggle the localStream video tracks
    if (state === "in_call" && localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn(!isCameraOn);
      return;
    }

    if (isCameraOn) {
      // Turn off camera (pre-call)
      if (previewStream) {
        previewStream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      }
      setIsCameraOn(false);
      return;
    }

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isMicOn, // Include audio if mic is already on
      });
      
      setPreviewStream(stream);
      setIsCameraOn(true);
      
      // If mic was already on, update its state with the new stream
      if (isMicOn) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
      
      // Start the call if not already waiting
      if (state === "open") {
        console.log("[Widget] 📞 Starting call flow - agent:", agent?.id, "state:", state);
        setState("waiting_for_agent");
        requestCall(agent.id);
      }
    } catch (err) {
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        // Permission denied - don't show alert, just keep muted state
        console.log("Camera permission denied");
      } else if (error.name === "NotFoundError") {
        console.log("No camera found");
      }
    }
  }, [agent, isCameraOn, isMicOn, previewStream, localStream, state, requestCall]);

  // Toggle mic - requests permission and starts call flow, or toggles during call
  const handleMicToggle = useCallback(async () => {
    if (!agent) return;

    // During a call, toggle the localStream audio tracks
    if (state === "in_call" && localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
      return;
    }

    if (isMicOn) {
      // Turn off mic (pre-call)
      if (previewStream) {
        previewStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      setIsMicOn(false);
      return;
    }

    try {
      // If we already have a stream with video, just add audio
      if (previewStream && isCameraOn) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(track => {
          previewStream.addTrack(track);
        });
        setIsMicOn(true);
      } else {
        // Request mic (and camera if camera is on)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOn,
          audio: true,
        });
        
        setPreviewStream(stream);
        setIsMicOn(true);
        
        // Start the call if not already waiting
        if (state === "open") {
          console.log("[Widget] 📞 Starting call flow (mic) - agent:", agent?.id, "state:", state);
          setState("waiting_for_agent");
          requestCall(agent.id);
        }
      }
    } catch (err) {
      const error = err as DOMException;
      if (error.name === "NotAllowedError") {
        console.log("Microphone permission denied");
      } else if (error.name === "NotFoundError") {
        console.log("No microphone found");
      }
    }
  }, [agent, isMicOn, isCameraOn, previewStream, localStream, state, requestCall]);

  const handleCancelWaiting = useCallback(() => {
    cancelCall();
    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    setIsCameraOn(false);
    setIsMicOn(false);
    setState("open");
  }, [cancelCall, previewStream]);

  const handleEndCall = useCallback(() => {
    // End call via signaling server
    if (currentCallId) {
      endSignalingCall(currentCallId);
    }
    endWebRTCCall();
    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    setIsCameraOn(false);
    setIsMicOn(false);
    setState("open");
  }, [currentCallId, endSignalingCall, endWebRTCCall, previewStream]);

  // Don't render if hidden
  if (state === "hidden") return null;

  const configPosition = config.position ?? "bottom-right";
  
  // Calculate widget style for positioning
  const widgetStyle: Record<string, string> = {};
  if (isFullscreen) {
    // Fullscreen styles handled by CSS class
  } else if (position) {
    // Custom dragged position
    widgetStyle.left = `${position.x}px`;
    widgetStyle.top = `${position.y}px`;
    widgetStyle.right = 'auto';
    widgetStyle.bottom = 'auto';
  }

  return (
    <div 
      ref={widgetRef}
      className={`gg-widget ${configPosition} ${isFullscreen ? 'gg-fullscreen' : ''} ${isDragging ? 'gg-dragging' : ''}`}
      style={widgetStyle}
    >
      {state === "minimized" ? (
        <button className="gg-minimized" onClick={handleExpand}>
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
          {/* Video Area */}
          <div className="gg-video-container">
            {/* Top right controls */}
            <div className="gg-video-controls">
              <button 
                className="gg-video-control-btn" 
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
            />
          ) : (
            <VideoSequencer
              introUrl={agent?.introVideoUrl}
              loopUrl={agent?.loopVideoUrl}
              isLive={false}
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
                  <div className="gg-self-camera-off">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Connecting indicator - overlay on video */}
            {state === "waiting_for_agent" && (
              <div className="gg-waiting-indicator">
                <div className="gg-waiting-spinner" />
                <span>Connecting...</span>
              </div>
            )}

            {/* Agent handoff notification */}
            {handoffMessage && (
              <div className="gg-handoff-message">
                <span>{handoffMessage}</span>
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

          {/* Call Controls - Always visible like a real call interface */}
          <div className="gg-call-controls">
            {/* Mic Toggle */}
            <button
              className={`gg-control-btn ${isMicOn ? "gg-control-on" : "gg-control-off"}`}
              onClick={handleMicToggle}
              disabled={!agent}
              title={isMicOn ? "Mute microphone" : "Unmute microphone"}
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
              title={isCameraOn ? "Turn off camera" : "Turn on camera"}
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
                title={state === "in_call" ? "End call" : "Disconnect"}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
