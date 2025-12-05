import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type { Socket } from "socket.io-client";
import type { ServerToWidgetEvents, WidgetToServerEvents } from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { CONNECTION_TIMING, ERROR_MESSAGES } from "../../constants";

interface UseWebRTCOptions {
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
  agentId: string | null;
  isCallAccepted: boolean;
  onConnectionTimeout?: () => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isScreenSharing: boolean;
  error: string | null;
  endCall: () => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
  retryConnection: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:greetnow.metered.live:80" },
  {
    urls: "turn:greetnow.metered.live:80?transport=udp",
    username: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
    credential: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
  },
  {
    urls: "turn:greetnow.metered.live:80?transport=tcp",
    username: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
    credential: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
  },
  {
    urls: "turn:greetnow.metered.live:443?transport=tcp",
    username: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
    credential: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
  },
  {
    urls: "turns:greetnow.metered.live:5349?transport=tcp",
    username: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
    credential: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
  },
];

// Type for signals we might receive
type SignalData = RTCSessionDescriptionInit | { type: "candidate"; candidate: RTCIceCandidateInit };

// Max ICE restart attempts before showing error
const MAX_ICE_RESTART_ATTEMPTS = 3;

export function useWebRTC({
  socket,
  agentId,
  isCallAccepted,
  onConnectionTimeout,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSendersRef = useRef<RTCRtpSender[]>([]);
  const pendingSignalsRef = useRef<SignalData[]>([]);
  const isInitializingRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountingRef = useRef(false);
  const iceRestartAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);

  // Store options in ref to avoid stale closures
  const onConnectionTimeoutRef = useRef(onConnectionTimeout);
  onConnectionTimeoutRef.current = onConnectionTimeout;

  /**
   * Clear any pending connection timeout
   */
  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  /**
   * Start connection timeout timer
   */
  const startConnectionTimeout = useCallback(() => {
    clearConnectionTimeout();
    
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isUnmountingRef.current && isConnecting && !isConnected) {
        console.error("[WebRTC] Connection timeout - no response from agent");
        setError(ERROR_MESSAGES.WEBRTC_FAILED);
        setIsConnecting(false);
        onConnectionTimeoutRef.current?.();
      }
    }, CONNECTION_TIMING.WEBRTC_CONNECTION_TIMEOUT);
  }, [clearConnectionTimeout, isConnecting, isConnected]);

  /**
   * Stop all tracks in a media stream safely
   */
  const stopStreamTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        stream.removeTrack(track);
      });
    }
  }, []);

  /**
   * Clean up all resources
   */
  const cleanup = useCallback(() => {
    clearConnectionTimeout();

    // Close peer connection
    if (peerRef.current) {
      // Remove event handlers before closing to prevent spurious events
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.oniceconnectionstatechange = null;
      
      try {
        peerRef.current.close();
      } catch (e) {
        // Ignore errors when closing already-closed connection
      }
      peerRef.current = null;
    }

    // Stop local stream
    stopStreamTracks(localStreamRef.current);
    localStreamRef.current = null;

    // Stop screen stream
    stopStreamTracks(screenStreamRef.current);
    screenStreamRef.current = null;

    // Clear pending signals and refs
    screenSendersRef.current = [];
    pendingSignalsRef.current = [];
    isInitializingRef.current = false;
    iceRestartAttemptsRef.current = 0;
    isReconnectingRef.current = false;

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsConnecting(false);
    setIsConnected(false);
    setIsReconnecting(false);
    setIsScreenSharing(false);
    setError(null);
  }, [clearConnectionTimeout, stopStreamTracks]);

  /**
   * Perform ICE restart when connection fails or disconnects
   */
  const performIceRestart = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || !socket || !agentId) {
      console.log("[WebRTC] Cannot perform ICE restart - missing peer or socket");
      return;
    }

    iceRestartAttemptsRef.current += 1;
    const attempt = iceRestartAttemptsRef.current;

    console.log(`[WebRTC] ICE restart attempt ${attempt}/${MAX_ICE_RESTART_ATTEMPTS}`);

    if (attempt > MAX_ICE_RESTART_ATTEMPTS) {
      console.error("[WebRTC] Max ICE restart attempts reached, giving up");
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      setError(ERROR_MESSAGES.CONNECTION_FAILED);
      return;
    }

    isReconnectingRef.current = true;
    setIsReconnecting(true);
    setError(null);

    try {
      // Create new offer with ICE restart flag
      // Note: Visitor can also initiate ICE restart by sending a new offer
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      console.log(`[WebRTC] Sending ICE restart offer (attempt ${attempt})`);
      socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
        targetId: agentId,
        signal: offer,
      });
    } catch (err) {
      console.error("[WebRTC] ICE restart failed:", err);
      if (attempt >= MAX_ICE_RESTART_ATTEMPTS) {
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setError(ERROR_MESSAGES.CONNECTION_FAILED);
      }
    }
  }, [socket, agentId]);

  /**
   * Process a signal (offer or ICE candidate) from the agent
   */
  const processSignal = useCallback(async (pc: RTCPeerConnection, signal: SignalData) => {
    try {
      if (signal.type === "offer") {
        console.log("[WebRTC] Processing offer from agent");
        await pc.setRemoteDescription(new RTCSessionDescription(signal));

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket && agentId) {
          socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: agentId,
            signal: answer,
          });
          console.log("[WebRTC] Sent answer to agent");
        }
      } else if (signal.type === "candidate" && "candidate" in signal) {
        console.log("[WebRTC] Processing ICE candidate from agent");
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error("[WebRTC] Error processing signal:", err);
      // Don't set error state for ICE candidate failures - they're often transient
      if (signal.type === "offer") {
        setError(ERROR_MESSAGES.WEBRTC_FAILED);
      }
    }
  }, [socket, agentId]);

  /**
   * Initialize the WebRTC call (visitor is NOT the initiator - responds to agent)
   */
  const initializeCall = useCallback(async () => {
    if (!socket || !agentId || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;
    setIsConnecting(true);
    setError(null);

    // Start connection timeout
    startConnectionTimeout();

    try {
      // Get local media with error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (mediaError) {
        clearConnectionTimeout();
        const err = mediaError as DOMException;
        
        let errorMessage: string;
        if (err.name === "NotAllowedError") {
          errorMessage = ERROR_MESSAGES.CAMERA_DENIED;
        } else if (err.name === "NotFoundError") {
          errorMessage = ERROR_MESSAGES.NO_CAMERA;
        } else if (err.name === "NotReadableError") {
          errorMessage = "Camera or microphone is being used by another application.";
        } else {
          errorMessage = `${ERROR_MESSAGES.MEDIA_ERROR} ${err.message}`;
        }
        
        setError(errorMessage);
        setIsConnecting(false);
        isInitializingRef.current = false;
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = pc;

      // Add local tracks to connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind);
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
          setIsConnecting(false);
          clearConnectionTimeout();
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && agentId) {
          console.log("[WebRTC] Sending ICE candidate to agent");
          socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: agentId,
            signal: { type: "candidate", candidate: event.candidate.toJSON() },
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[WebRTC] Connection state:", state);
        
        switch (state) {
          case "connected":
            console.log("[WebRTC] Connection established successfully");
            setIsConnected(true);
            setIsConnecting(false);
            isReconnectingRef.current = false;
            setIsReconnecting(false);
            clearConnectionTimeout();
            // Reset restart attempts on successful connection
            iceRestartAttemptsRef.current = 0;
            break;
          case "disconnected":
            // Temporary disconnection - attempt ICE restart
            console.warn("[WebRTC] Connection temporarily disconnected, attempting ICE restart");
            performIceRestart();
            break;
          case "failed":
            // Connection failed - attempt ICE restart
            console.error("[WebRTC] Connection failed, attempting ICE restart");
            performIceRestart();
            break;
          case "closed":
            // Connection was closed intentionally
            break;
        }
      };

      // Handle ICE connection state for more granular feedback
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[WebRTC] ICE connection state:", state);
        
        switch (state) {
          case "connected":
          case "completed":
            // ICE connected successfully
            isReconnectingRef.current = false;
            setIsReconnecting(false);
            iceRestartAttemptsRef.current = 0;
            break;
          case "disconnected":
            // ICE temporarily disconnected - may recover automatically
            console.warn("[WebRTC] ICE temporarily disconnected");
            break;
          case "failed":
            // ICE failed - trigger restart if not already doing so
            console.error("[WebRTC] ICE connection failed");
            if (!isReconnectingRef.current) {
              performIceRestart();
            }
            break;
        }
      };

      // Process any pending signals that arrived before peer was created
      if (pendingSignalsRef.current.length > 0) {
        console.log(`[WebRTC] Processing ${pendingSignalsRef.current.length} pending signals`);
        for (const signal of pendingSignalsRef.current) {
          await processSignal(pc, signal);
        }
        pendingSignalsRef.current = [];
      }
    } catch (err) {
      console.error("[WebRTC] Failed to initialize:", err);
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.WEBRTC_FAILED);
      setIsConnecting(false);
      isInitializingRef.current = false;
      clearConnectionTimeout();
    }
  }, [socket, agentId, processSignal, startConnectionTimeout, clearConnectionTimeout, performIceRestart]);

  /**
   * Retry connection after failure
   */
  const retryConnection = useCallback(() => {
    cleanup();
    // Small delay before retrying
    setTimeout(() => {
      if (isCallAccepted && agentId && !isUnmountingRef.current) {
        initializeCall();
      }
    }, 500);
  }, [cleanup, isCallAccepted, agentId, initializeCall]);

  // Listen for incoming signals from agent
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data: { targetId: string; signal: SignalData }) => {
      console.log("[WebRTC] Received signal from agent, type:", data.signal.type);

      if (peerRef.current) {
        await processSignal(peerRef.current, data.signal);
      } else {
        // Queue signal for later if peer isn't ready yet
        console.log("[WebRTC] Queuing signal - peer not ready yet");
        pendingSignalsRef.current.push(data.signal);
      }
    };

    socket.on(SOCKET_EVENTS.WEBRTC_SIGNAL, handleSignal as (data: unknown) => void);

    return () => {
      socket.off(SOCKET_EVENTS.WEBRTC_SIGNAL, handleSignal as (data: unknown) => void);
    };
  }, [socket, processSignal]);

  // Initialize call when accepted
  useEffect(() => {
    if (isCallAccepted && agentId && !peerRef.current && !isInitializingRef.current) {
      initializeCall();
    }
  }, [isCallAccepted, agentId, initializeCall]);

  // Cleanup when call ends
  useEffect(() => {
    if (!isCallAccepted) {
      // Reset initializing flag when call is no longer accepted
      isInitializingRef.current = false;
      pendingSignalsRef.current = [];

      // Only run full cleanup if we have an active peer connection
      if (peerRef.current) {
        cleanup();
      }
    }
  }, [isCallAccepted, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  /**
   * End the call and clean up
   */
  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async (): Promise<boolean> => {
    if (!peerRef.current || isScreenSharing) {
      return false;
    }

    try {
      // Request screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);

      // Add screen share tracks to peer connection
      const pc = peerRef.current;
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        screenSendersRef.current.push(sender);

        // Handle user stopping screen share via browser UI
        track.onended = () => {
          stopScreenShare();
        };
      });

      // Renegotiate connection
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket && agentId) {
        socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
          targetId: agentId,
          signal: offer,
        });
        console.log("[WebRTC] Sent renegotiation offer for screen share");
      }

      setIsScreenSharing(true);
      return true;
    } catch (err) {
      console.error("[WebRTC] Screen share failed:", err);
      return false;
    }
  }, [socket, agentId, isScreenSharing]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(() => {
    if (!peerRef.current || !isScreenSharing) {
      return;
    }

    // Remove screen share tracks from peer connection
    screenSendersRef.current.forEach((sender) => {
      try {
        peerRef.current?.removeTrack(sender);
      } catch (e) {
        // Track may already be removed
      }
    });
    screenSendersRef.current = [];

    // Stop the screen stream
    stopStreamTracks(screenStreamRef.current);
    screenStreamRef.current = null;

    setScreenStream(null);
    setIsScreenSharing(false);

    // Renegotiate connection
    const pc = peerRef.current;
    if (pc && socket && agentId) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
          targetId: agentId,
          signal: offer,
        });
        console.log("[WebRTC] Sent renegotiation offer after stopping screen share");
      }).catch((err) => {
        console.error("[WebRTC] Failed to renegotiate after stopping screen share:", err);
      });
    }
  }, [socket, agentId, isScreenSharing, stopStreamTracks]);

  return {
    localStream,
    remoteStream,
    screenStream,
    isConnecting,
    isConnected,
    isReconnecting,
    isScreenSharing,
    error,
    endCall,
    startScreenShare,
    stopScreenShare,
    retryConnection,
  };
}
