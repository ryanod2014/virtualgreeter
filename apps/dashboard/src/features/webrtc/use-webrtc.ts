"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToDashboardEvents, DashboardToServerEvents } from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

interface UseWebRTCOptions {
  socket: Socket<ServerToDashboardEvents, DashboardToServerEvents> | null;
  visitorId: string | null;
  isCallActive: boolean;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  isVisitorScreenSharing: boolean;
  isAgentScreenSharing: boolean;
  error: string | null;
  initializeCall: () => Promise<void>;
  endCall: () => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC({
  socket,
  visitorId,
  isCallActive,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [agentScreenStream, setAgentScreenStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVisitorScreenSharing, setIsVisitorScreenSharing] = useState(false);
  const [isAgentScreenSharing, setIsAgentScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenSendersRef = useRef<RTCRtpSender[]>([]);

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
    remoteStreamRef.current = null;
    screenSendersRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setScreenShareStream(null);
    setAgentScreenStream(null);
    setIsConnecting(false);
    setIsConnected(false);
    setIsVisitorScreenSharing(false);
    setIsAgentScreenSharing(false);
    setError(null);
  }, []);

  // Initialize call (agent is the initiator)
  const initializeCall = useCallback(async () => {
    if (!socket || !visitorId) {
      setError("Socket or visitor ID not available");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = pc;

      // Add local tracks to connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote streams (camera and screen share)
      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track, kind:", event.track.kind);
        
        if (event.streams[0]) {
          // Check if this is a new stream (screen share) or the original camera stream
          if (!remoteStreamRef.current) {
            // First stream is the camera
            remoteStreamRef.current = event.streams[0];
            setRemoteStream(event.streams[0]);
            setIsConnected(true);
            setIsConnecting(false);
          } else if (event.streams[0].id !== remoteStreamRef.current.id) {
            // Different stream = screen share
            console.log("[WebRTC] Detected screen share stream");
            setScreenShareStream(event.streams[0]);
            setIsVisitorScreenSharing(true);

            // Listen for track ended to know when screen share stops
            event.track.onended = () => {
              console.log("[WebRTC] Screen share track ended");
              setScreenShareStream(null);
              setIsVisitorScreenSharing(false);
            };
          }
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending ICE candidate to visitor");
          socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: visitorId,
            signal: { type: "candidate", candidate: event.candidate },
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
          setError("Connection failed");
          setIsConnecting(false);
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log("[WebRTC] Sending offer to visitor");
      socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
        targetId: visitorId,
        signal: offer,
      });

    } catch (err) {
      console.error("[WebRTC] Failed to initialize:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize call");
      setIsConnecting(false);
    }
  }, [socket, visitorId, cleanup]);

  // Listen for incoming signals from visitor
  useEffect(() => {
    if (!socket || !visitorId) return;

    const handleSignal = async (data: { targetId: string; signal: RTCSessionDescriptionInit | { type: "candidate"; candidate: RTCIceCandidateInit } }) => {
      const pc = peerRef.current;
      if (!pc) {
        console.log("[WebRTC] No peer connection yet");
        return;
      }

      try {
        if (data.signal.type === "answer") {
          console.log("[WebRTC] Received answer from visitor");
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.signal.type === "offer") {
          // Renegotiation offer from visitor (e.g., screen share)
          console.log("[WebRTC] Received renegotiation offer from visitor");
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
          
          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: visitorId,
            signal: answer,
          });
          console.log("[WebRTC] Sent renegotiation answer to visitor");
        } else if (data.signal.type === "candidate" && "candidate" in data.signal) {
          console.log("[WebRTC] Received ICE candidate from visitor");
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      } catch (err) {
        console.error("[WebRTC] Error handling signal:", err);
      }
    };

    socket.on(SOCKET_EVENTS.WEBRTC_SIGNAL, handleSignal as (data: unknown) => void);

    return () => {
      socket.off(SOCKET_EVENTS.WEBRTC_SIGNAL, handleSignal as (data: unknown) => void);
    };
  }, [socket, visitorId]);

  // Initialize call when it becomes active
  useEffect(() => {
    if (isCallActive && visitorId && !peerRef.current) {
      initializeCall();
    }
  }, [isCallActive, visitorId, initializeCall]);

  // Cleanup when call ends - reset all state even if peer was never created
  useEffect(() => {
    if (!isCallActive) {
      // Always reset the remote stream ref when call is not active
      // This ensures new incoming streams are recognized as camera (not screen share)
      remoteStreamRef.current = null;
      
      // Only run full cleanup if we have an active peer connection
      if (peerRef.current) {
        cleanup();
      }
    }
  }, [isCallActive, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Start screen sharing (agent side - for demos)
  const startScreenShare = useCallback(async (): Promise<boolean> => {
    if (!peerRef.current || isAgentScreenSharing) {
      return false;
    }

    try {
      // Request screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: true, // Include audio for demos
      });

      setAgentScreenStream(stream);

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

      if (socket && visitorId) {
        socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
          targetId: visitorId,
          signal: offer,
        });
        console.log("[WebRTC] Sent renegotiation offer for agent screen share");
      }

      setIsAgentScreenSharing(true);
      return true;
    } catch (err) {
      console.error("[WebRTC] Agent screen share failed:", err);
      return false;
    }
  }, [socket, visitorId, isAgentScreenSharing]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!peerRef.current || !isAgentScreenSharing) {
      return;
    }

    // Remove screen share tracks from peer connection
    screenSendersRef.current.forEach((sender) => {
      peerRef.current?.removeTrack(sender);
    });
    screenSendersRef.current = [];

    // Stop the screen stream
    if (agentScreenStream) {
      agentScreenStream.getTracks().forEach((track) => track.stop());
    }

    setAgentScreenStream(null);
    setIsAgentScreenSharing(false);

    // Renegotiate connection
    const pc = peerRef.current;
    if (pc && socket && visitorId) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
          targetId: visitorId,
          signal: offer,
        });
        console.log("[WebRTC] Sent renegotiation offer after stopping screen share");
      });
    }
  }, [socket, visitorId, isAgentScreenSharing, agentScreenStream]);

  return {
    localStream,
    remoteStream,
    screenShareStream,
    isConnecting,
    isConnected,
    isVisitorScreenSharing,
    isAgentScreenSharing,
    error,
    initializeCall,
    endCall,
    startScreenShare,
    stopScreenShare,
  };
}
