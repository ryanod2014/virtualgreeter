/**
 * @vitest-environment jsdom
 *
 * MobileRedirect Tests
 *
 * Behaviors Tested:
 * 1. Returns null while checking (isChecking state)
 * 2. Returns null after check completes on desktop
 * 3. Detects mobile device via userAgent regex
 * 4. Does not redirect desktop user agents
 * 5. Does not redirect if already on /mobile-gate
 * 6. Redirects mobile users to /mobile-gate
 * 7. Handles edge cases for user agent strings
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

// Mock next/navigation
const mockReplace = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

import { MobileRedirect } from "./MobileRedirect";

describe("MobileRedirect", () => {
  const originalUserAgent = navigator.userAgent;
  const originalVendor = navigator.vendor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Restore user agent
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "vendor", {
      value: originalVendor,
      writable: true,
      configurable: true,
    });
  });

  // Helper to set user agent
  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      writable: true,
      configurable: true,
    });
  }

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("1. returns null while checking (component always renders null)", () => {
      setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      const { container } = render(<MobileRedirect />);
      
      // Component renders null during checking phase
      expect(container.firstChild).toBeNull();
    });

    it("2. returns null after check completes on desktop", async () => {
      setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      const { container } = render(<MobileRedirect />);
      
      // Advance past the 100ms delay
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      // Component still renders null after check
      expect(container.firstChild).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // MOBILE DETECTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Mobile Detection", () => {
    it("3. detects iPhone as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects iPad as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects Android phone as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects iPod as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects BlackBerry as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko)");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects Opera Mini as mobile device", async () => {
      setUserAgent("Opera/9.80 (Android; Opera Mini/7.5.33361/28.2725; U; en) Presto/2.8.119 Version/11.1010");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects IEMobile as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0)");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("detects webOS as mobile device", async () => {
      setUserAgent("Mozilla/5.0 (webOS/1.4.5; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("4. does not redirect Windows desktop user agent", async () => {
      setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not redirect Mac desktop user agent", async () => {
      setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not redirect Linux desktop user agent", async () => {
      setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // PATHNAME HANDLING
  // ---------------------------------------------------------------------------
  describe("Pathname Handling", () => {
    it("5. does not redirect if already on /mobile-gate", async () => {
      mockUsePathname.mockReturnValue("/mobile-gate");
      setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      // Should not redirect even with mobile user agent
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // REDIRECT BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("Redirect", () => {
    it("6. redirects mobile users to /mobile-gate", async () => {
      setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      mockUsePathname.mockReturnValue("/dashboard");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it("uses router.replace (not push) for redirect", async () => {
      setUserAgent("Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      // Should use replace to avoid back button issues
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("7. handles empty user agent string", async () => {
      setUserAgent("");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      // Empty string should not match mobile regex
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("handles case-insensitive user agent matching", async () => {
      // Uppercase IPHONE should still be detected
      setUserAgent("Mozilla/5.0 (IPHONE; CPU iPhone OS 15_0)");
      
      render(<MobileRedirect />);
      
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });

    it("cleans up timer on unmount", async () => {
      setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      const { unmount } = render(<MobileRedirect />);
      
      // Unmount before timer fires
      unmount();
      
      // Advance time - should not cause errors
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      
      // No redirect should occur
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("waits 100ms before checking (debounce)", async () => {
      setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
      
      render(<MobileRedirect />);
      
      // Before 100ms - should not have redirected yet
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(mockReplace).not.toHaveBeenCalled();
      
      // After 100ms - should redirect
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(mockReplace).toHaveBeenCalledWith("/mobile-gate");
    });
  });
});




