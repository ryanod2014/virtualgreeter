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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RecordingSettings } from "@ghost-greeter/domain/database.types";

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
    settings.retention_days !== savedSettings.retention_days;

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
              Recordings will be deleted after{" "}
              <strong className="text-foreground">
                {settings.retention_days} days
              </strong>
            </span>
          </div>
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
            <h4 className="font-medium mb-2">How Recording Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Both agent and visitor video/audio are captured during calls
              </li>
              <li>
                • Recordings are securely stored and accessible only to your
                organization
              </li>
              <li>• Playback is available directly in call logs</li>
              <li>
                • Recordings are automatically deleted based on your retention
                policy
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

