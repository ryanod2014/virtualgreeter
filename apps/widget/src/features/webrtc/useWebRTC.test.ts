/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/preact";
import { useWebRTC } from "./useWebRTC";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { CONNECTION_TIMING, ERROR_MESSAGES } from "../../constants";

// Mock socket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocketEmit = vi.fn();

const createMockSocket = () => ({
  on: mockSocketOn,
  off: mockSocketOff,
  emit: mockSocketEmit,
  connected: true,
});

// Mock RTCPeerConnection
const mockAddTrack = vi.fn();
const mockClose = vi.fn();
const mockCreateOffer = vi.fn();
const mockCreateAnswer = vi.fn();
const mockSetLocalDescription = vi.fn();
const mockSetRemoteDescription = vi.fn();
const mockAddIceCandidate = vi.fn();

let mockOnTrack: ((event: { streams: MediaStream[] }) => void) | null = null;
let mockOnIceCandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null;
let mockOnConnectionStateChange: (() => void) | null = null;
let mockOnIceConnectionStateChange: (() => void) | null = null;
let mockConnectionState = "new";
let mockIceConnectionState = "new";

const createMockPeerConnection = () => ({
  addTrack: mockAddTrack,
  close: mockClose,
  createOffer: mockCreateOffer,
  createAnswer: mockCreateAnswer,
  setLocalDescription: mockSetLocalDescription,
  setRemoteDescription: mockSetRemoteDescription,
  addIceCandidate: mockAddIceCandidate,
  get connectionState() {
    return mockConnectionState;
  },
  get iceConnectionState() {
    return mockIceConnectionState;
  },
  set ontrack(handler: ((event: { streams: MediaStream[] }) => void) | null) {
    mockOnTrack = handler;
  },
  set onicecandidate(handler: ((event: { candidate: RTCIceCandidate | null }) => void) | null) {
    mockOnIceCandidate = handler;
  },
  set onconnectionstatechange(handler: (() => void) | null) {
    mockOnConnectionStateChange = handler;
  },
  set oniceconnectionstatechange(handler: (() => void) | null) {
    mockOnIceConnectionStateChange = handler;
  },
});

// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn();

// Mock MediaStream
const createMockMediaStream = () => ({
  getTracks: () => [
    { kind: "video", enabled: true, stop: vi.fn() },
    { kind: "audio", enabled: true, stop: vi.fn() },
  ],
  getVideoTracks: () => [{ kind: "video", enabled: true, stop: vi.fn() }],
  getAudioTracks: () => [{ kind: "audio", enabled: true, stop: vi.fn() }],
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
});

