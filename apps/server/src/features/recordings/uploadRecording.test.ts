import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomUUID } from "crypto";

// Mock the crypto module
vi.mock("crypto", () => ({
  randomUUID: vi.fn(),
}));

// Mock Supabase module
const mockUpload = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
      })),
    },
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

// Import after mocks
import { uploadRecording } from "./uploadRecording";
import { supabase } from "../../lib/supabase";

describe("uploadRecording", () => {
  const mockRecordingId = "recording-uuid-123";
  const mockOrganizationId = "org-456";
  const mockCallLogId = "call-789";
  const mockBlob = Buffer.from("mock video data");
  const mockContentType = "video/webm";

  beforeEach(() => {
    vi.clearAllMocks();
    (randomUUID as ReturnType<typeof vi.fn>).mockReturnValue(mockRecordingId);
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // HAPPY PATH
  // ---------------------------------------------------------------------------

  describe("Happy Path", () => {
    it("uploads recording successfully with randomized UUID", async () => {
      mockUpload.mockResolvedValue({ error: null });

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(result.success).toBe(true);
      expect(result.recordingId).toBe(mockRecordingId);
      expect(result.error).toBeUndefined();
    });

    it("generates a random UUID for the recording", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    it("uploads to private recordings bucket with correct path format", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(supabase!.storage.from).toHaveBeenCalledWith("recordings");
      expect(mockUpload).toHaveBeenCalledWith(
        `${mockOrganizationId}/${mockRecordingId}.webm`,
        mockBlob,
        {
          contentType: mockContentType,
          upsert: false,
        }
      );
    });

    it("updates call log with recording ID after successful upload", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(supabase!.from).toHaveBeenCalledWith("call_logs");
      expect(mockUpdate).toHaveBeenCalledWith({
        recording_url: mockRecordingId,
      });
      expect(mockEq).toHaveBeenCalledWith("id", mockCallLogId);
    });

    it("stores only recording ID in database, not full URL", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        recording_url: mockRecordingId,
      });
      // Verify it's not a URL
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          recording_url: expect.stringContaining("http"),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR CASES
  // ---------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("returns error when upload fails", async () => {
      mockUpload.mockResolvedValue({
        error: { message: "Storage upload failed" },
      });

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage upload failed");
      expect(result.recordingId).toBeUndefined();
    });

    it("does not update call log when upload fails", async () => {
      mockUpload.mockResolvedValue({
        error: { message: "Storage upload failed" },
      });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns success when upload succeeds but DB update fails", async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockEq.mockResolvedValue({ error: { message: "DB update failed" } });

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      // Upload succeeded, so overall operation is still considered successful
      expect(result.success).toBe(true);
      expect(result.recordingId).toBe(mockRecordingId);
    });

    it("handles unexpected errors gracefully", async () => {
      mockUpload.mockRejectedValue(new Error("Unexpected error"));

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
      expect(result.recordingId).toBeUndefined();
    });

    it("handles non-Error thrown values", async () => {
      mockUpload.mockRejectedValue("String error");

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles empty blob", async () => {
      mockUpload.mockResolvedValue({ error: null });

      const emptyBlob = Buffer.from("");

      const result = await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: emptyBlob,
        contentType: mockContentType,
      });

      expect(result.success).toBe(true);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        emptyBlob,
        expect.any(Object)
      );
    });

    it("handles different content types", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: "video/mp4",
      });

      expect(mockUpload).toHaveBeenCalledWith(expect.any(String), mockBlob, {
        contentType: "video/mp4",
        upsert: false,
      });
    });

    it("uses upsert: false to prevent overwriting existing recordings", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          upsert: false,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // FILE PATH FORMAT
  // ---------------------------------------------------------------------------

  describe("File Path Format", () => {
    it("creates path with organization ID folder structure", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: "org-abc-123",
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^org-abc-123\//),
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it("always uses .webm extension regardless of content type", async () => {
      mockUpload.mockResolvedValue({ error: null });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: mockCallLogId,
        blob: mockBlob,
        contentType: "video/mp4", // Different content type
      });

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/\.webm$/),
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it("generates unique file paths for different recordings in same org", async () => {
      mockUpload.mockResolvedValue({ error: null });

      (randomUUID as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce("uuid-1")
        .mockReturnValueOnce("uuid-2");

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: "call-1",
        blob: mockBlob,
        contentType: mockContentType,
      });

      await uploadRecording({
        organizationId: mockOrganizationId,
        callLogId: "call-2",
        blob: mockBlob,
        contentType: mockContentType,
      });

      expect(mockUpload).toHaveBeenNthCalledWith(
        1,
        `${mockOrganizationId}/uuid-1.webm`,
        expect.any(Buffer),
        expect.any(Object)
      );

      expect(mockUpload).toHaveBeenNthCalledWith(
        2,
        `${mockOrganizationId}/uuid-2.webm`,
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });
});
