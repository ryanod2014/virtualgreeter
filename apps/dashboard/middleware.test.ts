import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the updateSession function from supabase middleware
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

import { middleware } from "./middleware";
import { updateSession } from "@/lib/supabase/middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock NextRequest
  function createMockRequest(path: string): NextRequest {
    return new NextRequest(`http://localhost:3000${path}`);
  }

  describe("middleware function", () => {
    it("calls updateSession with the request", async () => {
      const mockResponse = { status: 200 };
      (updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest("/dashboard");
      const response = await middleware(request);

      expect(updateSession).toHaveBeenCalledWith(request);
      expect(response).toBe(mockResponse);
    });

    it("passes through the response from updateSession", async () => {
      const mockRedirectResponse = {
        status: 307,
        headers: new Headers({ location: "http://localhost:3000/login" }),
      };
      (updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockRedirectResponse);

      const request = createMockRequest("/admin");
      const response = await middleware(request);

      expect(response).toBe(mockRedirectResponse);
    });

    it("handles async updateSession correctly", async () => {
      const mockResponse = { status: 200 };
      (updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest("/settings");
      const response = await middleware(request);

      expect(updateSession).toHaveBeenCalledTimes(1);
      expect(response).toBe(mockResponse);
    });
  });

  describe("middleware config", () => {
    // Import the config to test the matcher pattern
    it("exports a matcher config", async () => {
      const { config } = await import("./middleware");
      
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
    });

    it("matcher excludes static files (_next/static)", async () => {
      const { config } = await import("./middleware");
      const pattern = config.matcher[0];
      
      // The pattern should exclude _next/static
      expect(pattern).toContain("_next/static");
    });

    it("matcher excludes image optimization files (_next/image)", async () => {
      const { config } = await import("./middleware");
      const pattern = config.matcher[0];
      
      expect(pattern).toContain("_next/image");
    });

    it("matcher excludes favicon.ico", async () => {
      const { config } = await import("./middleware");
      const pattern = config.matcher[0];
      
      expect(pattern).toContain("favicon.ico");
    });

    it("matcher excludes common image file extensions", async () => {
      const { config } = await import("./middleware");
      const pattern = config.matcher[0];
      
      expect(pattern).toContain("svg");
      expect(pattern).toContain("png");
      expect(pattern).toContain("jpg");
      expect(pattern).toContain("jpeg");
      expect(pattern).toContain("gif");
      expect(pattern).toContain("webp");
    });

    it("matcher excludes api routes", async () => {
      const { config } = await import("./middleware");
      const pattern = config.matcher[0];
      
      expect(pattern).toContain("api");
    });
  });
});