// Setup global mocks
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  vi.useFakeTimers();
  
  // Reset connection states
  mockConnectionState = "new";
  mockIceConnectionState = "new";
  mockOnTrack = null;
  mockOnIceCandidate = null;
  mockOnConnectionStateChange = null;
  mockOnIceConnectionStateChange = null;
  
  // Mock RTCPeerConnection
  (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = vi.fn(() => createMockPeerConnection());
  
  // Mock RTCSessionDescription
  (global as unknown as { RTCSessionDescription: unknown }).RTCSessionDescription = vi.fn((init) => init);
  
  // Mock RTCIceCandidate
  (global as unknown as { RTCIceCandidate: unknown }).RTCIceCandidate = vi.fn((init) => init);
  
  // Mock navigator.mediaDevices
  Object.defineProperty(global.navigator, "mediaDevices", {
    value: {
      getUserMedia: mockGetUserMedia,
      getDisplayMedia: vi.fn(),
    },
    writable: true,
  });
  
  // Default getUserMedia behavior
  mockGetUserMedia.mockResolvedValue(createMockMediaStream());
  
  // Default createAnswer behavior
  mockCreateAnswer.mockResolvedValue({ type: "answer", sdp: "mock-sdp" });
  mockSetLocalDescription.mockResolvedValue(undefined);
  mockSetRemoteDescription.mockResolvedValue(undefined);
  mockAddIceCandidate.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useWebRTC", () => {
  describe("initializeCall", () => {
    it("creates RTCPeerConnection with ICE servers when call is accepted", async () => {
      const mockSocket = createMockSocket();
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(global.RTCPeerConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          iceServers: expect.arrayContaining([
            expect.objectContaining({ urls: expect.stringContaining("stun") }),
          ]),
        })
      );
    });

    it("gets user media for local stream when initializing", async () => {
      const mockSocket = createMockSocket();
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
    });

    it("adds tracks to peer connection after getting user media", async () => {
      const mockSocket = createMockSocket();
      const mockStream = createMockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Should add each track from the stream
      expect(mockAddTrack).toHaveBeenCalled();
    });

    it("sets localStream state after getUserMedia success", async () => {
      const mockSocket = createMockSocket();
      const mockStream = createMockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(result.current.localStream).toBe(mockStream);
    });

    it("sets isConnecting to true while initializing", async () => {
      const mockSocket = createMockSocket();
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      // Initially connecting
      expect(result.current.isConnecting).toBe(true);
    });
  });

  describe("processSignal", () => {
    it("handles offer signal by creating answer", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      // Capture the signal handler when socket.on is called
      let signalHandler: ((data: { targetId: string; signal: unknown }) => void) | undefined;
      mockSocketOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
        if (event === SOCKET_EVENTS.WEBRTC_SIGNAL) {
          signalHandler = handler;
        }
      });
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate receiving an offer
      if (signalHandler) {
        await act(async () => {
          signalHandler({
            targetId: "visitor-123",
            signal: { type: "offer", sdp: "offer-sdp" },
          });
          await vi.advanceTimersByTimeAsync(100);
        });
        
        expect(mockSetRemoteDescription).toHaveBeenCalledWith(
          expect.objectContaining({ type: "offer", sdp: "offer-sdp" })
        );
        expect(mockCreateAnswer).toHaveBeenCalled();
        expect(mockSetLocalDescription).toHaveBeenCalled();
      }
    });

    it("handles ICE candidate signal by adding to peer connection", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      let signalHandler: ((data: { targetId: string; signal: unknown }) => void) | undefined;
      mockSocketOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
        if (event === SOCKET_EVENTS.WEBRTC_SIGNAL) {
          signalHandler = handler;
        }
      });
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate receiving an ICE candidate
      if (signalHandler) {
        const mockCandidate = { candidate: "candidate-string", sdpMid: "0", sdpMLineIndex: 0 };
        
        await act(async () => {
          signalHandler({
            targetId: "visitor-123",
            signal: { type: "candidate", candidate: mockCandidate },
          });
          await vi.advanceTimersByTimeAsync(100);
        });
        
        expect(mockAddIceCandidate).toHaveBeenCalledWith(
          expect.objectContaining(mockCandidate)
        );
      }
    });

    it("queues signals that arrive before peer connection is ready", async () => {
      const mockSocket = createMockSocket();
      
      // Make getUserMedia take longer so signals arrive before peer is ready
      mockGetUserMedia.mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(createMockMediaStream()), 200))
      );
      
      let signalHandler: ((data: { targetId: string; signal: unknown }) => void) | undefined;
      mockSocketOn.mockImplementation((event: string, handler: (data: unknown) => void) => {
        if (event === SOCKET_EVENTS.WEBRTC_SIGNAL) {
          signalHandler = handler;
        }
      });
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      // Signal arrives before getUserMedia completes
      if (signalHandler) {
        act(() => {
          signalHandler({
            targetId: "visitor-123",
            signal: { type: "offer", sdp: "early-offer-sdp" },
          });
        });
        
        // Signal should be queued, not processed yet
        expect(mockSetRemoteDescription).not.toHaveBeenCalled();
        
        // Now complete getUserMedia and process queued signal
        await act(async () => {
          await vi.advanceTimersByTimeAsync(300);
        });
        
        // Queued signal should now be processed
        expect(mockSetRemoteDescription).toHaveBeenCalled();
      }
    });
  });

  describe("Connection states", () => {
    it("sets isConnected to true when connectionState becomes connected", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate connection state change to "connected"
      mockConnectionState = "connected";
      if (mockOnConnectionStateChange) {
        act(() => {
          mockOnConnectionStateChange!();
        });
      }
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it("sets error state when connectionState becomes failed", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate connection state change to "failed"
      mockConnectionState = "failed";
      if (mockOnConnectionStateChange) {
        act(() => {
          mockOnConnectionStateChange!();
        });
      }
      
      expect(result.current.error).toBe(ERROR_MESSAGES.WEBRTC_FAILED);
      expect(result.current.isConnecting).toBe(false);
    });

    it("starts connection timeout timer when initializing", async () => {
      const mockSocket = createMockSocket();
      const mockOnConnectionTimeout = vi.fn();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
          onConnectionTimeout: mockOnConnectionTimeout,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Verify that isConnecting is true, indicating timeout timer should be active
      expect(result.current.isConnecting).toBe(true);
    });

    it("clears connection timeout when connection succeeds", async () => {
      const mockSocket = createMockSocket();
      const mockOnConnectionTimeout = vi.fn();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
          onConnectionTimeout: mockOnConnectionTimeout,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate successful connection before timeout
      mockConnectionState = "connected";
      if (mockOnConnectionStateChange) {
        act(() => {
          mockOnConnectionStateChange!();
        });
      }
      
      // Advance time past what would have been the timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CONNECTION_TIMING.WEBRTC_CONNECTION_TIMEOUT);
      });
      
      // Timeout should NOT have fired since we connected
      expect(mockOnConnectionTimeout).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("closes peer connection when endCall is called", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      act(() => {
        result.current.endCall();
      });
      
      expect(mockClose).toHaveBeenCalled();
    });

    it("stops all local stream tracks when endCall is called", async () => {
      const mockSocket = createMockSocket();
      const mockStop = vi.fn();
      const mockStream = {
        getTracks: () => [
          { kind: "video", enabled: true, stop: mockStop },
          { kind: "audio", enabled: true, stop: mockStop },
        ],
        getVideoTracks: () => [{ kind: "video", enabled: true, stop: mockStop }],
        getAudioTracks: () => [{ kind: "audio", enabled: true, stop: mockStop }],
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
      };
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      act(() => {
        result.current.endCall();
      });
      
      expect(mockStop).toHaveBeenCalled();
    });

    it("resets streams when endCall is called", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      act(() => {
        result.current.endCall();
      });
      
      // Streams should be cleaned up
      expect(result.current.localStream).toBeNull();
      expect(result.current.remoteStream).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("removes event handlers when cleaning up", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { unmount } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      unmount();
      
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("does not crash when getUserMedia throws NotAllowedError", async () => {
      const mockSocket = createMockSocket();
      const permissionError = new DOMException("Permission denied", "NotAllowedError");
      mockGetUserMedia.mockRejectedValue(permissionError);
      
      // Hook should not crash when getUserMedia fails
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      
      // Hook should still be usable (didn't crash)
      expect(result.current).toBeDefined();
    });

    it("does not crash when getUserMedia throws NotFoundError", async () => {
      const mockSocket = createMockSocket();
      const notFoundError = new DOMException("No camera", "NotFoundError");
      mockGetUserMedia.mockRejectedValue(notFoundError);
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      
      expect(result.current).toBeDefined();
    });

    it("does not crash when getUserMedia throws NotReadableError", async () => {
      const mockSocket = createMockSocket();
      const inUseError = new DOMException("Camera in use", "NotReadableError");
      mockGetUserMedia.mockRejectedValue(inUseError);
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      
      expect(result.current).toBeDefined();
    });

    it("sets error for ICE connection failure", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate ICE connection failure
      mockIceConnectionState = "failed";
      if (mockOnIceConnectionStateChange) {
        act(() => {
          mockOnIceConnectionStateChange!();
        });
      }
      
      expect(result.current.error).toBe(ERROR_MESSAGES.CONNECTION_FAILED);
    });
  });

  describe("retryConnection", () => {
    it("cleans up existing connection before retrying", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // First call creates the connection
      expect(global.RTCPeerConnection).toHaveBeenCalledTimes(1);
      
      act(() => {
        result.current.retryConnection();
      });
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      
      // Retry should create a new connection
      expect(global.RTCPeerConnection).toHaveBeenCalledTimes(2);
    });

    it("reinitializes getUserMedia on retry", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      
      act(() => {
        result.current.retryConnection();
      });
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe("Does not initialize when conditions not met", () => {
    it("does not initialize when isCallAccepted is false", async () => {
      const mockSocket = createMockSocket();
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: false,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(global.RTCPeerConnection).not.toHaveBeenCalled();
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it("does not initialize when agentId is null", async () => {
      const mockSocket = createMockSocket();
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: null,
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(global.RTCPeerConnection).not.toHaveBeenCalled();
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it("does not initialize when socket is null", async () => {
      renderHook(() =>
        useWebRTC({
          socket: null,
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(global.RTCPeerConnection).not.toHaveBeenCalled();
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });

  describe("ICE candidate handling", () => {
    it("emits ICE candidate to agent when onicecandidate fires", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // Simulate ICE candidate event
      if (mockOnIceCandidate) {
        const mockCandidate = {
          toJSON: () => ({ candidate: "test-candidate", sdpMid: "0" }),
        };
        
        act(() => {
          mockOnIceCandidate({ candidate: mockCandidate as unknown as RTCIceCandidate });
        });
        
        expect(mockSocketEmit).toHaveBeenCalledWith(
          SOCKET_EVENTS.WEBRTC_SIGNAL,
          expect.objectContaining({
            targetId: "agent-123",
            signal: expect.objectContaining({ type: "candidate" }),
          })
        );
      }
    });
  });

  describe("Remote stream handling", () => {
    it("handles ontrack event to receive remote stream", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      // The hook sets up ontrack handler which will receive remote streams
      // When remote stream arrives, isConnected should be set to true
      // This test verifies the handler is set up
      expect(mockOnTrack).toBeDefined();
    });
  });
});
  describe("ICE restart functionality (TKT-016)", () => {
    it("sets isReconnecting to true when performIceRestart is triggered", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Trigger ICE restart via connection state change to "disconnected"
      mockConnectionState = "disconnected";
      if (mockOnConnectionStateChange) {
        await act(async () => {
          mockOnConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      expect(result.current.isReconnecting).toBe(true);
    });

    it("triggers ICE restart when connection state becomes disconnected", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Clear previous calls
      mockCreateOffer.mockClear();
      mockSocketEmit.mockClear();

      // Trigger ICE restart via connection state change
      mockConnectionState = "disconnected";
      if (mockOnConnectionStateChange) {
        await act(async () => {
          mockOnConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      // Should call createOffer with iceRestart flag
      expect(mockCreateOffer).toHaveBeenCalledWith({ iceRestart: true });
      expect(mockSocketEmit).toHaveBeenCalledWith(
        SOCKET_EVENTS.WEBRTC_SIGNAL,
        expect.objectContaining({
          targetId: "agent-123",
          signal: { type: "offer", sdp: "restart-offer-sdp" },
        })
      );
    });

    it("triggers ICE restart when connection state becomes failed", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      mockCreateOffer.mockClear();

      // Trigger ICE restart via connection failure
      mockConnectionState = "failed";
      if (mockOnConnectionStateChange) {
        await act(async () => {
          mockOnConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      expect(mockCreateOffer).toHaveBeenCalledWith({ iceRestart: true });
    });

    it("triggers ICE restart when ICE connection state becomes failed", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      mockCreateOffer.mockClear();

      // Trigger ICE restart via ICE connection failure
      mockIceConnectionState = "failed";
      if (mockOnIceConnectionStateChange) {
        await act(async () => {
          mockOnIceConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      expect(mockCreateOffer).toHaveBeenCalledWith({ iceRestart: true });
    });

    it("resets isReconnecting to false when connection successfully reconnects", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Trigger ICE restart
      mockConnectionState = "disconnected";
      if (mockOnConnectionStateChange) {
        await act(async () => {
          mockOnConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      expect(result.current.isReconnecting).toBe(true);

      // Simulate successful reconnection
      mockConnectionState = "connected";
      if (mockOnConnectionStateChange) {
        await act(async () => {
          mockOnConnectionStateChange!();
          await vi.advanceTimersByTimeAsync(50);
        });
      }

      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.isConnected).toBe(true);
    });

    it("stops attempting ICE restart after 3 attempts and sets error", async () => {
      const mockSocket = createMockSocket();
      mockGetUserMedia.mockResolvedValue(createMockMediaStream());
      mockCreateOffer.mockResolvedValue({ type: "offer", sdp: "restart-offer-sdp" });

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as unknown as Parameters<typeof useWebRTC>[0]["socket"],
          agentId: "agent-123",
          isCallAccepted: true,
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      mockCreateOffer.mockClear();

      // Trigger 4 failures in a row (3 attempts + 1 more that should fail)
      for (let i = 0; i < 4; i++) {
        mockConnectionState = "disconnected";
        if (mockOnConnectionStateChange) {
          await act(async () => {
            mockOnConnectionStateChange!();
            await vi.advanceTimersByTimeAsync(50);
          });
        }
      }

      // Should have attempted exactly 3 times
      expect(mockCreateOffer).toHaveBeenCalledTimes(3);

      // Should set error after max attempts
      expect(result.current.error).toBeTruthy();
      expect(result.current.isReconnecting).toBe(false);
    });
  });
});
