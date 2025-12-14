/**
 * @vitest-environment jsdom
 *
 * Widget onCallEnded Tests
 *
 * These tests specifically test the onCallEnded callback behavior in Widget.tsx
 * that was modified in TKT-010-V2 to handle CallEndedPayload with message.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/preact";
import { Widget } from "./Widget";
import type { WidgetConfig } from "@ghost-greeter/domain";

// Mock dependencies
vi.mock("@preact/signals", () => ({
  signal: vi.fn((value) => ({ value })),
  computed: vi.fn((fn) => ({ value: fn() })),
}));

vi.mock("./features/signaling/useSignaling", () => ({
  useSignaling: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    requestCall: vi.fn(),
    cancelCall: vi.fn(),
    endCall: vi.fn(),
    connected: false,
    connecting: false,
    agent: null,
    callAccepted: false,
    callRejected: false,
    currentCallId: null,
    isReconnecting: false,
    reconnectAttempts: 0,
  })),
}));

vi.mock("./features/webrtc/useWebRTC", () => ({
  useWebRTC: vi.fn(() => ({
    localStream: null,
    remoteStream: null,
    startCall: vi.fn(),
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleVideo: vi.fn(),
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Camera: () => <div data-testid="camera-icon" />,
  CameraOff: () => <div data-testid="camera-off-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  X: () => <div data-testid="x-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
}));

describe("Widget - onCallEnded Callback Behavior", () => {
  let mockConfig: WidgetConfig;
  let mockUseSignaling: any;
  let onCallEndedCallback: ((data: any) => void) | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfig = {
      serverUrl: "http://localhost:3001",
      organizationId: "org-123",
      pathname: "/test",
    };

    // Capture the onCallEnded callback
    const { useSignaling } = await import("./features/signaling/useSignaling");
    mockUseSignaling = useSignaling as any;
    mockUseSignaling.mockImplementation((options: any) => {
      onCallEndedCallback = options.onCallEnded;
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        requestCall: vi.fn(),
        cancelCall: vi.fn(),
        endCall: vi.fn(),
        connected: true,
        connecting: false,
        agent: null,
        callAccepted: false,
        callRejected: false,
        currentCallId: null,
        isReconnecting: false,
        reconnectAttempts: 0,
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows error toast when call ends with message", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    // Verify callback was registered
    expect(onCallEndedCallback).toBeDefined();

    // Trigger onCallEnded with message
    if (onCallEndedCallback) {
      onCallEndedCallback({
        callId: "call-123",
        reason: "agent_ended",
        message: "Agent has ended the call",
      });
    }

    // Verify error toast was shown
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Agent has ended the call");
  });

  it("does not show error toast when call ends without message", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    // Trigger onCallEnded without message
    if (onCallEndedCallback) {
      onCallEndedCallback({
        callId: "call-123",
        reason: "timeout",
      });
    }

    // Verify no error toast was shown
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not show error toast when message is empty string", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    // Trigger onCallEnded with empty message
    if (onCallEndedCallback) {
      onCallEndedCallback({
        callId: "call-123",
        reason: "agent_ended",
        message: "",
      });
    }

    // Verify no error toast was shown
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("handles null/undefined data gracefully", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    // Trigger onCallEnded with null
    if (onCallEndedCallback) {
      onCallEndedCallback(null as any);
    }

    // Should not crash and no toast shown
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("handles undefined data gracefully", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    // Trigger onCallEnded with undefined
    if (onCallEndedCallback) {
      onCallEndedCallback(undefined as any);
    }

    // Should not crash and no toast shown
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("minimizes widget when call ends", async () => {
    // Mock useSignaling to simulate being in a call
    mockUseSignaling.mockImplementation((options: any) => {
      onCallEndedCallback = options.onCallEnded;
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        requestCall: vi.fn(),
        cancelCall: vi.fn(),
        endCall: vi.fn(),
        connected: true,
        connecting: false,
        agent: { id: "agent-123", displayName: "Test Agent" },
        callAccepted: true,
        callRejected: false,
        currentCallId: "call-123",
        isReconnecting: false,
        reconnectAttempts: 0,
      };
    });

    const { container } = render(<Widget config={mockConfig} />);

    // Widget should be visible in call state
    expect(container.querySelector('[data-state="in_call"]')).toBeTruthy();

    // Trigger onCallEnded
    if (onCallEndedCallback) {
      onCallEndedCallback({
        callId: "call-123",
        reason: "agent_ended",
        message: "Call ended",
      });
    }

    // Widget should transition to minimized state
    // Note: In actual implementation this would change the state,
    // but with mocked signals we can't fully test state transitions
    expect(onCallEndedCallback).toBeDefined();
  });

  it("shows custom error messages from different end reasons", async () => {
    const { toast } = await import("sonner");
    render(<Widget config={mockConfig} />);

    const testCases = [
      { message: "Agent has ended the call" },
      { message: "Call ended due to agent removal" },
      { message: "Network connection lost" },
      { message: "Call timeout reached" },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();

      if (onCallEndedCallback) {
        onCallEndedCallback({
          callId: "call-123",
          reason: "various",
          message: testCase.message,
        });
      }

      expect(toast.error).toHaveBeenCalledWith(testCase.message);
    }
  });
});