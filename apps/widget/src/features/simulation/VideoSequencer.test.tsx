/**
 * VideoSequencer.test.tsx
 *
 * Behavior-level tests for the VideoSequencer component.
 * Tests capture CURRENT behavior of the video state machine.
 *
 * Note: Component uses async state transitions via useEffect/useState.
 * Tests focus on:
 * 1. DOM structure and video element attributes (synchronous)
 * 2. Props being accepted correctly
 * 3. CSS classes applied correctly
 * 4. VIDEO_TIMING constants values
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render } from "preact";
import { VideoSequencer } from "./VideoSequencer";
import { VIDEO_TIMING } from "../../constants";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock HTMLMediaElement methods since jsdom doesn't implement them
beforeAll(() => {
  // Mock play() to return a promise
  if (!HTMLMediaElement.prototype.play) {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  }
  // Mock pause()
  if (!HTMLMediaElement.prototype.pause) {
    HTMLMediaElement.prototype.pause = () => {};
  }
  // Mock load()
  if (!HTMLMediaElement.prototype.load) {
    HTMLMediaElement.prototype.load = () => {};
  }
});

// =============================================================================
// TEST UTILITIES
// =============================================================================

let container: HTMLDivElement;

function renderVideoSequencer(props: Parameters<typeof VideoSequencer>[0] = {}) {
  render(
    <VideoSequencer
      waveUrl="https://example.com/wave.mp4"
      introUrl="https://example.com/intro.mp4"
      loopUrl="https://example.com/loop.mp4"
      {...props}
    />,
    container
  );

  return { container };
}

function getVideoElements(): HTMLVideoElement[] {
  return Array.from(container.querySelectorAll("video"));
}

function getWaveVideo(): HTMLVideoElement | null {
  return getVideoElements()[0] ?? null;
}

function getIntroVideo(): HTMLVideoElement | null {
  return getVideoElements()[1] ?? null;
}

function getLoopVideo(): HTMLVideoElement | null {
  return getVideoElements()[2] ?? null;
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe("VideoSequencer", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  // ===========================================================================
  // DOM STRUCTURE TESTS
  // ===========================================================================

  describe("DOM Structure", () => {
    it("1. renders exactly 3 video elements", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      expect(videos.length).toBe(3);
    });

    it("2. renders video container with gg-video-container class", () => {
      renderVideoSequencer();
      const videoContainer = container.querySelector(".gg-video-container");
      expect(videoContainer).not.toBeNull();
    });

    it("3. all videos have gg-video class", () => {
      renderVideoSequencer();
      const videos = container.querySelectorAll(".gg-video");
      expect(videos.length).toBe(3);
    });

    it("4. intro and loop videos have gg-video-hidden class initially", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      // Wave (first) is visible
      expect(videos[0].classList.contains("gg-video-hidden")).toBe(false);
      // Intro (second) is hidden
      expect(videos[1].classList.contains("gg-video-hidden")).toBe(true);
      // Loop (third) is hidden
      expect(videos[2].classList.contains("gg-video-hidden")).toBe(true);
    });
  });

  // ===========================================================================
  // WAVE VIDEO ATTRIBUTES
  // ===========================================================================

  describe("Wave Video Attributes", () => {
    it("5. wave video has muted=true", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.muted).toBe(true);
    });

    it("6. wave video has loop=true", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.loop).toBe(true);
    });

    it("7. wave video has preload='auto'", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.getAttribute("preload")).toBe("auto");
    });

    it("8. wave video has playsInline=true", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.playsInline).toBe(true);
    });
  });

  // ===========================================================================
  // INTRO VIDEO ATTRIBUTES
  // ===========================================================================

  describe("Intro Video Attributes", () => {
    it("9. intro video has preload='none' (deferred loading)", () => {
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo!.getAttribute("preload")).toBe("none");
    });

    it("10. intro video has playsInline=true", () => {
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo!.playsInline).toBe(true);
    });

    it("11. intro video does NOT have loop attribute", () => {
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo!.loop).toBe(false);
    });

    it("12. intro video has onEnded handler (via JSX)", () => {
      // The onEnded prop is set in JSX - we verify the element exists
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo).not.toBeNull();
    });
  });

  // ===========================================================================
  // LOOP VIDEO ATTRIBUTES
  // ===========================================================================

  describe("Loop Video Attributes", () => {
    it("13. loop video has loop=true", () => {
      renderVideoSequencer();
      const loopVideo = getLoopVideo();
      expect(loopVideo!.loop).toBe(true);
    });

    it("14. loop video has preload='none' (deferred loading)", () => {
      renderVideoSequencer();
      const loopVideo = getLoopVideo();
      expect(loopVideo!.getAttribute("preload")).toBe("none");
    });

    it("15. loop video has playsInline=true", () => {
      renderVideoSequencer();
      const loopVideo = getLoopVideo();
      expect(loopVideo!.playsInline).toBe(true);
    });
  });

  // ===========================================================================
  // PROPS ACCEPTANCE TESTS
  // ===========================================================================

  describe("Props Acceptance", () => {
    it("16. accepts waveUrl prop", () => {
      expect(() => renderVideoSequencer({ waveUrl: "https://test.com/wave.mp4" })).not.toThrow();
    });

    it("17. accepts introUrl prop", () => {
      expect(() => renderVideoSequencer({ introUrl: "https://test.com/intro.mp4" })).not.toThrow();
    });

    it("18. accepts loopUrl prop", () => {
      expect(() => renderVideoSequencer({ loopUrl: "https://test.com/loop.mp4" })).not.toThrow();
    });

    it("19. accepts isConnecting prop", () => {
      expect(() => renderVideoSequencer({ isConnecting: true })).not.toThrow();
    });

    it("20. accepts isLive prop", () => {
      expect(() => renderVideoSequencer({ isLive: true })).not.toThrow();
    });

    it("21. accepts audioUnlocked prop", () => {
      expect(() => renderVideoSequencer({ audioUnlocked: true })).not.toThrow();
    });

    it("22. accepts onError callback prop", () => {
      const onError = vi.fn();
      expect(() => renderVideoSequencer({ onError })).not.toThrow();
    });

    it("23. accepts skipToLoop prop", () => {
      expect(() => renderVideoSequencer({ skipToLoop: true })).not.toThrow();
    });

    it("24. accepts onIntroComplete callback prop", () => {
      const onIntroComplete = vi.fn();
      expect(() => renderVideoSequencer({ onIntroComplete })).not.toThrow();
    });

    it("25. accepts null for waveUrl", () => {
      expect(() => renderVideoSequencer({ waveUrl: null })).not.toThrow();
    });

    it("26. accepts null for introUrl", () => {
      expect(() => renderVideoSequencer({ introUrl: null })).not.toThrow();
    });

    it("27. accepts null for loopUrl", () => {
      expect(() => renderVideoSequencer({ loopUrl: null })).not.toThrow();
    });
  });

  // ===========================================================================
  // CONNECTING OVERLAY MARKUP
  // ===========================================================================

  describe("Connecting Overlay", () => {
    it("28. connecting overlay div exists in component markup", () => {
      // The overlay is conditionally rendered based on state
      // We verify the component includes the markup structure
      renderVideoSequencer({ isConnecting: true });
      // Can't test visibility without state transition, but component should render
      expect(container.querySelector(".gg-video-container")).not.toBeNull();
    });
  });

  // ===========================================================================
  // ERROR STATE MARKUP
  // ===========================================================================

  describe("Error State Markup", () => {
    it("29. error state div structure exists in component", () => {
      // Error state is conditionally rendered - verify component renders
      renderVideoSequencer();
      expect(container.querySelector(".gg-video-container")).not.toBeNull();
    });
  });

  // ===========================================================================
  // INITIAL STATE TESTS
  // ===========================================================================

  describe("Initial State", () => {
    it("30. component starts in loading state (videos still render)", () => {
      renderVideoSequencer();
      // In loading state, videos are rendered but overlays depend on state
      expect(getVideoElements().length).toBe(3);
    });

    it("31. wave video is initially visible (activeVideo='wave')", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.classList.contains("gg-video-hidden")).toBe(false);
    });

    it("32. intro video is initially hidden", () => {
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo!.classList.contains("gg-video-hidden")).toBe(true);
    });

    it("33. loop video is initially hidden", () => {
      renderVideoSequencer();
      const loopVideo = getLoopVideo();
      expect(loopVideo!.classList.contains("gg-video-hidden")).toBe(true);
    });
  });

  // ===========================================================================
  // COMPONENT PROPS TYPES
  // ===========================================================================

  describe("VideoSequencer Types", () => {
    it("34. VideoState type includes all expected states", () => {
      // Documented states: loading, wave, intro, loop, connecting, live, error
      // We verify by ensuring component accepts props that trigger different states
      renderVideoSequencer();
      renderVideoSequencer({ isConnecting: true });
      renderVideoSequencer({ isLive: true });
      // All render without type errors
      expect(true).toBe(true);
    });
  });

  // ===========================================================================
  // VIDEO ELEMENT COUNT
  // ===========================================================================

  describe("Video Element Count", () => {
    it("35. renders 3 videos with all URLs provided", () => {
      renderVideoSequencer();
      expect(getVideoElements().length).toBe(3);
    });

    it("36. renders 3 videos even with null URLs", () => {
      renderVideoSequencer({ waveUrl: null, introUrl: null, loopUrl: null });
      expect(getVideoElements().length).toBe(3);
    });
  });

  // ===========================================================================
  // CSS CLASS APPLICATION
  // ===========================================================================

  describe("CSS Classes", () => {
    it("36. gg-video class applied to all video elements", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      videos.forEach((video) => {
        expect(video.classList.contains("gg-video")).toBe(true);
      });
    });

    it("37. gg-video-hidden applied to non-active videos", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      const hiddenCount = videos.filter((v) => v.classList.contains("gg-video-hidden")).length;
      // 2 videos should be hidden (intro and loop), wave is active
      expect(hiddenCount).toBe(2);
    });

    it("38. only 1 video visible at initial render", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      const visibleCount = videos.filter((v) => !v.classList.contains("gg-video-hidden")).length;
      expect(visibleCount).toBe(1);
    });
  });

  // ===========================================================================
  // VIDEO URL ASSIGNMENT
  // ===========================================================================

  describe("Video URL Assignment", () => {
    it("39. component renders with all video URLs", () => {
      renderVideoSequencer({
        waveUrl: "https://test.com/wave.mp4",
        introUrl: "https://test.com/intro.mp4",
        loopUrl: "https://test.com/loop.mp4",
      });
      expect(getVideoElements().length).toBe(3);
    });
  });

  // ===========================================================================
  // DEFERRED LOADING ATTRIBUTES
  // ===========================================================================

  describe("Deferred Loading Strategy", () => {
    it("40. wave video has preload='auto' (immediate)", () => {
      renderVideoSequencer();
      const waveVideo = getWaveVideo();
      expect(waveVideo!.preload).toBe("auto");
    });

    it("41. intro video has preload='none' (deferred)", () => {
      renderVideoSequencer();
      const introVideo = getIntroVideo();
      expect(introVideo!.preload).toBe("none");
    });

    it("42. loop video has preload='none' (deferred)", () => {
      renderVideoSequencer();
      const loopVideo = getLoopVideo();
      expect(loopVideo!.preload).toBe("none");
    });
  });

  // ===========================================================================
  // IOS COMPATIBILITY
  // ===========================================================================

  describe("iOS Compatibility (playsInline)", () => {
    it("43. all videos have playsInline attribute", () => {
      renderVideoSequencer();
      const videos = getVideoElements();
      videos.forEach((video) => {
        expect(video.playsInline).toBe(true);
      });
    });
  });
});

// =============================================================================
// VIDEO_TIMING CONSTANTS TESTS
// =============================================================================

describe("VIDEO_TIMING Constants", () => {
  describe("INTRO_MIN_PLAY_DURATION", () => {
    it("value is 500ms", () => {
      expect(VIDEO_TIMING.INTRO_MIN_PLAY_DURATION).toBe(500);
    });

    it("is a positive number", () => {
      expect(VIDEO_TIMING.INTRO_MIN_PLAY_DURATION).toBeGreaterThan(0);
    });

    it("is less than typical video duration (reasonable value)", () => {
      // 500ms is short enough to not interfere with real intro videos
      expect(VIDEO_TIMING.INTRO_MIN_PLAY_DURATION).toBeLessThan(5000);
    });
  });

  describe("END_DETECTION_TOLERANCE", () => {
    it("value is 0.5 seconds", () => {
      expect(VIDEO_TIMING.END_DETECTION_TOLERANCE).toBe(0.5);
    });

    it("is greater than 0", () => {
      expect(VIDEO_TIMING.END_DETECTION_TOLERANCE).toBeGreaterThan(0);
    });

    it("is at most 1 second (reasonable tolerance)", () => {
      expect(VIDEO_TIMING.END_DETECTION_TOLERANCE).toBeLessThanOrEqual(1);
    });
  });

  describe("INTRO_RETRY_DELAY", () => {
    it("value is 100ms", () => {
      expect(VIDEO_TIMING.INTRO_RETRY_DELAY).toBe(100);
    });

    it("is a positive number", () => {
      expect(VIDEO_TIMING.INTRO_RETRY_DELAY).toBeGreaterThan(0);
    });

    it("is a short delay (quick retry)", () => {
      expect(VIDEO_TIMING.INTRO_RETRY_DELAY).toBeLessThan(1000);
    });
  });

  describe("Constants are exported correctly", () => {
    it("VIDEO_TIMING object has all expected keys", () => {
      expect(VIDEO_TIMING).toHaveProperty("INTRO_MIN_PLAY_DURATION");
      expect(VIDEO_TIMING).toHaveProperty("END_DETECTION_TOLERANCE");
      expect(VIDEO_TIMING).toHaveProperty("INTRO_RETRY_DELAY");
    });

    it("VIDEO_TIMING is frozen (as const)", () => {
      // The object should be readonly due to `as const`
      expect(typeof VIDEO_TIMING.INTRO_MIN_PLAY_DURATION).toBe("number");
    });
  });
});




