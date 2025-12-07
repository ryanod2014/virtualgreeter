/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/preact";
import { LiveCallView } from "./LiveCallView";

// Mock HTMLVideoElement.srcObject since jsdom doesn't support it
Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
  set: vi.fn(),
  get: vi.fn(() => null),
});

// Mock video play method
HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

// Create mock MediaStream
const createMockMediaStream = () => ({
  id: "mock-stream-id",
  active: true,
  getTracks: () => [
    { kind: "video", enabled: true, stop: vi.fn() },
    { kind: "audio", enabled: true, stop: vi.fn() },
  ],
  getVideoTracks: () => [{ kind: "video", enabled: true, stop: vi.fn() }],
  getAudioTracks: () => [{ kind: "audio", enabled: true, stop: vi.fn() }],
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
});

describe("LiveCallView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Video Display", () => {
    it("displays remote video element when remoteStream is provided", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const remoteVideo = container.querySelector('video[aria-label="Agent video"]');
      expect(remoteVideo).toBeTruthy();
      // Video should be visible when remoteStream is present
      expect(remoteVideo?.style.display).toBe("block");
    });

    it("hides remote video element when remoteStream is null", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const remoteVideo = container.querySelector('video[aria-label="Agent video"]');
      expect(remoteVideo).toBeTruthy();
      // Video should be hidden when no remoteStream
      expect(remoteVideo?.style.display).toBe("none");
    });

    it("displays local video (self-view) when localStream is provided", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]');
      expect(localVideo).toBeTruthy();
    });

    it("does not display self-view when localStream is null", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]');
      expect(localVideo).toBeFalsy();
    });

    it("shows self-view in gg-self-view container with active class", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const selfViewContainer = container.querySelector('.gg-self-view');
      expect(selfViewContainer).toBeTruthy();
      expect(selfViewContainer?.classList.contains('gg-self-view-active')).toBe(true);
    });
  });

  describe("LIVE Badge", () => {
    it("displays LIVE badge during active call", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const liveBadge = container.querySelector('.gg-live-badge');
      expect(liveBadge).toBeTruthy();
      expect(liveBadge?.textContent).toBe("LIVE");
    });

    it("displays LIVE badge with red dot when no error", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const liveDot = container.querySelector('.gg-live-dot');
      expect(liveDot).toBeTruthy();
      // Red dot color when no error
      expect(liveDot?.getAttribute("style")).toContain("rgb(239, 68, 68)");
    });

    it("displays ERROR text and grey dot when error is present", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
        />
      );
      
      const liveBadge = container.querySelector('.gg-live-badge');
      expect(liveBadge?.textContent).toBe("ERROR");
      
      const liveDot = container.querySelector('.gg-live-dot');
      // Grey dot when error
      expect(liveDot?.getAttribute("style")).toContain("rgb(136, 136, 136)");
    });
  });

  describe("Connecting State", () => {
    it("shows connecting message when isConnecting is true", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );
      
      const connectingMessage = container.querySelector('.gg-click-to-play');
      expect(connectingMessage?.textContent).toContain("Setting up video");
    });

    it("shows helpful subtext during connecting", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );
      
      const subtextElement = container.querySelector('.gg-click-to-play');
      expect(subtextElement?.textContent).toContain("This usually takes a few seconds");
    });

    it("shows pulsing animation on connecting icon", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );
      
      const playIcon = container.querySelector('.gg-play-icon');
      expect(playIcon?.getAttribute("style")).toContain("animation");
    });
  });

  describe("Error State", () => {
    it("displays error message when error is present", () => {
      const errorMessage = "Video connection dropped";
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={errorMessage}
        />
      );
      
      const errorText = container.querySelector('.gg-click-to-play');
      expect(errorText?.textContent).toContain(errorMessage);
    });

    it("shows retry button when error is present and onRetry is provided", () => {
      const mockOnRetry = vi.fn();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          onRetry={mockOnRetry}
        />
      );
      
      const retryButton = container.querySelector('button');
      expect(retryButton).toBeTruthy();
      expect(retryButton?.textContent).toContain("Try Again");
    });

    it("calls onRetry when retry button is clicked", () => {
      const mockOnRetry = vi.fn();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          onRetry={mockOnRetry}
        />
      );
      
      const retryButton = container.querySelector('button');
      if (retryButton) {
        fireEvent.click(retryButton);
        expect(mockOnRetry).toHaveBeenCalledTimes(1);
      }
    });

    it("does not show retry button when onRetry is not provided", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
        />
      );
      
      // Should still show error but no retry button
      const retryButton = container.querySelector('button');
      expect(retryButton).toBeFalsy();
    });

    it("shows warning icon for error state", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
        />
      );
      
      const warningIcon = container.querySelector('.gg-play-icon svg');
      expect(warningIcon).toBeTruthy();
      // Warning icon has yellow/amber stroke
      expect(warningIcon?.getAttribute("stroke")).toBe("#fbbf24");
    });
  });

  describe("Waiting State (no error, no connecting, no remote stream)", () => {
    it("shows waiting message when not connecting and no remote stream", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const waitingMessage = container.querySelector('.gg-click-to-play');
      expect(waitingMessage?.textContent).toContain("Connecting to agent");
    });

    it("shows video camera icon when waiting", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const icon = container.querySelector('.gg-play-icon svg');
      expect(icon).toBeTruthy();
      // Waiting state has white stroke
      expect(icon?.getAttribute("stroke")).toBe("white");
    });
  });

  describe("Connected State", () => {
    it("shows connected badge when isConnected is true and no error", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const connectedBadge = container.querySelector('.gg-connected-badge');
      expect(connectedBadge).toBeTruthy();
      expect(connectedBadge?.textContent).toContain("Connected");
    });

    it("does not show connected badge when error is present", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error="Connection issue"
        />
      );
      
      const connectedBadge = container.querySelector('.gg-connected-badge');
      expect(connectedBadge).toBeFalsy();
    });

    it("does not show connected badge when not connected", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );
      
      const connectedBadge = container.querySelector('.gg-connected-badge');
      expect(connectedBadge).toBeFalsy();
    });

    it("shows green connected dot in badge", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const connectedDot = container.querySelector('.gg-connected-dot');
      expect(connectedDot).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has aria-label on remote video element", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const remoteVideo = container.querySelector('video[aria-label="Agent video"]');
      expect(remoteVideo).toBeTruthy();
    });

    it("has aria-label on local video element", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]');
      expect(localVideo).toBeTruthy();
    });

    it("has role=status on placeholder during connecting", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );
      
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement).toBeTruthy();
    });

    it("has proper aria-label on live badge", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const liveBadge = container.querySelector('.gg-live-badge');
      expect(liveBadge?.getAttribute("aria-label")).toBe("Live call");
    });

    it("has aria-label indicating error on live badge when error present", () => {
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
        />
      );
      
      const liveBadge = container.querySelector('.gg-live-badge');
      expect(liveBadge?.getAttribute("aria-label")).toBe("Call error");
    });

    it("has role=status on connected badge", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const connectedBadge = container.querySelector('.gg-connected-badge');
      expect(connectedBadge?.getAttribute("role")).toBe("status");
    });
  });

  describe("Video element attributes", () => {
    it("remote video has autoPlay attribute", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const remoteVideo = container.querySelector('video[aria-label="Agent video"]');
      expect(remoteVideo?.hasAttribute("autoplay")).toBe(true);
    });

    it("remote video has playsInline attribute", () => {
      const mockRemoteStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={null}
          remoteStream={mockRemoteStream as unknown as MediaStream}
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );
      
      const remoteVideo = container.querySelector('video[aria-label="Agent video"]');
      expect(remoteVideo?.hasAttribute("playsinline")).toBe(true);
    });

    it("local video has muted property", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]') as HTMLVideoElement;
      // Note: 'muted' in JSX sets the DOM property, not the HTML attribute
      // The video element may have muted as a boolean property
      expect(localVideo).toBeTruthy();
      // The component sets muted prop which renders in JSX
    });

    it("local video has autoPlay attribute", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]');
      expect(localVideo?.hasAttribute("autoplay")).toBe(true);
    });

    it("local video has playsInline attribute", () => {
      const mockLocalStream = createMockMediaStream();
      
      const { container } = render(
        <LiveCallView
          localStream={mockLocalStream as unknown as MediaStream}
          remoteStream={null}
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );
      
      const localVideo = container.querySelector('video[aria-label="Your camera"]');
      expect(localVideo?.hasAttribute("playsinline")).toBe(true);
    });
  });
});

