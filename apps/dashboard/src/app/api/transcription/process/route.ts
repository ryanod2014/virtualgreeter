/**
 * API Route: Process Call Transcription
 * POST /api/transcription/process
 * 
 * Triggers transcription and AI summary processing for a completed call recording.
 * Called automatically after a recording is uploaded.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RecordingSettings } from "@ghost-greeter/domain/database.types";

// Pricing constants (2x API costs)
const TRANSCRIPTION_COST_PER_MIN = 0.01; // ~2x Deepgram Nova-2
const AI_SUMMARY_COST_PER_MIN = 0.02; // ~2x LLM token costs

// Default AI summary format
const DEFAULT_AI_SUMMARY_FORMAT = `## Summary
Brief 2-3 sentence overview of the call.

## Customer Interest
- What product/service were they interested in?
- What problem are they trying to solve?
- Budget or timeline mentioned?

## Key Discussion Points
1. 
2. 
3. 

## Objections & Concerns
- List any objections or hesitations raised

## Action Items
- [ ] Follow-up tasks for the sales rep
- [ ] Next steps discussed with customer

## Call Outcome
(Qualified Lead / Needs Follow-up / Not Interested / Scheduled Demo / Closed Deal)

## Notes
Any additional context or observations`;

const AI_SUMMARY_SYSTEM_PROMPT = `Your job is to summarize this call following the EXACT format given. Fill in each section based on the call transcription. If a section doesn't apply or information wasn't discussed, write "N/A" or "Not discussed".`;

interface TranscriptionResult {
  success: boolean;
  transcription?: string;
  durationSeconds?: number;
  error?: string;
}

interface AISummaryResult {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * Transcribe audio using Deepgram (single attempt)
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

    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const durationSeconds = result.metadata?.duration;

    if (!transcript) {
      return { success: false, error: "No transcription returned from Deepgram" };
    }

    console.log("[Transcription] Completed, duration:", durationSeconds, "seconds");

    return {
      success: true,
      transcription: transcript,
      durationSeconds: durationSeconds,
    };
  } catch (error) {
    console.error("[Transcription] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Transcribe with automatic retry and exponential backoff
 */
