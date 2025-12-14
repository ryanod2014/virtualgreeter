import { supabase } from "../../lib/supabase";

interface GetRecordingUrlOptions {
  organizationId: string;
  recordingId: string;
  expiresIn?: number; // Expiration time in seconds (default 1 hour)
}

interface GetRecordingUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresAt?: string; // ISO timestamp when the URL expires
  error?: string;
}

/**
 * Generates a signed URL for a recording with a time-limited expiration.
 * This ensures recordings are only accessible with a valid, non-expired URL.
 *
 * @param options - Options including org ID, recording ID, and optional expiration time
 * @returns Result object with signed URL and expiration time or error
 */
export async function getRecordingUrl({
  organizationId,
  recordingId,
  expiresIn = 3600, // Default 1 hour (3600 seconds)
}: GetRecordingUrlOptions): Promise<GetRecordingUrlResult> {
  if (!supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    // Construct the file path: {organizationId}/{recordingId}.webm
    const filePath = `${organizationId}/${recordingId}.webm`;

    console.log("[Recording URL] Generating signed URL for:", filePath);

    // Create a signed URL that expires in the specified time
    const { data, error } = await supabase.storage
      .from("recordings")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("[Recording URL] Failed to generate signed URL:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data?.signedUrl) {
      return {
        success: false,
        error: "No signed URL returned",
      };
    }

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log("[Recording URL] Signed URL generated, expires at:", expiresAt);

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt,
    };
  } catch (err) {
    console.error("[Recording URL] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
