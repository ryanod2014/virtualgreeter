import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase module
const mockCreateSignedUrl = vi.fn();

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: mockCreateSignedUrl,
    })),
  },
};

vi.mock("../../lib/supabase", () => ({
  supabase: mockSupabase,
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
      expect(result.error).toBeUndefined();
    });

    it("returns ISO timestamp for when URL expires", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.expiresAt).toBeDefined();
      expect(typeof result.expiresAt).toBe("string");
      // Should be a valid ISO date string
      expect(() => new Date(result.expiresAt!)).not.toThrow();
    });

    it("calls Supabase with correct bucket name and file path", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith("recordings");
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        `${mockOrganizationId}/${mockRecordingId}.webm`,
        defaultExpiresIn
      );
    });

    it("uses default expiration of 3600 seconds when not specified", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        3600
      );
    });

    it("accepts custom expiration time", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const customExpiresIn = 7200; // 2 hours

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: customExpiresIn,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        7200
      );
    });

    it("calculates correct expiration timestamp", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const now = Date.now();
      const expiresIn = 3600;

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn,
      });

      const expectedExpiresAt = new Date(now + expiresIn * 1000).toISOString();
      expect(result.expiresAt).toBe(expectedExpiresAt);
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR CASES
  // ---------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("returns error when Supabase is not configured", async () => {
      // Temporarily mock supabase as null
      const originalSupabase = mockSupabase;
      vi.doMock("../../lib/supabase", () => ({
        supabase: null,
      }));

      const { getRecordingUrl: getRecordingUrlWithNullSupabase } = await import(
        "./getRecordingUrl"
      );

      const result = await getRecordingUrlWithNullSupabase({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Supabase not configured");
      expect(result.signedUrl).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();

      // Restore
      vi.doMock("../../lib/supabase", () => ({
        supabase: originalSupabase,
      }));
    });

    it("returns error when Supabase createSignedUrl fails", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "File not found" },
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
      expect(result.signedUrl).toBeUndefined();
    });

    it("returns error when no signed URL is returned in data", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: null },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No signed URL returned");
    });

    it("returns error when data is null", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
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
      mockCreateSignedUrl.mockRejectedValue(new Error("Network error"));

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
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
    it("handles very short expiration times", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: 60, // 1 minute
      });

      expect(result.success).toBe(true);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        60
      );
    });

    it("handles very long expiration times", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: 86400, // 24 hours
      });

      expect(result.success).toBe(true);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        86400
      );
    });

    it("handles zero expiration time", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn: 0,
      });

      expect(result.success).toBe(true);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.any(String), 0);
    });

    it("handles organization IDs with special characters", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: "org-abc_123-xyz",
        recordingId: mockRecordingId,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        "org-abc_123-xyz/recording-uuid-123.webm",
        defaultExpiresIn
      );
    });

    it("handles recording IDs with special characters", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: "rec_123-abc-xyz_456",
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        "org-456/rec_123-abc-xyz_456.webm",
        defaultExpiresIn
      );
    });
  });

  // ---------------------------------------------------------------------------
  // FILE PATH FORMAT
  // ---------------------------------------------------------------------------

  describe("File Path Format", () => {
    it("constructs path with organization ID and recording ID", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: "my-org",
        recordingId: "my-recording",
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        "my-org/my-recording.webm",
        expect.any(Number)
      );
    });

    it("always appends .webm extension", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.stringMatching(/\.webm$/),
        expect.any(Number)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EXPIRATION TIMESTAMP
  // ---------------------------------------------------------------------------

  describe("Expiration Timestamp", () => {
    it("expiration is exactly expiresIn seconds in the future", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const now = 1700000000000; // Fixed time from beforeEach
      const expiresIn = 1800; // 30 minutes

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
        expiresIn,
      });

      const expiresAtTime = new Date(result.expiresAt!).getTime();
      const expectedExpiresAtTime = now + expiresIn * 1000;

      expect(expiresAtTime).toBe(expectedExpiresAtTime);
    });

    it("returns ISO 8601 formatted timestamp", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const result = await getRecordingUrl({
        organizationId: mockOrganizationId,
        recordingId: mockRecordingId,
      });

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(result.expiresAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