async function transcribeWithRetry(audioUrl: string): Promise<ProcessingResult> {
  const retryLog: RetryAttempt[] = [];
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    console.log(`[Transcription] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

    const result = await transcribeWithDeepgram(audioUrl);

    if (result.success) {
      console.log(`[Transcription] Success on attempt ${attempt}`);
      return {
        success: true,
        transcription: result.transcription,
        durationSeconds: result.durationSeconds,
        totalAttempts: attempt,
        retryLog,
      };
    }

    lastError = result.error || "Unknown error";
    retryLog.push({ attempt, timestamp: new Date().toISOString(), error: lastError });
    console.log(`[Transcription] Attempt ${attempt} failed:`, lastError);

    if (isNonRetriableError(lastError)) {
      console.log("[Transcription] Non-retriable error, skipping remaining retries");
      return { success: false, error: lastError, totalAttempts: attempt, retryLog };
    }

    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1];
      console.log(`[Transcription] Waiting ${delayMs}ms before retry...`);
      await sleep(delayMs);
    }
  }

  console.log("[Transcription] All retry attempts exhausted");
  return { success: false, error: lastError, totalAttempts: MAX_RETRY_ATTEMPTS, retryLog };
}

/**
 * Generate AI summary using OpenAI
 */
async function generateAISummary(
  transcription: string,
  customFormat: string | null
): Promise<AISummaryResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    console.log("[AI Summary] Generating summary...");

    const format = customFormat || DEFAULT_AI_SUMMARY_FORMAT;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_SUMMARY_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Call transcription:\n${transcription}\n\nSummary format:\n${format}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Summary] OpenAI API error:", response.status, errorText);
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content;

    if (!summary) {
      return { success: false, error: "No summary returned from OpenAI" };
    }

    console.log("[AI Summary] Generated successfully");
    return { success: true, summary };
  } catch (error) {
    console.error("[AI Summary] Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { callLogId } = await request.json();

    if (!callLogId) {
      return NextResponse.json({ error: "callLogId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the call log with org settings
    const { data: callLog, error: callError } = await supabase
      .from("call_logs")
      .select(`
        id,
        organization_id,
        recording_url,
        duration_seconds,
        transcription_status,
        organizations!inner(recording_settings)
      `)
      .eq("id", callLogId)
      .single();

    if (callError || !callLog) {
      console.error("[ProcessCall] Failed to fetch call log:", callError);
      return NextResponse.json({ error: "Call log not found" }, { status: 404 });
    }

    // Skip if already processed
    if (callLog.transcription_status === "completed" || callLog.transcription_status === "processing") {
      return NextResponse.json({ 
        message: "Already processed or processing",
        status: callLog.transcription_status 
      });
    }

    const recordingSettings = (callLog as any).organizations?.recording_settings as RecordingSettings | null;

    // Check if recording exists and transcription is enabled
    if (!callLog.recording_url) {
      return NextResponse.json({ error: "No recording URL" }, { status: 400 });
    }

    if (!recordingSettings?.transcription_enabled) {
      return NextResponse.json({ message: "Transcription not enabled for org" });
    }

    // Mark transcription as processing
    await supabase
      .from("call_logs")
      .update({ transcription_status: "processing" })
      .eq("id", callLogId);

    // Transcribe the audio with automatic retry
    const transcriptionResult = await transcribeWithRetry(callLog.recording_url);

    if (!transcriptionResult.success) {
      await supabase
        .from("call_logs")
        .update({
          transcription_status: "failed",
          transcription_error: transcriptionResult.error,
          transcription_retry_count: transcriptionResult.totalAttempts,
          transcription_retry_log: JSON.stringify(transcriptionResult.retryLog),
        })
        .eq("id", callLogId);
      console.log(`[ProcessCall] Transcription failed after ${transcriptionResult.totalAttempts} attempts:`, transcriptionResult.error);
      return NextResponse.json({ 
        error: transcriptionResult.error,
        totalAttempts: transcriptionResult.totalAttempts,
        retryLog: transcriptionResult.retryLog,
      }, { status: 500 });
    }

    // Calculate cost based on duration
    const durationMinutes = (transcriptionResult.durationSeconds || callLog.duration_seconds || 0) / 60;
    const transcriptionCost = durationMinutes * TRANSCRIPTION_COST_PER_MIN;

    // Save successful transcription with retry info
    await supabase
      .from("call_logs")
      .update({
        transcription: transcriptionResult.transcription,
        transcription_status: "completed",
        transcription_duration_seconds: transcriptionResult.durationSeconds,
        transcription_cost: transcriptionCost,
        transcribed_at: new Date().toISOString(),
        transcription_retry_count: transcriptionResult.totalAttempts - 1,
        transcription_retry_log: transcriptionResult.retryLog.length > 0 ? JSON.stringify(transcriptionResult.retryLog) : null,
      })
      .eq("id", callLogId);

    // Record usage for billing
    await supabase
      .from("usage_records")
      .insert({
        organization_id: callLog.organization_id,
        call_log_id: callLogId,
        usage_type: "transcription",
        duration_seconds: transcriptionResult.durationSeconds || 0,
        cost: transcriptionCost,
      });

    console.log("[ProcessCall] Transcription saved, cost:", transcriptionCost);

    // Process AI summary if enabled
    let summaryResult: AISummaryResult | null = null;
    let summaryCost = 0;

    if (recordingSettings?.ai_summary_enabled) {
      // Mark AI summary as processing
      await supabase
        .from("call_logs")
        .update({ ai_summary_status: "processing" })
        .eq("id", callLogId);

      summaryResult = await generateAISummary(
        transcriptionResult.transcription!,
        recordingSettings.ai_summary_prompt_format
      );

      if (!summaryResult.success) {
        await supabase
          .from("call_logs")
          .update({
            ai_summary_status: "failed",
            ai_summary_error: summaryResult.error,
          })
          .eq("id", callLogId);
      } else {
        summaryCost = durationMinutes * AI_SUMMARY_COST_PER_MIN;

        await supabase
          .from("call_logs")
          .update({
            ai_summary: summaryResult.summary,
            ai_summary_status: "completed",
            ai_summary_cost: summaryCost,
            summarized_at: new Date().toISOString(),
          })
          .eq("id", callLogId);

        await supabase
          .from("usage_records")
          .insert({
            organization_id: callLog.organization_id,
            call_log_id: callLogId,
            usage_type: "ai_summary",
            duration_seconds: transcriptionResult.durationSeconds || 0,
            cost: summaryCost,
          });

        console.log("[ProcessCall] AI summary saved, cost:", summaryCost);
      }
    }

    return NextResponse.json({
      success: true,
      transcription: {
        status: "completed",
        cost: transcriptionCost,
        durationSeconds: transcriptionResult.durationSeconds,
      },
      aiSummary: summaryResult?.success ? {
        status: "completed",
        cost: summaryCost,
      } : summaryResult ? {
        status: "failed",
        error: summaryResult.error,
      } : null,
    });

  } catch (error) {
    console.error("[ProcessCall] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

