import { randomUUID } from "crypto";
import { supabase } from "../../lib/supabase.js";

interface UploadRecordingOptions {
  organizationId: string;
  callLogId: string;
  blob: Buffer;
  contentType: string;
}

interface UploadRecordingResult {
  success: boolean;
  recordingId?: string;
  error?: string;
}

/**
 * Uploads a recording to the private Supabase storage bucket with a randomized UUID.
 * This prevents predictable URL patterns and enhances security.
 *
 * @param options - Upload options including org ID, call log ID, blob data, and content type
 * @returns Result object with success status and recording ID or error
 */
export async function uploadRecording({
  organizationId,
  callLogId,
  blob,
  contentType,
}: UploadRecordingOptions): Promise<UploadRecordingResult> {
  if (!supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    // Generate a random UUID for the recording to prevent predictable URLs
    const recordingId = randomUUID();

    // Store in org folder with randomized filename
    // Path format: {organizationId}/{recordingId}.webm
    const filePath = `${organizationId}/${recordingId}.webm`;

    console.log("[Recording Upload] Uploading to private bucket:", filePath);

    // Upload to private recordings bucket
    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Recording Upload] Upload failed:", uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    // Update call log with the recording ID (not the full URL)
    // The actual signed URL will be generated on-demand when needed
    const { error: updateError } = await supabase
      .from("call_logs")
      .update({
        recording_url: recordingId, // Store just the ID, not the full URL
      })
      .eq("id", callLogId);

    if (updateError) {
      console.error("[Recording Upload] Failed to update call log:", updateError);
      // Upload succeeded but DB update failed - log but don't fail the whole operation
      // The recording exists and can be manually linked if needed
    }

    console.log("[Recording Upload] Upload successful. Recording ID:", recordingId);

    return {
      success: true,
      recordingId,
    };
  } catch (err) {
    console.error("[Recording Upload] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
