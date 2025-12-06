/**
 * @vitest-environment jsdom
 * 
 * useWebRTC Hook Tests
 * 
 * Tests for the WebRTC connection management hook.
 * These tests verify the hook's interface and behavior patterns.
 * 
 * Note: Full WebRTC integration testing requires real browser APIs
 * and is better done via E2E tests. These unit tests focus on
 * the hook's state management and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  connectionState: RTCPeerConnectionState = "new";
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "mock_sdp" });
  createAnswer = vi.fn().mockResolvedValue({ type: "answer", sdp: "mock_sdp" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  addTrack = vi.fn().mockReturnValue({});
  removeTrack = vi.fn();
  getSenders = vi.fn().mockReturnValue([]);
  close = vi.fn();
}

// Mock MediaStream
function createMockMediaStream(id = "stream_123"): MediaStream {
  const audioTrack = { id: `audio_${id}`, kind: "audio", enabled: true, stop: vi.fn() };
  const videoTrack = { id: `video_${id}`, kind: "video", enabled: true, stop: vi.fn() };

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
  constructor(public init: { type: string; sdp: string }) {} 
});
vi.stubGlobal("RTCIceCandidate", class { 
  constructor(public init: { candidate: string }) {} 
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
});

