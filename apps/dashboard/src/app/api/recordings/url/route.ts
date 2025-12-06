/**
 * API Route: Get Recording URL
 * POST /api/recordings/url
 *
 * Generates a signed URL for a recording with 1-hour expiration.
 * This ensures recordings are only accessible with a valid, non-expired URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_EXPIRATION = 3600; // 1 hour in seconds

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const organizationId = userData.organization_id;

    // Parse request body
    const body = await request.json();
    const { recordingId, expiresIn = DEFAULT_EXPIRATION } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: "Missing required field: recordingId" },
        { status: 400 }
      );
    }

    // Verify the recording belongs to the user's organization
    const { data: callLog, error: callLogError } = await supabase
      .from("call_logs")
      .select("recording_url, organization_id")
      .eq("recording_url", recordingId)
      .eq("organization_id", organizationId)
      .single();

    if (callLogError || !callLog) {
      return NextResponse.json(
        { error: "Recording not found or access denied" },
        { status: 404 }
      );
    }

    // Construct the file path: {organizationId}/{recordingId}.webm
    const filePath = `${organizationId}/${recordingId}.webm`;

    console.log("[Recording URL API] Generating signed URL for:", filePath);

    // Create a signed URL that expires in the specified time
    const { data, error } = await supabase.storage
      .from("recordings")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("[Recording URL API] Failed to generate signed URL:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        { error: "No signed URL returned" },
        { status: 500 }
      );
    }

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log("[Recording URL API] Signed URL generated, expires at:", expiresAt);

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresAt,
    });
  } catch (err) {
    console.error("[Recording URL API] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
