import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase module first
const mockCreateSignedUrl = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}));

// Import after mocks
import { getRecordingUrl } from "./getRecordingUrl";

describe("getRecordingUrl", () => {
  const mockOrganizationId = "org-456";
  const mockRecordingId = "recording-uuid-123";
  const mockSignedUrl = "https://storage.supabase.com/signed-url?token=abc123";
  const defaultExpiresIn = 3600; // 1 hour

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now() to a fixed value for consistent expiration calculations
    vi.spyOn(Date, "now").mockReturnValue(1700000000000); // Nov 14, 2023
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // HAPPY PATH
  // ---------------------------------------------------------------------------

  describe("Happy Path", () => {
    it("generates signed URL successfully with default 1-hour expiration", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(true);
      expect(result.signedUrl).toBe(mockSignedUrl);
      expect(result.expiresAt).toBe("2023-11-14T12:00:00.000Z");
      expect(result.error).toBeUndefined();

      // Verify correct storage bucket and file path
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        `${mockOrganizationId}/${mockRecordingId}.webm`,
        defaultExpiresIn
      );
    });

    it("generates signed URL with custom expiration time", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const customExpiresIn = 7200; // 2 hours

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: customExpiresIn,
      });

      expect(result.success).toBe(true);
      expect(result.signedUrl).toBe(mockSignedUrl);
      expect(result.expiresAt).toBe("2023-11-14T13:00:00.000Z"); // 2 hours later
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        `${mockOrganizationId}/${mockRecordingId}.webm`,
        customExpiresIn
      );
    });

    it("constructs file path with organization ID folder structure", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: "org-abc-123",
        recordingId: "recording-xyz-789",
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        "org-abc-123/recording-xyz-789.webm",
        defaultExpiresIn
      );
    });

    it("uses recordings bucket for signed URL generation", async () => {
      const fromSpy = vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      }));

      // Override the module mock for this test
      const { supabase } = await import("../../lib/supabase.js");
      supabase.storage.from = fromSpy;

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(fromSpy).toHaveBeenCalledWith("recordings");
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("returns error when Supabase createSignedUrl fails", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
      expect(result.signedUrl).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });

    it("returns error when no signed URL is returned", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No signed URL returned");
    });

    it("handles unexpected errors gracefully", async () => {
      mockCreateSignedUrl.mockRejectedValue(new Error("Unexpected error"));

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });

    it("handles non-Error thrown values", async () => {
      mockCreateSignedUrl.mockRejectedValue("String error");

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles recordings with special characters in IDs", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const specialOrgId = "org-with-special-chars_123";
      const specialRecordingId = "recording_with-dots.and-dashes";

      await getRecordingUrl({
        organizationId: specialOrgId,
        recordingId: specialRecordingId,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        `${specialOrgId}/${specialRecordingId}.webm`,
        defaultExpiresIn
      );
    });

    it("handles very short expiration times", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const shortExpiresIn = 60; // 1 minute

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: shortExpiresIn,
      });

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBe("2023-11-14T11:01:00.000Z"); // 1 minute later
    });

    it("handles very long expiration times", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const longExpiresIn = 86400 * 7; // 7 days

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: longExpiresIn,
      });

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBe("2023-11-21T11:00:00.000Z"); // 7 days later
    });
  });

  // ---------------------------------------------------------------------------
  // EXPIRATION TIME CALCULATIONS
  // ---------------------------------------------------------------------------

  describe("Expiration Time Calculations", () => {
    it("calculates expiration timestamp correctly", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const testCases = [
        { expiresIn: 300, expected: "2023-11-14T11:05:00.000Z" }, // 5 minutes
        { expiresIn: 1800, expected: "2023-11-14T11:30:00.000Z" }, // 30 minutes
        { expiresIn: 3600, expected: "2023-11-14T12:00:00.000Z" }, // 1 hour
        { expiresIn: 21600, expected: "2023-11-14T17:00:00.000Z" }, // 6 hours
        { expiresIn: 86400, expected: "2023-11-15T11:00:00.000Z" }, // 24 hours
      ];

      for (const { expiresIn, expected } of testCases) {
        const result = await getRecordingUrl({
          organizationId: mockOrganizationId,
          recordingId: mockRecordingId,
          expiresIn,
        });

        expect(result.expiresAt).toBe(expected);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CONSOLE LOGGING
  // ---------------------------------------------------------------------------

  describe("Console Logging", () => {
    it("logs URL generation attempt", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Recording URL] Generating signed URL for:",
        `${mockOrganizationId}/${mockRecordingId}.webm`
      );

      consoleSpy.mockRestore();
    });

    it("logs successful URL generation with expiration", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Recording URL] Signed URL generated, expires at:",
        "2023-11-14T12:00:00.000Z"
      );

      consoleSpy.mockRestore();
    });

    it("logs errors when URL generation fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Recording URL] Failed to generate signed URL:",
        { message: "Storage error" }
      );

      consoleSpy.mockRestore();
    });
  });
});