/**
 * API Route: Upload Recording
 * POST /api/recordings/upload
 *
 * Uploads a call recording to the private Supabase storage bucket with a randomized UUID.
 * This replaces the client-side upload to prevent predictable URL patterns.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Parse form data
    const formData = await request.formData();
    const blob = formData.get("blob") as Blob;
    const callLogId = formData.get("callLogId") as string;
    const contentType = formData.get("contentType") as string || "video/webm";

    if (!blob || !callLogId) {
      return NextResponse.json(
        { error: "Missing required fields: blob and callLogId" },
        { status: 400 }
      );
    }

    // Generate a random UUID for the recording to prevent predictable URLs
    const recordingId = randomUUID();

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store in org folder with randomized filename
    // Path format: {organizationId}/{recordingId}.webm
    const filePath = `${organizationId}/${recordingId}.webm`;

    console.log("[Recording Upload API] Uploading to private bucket:", filePath);

    // Upload to private recordings bucket
    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Recording Upload API] Upload failed:", uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Update call log with the recording ID (not the full URL)
    // The actual signed URL will be generated on-demand when needed
    const { error: updateError } = await supabase
      .from("call_logs")
      .update({
        recording_url: recordingId, // Store just the ID, not the full URL
      })
      .eq("id", callLogId)
      .eq("organization_id", organizationId); // Security: ensure user owns this call log

    if (updateError) {
      console.error("[Recording Upload API] Failed to update call log:", updateError);
      return NextResponse.json(
        { error: "Failed to update call log" },
        { status: 500 }
      );
    }

    console.log("[Recording Upload API] Upload successful. Recording ID:", recordingId);

    return NextResponse.json({
      success: true,
      recordingId,
    });
  } catch (err) {
    console.error("[Recording Upload API] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
