/**
 * Transcription Processing with Auto-Retry
 * 
 * Handles transcription with exponential backoff retry logic (1s, 4s, 16s).
 * Distinguishes between retriable and non-retriable errors.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 4000, 16000]; // 1s, 4s, 16s exponential backoff

// Non-retriable error patterns - these errors won't benefit from retry
const NON_RETRIABLE_ERRORS = [
  "DEEPGRAM_API_KEY not configured",
  "No transcription returned from Deepgram", // Empty/silent audio
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

interface ProcessingResult {
  success: boolean;
  transcription?: string;
  durationSeconds?: number;
  error?: string;
  totalAttempts: number;
  retryLog: RetryAttempt[];
  isPermanentlyFailed: boolean;
}

/**
 * Check if an error is non-retriable (shouldn't be retried)
 */
function isNonRetriableError(error: string): boolean {
  const lowerError = error.toLowerCase();
  return NON_RETRIABLE_ERRORS.some(pattern => 
    lowerError.includes(pattern.toLowerCase())
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attempt transcription with Deepgram
 */
async function transcribeWithDeepgram(audioUrl: string): Promise<TranscriptionResult> {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    return { success: false, error: "DEEPGRAM_API_KEY not configured" };
  }

  try {
    console.log("[Transcription] Calling Deepgram API for:", audioUrl);

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcription] Deepgram API error:", response.status, errorText);
      return { success: false, error: `Deepgram API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json() as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
      metadata?: { duration?: number };
    };

    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const durationSeconds = result.metadata?.duration;

    if (!transcript) {
      return { success: false, error: "No transcription returned from Deepgram" };
    }

    console.log("[Transcription] Success, duration:", durationSeconds, "seconds");

    return {
      success: true,
      transcription: transcript,
      durationSeconds: durationSeconds,
    };
  } catch (error) {
    console.error("[Transcription] Network/fetch error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Process transcription with automatic retry and exponential backoff
 */
export async function processTranscriptionWithRetry(audioUrl: string): Promise<ProcessingResult> {
  const retryLog: RetryAttempt[] = [];
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    console.log(`[Transcription] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for:`, audioUrl);

    const result = await transcribeWithDeepgram(audioUrl);

    if (result.success) {
      console.log(`[Transcription] Success on attempt ${attempt}`);
      return {
        success: true,
        transcription: result.transcription,
        durationSeconds: result.durationSeconds,
        totalAttempts: attempt,
        retryLog,
        isPermanentlyFailed: false,
      };
    }

    lastError = result.error || "Unknown error";
    retryLog.push({
      attempt,
      timestamp: new Date().toISOString(),
      error: lastError,
    });

    console.log(`[Transcription] Attempt ${attempt} failed:`, lastError);

    if (isNonRetriableError(lastError)) {
      console.log("[Transcription] Non-retriable error detected, skipping remaining retries");
      return {
        success: false,
        error: lastError,
        totalAttempts: attempt,
        retryLog,
        isPermanentlyFailed: true,
      };
    }

    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1] || 1000;
      console.log(`[Transcription] Waiting ${delayMs}ms before retry...`);
      await sleep(delayMs);
    }
  }

  console.log("[Transcription] All retry attempts exhausted");
  return {
    success: false,
    error: lastError,
    totalAttempts: MAX_RETRY_ATTEMPTS,
    retryLog,
    isPermanentlyFailed: true,
  };
}

/**
 * Update call log with transcription result and retry information
 */
export async function updateCallLogTranscription(
  supabase: SupabaseClient,
  callLogId: string,
  result: ProcessingResult,
  transcriptionCost?: number
): Promise<void> {
  if (result.success) {
    await supabase
      .from("call_logs")
      .update({
        transcription: result.transcription,
        transcription_status: "completed",
        transcription_duration_seconds: result.durationSeconds,
        transcription_cost: transcriptionCost,
        transcribed_at: new Date().toISOString(),
        transcription_retry_count: result.totalAttempts - 1,
        transcription_retry_log: result.retryLog.length > 0 ? JSON.stringify(result.retryLog) : null,
      })
      .eq("id", callLogId);
  } else {
    await supabase
      .from("call_logs")
      .update({
        transcription_status: "failed",
        transcription_error: result.error,
        transcription_retry_count: result.totalAttempts,
        transcription_retry_log: JSON.stringify(result.retryLog),
      })
      .eq("id", callLogId);
  }
}

/**
 * Check if a transcription should allow manual retry
 */
export function canRetryTranscription(
  transcriptionStatus: string | null,
  retryCount: number | null
): boolean {
  return transcriptionStatus === "failed" && (retryCount || 0) >= MAX_RETRY_ATTEMPTS;
}

/**
 * Get retry configuration for external use
 */
export function getRetryConfig() {
  return {
    maxAttempts: MAX_RETRY_ATTEMPTS,
    delaysMs: RETRY_DELAYS_MS,
    nonRetriablePatterns: NON_RETRIABLE_ERRORS,
  };
}
