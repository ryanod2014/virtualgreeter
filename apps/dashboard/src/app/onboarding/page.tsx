"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, Upload, Check, ArrowRight, Loader2, Video, Shield, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "welcome" | "role-choice" | "videos" | "complete";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [loopVideo, setLoopVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Handle "I'll take calls" choice - activate agent profile
  // Note: First seat is included, so no billing charge needed for founding admin
  const handleBecomeAgent = async () => {
    setIsActivating(true);
    setActivateError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Activate agent profile (founding admin uses their included seat)
      await supabase
        .from("agent_profiles")
        .update({ is_active: true })
        .eq("user_id", user.id);

      // Continue to video setup
      setStep("videos");
    } catch (error) {
      console.error("Error activating as agent:", error);
      setActivateError(error instanceof Error ? error.message : "Failed to activate. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  // Handle admin-only choice - just go to admin dashboard
  // (Agent profile is already inactive by default now)
  const handleAdminOnly = () => {
    router.push("/admin");
  };

  const handleVideoUpload = async () => {
    if (!introVideo || !loopVideo) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's organization ID
      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const orgId = profile.organization_id;

      // Upload intro video
      const introPath = `${orgId}/${user.id}/intro.mp4`;
      await supabase.storage.from("videos").upload(introPath, introVideo, {
        cacheControl: "3600",
        upsert: true,
      });

      // Upload loop video
      const loopPath = `${orgId}/${user.id}/loop.mp4`;
      await supabase.storage.from("videos").upload(loopPath, loopVideo, {
        cacheControl: "3600",
        upsert: true,
      });

      // Get public URLs
      const { data: introUrl } = supabase.storage.from("videos").getPublicUrl(introPath);
      const { data: loopUrl } = supabase.storage.from("videos").getPublicUrl(loopPath);

      // Update agent profile
      await supabase
        .from("agent_profiles")
        .update({
          intro_video_url: introUrl.publicUrl,
          loop_video_url: loopUrl.publicUrl,
        })
        .eq("user_id", user.id);

      setStep("complete");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload videos. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    router.push("/dashboard");
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Ghost className="w-10 h-10 text-primary" />
          <span className="text-2xl font-bold">GreetNow</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <ProgressDot active={step === "welcome"} completed={step !== "welcome"} />
          <div className="w-8 h-0.5 bg-border" />
          <ProgressDot active={step === "role-choice"} completed={step === "videos" || step === "complete"} />
          <div className="w-8 h-0.5 bg-border" />
          <ProgressDot active={step === "videos"} completed={step === "complete"} />
          <div className="w-8 h-0.5 bg-border" />
          <ProgressDot active={step === "complete"} completed={false} />
        </div>

        {/* Content */}
        <div className="glass rounded-2xl p-8">
          {step === "welcome" && (
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Welcome to GreetNow! 👋</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Let's get you set up to start converting website visitors with your
                simulated live presence.
              </p>
              <button
                onClick={() => setStep("role-choice")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === "role-choice" && (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">One quick question...</h1>
              <p className="text-muted-foreground mb-8">
                Will you be taking calls yourself, or just managing your team?
              </p>

              {activateError && (
                <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-lg mx-auto">
                  {activateError}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <button
                  onClick={handleBecomeAgent}
                  disabled={isActivating}
                  className="p-6 rounded-xl border-2 border-border hover:border-primary transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="font-semibold mb-1">
                    {isActivating ? "Setting up..." : "I'll take calls"}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Set up your videos and start greeting visitors yourself
                  </p>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Uses your included seat ($297/mo)
                  </div>
                </button>
                
                <button
                  onClick={handleAdminOnly}
                  disabled={isActivating}
                  className="p-6 rounded-xl border-2 border-border hover:border-primary transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-muted/80 transition-colors">
                    <Shield className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="font-semibold mb-1">Admin only</div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your team, sites, and view analytics
                  </p>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Invite an agent ($297/mo)
                  </div>
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                You can always change this later from your dashboard
              </p>
            </div>
          )}

          {step === "videos" && (
            <div>
              <h1 className="text-2xl font-bold mb-2 text-center">Upload Your Videos</h1>
              <p className="text-muted-foreground mb-8 text-center">
                These videos will be shown to visitors until you connect live
              </p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <VideoUploader
                  label="Intro Video"
                  description="Plays once when visitor arrives (10-15s)"
                  file={introVideo}
                  onFileChange={setIntroVideo}
                />
                <VideoUploader
                  label="Loop Video"
                  description="Loops until visitor engages (5-10s)"
                  file={loopVideo}
                  onFileChange={setLoopVideo}
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleVideoUpload}
                  disabled={!introVideo || !loopVideo || isUploading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold mb-4">You're All Set! 🎉</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your simulated presence is ready. Head to the bullpen to go live
                and start converting visitors.
              </p>
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Bullpen
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressDot({ active, completed }: { active: boolean; completed: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-full transition-colors ${
        completed
          ? "bg-green-500"
          : active
          ? "bg-primary"
          : "bg-muted"
      }`}
    />
  );
}

function VideoUploader({
  label,
  description,
  file,
  onFileChange,
}: {
  label: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    onFileChange(selectedFile);
  };

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
      <input
        type="file"
        accept="video/mp4,video/webm"
        onChange={handleChange}
        className="hidden"
        id={`upload-${label}`}
      />
      <label htmlFor={`upload-${label}`} className="cursor-pointer">
        {file ? (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div className="font-medium">{file.name}</div>
            <div className="text-sm text-muted-foreground">
              Click to change
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
        )}
      </label>
    </div>
  );
}

