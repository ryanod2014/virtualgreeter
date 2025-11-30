/**
 * Transcription Service
 * Handles audio transcription via Deepgram and AI summarization via OpenAI
 */

import { createClient } from "@supabase/supabase-js";
import type { RecordingSettings } from "@blitz/domain/database.types";

// Pricing constants (2x API costs)
const TRANSCRIPTION_COST_PER_MIN = 0.01; // ~2x Deepgram Nova-2 ($0.0043/min)
const AI_SUMMARY_COST_PER_MIN = 0.02; // ~2x LLM token costs

// Default AI summary format for sales calls
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

// AI Summary system prompt
const AI_SUMMARY_SYSTEM_PROMPT = `Your job is to summarize this call following the EXACT format given. Fill in each section based on the call transcription. If a section doesn't apply or information wasn't discussed, write "N/A" or "Not discussed".`;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Check for API keys
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
 * Transcribe audio using Deepgram
 */
async function transcribeWithDeepgram(audioUrl: string): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    return { success: false, error: "DEEPGRAM_API_KEY not configured" };
  }

  try {
    console.log("[Transcription] Starting Deepgram transcription for:", audioUrl);

    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true", {
      method: "POST",
      headers: {
        "Authorization": `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: audioUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcription] Deepgram API error:", response.status, errorText);
      return { success: false, error: `Deepgram API error: ${response.status}` };
    }

    const result = await response.json();
    
    // Extract transcription from Deepgram response
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
 * Generate AI summary using OpenAI
 */
async function generateAISummary(transcription: string, customFormat: string | null): Promise<AISummaryResult> {
  if (!OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    console.log("[AI Summary] Generating summary...");

    const format = customFormat || DEFAULT_AI_SUMMARY_FORMAT;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: AI_SUMMARY_SYSTEM_PROMPT,
          },
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

    return {
      success: true,
      summary: summary,
    };
  } catch (error) {
    console.error("[AI Summary] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Process a call recording: transcribe and optionally summarize
 * Called after a recording is uploaded
 */
export async function processCallRecording(callLogId: string): Promise<void> {
  if (!supabase) {
    console.error("[ProcessCall] Supabase not configured");
    return;
  }

  console.log("[ProcessCall] Processing call:", callLogId);

  try {
    // 1. Get the call log with org settings
    const { data: callLog, error: callError } = await supabase
      .from("call_logs")
      .select(`
        id,
        organization_id,
        recording_url,
        duration_seconds,
        organizations!inner(recording_settings)
      `)
      .eq("id", callLogId)
      .single();

    if (callError || !callLog) {
      console.error("[ProcessCall] Failed to fetch call log:", callError);
      return;
    }

    const recordingSettings = (callLog as any).organizations?.recording_settings as RecordingSettings | null;

    // Check if recording exists and transcription is enabled
    if (!callLog.recording_url) {
      console.log("[ProcessCall] No recording URL, skipping");
      return;
    }

    if (!recordingSettings?.transcription_enabled) {
      console.log("[ProcessCall] Transcription not enabled for org");
      return;
    }

    // 2. Mark transcription as processing
    await supabase
      .from("call_logs")
      .update({ transcription_status: "processing" })
      .eq("id", callLogId);

    // 3. Transcribe the audio
    const transcriptionResult = await transcribeWithDeepgram(callLog.recording_url);

    if (!transcriptionResult.success) {
      // Mark as failed
      await supabase
        .from("call_logs")
        .update({
          transcription_status: "failed",
          transcription_error: transcriptionResult.error,
        })
        .eq("id", callLogId);
      return;
    }

    // Calculate cost based on duration
    const durationMinutes = (transcriptionResult.durationSeconds || callLog.duration_seconds || 0) / 60;
    const transcriptionCost = durationMinutes * TRANSCRIPTION_COST_PER_MIN;

    // 4. Save transcription
    await supabase
      .from("call_logs")
      .update({
        transcription: transcriptionResult.transcription,
        transcription_status: "completed",
        transcription_duration_seconds: transcriptionResult.durationSeconds,
        transcription_cost: transcriptionCost,
        transcribed_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    // 5. Record usage for billing
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

    // 6. Check if AI summary is enabled
    if (!recordingSettings?.ai_summary_enabled) {
      console.log("[ProcessCall] AI summary not enabled, done");
      return;
    }

    // 7. Mark AI summary as processing
    await supabase
      .from("call_logs")
      .update({ ai_summary_status: "processing" })
      .eq("id", callLogId);

    // 8. Generate AI summary
    const summaryResult = await generateAISummary(
      transcriptionResult.transcription!,
      recordingSettings.ai_summary_prompt_format
    );

    if (!summaryResult.success) {
      // Mark as failed
      await supabase
        .from("call_logs")
        .update({
          ai_summary_status: "failed",
          ai_summary_error: summaryResult.error,
        })
        .eq("id", callLogId);
      return;
    }

    // Calculate AI summary cost
    const summaryCost = durationMinutes * AI_SUMMARY_COST_PER_MIN;

    // 9. Save AI summary
    await supabase
      .from("call_logs")
      .update({
        ai_summary: summaryResult.summary,
        ai_summary_status: "completed",
        ai_summary_cost: summaryCost,
        summarized_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    // 10. Record usage for billing
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
    console.log("[ProcessCall] Processing complete for call:", callLogId);

  } catch (error) {
    console.error("[ProcessCall] Unexpected error:", error);
  }
}

/**
 * Check if transcription service is properly configured
 */
export function isTranscriptionConfigured(): boolean {
  return !!DEEPGRAM_API_KEY;
}

/**
 * Check if AI summary service is properly configured
 */
export function isAISummaryConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Get configuration status for logging
 */
export function getServiceStatus(): { deepgram: boolean; openai: boolean; supabase: boolean } {
  return {
    deepgram: !!DEEPGRAM_API_KEY,
    openai: !!OPENAI_API_KEY,
    supabase: !!supabase,
  };
}

