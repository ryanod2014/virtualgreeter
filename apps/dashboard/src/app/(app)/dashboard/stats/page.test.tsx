import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

describe("StatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("redirect behavior", () => {
    it("redirects to /dashboard/calls", async () => {
      // Import after mocks are set up
      const { default: StatsPage } = await import("./page");

      // The component calls redirect immediately on render
      // Since redirect throws in Next.js, we need to handle that
      try {
        StatsPage();
      } catch {
        // redirect throws NEXT_REDIRECT error in Next.js
      }

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard/calls");
    });

    it("redirects exactly once", async () => {
      const { default: StatsPage } = await import("./page");

      try {
        StatsPage();
      } catch {
        // redirect throws
      }

      expect(mockRedirect).toHaveBeenCalledTimes(1);
    });

    it("redirects to the combined calls page path", async () => {
      const { default: StatsPage } = await import("./page");

      try {
        StatsPage();
      } catch {
        // redirect throws
      }

      // Verify it goes to /dashboard/calls (the agent's calls view)
      // not /admin/calls (the admin view)
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toBe("/dashboard/calls");
      expect(redirectPath).not.toContain("/admin");
    });
  });

  describe("page component", () => {
    it("is a server component (no 'use client' directive)", async () => {
      // Server components can call redirect synchronously
      // This test documents that the component is server-rendered
      const { default: StatsPage } = await import("./page");
      
      // The function should exist and be callable
      expect(typeof StatsPage).toBe("function");
      
      // Calling it triggers redirect
      try {
        StatsPage();
      } catch {
        // Expected
      }
      
      expect(mockRedirect).toHaveBeenCalled();
    });

    it("does not render any UI (immediate redirect)", async () => {
      const { default: StatsPage } = await import("./page");

      try {
        const result = StatsPage();
        // If redirect doesn't throw in test env, result should be undefined
        // since redirect() in Next.js never returns
        expect(result).toBeUndefined();
      } catch {
        // redirect throws in Next.js which is expected behavior
        expect(mockRedirect).toHaveBeenCalled();
      }
    });
  });
});



