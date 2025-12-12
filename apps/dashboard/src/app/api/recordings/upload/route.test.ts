import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

// Mock crypto module
vi.mock("crypto", () => ({
  randomUUID: vi.fn(),
}));

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/recordings/upload", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockCallLogId = "call-789";
  const mockRecordingId = "recording-uuid-123";

  // Supabase mock helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockStorageUpload: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (randomUUID as ReturnType<typeof vi.fn>).mockReturnValue(mockRecordingId);

    // Setup default mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockStorageUpload = vi.fn();
    mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    // Setup Supabase client mock
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockAuthGetUser },
      from: vi.fn((tableName: string) => {
        if (tableName === "users") {
          return { select: mockSelect };
        }
        if (tableName === "call_logs") {
          return { update: mockUpdate };
        }
        return { select: mockSelect };
      }),
      storage: {
        from: vi.fn(() => ({
          upload: mockStorageUpload,
        })),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a mock request with FormData
  function createMockRequest(
    blob: Blob | null,
    callLogId: string | null,
    contentType: string | null = "video/webm"
  ): NextRequest {
    const formData = new FormData();
    if (blob) formData.append("blob", blob);
    if (callLogId) formData.append("callLogId", callLogId);
    if (contentType) formData.append("contentType", contentType);

    return new NextRequest("http://localhost:3000/api/recordings/upload", {
      method: "POST",
      body: formData,
    });
  }

  // ---------------------------------------------------------------------------
  // HAPPY PATH
  // ---------------------------------------------------------------------------

  describe("Happy Path", () => {
    it("uploads recording successfully and returns recording ID", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.recordingId).toBe(mockRecordingId);
    });

    it("generates randomized UUID for recording filename", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    it("uploads to private recordings bucket with org/uuid.webm path", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      const supabase = await createClient();
      expect(supabase.storage.from).toHaveBeenCalledWith("recordings");
      expect(mockStorageUpload).toHaveBeenCalledWith(
        `${mockOrgId}/${mockRecordingId}.webm`,
        expect.any(Buffer),
        {
          contentType: "video/webm",
          upsert: false,
        }
      );
    });

    it("updates call log with recording ID only (not full URL)", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith({
        recording_url: mockRecordingId,
      });
    });

    it("enforces organization ownership on call log update", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const mockEqChain = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({
        eq: vi.fn((field, value) => {
          if (field === "id") {
            return { eq: mockEqChain };
          }
          return mockEqChain;
        }),
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      const updateResult = mockUpdate.mock.results[0].value;
      expect(updateResult.eq).toHaveBeenCalledWith("id", mockCallLogId);
      expect(updateResult.eq).toHaveBeenCalledWith("organization_id", mockOrgId);
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

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
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

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 404 if user not found in database", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("User not found");
    });

    it("returns 404 if user database error occurs", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  describe("Validation", () => {
    it("returns 400 if blob is missing", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });

      const request = createMockRequest(null, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Missing required fields: blob and callLogId");
    });

    it("returns 400 if callLogId is missing", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, null, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Missing required fields: blob and callLogId");
    });

    it("uses default content type if not provided", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, null);
      await POST(request);

      expect(mockStorageUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: "video/webm",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("returns 500 when storage upload fails", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({
        error: { message: "Storage full" },
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Storage full");
    });

    it("does not update call log if upload fails", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({
        error: { message: "Upload failed" },
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns 500 when call log update fails", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB update failed" } }),
      });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to update call log");
    });

    it("handles unexpected errors gracefully", async () => {
      mockSingle.mockRejectedValue(new Error("Unexpected error"));

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Unexpected error");
    });

    it("handles non-Error thrown values", async () => {
      mockSingle.mockRejectedValue("String error");

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Unknown error");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles empty blob", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob([], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("handles different content types", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/mp4" });
      const request = createMockRequest(blob, mockCallLogId, "video/mp4");
      await POST(request);

      expect(mockStorageUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: "video/mp4",
        })
      );
    });

    it("uses upsert: false to prevent overwriting", async () => {
      mockSingle.mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });
      mockStorageUpload.mockResolvedValue({ error: null });

      const blob = new Blob(["test data"], { type: "video/webm" });
      const request = createMockRequest(blob, mockCallLogId, "video/webm");
      await POST(request);

      expect(mockStorageUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          upsert: false,
        })
      );
    });
  });
});
