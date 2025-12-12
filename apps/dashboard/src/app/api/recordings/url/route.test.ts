import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/recordings/url", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockRecordingId = "recording-uuid-123";
  const mockSignedUrl = "https://storage.supabase.com/signed-url?token=abc123";
  const fixedTimestamp = 1700000000000; // Nov 14, 2023

  // Supabase mock helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockCreateSignedUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(fixedTimestamp);

    // Setup default mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockCreateSignedUrl = vi.fn();

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    // Setup Supabase client mock
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockAuthGetUser },
      from: vi.fn(() => ({
        select: mockSelect,
      })),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: mockCreateSignedUrl,
        })),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a mock request
  function createMockRequest(body: object): NextRequest {
    return new NextRequest("http://localhost:3000/api/recordings/url", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ---------------------------------------------------------------------------
  // HAPPY PATH
  // ---------------------------------------------------------------------------

  describe("Happy Path", () => {
    it("generates signed URL successfully with default expiration", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.signedUrl).toBe(mockSignedUrl);
      expect(responseData.expiresAt).toBeDefined();
    });

    it("uses default expiration of 3600 seconds (1 hour)", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      await POST(request);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        3600
      );
    });

    it("accepts custom expiration time", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({
        recordingId: mockRecordingId,
        expiresIn: 7200,
      });
      await POST(request);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.any(String), 7200);
    });

    it("creates signed URL for correct file path (org/recording.webm)", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      await POST(request);

      const supabase = await createClient();
      expect(supabase.storage.from).toHaveBeenCalledWith("recordings");
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        `${mockOrgId}/${mockRecordingId}.webm`,
        expect.any(Number)
      );
    });

    it("returns ISO timestamp for URL expiration", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.expiresAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("verifies recording belongs to user's organization", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      await POST(request);

      // Verify organization check in call_logs query
      expect(mockSelect).toHaveBeenCalledWith("recording_url, organization_id");
      expect(mockEq).toHaveBeenCalledWith("recording_url", mockRecordingId);
      expect(mockEq).toHaveBeenCalledWith("organization_id", mockOrgId);
    });
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------

  describe("Authentication", () => {
    it("returns 401 if user is not authenticated", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });

    it("returns 401 if auth error occurs", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth failed" },
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 404 if user not found in database", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("User not found");
    });

    it("returns 404 if user database error occurs", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  describe("Validation", () => {
    it("returns 400 if recordingId is missing", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });

      const request = createMockRequest({});
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Missing required field: recordingId");
    });

    it("returns 404 if recording not found", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Recording not found or access denied");
    });

    it("returns 404 if recording database error occurs", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "DB error" },
        });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // AUTHORIZATION
  // ---------------------------------------------------------------------------

  describe("Authorization", () => {
    it("denies access to recording from different organization", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: "different-org-789", // Different org!
          },
          error: null,
        });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);

      // Query should fail due to organization_id mismatch in .eq()
      expect(response.status).toBe(404);
    });

    it("allows access only when user's org matches recording's org", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId, // Same org
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("returns 500 when storage createSignedUrl fails", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "File not found" },
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("File not found");
    });

    it("returns 500 when no signed URL is returned", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("No signed URL returned");
    });

    it("handles unexpected errors gracefully", async () => {
      mockSingle.mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Unexpected error");
    });

    it("handles non-Error thrown values", async () => {
      mockSingle.mockRejectedValue("String error");

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Unknown error");
    });
  });

  // ---------------------------------------------------------------------------
  // EXPIRATION CALCULATION
  // ---------------------------------------------------------------------------

  describe("Expiration Calculation", () => {
    it("calculates correct expiration timestamp for default 1 hour", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const request = createMockRequest({ recordingId: mockRecordingId });
      const response = await POST(request);
      const responseData = await response.json();

      const expectedExpiresAt = new Date(
        fixedTimestamp + 3600 * 1000
      ).toISOString();
      expect(responseData.expiresAt).toBe(expectedExpiresAt);
    });

    it("calculates correct expiration timestamp for custom expiration", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            recording_url: mockRecordingId,
            organization_id: mockOrgId,
          },
          error: null,
        });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      const customExpiresIn = 7200; // 2 hours
      const request = createMockRequest({
        recordingId: mockRecordingId,
        expiresIn: customExpiresIn,
      });
      const response = await POST(request);
      const responseData = await response.json();

      const expectedExpiresAt = new Date(
        fixedTimestamp + customExpiresIn * 1000
      ).toISOString();
      expect(responseData.expiresAt).toBe(expectedExpiresAt);
    });
  });
});
