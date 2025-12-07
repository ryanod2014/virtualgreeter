/**
 * @vitest-environment jsdom
 *
 * WorkbenchClient Component Tests
 *
 * Tests capture the current behavior of the agent workbench:
 * - Display: Header, active call UI, away state, ready state, camera preview
 * - Actions: Accept calls, end calls, toggle mute/video
 * - Edge Cases: Non-active agent prompt, no videos warning
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Video: () => <div data-testid="video-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Coffee: () => <div data-testid="coffee-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
}));

// Mock signaling context
const mockSetBack = vi.fn();
const mockEndCall = vi.fn();
const mockSignalingContext = {
  isConnected: true,
  activeCall: null as {
    callId: string;
    visitorId: string;
    callLogId: string;
    pageUrl: string;
  } | null,
  cobrowse: {
    snapshot: null,
    mousePosition: null,
    scrollPosition: null,
    selection: null,
  },
  isMarkedAway: false,
  endCall: mockEndCall,
  setBack: mockSetBack,
  socket: null,
};

vi.mock("@/features/signaling/signaling-provider", () => ({
  useSignalingContext: () => mockSignalingContext,
}));

// Mock WebRTC hook
const mockStartScreenShare = vi.fn().mockResolvedValue(true);
const mockStopScreenShare = vi.fn();
const mockWebRTC = {
  localStream: null as MediaStream | null,
  remoteStream: null as MediaStream | null,
  screenShareStream: null,
  isConnecting: false,
  isConnected: false,
  isVisitorScreenSharing: false,
  isAgentScreenSharing: false,
  startScreenShare: mockStartScreenShare,
  stopScreenShare: mockStopScreenShare,
};

vi.mock("@/features/webrtc/use-webrtc", () => ({
  useWebRTC: () => mockWebRTC,
}));

// Mock call recording hook
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockCallRecording = {
  isRecording: false,
  recordingError: null,
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
};

vi.mock("@/features/webrtc/use-call-recording", () => ({
  useCallRecording: () => mockCallRecording,
}));

// Mock ActiveCallStage component
vi.mock("@/features/webrtc/active-call-stage", () => ({
  ActiveCallStage: ({
    call,
    onEndCall,
  }: {
    call: { callId: string };
    onEndCall: (callId: string) => void;
  }) => (
    <div data-testid="active-call-stage">
      <span data-testid="call-id">{call.callId}</span>
      <button data-testid="end-call-btn" onClick={() => onEndCall(call.callId)}>
        End Call
      </button>
    </div>
  ),
}));

// Mock CobrowseViewer component
vi.mock("@/features/cobrowse/CobrowseViewer", () => ({
  CobrowseViewer: () => <div data-testid="cobrowse-viewer">Cobrowse Viewer</div>,
}));

// Mock camera preview hook
const mockRetryPreview = vi.fn();
const mockCameraPreview = {
  stream: null as MediaStream | null,
  isLoading: false,
  error: null as string | null,
  retry: mockRetryPreview,
};

vi.mock("@/features/workbench/hooks/use-camera-preview", () => ({
  useCameraPreview: () => mockCameraPreview,
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              recording_settings: {
                enabled: true,
                retention_days: 30,
                transcription_enabled: true,
                ai_summary_enabled: true,
              },
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { WorkbenchClient } from "./workbench-client";

describe("WorkbenchClient", () => {
  const mockUser = {
    id: "user_123",
    full_name: "Test User",
    email: "test@example.com",
    avatar_url: null,
    organization_id: "org_123",
    role: "agent" as const,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockAgentProfile = {
    id: "profile_123",
    user_id: "user_123",
    display_name: "Agent Test",
    is_active: true,
    intro_video_url: "https://example.com/intro.mp4",
    loop_video_url: "https://example.com/loop.mp4",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    agentProfile: mockAgentProfile,
    user: mockUser,
    organizationId: "org_123",
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states
    mockSignalingContext.isConnected = true;
    mockSignalingContext.activeCall = null;
    mockSignalingContext.isMarkedAway = false;
    mockWebRTC.localStream = null;
    mockWebRTC.remoteStream = null;
    mockWebRTC.isConnecting = false;
    mockWebRTC.isConnected = false;
    mockCameraPreview.stream = null;
    mockCameraPreview.isLoading = false;
    mockCameraPreview.error = null;
    mockCallRecording.isRecording = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - NON-ACTIVE AGENT
  // ---------------------------------------------------------------------------

  describe("Display - Non-Active Agent", () => {
    it("shows activation prompt when agent is not active", () => {
      const inactiveAgentProfile = { ...mockAgentProfile, is_active: false };
      render(
        <WorkbenchClient {...defaultProps} agentProfile={inactiveAgentProfile} />
      );

      expect(
        screen.getByText("You're not set up to take calls")
      ).toBeInTheDocument();
    });

    it("shows Agent Settings link for inactive agents", () => {
      const inactiveAgentProfile = { ...mockAgentProfile, is_active: false };
      render(
        <WorkbenchClient {...defaultProps} agentProfile={inactiveAgentProfile} />
      );

      const settingsLink = screen.getByText("Agent Settings");
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink.closest("a")).toHaveAttribute("href", "/admin/agents");
    });

    it("still shows header for non-active agents", () => {
      const inactiveAgentProfile = { ...mockAgentProfile, is_active: false };
      render(
        <WorkbenchClient {...defaultProps} agentProfile={inactiveAgentProfile} />
      );

      expect(screen.getByText("Bullpen")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - ACTIVE AGENT
  // ---------------------------------------------------------------------------

  describe("Display - Header", () => {
    it("shows Bullpen as page title", () => {
      render(<WorkbenchClient {...defaultProps} />);
      expect(screen.getByText("Bullpen")).toBeInTheDocument();
    });

    it("shows subtitle about managing presence and calls", () => {
      render(<WorkbenchClient {...defaultProps} />);
      expect(
        screen.getByText("Manage your live presence and incoming calls")
      ).toBeInTheDocument();
    });
  });

  describe("Display - No Videos Warning", () => {
    it("shows warning when intro_video_url is missing", () => {
      const profileNoVideos = {
        ...mockAgentProfile,
        intro_video_url: null,
        loop_video_url: null,
      };
      render(<WorkbenchClient {...defaultProps} agentProfile={profileNoVideos} />);

      expect(screen.getByText("Setup Required")).toBeInTheDocument();
    });

    it("hides warning when both videos are present", () => {
      render(<WorkbenchClient {...defaultProps} />);
      expect(screen.queryByText("Setup Required")).not.toBeInTheDocument();
    });

    it("warning contains link to videos page", () => {
      const profileNoVideos = {
        ...mockAgentProfile,
        intro_video_url: null,
        loop_video_url: null,
      };
      render(<WorkbenchClient {...defaultProps} agentProfile={profileNoVideos} />);

      expect(screen.getByText("upload your videos")).toHaveAttribute(
        "href",
        "/dashboard/videos"
      );
    });
  });

  describe("Display - Away State", () => {
    it("shows away message when agent is marked away", () => {
      mockSignalingContext.isMarkedAway = true;
      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("You're Away")).toBeInTheDocument();
    });

    it("shows Go Active button when away", () => {
      mockSignalingContext.isMarkedAway = true;
      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Go Active")).toBeInTheDocument();
    });

    it("shows coffee icon when away", () => {
      mockSignalingContext.isMarkedAway = true;
      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByTestId("coffee-icon")).toBeInTheDocument();
    });
  });

  describe("Display - Ready State (No Active Call)", () => {
    it("shows Ready for Calls when connected and not on call", () => {
      mockSignalingContext.isConnected = true;
      mockSignalingContext.activeCall = null;
      mockSignalingContext.isMarkedAway = false;

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Ready for Calls")).toBeInTheDocument();
    });

    it("shows Broadcasting Live badge when connected", () => {
      mockSignalingContext.isConnected = true;
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Broadcasting Live")).toBeInTheDocument();
    });

    it("shows camera loading state", () => {
      mockCameraPreview.isLoading = true;

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Starting camera...")).toBeInTheDocument();
    });

    it("shows camera error with retry button", () => {
      mockCameraPreview.error = "Camera permission denied";

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Camera permission denied")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  describe("Display - Active Call", () => {
    it("shows ActiveCallStage when there is an active call", () => {
      mockSignalingContext.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        callLogId: "log_789",
        pageUrl: "https://example.com",
      };

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByTestId("active-call-stage")).toBeInTheDocument();
    });

    it("shows CobrowseViewer when there is an active call", () => {
      mockSignalingContext.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        callLogId: "log_789",
        pageUrl: "https://example.com",
      };

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByTestId("cobrowse-viewer")).toBeInTheDocument();
    });

    it("shows Visitor's Screen label during active call", () => {
      mockSignalingContext.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        callLogId: "log_789",
        pageUrl: "https://example.com",
      };

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Visitor's Screen")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Go Active", () => {
    it("calls setBack when Go Active button is clicked", () => {
      mockSignalingContext.isMarkedAway = true;

      render(<WorkbenchClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Go Active"));

      expect(mockSetBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - End Call", () => {
    it("calls endCall with callId when end call button clicked", () => {
      mockSignalingContext.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        callLogId: "log_789",
        pageUrl: "https://example.com",
      };

      render(<WorkbenchClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("end-call-btn"));

      expect(mockEndCall).toHaveBeenCalledWith("call_123");
    });
  });

  describe("Actions - Camera Retry", () => {
    it("calls retry when Retry button clicked on camera error", () => {
      mockCameraPreview.error = "Camera permission denied";

      render(<WorkbenchClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Retry"));

      expect(mockRetryPreview).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles null agentProfile", () => {
      // When agentProfile is null, is_active check fails (undefined === true is false)
      render(<WorkbenchClient {...defaultProps} agentProfile={null} />);

      // Should show the non-active agent prompt
      expect(
        screen.getByText("You're not set up to take calls")
      ).toBeInTheDocument();
    });

    it("uses user full_name when agentProfile display_name is missing", () => {
      const profileNoDisplayName = { ...mockAgentProfile, display_name: null };
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(
        <WorkbenchClient {...defaultProps} agentProfile={profileNoDisplayName} />
      );

      // The display name should fall back to user.full_name
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("shows Live badge when connected and has preview stream", () => {
      mockSignalingContext.isConnected = true;
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("shows agent display name in camera preview", () => {
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(<WorkbenchClient {...defaultProps} />);

      expect(screen.getByText("Agent Test")).toBeInTheDocument();
    });

    it("handles missing loop_video_url (shows warning)", () => {
      const profileMissingLoop = {
        ...mockAgentProfile,
        loop_video_url: null,
      };
      render(
        <WorkbenchClient {...defaultProps} agentProfile={profileMissingLoop} />
      );

      expect(screen.getByText("Setup Required")).toBeInTheDocument();
    });

    it("does not show camera preview when marked away", () => {
      mockSignalingContext.isMarkedAway = true;
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(<WorkbenchClient {...defaultProps} />);

      // Should show away UI, not the camera preview
      expect(screen.getByText("You're Away")).toBeInTheDocument();
      expect(screen.queryByText("Live")).not.toBeInTheDocument();
    });

    it("does not show camera preview when on active call", () => {
      mockSignalingContext.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        callLogId: "log_789",
        pageUrl: "https://example.com",
      };
      mockCameraPreview.stream = { id: "stream" } as MediaStream;

      render(<WorkbenchClient {...defaultProps} />);

      // Should show active call UI, not the waiting/preview UI
      expect(screen.getByTestId("active-call-stage")).toBeInTheDocument();
      expect(screen.queryByText("Ready for Calls")).not.toBeInTheDocument();
    });
  });

});

