import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type { Socket } from "socket.io-client";
import type { ServerToWidgetEvents, WidgetToServerEvents } from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

interface UseWebRTCOptions {
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
  agentId: string | null;
  isCallAccepted: boolean;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  isScreenSharing: boolean;
  error: string | null;
  endCall: () => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Type for signals we might receive
type SignalData = RTCSessionDescriptionInit | { type: "candidate"; candidate: RTCIceCandidateInit };

export function useWebRTC({
  socket,
  agentId,
  isCallAccepted,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSendersRef = useRef<RTCRtpSender[]>([]);
  const pendingSignalsRef = useRef<SignalData[]>([]);
  const isInitializingRef = useRef(false);

  // Clean up function
  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    screenSendersRef.current = [];
    pendingSignalsRef.current = [];
    isInitializingRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsConnecting(false);
    setIsConnected(false);
    setIsScreenSharing(false);
    setError(null);
  }, []);

  // Process a signal (offer or ICE candidate)
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
    }
  }, [socket, agentId]);

  // Initialize call (visitor is NOT the initiator - responds to agent)
  const initializeCall = useCallback(async () => {
    if (!socket || !agentId || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // Get local media with error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (mediaError) {
        // Handle camera/mic permission errors
        const err = mediaError as DOMException;
        if (err.name === "NotAllowedError") {
          setError("Camera/microphone permission denied. Please allow access and try again.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found on this device.");
        } else {
          setError(`Media error: ${err.message}`);
        }
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
        console.log("[WebRTC] Received remote track");
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
          setIsConnecting(false);
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

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setError("Connection failed. Please try again.");
          setIsConnecting(false);
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
      setError(err instanceof Error ? err.message : "Failed to initialize call");
      setIsConnecting(false);
      isInitializingRef.current = false;
    }
  }, [socket, agentId, processSignal]);

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

  // Cleanup when call ends - reset all state even if peer was never created
  useEffect(() => {
    if (!isCallAccepted) {
      // Always reset the initializing flag when call is no longer accepted
      // This ensures we can start a new call even if the previous one didn't fully initialize
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
      cleanup();
    };
  }, [cleanup]);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Start screen sharing
  const startScreenShare = useCallback(async (): Promise<boolean> => {
    if (!peerRef.current || isScreenSharing) {
      return false;
    }

    try {
      // Request screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
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

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!peerRef.current || !isScreenSharing) {
      return;
    }

    // Remove screen share tracks from peer connection
    screenSendersRef.current.forEach((sender) => {
      peerRef.current?.removeTrack(sender);
    });
    screenSendersRef.current = [];

    // Stop the screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

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
      });
    }
  }, [socket, agentId, isScreenSharing]);

  return {
    localStream,
    remoteStream,
    screenStream,
    isConnecting,
    isConnected,
    isScreenSharing,
    error,
    endCall,
    startScreenShare,
    stopScreenShare,
  };
}
