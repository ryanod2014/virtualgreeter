"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Video,
  Check,
  Loader2,
  AlertTriangle,
  Calendar,
  HardDrive,
  Shield,
  FileText,
  Sparkles,
  DollarSign,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RecordingSettings } from "@ghost-greeter/domain/database.types";

// Pricing constants (2x API costs)
const TRANSCRIPTION_COST_PER_MIN = 0.01; // ~2x Deepgram Nova-2
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

interface Props {
  organizationId: string;
  initialSettings: RecordingSettings;
}

export function RecordingSettingsClient({
  organizationId,
  initialSettings,
}: Props) {
  const [settings, setSettings] = useState<RecordingSettings>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<RecordingSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const hasChanges =
    settings.enabled !== savedSettings.enabled ||
    settings.retention_days !== savedSettings.retention_days ||
    settings.transcription_enabled !== savedSettings.transcription_enabled ||
    settings.ai_summary_enabled !== savedSettings.ai_summary_enabled ||
    settings.ai_summary_prompt_format !== savedSettings.ai_summary_prompt_format;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      console.log("[RecordingSettings] Saving:", settings);
      
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ recording_settings: settings })
        .eq("id", organizationId);

      if (updateError) {
        console.error("[RecordingSettings] Save error:", updateError);
        throw updateError;
      }

      console.log("[RecordingSettings] ✅ Saved successfully");
      setSavedSettings(settings); // Update saved state so hasChanges works correctly
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const retentionOptions = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
    { value: 180, label: "180 days" },
    { value: 365, label: "1 year" },
    { value: -1, label: "Forever" },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Call Recording</h1>
            <p className="text-muted-foreground">
              Configure video call recording settings for your organization
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Settings saved successfully
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Enable Recording */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Enable Recording</h2>
              <p className="text-sm text-muted-foreground">
                When enabled, all video calls will be automatically recorded and
                saved for playback in call logs.
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, enabled: !settings.enabled })
              }
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.enabled ? "bg-primary" : "bg-muted"
              }`}
              role="switch"
              aria-checked={settings.enabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {settings.enabled && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-500">
                  Privacy Notice
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ensure you have proper consent from all parties before
                  recording calls. Recordings may be subject to data privacy
                  regulations in your jurisdiction.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Retention Period */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recording Retention</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Recordings older than the retention period will be automatically
            deleted. Choose a period that balances storage costs with your
            review needs.
          </p>

          <div className="grid grid-cols-4 gap-3">
            {retentionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings({ ...settings, retention_days: option.value })
                }
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  settings.retention_days === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>
              {settings.retention_days === -1 ? (
                <>Recordings will be kept <strong className="text-foreground">forever</strong></>
              ) : (
                <>Recordings will be deleted after{" "}
                <strong className="text-foreground">
                  {settings.retention_days} days
                </strong></>
              )}
            </span>
          </div>
        </div>

        {/* Transcription Settings */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Call Transcription</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Automatically transcribe call audio to text. Transcriptions enable search, review, and AI-powered summaries.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600">
                  ${TRANSCRIPTION_COST_PER_MIN.toFixed(2)}/min
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  transcription_enabled: !settings.transcription_enabled,
                  // Disable AI summary when turning off transcription
                  ai_summary_enabled: settings.transcription_enabled ? false : settings.ai_summary_enabled,
                })
              }
              disabled={!settings.enabled}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.transcription_enabled && settings.enabled ? "bg-primary" : "bg-muted"
              } ${!settings.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={settings.transcription_enabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.transcription_enabled && settings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!settings.enabled && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 inline mr-2" />
              Enable call recording above to use transcription features.
            </div>
          )}
        </div>

        {/* AI Summary Settings */}
        <div className={`glass rounded-2xl p-6 transition-opacity ${!settings.transcription_enabled ? "opacity-50" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold">AI Call Summary</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate AI-powered summaries from call transcriptions. Customize the output format to match your workflow.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <DollarSign className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">
                  ${AI_SUMMARY_COST_PER_MIN.toFixed(2)}/min
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  ai_summary_enabled: !settings.ai_summary_enabled,
                })
              }
              disabled={!settings.transcription_enabled}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.ai_summary_enabled && settings.transcription_enabled ? "bg-primary" : "bg-muted"
              } ${!settings.transcription_enabled ? "cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={settings.ai_summary_enabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.ai_summary_enabled && settings.transcription_enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!settings.transcription_enabled && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 inline mr-2" />
              Enable call transcription above to use AI summaries.
            </div>
          )}

          {/* Custom Prompt Format */}
          {settings.ai_summary_enabled && settings.transcription_enabled && (
            <div className="mt-6 space-y-4">
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold mb-2">Summary Format (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize how your call summaries are structured. Leave blank to use our default sales call format, or define your own sections and details.
                </p>
                
                <textarea
                  value={settings.ai_summary_prompt_format ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai_summary_prompt_format: e.target.value || null,
                    })
                  }
                  placeholder={DEFAULT_AI_SUMMARY_FORMAT}
                  className="w-full h-80 px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
                />
                
                <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-600">
                    <strong>Tip:</strong> The AI will follow your format exactly. Include section headers, bullet points, and specific questions you want answered. If left blank, the default sales call format shown above will be used.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-2">How It Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Recording:</strong> Both agent and visitor video/audio are captured during calls
              </li>
              <li>
                • <strong>Transcription:</strong> Audio is converted to searchable text — <span className="text-amber-600 font-medium">${TRANSCRIPTION_COST_PER_MIN.toFixed(2)}/min</span>
              </li>
              <li>
                • <strong>AI Summary:</strong> Transcriptions are summarized using your format — <span className="text-purple-600 font-medium">${AI_SUMMARY_COST_PER_MIN.toFixed(2)}/min</span>
              </li>
              <li>
                • Recordings are securely stored and accessible only to your organization
              </li>
              <li>
                • All data is automatically deleted based on your retention policy
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

