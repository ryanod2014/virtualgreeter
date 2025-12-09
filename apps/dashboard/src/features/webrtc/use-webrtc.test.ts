/**
 * @vitest-environment jsdom
 * 
 * useWebRTC Hook Tests (Dashboard - Agent Side)
 * 
 * Tests for the WebRTC connection management hook on the dashboard (agent) side.
 * These tests capture CURRENT behavior at the behavior level.
 * 
 * Behaviors Tested:
 * 1. initializeCall - Creates RTCPeerConnection with ICE servers
 * 2. initializeCall - Calls getUserMedia for local stream
 * 3. initializeCall - Adds tracks to peer connection
 * 4. initializeCall - Sets up ontrack handler
 * 5. createOffer - Creates SDP offer
 * 6. createOffer - Sets local description
 * 7. createOffer - Emits webrtc:signal with offer
 * 8. handleSignal - Handles answer → sets remote description
 * 9. handleSignal - Handles ICE candidate → adds to peer connection
 * 10. startScreenShare - Calls getDisplayMedia
 * 11. startScreenShare - Adds tracks and triggers renegotiation
 * 12. stopScreenShare - Removes tracks and triggers renegotiation
 * 13. Connection states - "connected" state fires callback
 * 14. Connection states - "failed" state handles error
 * 15. Cleanup - Closes peer connection
 * 16. Cleanup - Stops all tracks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Store event handlers for testing
const socketEventHandlers = new Map<string, (...args: unknown[]) => void>();

// Create mock socket factory
function createMockSocket() {
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      socketEventHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketEventHandlers.delete(event);
    }),
  };
}

// Store reference to created peer connections for testing
let lastCreatedPeerConnection: MockRTCPeerConnection | null = null;

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  connectionState: RTCPeerConnectionState = "new";
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  iceServers: RTCIceServer[] = [];

  constructor(config?: RTCConfiguration) {
    this.iceServers = config?.iceServers as RTCIceServer[] ?? [];
    lastCreatedPeerConnection = this;
  }

  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "mock_sdp" });
  createAnswer = vi.fn().mockResolvedValue({ type: "answer", sdp: "mock_sdp" });
  setLocalDescription = vi.fn().mockImplementation((desc) => {
    this.localDescription = desc;
    return Promise.resolve();
  });
  setRemoteDescription = vi.fn().mockImplementation((desc) => {
    this.remoteDescription = desc;
    return Promise.resolve();
  });
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  addTrack = vi.fn().mockReturnValue({ track: null });
  removeTrack = vi.fn();
  getSenders = vi.fn().mockReturnValue([]);
  close = vi.fn();
}

// Mock MediaStream with controllable tracks
function createMockMediaStream(id = "stream_123"): MediaStream {
  const audioTrack = { 
    id: `audio_${id}`, 
    kind: "audio", 
    enabled: true, 
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };
  const videoTrack = { 
    id: `video_${id}`, 
    kind: "video", 
    enabled: true, 
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };

  return {
    id,
    getTracks: () => [audioTrack, videoTrack],
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => [videoTrack],
  } as unknown as MediaStream;
}

// Mock browser APIs
const mockGetUserMedia = vi.fn().mockResolvedValue(createMockMediaStream("local"));
const mockGetDisplayMedia = vi.fn().mockResolvedValue(createMockMediaStream("screen"));

// Setup global mocks before importing the module
vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
vi.stubGlobal("RTCSessionDescription", class { 
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  } 
});
vi.stubGlobal("RTCIceCandidate", class { 
  candidate: string;
  constructor(init: { candidate: string }) {
    this.candidate = init.candidate;
  } 
});
vi.stubGlobal("navigator", {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia,
  },
});

// Import after mocks
import { useWebRTC } from "./use-webrtc";

describe("useWebRTC", () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    socketEventHandlers.clear();
    mockSocket = createMockSocket();
    mockGetUserMedia.mockResolvedValue(createMockMediaStream("local"));
    mockGetDisplayMedia.mockResolvedValue(createMockMediaStream("screen"));
    lastCreatedPeerConnection = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // HOOK INTERFACE
  // ---------------------------------------------------------------------------

  describe("Hook Interface", () => {
    it("returns all expected state and functions", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      // State
      expect(result.current).toHaveProperty("localStream");
      expect(result.current).toHaveProperty("remoteStream");
      expect(result.current).toHaveProperty("screenShareStream");
      expect(result.current).toHaveProperty("isConnecting");
      expect(result.current).toHaveProperty("isConnected");
      expect(result.current).toHaveProperty("isVisitorScreenSharing");
      expect(result.current).toHaveProperty("isAgentScreenSharing");
      expect(result.current).toHaveProperty("error");

      // Functions
      expect(typeof result.current.initializeCall).toBe("function");
      expect(typeof result.current.endCall).toBe("function");
      expect(typeof result.current.startScreenShare).toBe("function");
      expect(typeof result.current.stopScreenShare).toBe("function");
    });

    it("initializes with null streams", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(result.current.localStream).toBeNull();
      expect(result.current.remoteStream).toBeNull();
      expect(result.current.screenShareStream).toBeNull();
    });

    it("initializes with false connection states", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isVisitorScreenSharing).toBe(false);
      expect(result.current.isAgentScreenSharing).toBe(false);
    });

    it("initializes with null error", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(result.current.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // initializeCall ERROR HANDLING
  // ---------------------------------------------------------------------------

  describe("initializeCall error handling", () => {
    it("sets error when socket is null", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: null,
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(result.current.error).toBe("Socket or visitor ID not available");
    });

    it("sets error when visitorId is null", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: null,
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(result.current.error).toBe("Socket or visitor ID not available");
    });

    it("sets error when getUserMedia fails", async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(result.current.error).toBe("Permission denied");
      expect(result.current.isConnecting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // startScreenShare BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("startScreenShare", () => {
    it("returns false when peer connection is not initialized", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.startScreenShare();
      });

      expect(success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // stopScreenShare BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("stopScreenShare", () => {
    it("does not throw when called without peer connection", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      // Should not throw
      expect(() => {
        act(() => {
          result.current.stopScreenShare();
        });
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // endCall / CLEANUP BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("endCall / Cleanup", () => {
    it("resets all state when called", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      act(() => {
        result.current.endCall();
      });

      expect(result.current.localStream).toBeNull();
      expect(result.current.remoteStream).toBeNull();
      expect(result.current.screenShareStream).toBeNull();
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isVisitorScreenSharing).toBe(false);
      expect(result.current.isAgentScreenSharing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("does not throw when called multiple times", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(() => {
        act(() => {
          result.current.endCall();
          result.current.endCall();
          result.current.endCall();
        });
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // SOCKET EVENT LISTENER SETUP
  // ---------------------------------------------------------------------------

  describe("Socket event listeners", () => {
    it("registers WEBRTC_SIGNAL listener on mount", () => {
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(mockSocket.on).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.any(Function)
      );
    });

    it("unregisters WEBRTC_SIGNAL listener on unmount", () => {
      const { unmount } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.any(Function)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // initializeCall BEHAVIORS (1-4)
  // ---------------------------------------------------------------------------

  describe("initializeCall", () => {
    it("creates RTCPeerConnection with ICE servers", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(lastCreatedPeerConnection).not.toBeNull();
      // ICE servers should be configured
      expect(lastCreatedPeerConnection?.iceServers.length).toBeGreaterThan(0);
    });

    it("calls getUserMedia for local stream with video and audio", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
    });

    it("sets localStream state after getUserMedia succeeds", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(result.current.localStream).not.toBeNull();
    });

    it("adds local tracks to peer connection", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Should add both audio and video tracks
      expect(lastCreatedPeerConnection?.addTrack).toHaveBeenCalledTimes(2);
    });

    it("sets up ontrack handler on peer connection", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(lastCreatedPeerConnection?.ontrack).not.toBeNull();
    });

    it("sets isConnecting to true when initializing", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      // Use a promise to delay getUserMedia
      let resolveGetUserMedia: (stream: MediaStream) => void;
      const mediaPromise = new Promise<MediaStream>((resolve) => {
        resolveGetUserMedia = resolve;
      });
      mockGetUserMedia.mockReturnValueOnce(mediaPromise);

      act(() => {
        result.current.initializeCall();
      });

      // isConnecting should be true while waiting
      expect(result.current.isConnecting).toBe(true);

      // Resolve to complete
      await act(async () => {
        resolveGetUserMedia!(createMockMediaStream("local"));
        await mediaPromise;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createOffer BEHAVIORS (5-7 - embedded in initializeCall)
  // ---------------------------------------------------------------------------

  describe("createOffer (via initializeCall)", () => {
    it("creates SDP offer after peer connection setup", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(lastCreatedPeerConnection?.createOffer).toHaveBeenCalled();
    });

    it("sets local description with the created offer", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(lastCreatedPeerConnection?.setLocalDescription).toHaveBeenCalledWith(
        expect.objectContaining({ type: "offer", sdp: "mock_sdp" })
      );
    });

    it("emits webrtc:signal with offer to visitor", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.objectContaining({
          targetId: "visitor_123",
          signal: expect.objectContaining({ type: "offer" }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handleSignal BEHAVIORS (8-9)
  // ---------------------------------------------------------------------------

  describe("handleSignal", () => {
    it("handles answer signal by setting remote description", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Simulate receiving an answer signal
      const signalHandler = socketEventHandlers.get("webrtc:signal");
      expect(signalHandler).toBeDefined();

      await act(async () => {
        signalHandler!({
          targetId: "agent_123",
          signal: { type: "answer", sdp: "answer_sdp" },
        });
      });

      expect(lastCreatedPeerConnection?.setRemoteDescription).toHaveBeenCalled();
    });

    it("handles ICE candidate signal by adding to peer connection", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      const signalHandler = socketEventHandlers.get("webrtc:signal");
      expect(signalHandler).toBeDefined();

      await act(async () => {
        signalHandler!({
          targetId: "agent_123",
          signal: { type: "candidate", candidate: { candidate: "candidate_string" } },
        });
      });

      expect(lastCreatedPeerConnection?.addIceCandidate).toHaveBeenCalled();
    });

    it("handles renegotiation offer by creating answer", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      const signalHandler = socketEventHandlers.get("webrtc:signal");
      expect(signalHandler).toBeDefined();

      // Reset mock to track renegotiation calls
      mockSocket.emit.mockClear();

      await act(async () => {
        signalHandler!({
          targetId: "agent_123",
          signal: { type: "offer", sdp: "renegotiation_offer_sdp" },
        });
      });

      // Should create answer and emit it
      expect(lastCreatedPeerConnection?.createAnswer).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.objectContaining({
          targetId: "visitor_123",
          signal: expect.objectContaining({ type: "answer" }),
        })
      );
    });

    it("ignores signals when peer connection is not ready", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      // Don't initialize, so peer connection is null
      const signalHandler = socketEventHandlers.get("webrtc:signal");
      expect(signalHandler).toBeDefined();

      // Should not throw
      await act(async () => {
        signalHandler!({
          targetId: "agent_123",
          signal: { type: "answer", sdp: "answer_sdp" },
        });
      });

      // No error should be set
      expect(result.current.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Screen Share BEHAVIORS (10-12)
  // ---------------------------------------------------------------------------

  describe("startScreenShare", () => {
    it("calls getDisplayMedia for screen sharing", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      mockGetDisplayMedia.mockClear();

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(mockGetDisplayMedia).toHaveBeenCalled();
    });

    it("adds screen share tracks to peer connection", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Clear addTrack calls from initial setup
      lastCreatedPeerConnection?.addTrack.mockClear();

      await act(async () => {
        await result.current.startScreenShare();
      });

      // Screen stream has 2 tracks (video and audio)
      expect(lastCreatedPeerConnection?.addTrack).toHaveBeenCalled();
    });

    it("triggers renegotiation offer after adding screen share", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Clear previous calls
      lastCreatedPeerConnection?.createOffer.mockClear();
      mockSocket.emit.mockClear();

      await act(async () => {
        await result.current.startScreenShare();
      });

      // Should create new offer for renegotiation
      expect(lastCreatedPeerConnection?.createOffer).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.objectContaining({
          targetId: "visitor_123",
          signal: expect.objectContaining({ type: "offer" }),
        })
      );
    });

    it("sets isAgentScreenSharing to true", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(result.current.isAgentScreenSharing).toBe(true);
    });

    it("returns true on successful screen share", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      let success = false;
      await act(async () => {
        success = await result.current.startScreenShare();
      });

      expect(success).toBe(true);
    });

    it("returns false when getDisplayMedia fails", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      mockGetDisplayMedia.mockRejectedValueOnce(new Error("User cancelled"));

      let success = true;
      await act(async () => {
        success = await result.current.startScreenShare();
      });

      expect(success).toBe(false);
    });

    it("returns false when already screen sharing", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      await act(async () => {
        await result.current.startScreenShare();
      });

      let success = true;
      await act(async () => {
        success = await result.current.startScreenShare();
      });

      expect(success).toBe(false);
    });
  });

  describe("stopScreenShare", () => {
    it("removes screen share tracks from peer connection", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      await act(async () => {
        await result.current.startScreenShare();
      });

      // The removeTrack is called during stopScreenShare
      lastCreatedPeerConnection?.removeTrack.mockClear();

      act(() => {
        result.current.stopScreenShare();
      });

      expect(lastCreatedPeerConnection?.removeTrack).toHaveBeenCalled();
    });

    it("sets isAgentScreenSharing to false", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      await act(async () => {
        await result.current.startScreenShare();
      });

      act(() => {
        result.current.stopScreenShare();
      });

      expect(result.current.isAgentScreenSharing).toBe(false);
    });

    it("triggers renegotiation offer after stopping screen share", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      await act(async () => {
        await result.current.startScreenShare();
      });

      // Clear previous calls
      lastCreatedPeerConnection?.createOffer.mockClear();
      mockSocket.emit.mockClear();

      act(() => {
        result.current.stopScreenShare();
      });

      // Wait for async renegotiation
      await waitFor(() => {
        expect(lastCreatedPeerConnection?.createOffer).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Connection State BEHAVIORS (13-14)
  // ---------------------------------------------------------------------------

  describe("Connection states", () => {
    it("sets isConnected to true when connectionState becomes 'connected'", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Simulate connection state change
      act(() => {
        if (lastCreatedPeerConnection) {
          lastCreatedPeerConnection.connectionState = "connected";
          lastCreatedPeerConnection.onconnectionstatechange?.();
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it("sets error when connectionState becomes 'failed'", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Simulate connection failure
      act(() => {
        if (lastCreatedPeerConnection) {
          lastCreatedPeerConnection.connectionState = "failed";
          lastCreatedPeerConnection.onconnectionstatechange?.();
        }
      });

      expect(result.current.error).toBe("Connection failed");
      expect(result.current.isConnecting).toBe(false);
    });

    it("sets error when connectionState becomes 'disconnected'", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Simulate disconnection
      act(() => {
        if (lastCreatedPeerConnection) {
          lastCreatedPeerConnection.connectionState = "disconnected";
          lastCreatedPeerConnection.onconnectionstatechange?.();
        }
      });

      expect(result.current.error).toBe("Connection failed");
    });

    it("sets isConnected from ontrack handler when remote stream received", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Simulate receiving remote track
      act(() => {
        const mockRemoteStream = createMockMediaStream("remote");
        const trackEvent = {
          track: { kind: "video" },
          streams: [mockRemoteStream],
        } as unknown as RTCTrackEvent;
        
        lastCreatedPeerConnection?.ontrack?.(trackEvent);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.remoteStream).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup BEHAVIORS (15-16)
  // ---------------------------------------------------------------------------

  describe("Cleanup", () => {
    it("closes peer connection on cleanup", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      const peerConnection = lastCreatedPeerConnection;

      act(() => {
        result.current.endCall();
      });

      expect(peerConnection?.close).toHaveBeenCalled();
    });

    it("stops all local tracks on cleanup", async () => {
      const mockStream = createMockMediaStream("local");
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      act(() => {
        result.current.endCall();
      });

      // All tracks should have stop called
      mockStream.getTracks().forEach((track) => {
        expect((track as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled();
      });
    });

    it("cleans up when isCallActive becomes false", async () => {
      const { result, rerender } = renderHook(
        ({ isCallActive }: { isCallActive: boolean }) =>
          useWebRTC({
            socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
            visitorId: "visitor_123",
            isCallActive,
          }),
        { initialProps: { isCallActive: true } }
      );

      // Wait for auto-initialization to complete
      await waitFor(() => {
        expect(lastCreatedPeerConnection).not.toBeNull();
      });

      const peerConnection = lastCreatedPeerConnection;

      // Change isCallActive to false (should trigger cleanup)
      rerender({ isCallActive: false });

      await waitFor(() => {
        expect(peerConnection?.close).toHaveBeenCalled();
      });
    });

    it("cleans up on unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      const peerConnection = lastCreatedPeerConnection;

      unmount();

      expect(peerConnection?.close).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ICE Candidate Sending BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("ICE Candidate Sending", () => {
    it("emits ICE candidates when onicecandidate fires", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Clear emit calls from offer
      mockSocket.emit.mockClear();

      // Simulate ICE candidate
      act(() => {
        const candidateEvent = {
          candidate: { candidate: "candidate:12345", sdpMid: "0", sdpMLineIndex: 0 },
        } as unknown as RTCPeerConnectionIceEvent;
        
        lastCreatedPeerConnection?.onicecandidate?.(candidateEvent);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "webrtc:signal",
        expect.objectContaining({
          targetId: "visitor_123",
          signal: expect.objectContaining({ type: "candidate" }),
        })
      );
    });

    it("does not emit when ICE candidate is null (gathering complete)", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Clear emit calls from offer
      mockSocket.emit.mockClear();

      // Simulate null candidate (gathering complete)
      act(() => {
        const candidateEvent = {
          candidate: null,
        } as unknown as RTCPeerConnectionIceEvent;
        
        lastCreatedPeerConnection?.onicecandidate?.(candidateEvent);
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Remote Track Handling BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Remote Track Handling", () => {
    it("sets first incoming stream as remoteStream (camera)", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      const mockRemoteStream = createMockMediaStream("remote_camera");
      
      act(() => {
        const trackEvent = {
          track: { kind: "video" },
          streams: [mockRemoteStream],
        } as unknown as RTCTrackEvent;
        
        lastCreatedPeerConnection?.ontrack?.(trackEvent);
      });

      expect(result.current.remoteStream?.id).toBe("remote_camera");
    });

    it("sets second different stream as screenShareStream", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // First stream (camera)
      const cameraStream = createMockMediaStream("camera");
      act(() => {
        const trackEvent = {
          track: { kind: "video" },
          streams: [cameraStream],
        } as unknown as RTCTrackEvent;
        
        lastCreatedPeerConnection?.ontrack?.(trackEvent);
      });

      // Second stream (screen share)
      const screenStream = createMockMediaStream("visitor_screen");
      act(() => {
        const trackEvent = {
          track: { kind: "video", onended: null },
          streams: [screenStream],
        } as unknown as RTCTrackEvent;
        
        lastCreatedPeerConnection?.ontrack?.(trackEvent);
      });

      expect(result.current.remoteStream?.id).toBe("camera");
      expect(result.current.screenShareStream?.id).toBe("visitor_screen");
      expect(result.current.isVisitorScreenSharing).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-initialization BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Auto-initialization", () => {
    it("auto-initializes when isCallActive becomes true", async () => {
      const { rerender } = renderHook(
        ({ isCallActive }: { isCallActive: boolean }) =>
          useWebRTC({
            socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
            visitorId: "visitor_123",
            isCallActive,
          }),
        { initialProps: { isCallActive: false } }
      );

      expect(mockGetUserMedia).not.toHaveBeenCalled();

      // Set call active
      await act(async () => {
        rerender({ isCallActive: true });
      });

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
    });
  });
});

  // ---------------------------------------------------------------------------
  // ICE RESTART BEHAVIORS (TKT-016)
  // ---------------------------------------------------------------------------

  describe("ICE restart functionality (TKT-016)", () => {
    it("adds isReconnecting state to return value", () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      expect(result.current).toHaveProperty("isReconnecting");
      expect(result.current.isReconnecting).toBe(false);
    });

    it("sets isReconnecting to true when connection state becomes disconnected", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Trigger ICE restart via connection state change
      act(() => {
        if (lastCreatedPeerConnection) {
          lastCreatedPeerConnection.connectionState = "disconnected";
          lastCreatedPeerConnection.onconnectionstatechange?.();
        }
      });

      expect(result.current.isReconnecting).toBe(true);
    });

    it("triggers ICE restart with iceRestart flag when connection disconnects", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      // Clear previous createOffer calls
      lastCreatedPeerConnection?.createOffer.mockClear();

      // Trigger disconnection
      act(() => {
        if (lastCreatedPeerConnection) {
          lastCreatedPeerConnection.connectionState = "disconnected";
          lastCreatedPeerConnection.onconnectionstatechange?.();
        }
      });

      expect(lastCreatedPeerConnection?.createOffer).toHaveBeenCalledWith({ iceRestart: true });
    });

    it("stops attempting ICE restart after 3 attempts and sets error", async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          visitorId: "visitor_123",
          isCallActive: false,
        })
      );

      await act(async () => {
        await result.current.initializeCall();
      });

      lastCreatedPeerConnection?.createOffer.mockClear();

      // Trigger 4 failures in a row
      for (let i = 0; i < 4; i++) {
        act(() => {
          if (lastCreatedPeerConnection) {
            lastCreatedPeerConnection.connectionState = "disconnected";
            lastCreatedPeerConnection.onconnectionstatechange?.();
          }
        });
      }

      // Should have attempted exactly 3 times
      expect(lastCreatedPeerConnection?.createOffer).toHaveBeenCalledTimes(3);

      // Should set error after max attempts
      expect(result.current.error).toBe("Connection failed after multiple attempts");
      expect(result.current.isReconnecting).toBe(false);
    });
  });
});
