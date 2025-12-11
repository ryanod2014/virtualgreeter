/**
 * @vitest-environment jsdom
 * 
 * ActiveCallStage Component Tests
 * 
 * Tests for the Agent Active Call UI component behavior.
 * Note: These are simplified unit tests focusing on render logic.
 * Complex WebRTC behaviors are tested via integration tests.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ActiveCall } from "@ghost-greeter/domain";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
  Video: () => <div data-testid="video-icon" />,
  VideoOff: () => <div data-testid="video-off-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  MonitorUp: () => <div data-testid="monitor-up-icon" />,
  MonitorOff: () => <div data-testid="monitor-off-icon" />,
}));

import { ActiveCallStage } from "./active-call-stage";

describe("ActiveCallStage", () => {
  // Mock data
  const mockCall: ActiveCall = {
    callId: "call_123",
    visitorId: "visitor_456",
    agentId: "agent_789",
    startedAt: Date.now() - 65000, // 65 seconds ago
    endedAt: null,
    orgId: "org_test",
    pageUrl: "/test-page",
  };

  // Helper to create mock MediaStream
  function createMockMediaStream(): MediaStream {
    const audioTrack = {
      kind: "audio" as const,
      enabled: true,
      stop: vi.fn(),
    };
    const videoTrack = {
      kind: "video" as const,
      enabled: true,
      stop: vi.fn(),
    };

    return {
      getTracks: () => [audioTrack, videoTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [videoTrack],
      id: `stream_${Math.random().toString(36).slice(2)}`,
    } as unknown as MediaStream;
  }

  // Default props
  const defaultProps = {
    call: mockCall,
    localStream: null,
    remoteStream: null,
    screenShareStream: null,
    isConnecting: false,
    isConnected: false,
    isVisitorScreenSharing: false,
    isAgentScreenSharing: false,
    isRecording: false,
    onStartScreenShare: vi.fn().mockResolvedValue(true),
    onStopScreenShare: vi.fn(),
    onEndCall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display", () => {
    it("shows LIVE badge when component renders", () => {
      render(<ActiveCallStage {...defaultProps} />);
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("shows Connected badge when isConnected is true", () => {
      render(<ActiveCallStage {...defaultProps} isConnected={true} />);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("does not show Connected badge when isConnected is false", () => {
      render(<ActiveCallStage {...defaultProps} isConnected={false} />);
      expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    });

    it("shows Recording badge when isRecording is true", () => {
      render(<ActiveCallStage {...defaultProps} isRecording={true} />);
      expect(screen.getByText("Recording")).toBeInTheDocument();
    });

    it("does not show Recording badge when isRecording is false", () => {
      render(<ActiveCallStage {...defaultProps} isRecording={false} />);
      expect(screen.queryByText("Recording")).not.toBeInTheDocument();
    });

    it("shows Connecting spinner when isConnecting is true and no remoteStream", () => {
      render(<ActiveCallStage {...defaultProps} isConnecting={true} />);
      expect(screen.getByText("Connecting to visitor...")).toBeInTheDocument();
    });

    it("shows Waiting for visitor video when not connecting and no remoteStream", () => {
      render(
        <ActiveCallStage
          {...defaultProps}
          isConnecting={false}
          remoteStream={null}
        />
      );
      expect(
        screen.getByText("Waiting for visitor video...")
      ).toBeInTheDocument();
    });

    it("shows You're Sharing badge when isAgentScreenSharing is true", () => {
      render(<ActiveCallStage {...defaultProps} isAgentScreenSharing={true} />);
      expect(screen.getByText("You're Sharing")).toBeInTheDocument();
    });

    it("shows Visitor Sharing badge when isVisitorScreenSharing is true", () => {
      const screenShareStream = createMockMediaStream();
      render(
        <ActiveCallStage
          {...defaultProps}
          isVisitorScreenSharing={true}
          screenShareStream={screenShareStream}
        />
      );
      expect(screen.getByText("Visitor Sharing")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CONTROLS BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Controls", () => {
    it("end call button calls onEndCall with callId", () => {
      const onEndCall = vi.fn();
      render(<ActiveCallStage {...defaultProps} onEndCall={onEndCall} />);

      // Find end call button (has PhoneOff icon)
      const buttons = screen.getAllByRole("button");
      const endCallButton = buttons.find(btn => 
        btn.querySelector('[data-testid="phone-off-icon"]')
      );
      
      if (endCallButton) {
        fireEvent.click(endCallButton);
        expect(onEndCall).toHaveBeenCalledWith("call_123");
      }
    });

    it("mute button toggles audio track enabled state", () => {
      const localStream = createMockMediaStream();
      const audioTrack = localStream.getAudioTracks()[0];

      render(<ActiveCallStage {...defaultProps} localStream={localStream} />);

      // Find mute button (first button with mic icon)
      const buttons = screen.getAllByRole("button");
      const muteButton = buttons.find(btn => 
        btn.querySelector('[data-testid="mic-icon"]') || 
        btn.querySelector('[data-testid="mic-off-icon"]')
      );
      
      if (muteButton) {
        fireEvent.click(muteButton);
        expect(audioTrack.enabled).toBe(false);
      }
    });

    it("video button toggles video track enabled state", () => {
      const localStream = createMockMediaStream();
      const videoTrack = localStream.getVideoTracks()[0];

      render(<ActiveCallStage {...defaultProps} localStream={localStream} />);

      // Find video button
      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn => 
        btn.querySelector('[data-testid="video-icon"]') || 
        btn.querySelector('[data-testid="video-off-icon"]')
      );
      
      if (videoButton) {
        fireEvent.click(videoButton);
        expect(videoTrack.enabled).toBe(false);
      }
    });

    it("screen share button shows MonitorOff icon when sharing", () => {
      render(<ActiveCallStage {...defaultProps} isAgentScreenSharing={true} />);
      expect(screen.getByTestId("monitor-off-icon")).toBeInTheDocument();
    });

    it("screen share button shows MonitorUp icon when not sharing", () => {
      render(<ActiveCallStage {...defaultProps} isAgentScreenSharing={false} />);
      expect(screen.getByTestId("monitor-up-icon")).toBeInTheDocument();
    });

    it("does not throw when toggling mute with null localStream", () => {
      render(<ActiveCallStage {...defaultProps} localStream={null} />);
      const buttons = screen.getAllByRole("button");
      const muteButton = buttons.find(btn => 
        btn.querySelector('[data-testid="mic-icon"]')
      );
      
      if (muteButton) {
        // Should not throw
        expect(() => fireEvent.click(muteButton)).not.toThrow();
      }
    });

    it("does not throw when toggling video with null localStream", () => {
      render(<ActiveCallStage {...defaultProps} localStream={null} />);
      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn => 
        btn.querySelector('[data-testid="video-icon"]')
      );
      
      if (videoButton) {
        // Should not throw
        expect(() => fireEvent.click(videoButton)).not.toThrow();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // TIMER BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Timer", () => {
    it("shows initial timer value of 00:00 before first interval fires", () => {
      render(<ActiveCallStage {...defaultProps} />);

      const timerText = screen.getByText(/\d{2}:\d{2}/);
      expect(timerText).toBeInTheDocument();
      // Timer starts at 0 and updates via setInterval
      expect(timerText.textContent).toBe("00:00");
    });

    it("updates timer after first interval fires", async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const callStartedAt = now - 5000; // 5 seconds ago
      const call = { ...mockCall, startedAt: callStartedAt };

      render(<ActiveCallStage {...defaultProps} call={call} />);

      let timerText = screen.getByText(/\d{2}:\d{2}/);
      expect(timerText.textContent).toBe("00:00"); // Initial state

      // Advance timer by 1 second to trigger first interval
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      timerText = screen.getByText(/\d{2}:\d{2}/);
      // Should now show the calculated duration (5 seconds from start + 1 second elapsed = 6)
      expect(timerText.textContent).toBe("00:06");
    });

    it("formats duration with minutes and seconds", async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const callStartedAt = now - 65000; // 1 min 5 sec ago
      const call = { ...mockCall, startedAt: callStartedAt };

      render(<ActiveCallStage {...defaultProps} call={call} />);

      // Advance timer to trigger interval
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      const timerText = screen.getByText(/\d{2}:\d{2}/);
      // Should show 66 seconds = 01:06
      expect(timerText.textContent).toBe("01:06");
    });

    it("updates timer every second", async () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const callStartedAt = now - 5000; // 5 seconds ago
      const call = { ...mockCall, startedAt: callStartedAt };

      render(<ActiveCallStage {...defaultProps} call={call} />);

      // Advance timer to trigger first interval
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      let timerText = screen.getByText(/\d{2}:\d{2}/);
      expect(timerText.textContent).toBe("00:06");

      // Advance timer by 3 more seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      timerText = screen.getByText(/\d{2}:\d{2}/);
      // Timer should update with real time progression: 5 + 4 = 9 seconds
      expect(timerText.textContent).toBe("00:09");
    });

    it("clears interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = render(<ActiveCallStage {...defaultProps} />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // FULLSCREEN
  // ---------------------------------------------------------------------------

  describe("Fullscreen", () => {
    it("shows Maximize2 icon when not fullscreen", () => {
      render(<ActiveCallStage {...defaultProps} />);
      expect(screen.getByTestId("maximize-icon")).toBeInTheDocument();
    });
  });
});




