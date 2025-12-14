/**
 * API Route: Retry Failed Transcription
 * POST /api/transcription/retry
 * 
 * Allows manual retry of permanently failed transcriptions.
 * Only available for transcriptions that have exhausted automatic retries.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RecordingSettings } from "@ghost-greeter/domain/database.types";

const TRANSCRIPTION_COST_PER_MIN = 0.01;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 4000, 16000];

const NON_RETRIABLE_ERRORS = [
  "DEEPGRAM_API_KEY not configured",
  "No transcription returned from Deepgram",
  "audio too short",
  "invalid audio format",
  "unsupported audio",
  "audio duration is 0",
];

interface TranscriptionResult {
  success: boolean;
  transcription?: string;
  durationSeconds?: number;
  error?: string;
}

interface RetryAttempt {
  attempt: number;
  timestamp: string;
  error: string;
}

function isNonRetriableError(error: string): boolean {
  const lowerError = error.toLowerCase();
  return NON_RETRIABLE_ERRORS.some(pattern => lowerError.includes(pattern.toLowerCase()));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function transcribeWithDeepgram(audioUrl: string): Promise<TranscriptionResult> {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) return { success: false, error: "DEEPGRAM_API_KEY not configured" };

  try {
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true",
      {
        method: "POST",
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: audioUrl }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Retry] Deepgram API error:", response.status, errorText);
      return { success: false, error: `Deepgram API error: ${response.status}` };
    }

    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const durationSeconds = result.metadata?.duration;

    if (!transcript) return { success: false, error: "No transcription returned from Deepgram" };
    return { success: true, transcription: transcript, durationSeconds };
  } catch (error) {
    console.error("[Retry] Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { callLogId } = await request.json();
    if (!callLogId) return NextResponse.json({ error: "callLogId is required" }, { status: 400 });

    const supabase = await createClient();

    const { data: callLog, error: callError } = await supabase
      .from("call_logs")
      .select(`id, organization_id, recording_url, duration_seconds, transcription_status, transcription_retry_count, transcription_retry_log, organizations!inner(recording_settings)`)
      .eq("id", callLogId)
      .single();

    if (callError || !callLog) {
      console.error("[Retry] Failed to fetch call log:", callError);
      return NextResponse.json({ error: "Call log not found" }, { status: 404 });
    }

    if (callLog.transcription_status !== "failed") {
      return NextResponse.json({ error: "Transcription is not in failed state" }, { status: 400 });
    }

    // Only allow manual retry if automatic retries have been exhausted
    if ((callLog.transcription_retry_count || 0) < 3) {
      return NextResponse.json({ error: "Automatic retries not yet exhausted" }, { status: 400 });
    }

    const recordingSettings = (callLog as any).organizations?.recording_settings as RecordingSettings | null;
    if (!recordingSettings?.transcription_enabled) {
      return NextResponse.json({ error: "Transcription not enabled for organization" }, { status: 400 });
    }

    if (!callLog.recording_url) return NextResponse.json({ error: "No recording URL" }, { status: 400 });

    let existingRetryLog: RetryAttempt[] = [];
    try {
      if (callLog.transcription_retry_log) existingRetryLog = JSON.parse(callLog.transcription_retry_log as string);
    } catch { existingRetryLog = []; }

    console.log(`[Retry] Manual retry initiated for call ${callLogId}`);

    await supabase.from("call_logs").update({ transcription_status: "processing" }).eq("id", callLogId);

    const retryLog: RetryAttempt[] = [];
    let lastError = "";
    let success = false;
    let transcription: string | undefined;
    let durationSeconds: number | undefined;
    let totalAttempts = 0;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      totalAttempts = attempt;
      console.log(`[Retry] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for call ${callLogId}`);

      const result = await transcribeWithDeepgram(callLog.recording_url);

      if (result.success) {
        console.log(`[Retry] Success on attempt ${attempt}`);
        success = true;
        transcription = result.transcription;
        durationSeconds = result.durationSeconds;
        break;
      }

      lastError = result.error || "Unknown error";
      retryLog.push({ attempt, timestamp: new Date().toISOString(), error: lastError });
      console.log(`[Retry] Attempt ${attempt} failed:`, lastError);

      if (isNonRetriableError(lastError)) {
        console.log("[Retry] Non-retriable error, stopping retries");
        break;
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1];
        console.log(`[Retry] Waiting ${delayMs}ms before next attempt...`);
        await sleep(delayMs);
      }
    }

    const combinedRetryLog = [...existingRetryLog, ...retryLog];
    const totalRetryCount = (callLog.transcription_retry_count || 0) + totalAttempts;

    if (success && transcription) {
      const durationMinutes = (durationSeconds || callLog.duration_seconds || 0) / 60;
      const transcriptionCost = durationMinutes * TRANSCRIPTION_COST_PER_MIN;

      await supabase.from("call_logs").update({
        transcription, transcription_status: "completed", transcription_duration_seconds: durationSeconds,
        transcription_cost: transcriptionCost, transcribed_at: new Date().toISOString(),
        transcription_retry_count: totalRetryCount, transcription_retry_log: JSON.stringify(combinedRetryLog),
      }).eq("id", callLogId);

      await supabase.from("usage_records").insert({
        organization_id: callLog.organization_id, call_log_id: callLogId,
        usage_type: "transcription", duration_seconds: durationSeconds || 0, cost: transcriptionCost,
      });

      console.log(`[Retry] Transcription saved successfully for call ${callLogId}`);
      return NextResponse.json({
        success: true, message: "Transcription completed successfully",
        transcription: { status: "completed", cost: transcriptionCost, durationSeconds, totalAttempts: totalRetryCount },
      });
    } else {
      await supabase.from("call_logs").update({
        transcription_status: "failed", transcription_error: lastError,
        transcription_retry_count: totalRetryCount, transcription_retry_log: JSON.stringify(combinedRetryLog),
      }).eq("id", callLogId);

      console.log(`[Retry] Transcription failed again for call ${callLogId}: ${lastError}`);
      return NextResponse.json({ success: false, error: lastError, totalAttempts: totalRetryCount, retryLog: combinedRetryLog });
    }
  } catch (error) {
    console.error("[Retry] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
