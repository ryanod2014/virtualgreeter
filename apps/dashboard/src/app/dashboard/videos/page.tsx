"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Ghost,
  Video,
  Play,
  Square,
  Check,
  ArrowRight,
  RotateCcw,
  Loader2,
  Mic,
  Volume2,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RecordingStage = "loading" | "has-videos" | "intro" | "mimic" | "countdown-mimic" | "recording-mimic" | "script" | "countdown-script" | "recording-script" | "smile" | "countdown-smile" | "recording-smile" | "review" | "uploading" | "complete";

// Example video URL - this should be replaced with your actual example video
const EXAMPLE_VIDEO_URL = "/example-intro.mp4";

interface ExistingVideos {
  waveVideoUrl: string | null;
  introVideoUrl: string | null;
  loopVideoUrl: string | null;
}

export default function VideosPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [stage, setStage] = useState<RecordingStage>("loading");
  const [existingVideos, setExistingVideos] = useState<ExistingVideos | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState<{
    mimic: Blob | null;
    script: Blob | null;
    smile: Blob | null;
  }>({
    mimic: null,
    script: null,
    smile: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Track which single video is being re-recorded (null = recording all)
  const [rerecordingVideo, setRerecordingVideo] = useState<"mimic" | "script" | "smile" | null>(null);

  // Load existing videos on mount
  useEffect(() => {
    const loadExistingVideos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("[Videos] No user found, showing intro");
          setStage("intro");
          return;
        }

        console.log("[Videos] Loading agent profile for user:", user.id);
        
        // First try to get profile with all video columns
        const { data: agentProfile, error: profileError } = await supabase
          .from("agent_profiles")
          .select("wave_video_url, intro_video_url, loop_video_url")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.error("[Videos] Error loading profile:", profileError);
          // If columns don't exist, try with basic columns
          const { data: fallbackProfile } = await supabase
            .from("agent_profiles")
            .select("intro_video_url, loop_video_url")
            .eq("user_id", user.id)
            .single();
          
          if (fallbackProfile && (fallbackProfile.intro_video_url || fallbackProfile.loop_video_url)) {
            setExistingVideos({
              waveVideoUrl: null,
              introVideoUrl: fallbackProfile.intro_video_url,
              loopVideoUrl: fallbackProfile.loop_video_url,
            });
            setStage("has-videos");
            return;
          }
          setStage("intro");
          return;
        }

        console.log("[Videos] Agent profile loaded:", agentProfile);

        if (agentProfile && (agentProfile.wave_video_url || agentProfile.intro_video_url || agentProfile.loop_video_url)) {
          setExistingVideos({
            waveVideoUrl: agentProfile.wave_video_url,
            introVideoUrl: agentProfile.intro_video_url,
            loopVideoUrl: agentProfile.loop_video_url,
          });
          setStage("has-videos");
        } else {
          console.log("[Videos] No videos found, showing intro");
          setStage("intro");
        }
      } catch (err) {
        console.error("[Videos] Error loading existing videos:", err);
        setStage("intro");
      }
    };

    loadExistingVideos();
  }, [supabase]);

  // Refs
  const webcamRef = useRef<HTMLVideoElement>(null);
  const exampleVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize webcam
  useEffect(() => {
    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: true,
        });
        streamRef.current = stream;
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
        setHasAudioPermission(true);
      } catch (err) {
        console.error("Failed to access webcam:", err);
        setError("Please allow camera and microphone access to record your intro videos.");
      }
    };

    initWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Start countdown before recording
  const startCountdown = useCallback((nextStage: RecordingStage, recordingStage: RecordingStage) => {
    setStage(nextStage);
    setCountdown(3);

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        startRecording(recordingStage);
      }
    }, 1000);
  }, []);

  // Start recording
  const startRecording = useCallback((recordingStage: RecordingStage) => {
    if (!streamRef.current) return;

    setStage(recordingStage);
    chunksRef.current = [];

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const videoType = recordingStage.replace("recording-", "") as "mimic" | "script" | "smile";
      setRecordedVideos((prev) => ({ ...prev, [videoType]: blob }));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    // If recording mimic, play the example video
    if (recordingStage === "recording-mimic" && exampleVideoRef.current) {
      exampleVideoRef.current.currentTime = 0;
      exampleVideoRef.current.play();
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (exampleVideoRef.current) {
      exampleVideoRef.current.pause();
    }
  }, []);

  // Handle next after recording
  const handleNextRecording = useCallback(() => {
    stopRecording();
    
    // If re-recording a single video, go to single video review
    if (rerecordingVideo) {
      setStage("review");
      return;
    }
    
    if (stage === "recording-mimic") {
      setStage("script");
    } else if (stage === "recording-script") {
      setStage("smile");
    } else if (stage === "recording-smile") {
      setStage("review");
    }
  }, [stage, stopRecording, rerecordingVideo]);

  // Start re-recording a specific video from has-videos stage
  const startRerecordSingle = useCallback((type: "mimic" | "script" | "smile") => {
    setRerecordingVideo(type);
    setRecordedVideos(prev => ({ ...prev, [type]: null }));
    if (type === "mimic") {
      setStage("mimic");
    } else if (type === "script") {
      setStage("script");
    } else {
      setStage("smile");
    }
  }, []);

  // Redo a specific recording (during full recording flow)
  const redoRecording = useCallback((type: "mimic" | "script" | "smile") => {
    setRecordedVideos((prev) => ({ ...prev, [type]: null }));
    if (type === "mimic") {
      setStage("mimic");
    } else if (type === "script") {
      setStage("script");
    } else {
      setStage("smile");
    }
  }, []);

  // Upload a single re-recorded video
  const uploadSingleVideo = useCallback(async () => {
    if (!rerecordingVideo || !recordedVideos[rerecordingVideo]) {
      setError("No video to upload.");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const orgId = profile.organization_id;
      const videoBlob = recordedVideos[rerecordingVideo]!;

      // Determine path and field based on video type
      let videoPath: string;
      let dbField: string;
      
      switch (rerecordingVideo) {
        case "mimic":
          videoPath = `${orgId}/${user.id}/wave-intro.webm`;
          dbField = "wave_video_url";
          break;
        case "script":
          videoPath = `${orgId}/${user.id}/intro.webm`;
          dbField = "intro_video_url";
          break;
        case "smile":
          videoPath = `${orgId}/${user.id}/loop.webm`;
          dbField = "loop_video_url";
          break;
      }

      setUploadProgress(30);

      // Upload the video
      await supabase.storage.from("videos").upload(videoPath, videoBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      setUploadProgress(60);

      // Get public URL
      const { data: videoUrl } = supabase.storage.from("videos").getPublicUrl(videoPath);

      setUploadProgress(80);

      // Update only this field in agent profile
      const { error: updateError } = await supabase
        .from("agent_profiles")
        .update({ [dbField]: videoUrl.publicUrl })
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      setUploadProgress(100);

      // Update existing videos state with new URL
      setExistingVideos(prev => {
        if (!prev) return prev;
        const fieldMap: Record<string, keyof ExistingVideos> = {
          mimic: "waveVideoUrl",
          script: "introVideoUrl", 
          smile: "loopVideoUrl"
        };
        return {
          ...prev,
          [fieldMap[rerecordingVideo]]: videoUrl.publicUrl
        };
      });

      // Reset and go back to has-videos
      setRerecordingVideo(null);
      setRecordedVideos({ mimic: null, script: null, smile: null });
      setStage("has-videos");

    } catch (err) {
      console.error("[Videos] Upload error:", err);
      setError("Failed to upload video. Please try again.");
      setStage("review");
    }
  }, [rerecordingVideo, recordedVideos, supabase]);

  // Upload all videos
  const uploadVideos = useCallback(async () => {
    if (!recordedVideos.mimic || !recordedVideos.script || !recordedVideos.smile) {
      setError("Please record all three videos before uploading.");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);

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

      // Convert webm to mp4 would require server-side processing
      // For now, upload as webm and handle in the player

      // Upload mimic video (plays on loop muted until audio permission)
      setUploadProgress(10);
      const mimicPath = `${orgId}/${user.id}/wave-intro.webm`;
      await supabase.storage.from("videos").upload(mimicPath, recordedVideos.mimic, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Upload script video (plays with audio after permission)
      setUploadProgress(40);
      const scriptPath = `${orgId}/${user.id}/intro.webm`;
      await supabase.storage.from("videos").upload(scriptPath, recordedVideos.script, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Upload smile video (loops forever)
      setUploadProgress(70);
      const smilePath = `${orgId}/${user.id}/loop.webm`;
      await supabase.storage.from("videos").upload(smilePath, recordedVideos.smile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Get public URLs
      const { data: mimicUrl } = supabase.storage.from("videos").getPublicUrl(mimicPath);
      const { data: scriptUrl } = supabase.storage.from("videos").getPublicUrl(scriptPath);
      const { data: smileUrl } = supabase.storage.from("videos").getPublicUrl(smilePath);

      console.log("[Videos] Video URLs:", {
        wave: mimicUrl.publicUrl,
        intro: scriptUrl.publicUrl,
        loop: smileUrl.publicUrl,
      });

      setUploadProgress(90);

      // Update agent profile with new video URLs
      const { error: updateError } = await supabase
        .from("agent_profiles")
        .update({
          wave_video_url: mimicUrl.publicUrl,
          intro_video_url: scriptUrl.publicUrl,
          loop_video_url: smileUrl.publicUrl,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Videos] Update error:", updateError);
        throw updateError;
      }

      console.log("[Videos] Profile updated successfully");
      setUploadProgress(100);
      setStage("complete");
    } catch (err) {
      console.error("[Videos] Upload error:", err);
      setError("Failed to upload videos. Please try again.");
      setStage("review");
    }
  }, [recordedVideos, supabase]);

  // Render based on stage
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ghost className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Pre-recorded Intro</h1>
          </div>
          <p className="text-muted-foreground">
            Record your intro videos to greet visitors before you go live
          </p>
        </div>

        {/* Progress Steps - only show when recording */}
        {!["loading", "has-videos"].includes(stage) && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <ProgressStep 
              step={1} 
              label="Wave" 
              active={stage.includes("mimic")} 
              completed={recordedVideos.mimic !== null} 
            />
            <div className="w-12 h-0.5 bg-border" />
            <ProgressStep 
              step={2} 
              label="Speak" 
              active={stage.includes("script")} 
              completed={recordedVideos.script !== null} 
            />
            <div className="w-12 h-0.5 bg-border" />
            <ProgressStep 
              step={3} 
              label="Smile" 
              active={stage.includes("smile")} 
              completed={recordedVideos.smile !== null} 
            />
            <div className="w-12 h-0.5 bg-border" />
            <ProgressStep 
              step={4} 
              label="Done" 
              active={stage === "review" || stage === "uploading" || stage === "complete"} 
              completed={stage === "complete"} 
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="glass rounded-2xl p-8">
          {/* Loading Stage */}
          {stage === "loading" && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your videos...</p>
            </div>
          )}

          {/* Has Existing Videos Stage */}
          {stage === "has-videos" && existingVideos && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Your Intro Videos Are Ready!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your pre-recorded intro is active and will be shown to visitors.
              </p>
              
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2 group">
                    {existingVideos.waveVideoUrl ? (
                      <>
                        <video
                          src={existingVideos.waveVideoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => startRerecordSingle("mimic")}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium">
                            <RotateCcw className="w-4 h-4" />
                            Re-record
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startRerecordSingle("mimic")}
                        className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Play className="w-6 h-6 mb-1" />
                        Record
                      </button>
                    )}
                  </div>
                  <div className="font-medium text-sm">1. Wave</div>
                  <div className="text-xs text-muted-foreground">Loops while muted</div>
                </div>
                <div className="text-center">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2 group">
                    {existingVideos.introVideoUrl ? (
                      <>
                        <video
                          src={existingVideos.introVideoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => startRerecordSingle("script")}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium">
                            <RotateCcw className="w-4 h-4" />
                            Re-record
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startRerecordSingle("script")}
                        className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Play className="w-6 h-6 mb-1" />
                        Record
                      </button>
                    )}
                  </div>
                  <div className="font-medium text-sm">2. Speak</div>
                  <div className="text-xs text-muted-foreground">Plays with audio</div>
                </div>
                <div className="text-center">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2 group">
                    {existingVideos.loopVideoUrl ? (
                      <>
                        <video
                          src={existingVideos.loopVideoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => startRerecordSingle("smile")}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium">
                            <RotateCcw className="w-4 h-4" />
                            Re-record
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startRerecordSingle("smile")}
                        className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Play className="w-6 h-6 mb-1" />
                        Record
                      </button>
                    )}
                  </div>
                  <div className="font-medium text-sm">3. Smile</div>
                  <div className="text-xs text-muted-foreground">Loops forever</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setExistingVideos(null);
                    setStage("intro");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Record New Videos
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Workbench
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Intro Stage */}
          {stage === "intro" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Let's Record Your Intro</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                You'll record 3 short clips that create a seamless experience for visitors:
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8 text-left max-w-2xl mx-auto">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-primary font-semibold mb-1">1. Wave</div>
                  <div className="text-sm text-muted-foreground">
                    Mimic the example – wave and look engaged
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-primary font-semibold mb-1">2. Speak</div>
                  <div className="text-sm text-muted-foreground">
                    Read the script asking visitors to unmute
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-primary font-semibold mb-1">3. Smile</div>
                  <div className="text-sm text-muted-foreground">
                    Just sit and smile – loops while waiting
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStage("mimic")}
                disabled={!hasAudioPermission}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasAudioPermission ? (
                  <>
                    Start Recording
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Waiting for camera...
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mimic Stage - Instructions */}
          {stage === "mimic" && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 1: Wave & Engage</h2>
              <p className="text-muted-foreground mb-6">
                You'll see yourself and an example video side-by-side. Mimic what you see!
              </p>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    ref={webcamRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
                    Your Camera
                  </div>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    ref={exampleVideoRef}
                    src={EXAMPLE_VIDEO_URL}
                    playsInline
                    loop
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
                    Example
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-16 h-16 text-white/80" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Wave, smile, and look like you're about to say something important!
              </p>
              <button
                onClick={() => startCountdown("countdown-mimic", "recording-mimic")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Recording
              </button>
            </div>
          )}

          {/* Countdown for Mimic */}
          {stage === "countdown-mimic" && (
            <CountdownOverlay countdown={countdown} />
          )}

          {/* Recording Mimic */}
          {stage === "recording-mimic" && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 font-semibold">Recording</span>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black ring-4 ring-red-500/50">
                  <video
                    ref={webcamRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-red-500 text-white text-sm font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    REC
                  </div>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    ref={exampleVideoRef}
                    src={EXAMPLE_VIDEO_URL}
                    autoPlay
                    playsInline
                    loop
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
                    Follow Along
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Mimic the example video – wave, smile, look engaged!
              </p>
              <button
                onClick={handleNextRecording}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop & Continue
              </button>
            </div>
          )}

          {/* Script Stage - Instructions */}
          {stage === "script" && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 2: Ask to Unmute</h2>
              <p className="text-muted-foreground mb-6">
                Read the script below naturally, like you're talking to a real visitor
              </p>
              <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black mb-6">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
                  Your Camera
                </div>
              </div>
              <div className="max-w-lg mx-auto p-6 rounded-xl bg-primary/10 border border-primary/20 mb-6">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Mic className="w-5 h-5" />
                  <span className="font-semibold">Your Script</span>
                </div>
                <p className="text-xl font-medium leading-relaxed">
                  "Hey, do you mind turning on your mic real fast? Quick question for you."
                </p>
              </div>
              <button
                onClick={() => startCountdown("countdown-script", "recording-script")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Recording
              </button>
            </div>
          )}

          {/* Countdown for Script */}
          {stage === "countdown-script" && (
            <CountdownOverlay countdown={countdown} />
          )}

          {/* Recording Script */}
          {stage === "recording-script" && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 font-semibold">Recording</span>
              </div>
              <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black ring-4 ring-red-500/50 mb-6">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-red-500 text-white text-sm font-medium flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  REC
                </div>
              </div>
              <div className="max-w-lg mx-auto p-6 rounded-xl bg-primary/10 border border-primary/20 mb-6">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Volume2 className="w-5 h-5" />
                  <span className="font-semibold">Read This</span>
                </div>
                <p className="text-2xl font-medium leading-relaxed">
                  "Hey, do you mind turning on your mic real fast? Quick question for you."
                </p>
              </div>
              <button
                onClick={handleNextRecording}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop & Continue
              </button>
            </div>
          )}

          {/* Smile Stage - Instructions */}
          {stage === "smile" && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 3: Waiting Smile</h2>
              <p className="text-muted-foreground mb-6">
                Just sit there and smile naturally. This loops while waiting for a response.
              </p>
              <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black mb-6">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
                  Your Camera
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Look friendly and attentive, like you're waiting for them to respond 😊
              </p>
              <button
                onClick={() => startCountdown("countdown-smile", "recording-smile")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Recording
              </button>
            </div>
          )}

          {/* Countdown for Smile */}
          {stage === "countdown-smile" && (
            <CountdownOverlay countdown={countdown} />
          )}

          {/* Recording Smile */}
          {stage === "recording-smile" && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 font-semibold">Recording</span>
              </div>
              <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black ring-4 ring-red-500/50 mb-6">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-red-500 text-white text-sm font-medium flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  REC
                </div>
              </div>
              <p className="text-lg text-muted-foreground mb-6">
                😊 Keep smiling naturally...
              </p>
              <button
                onClick={handleNextRecording}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop & Finish
              </button>
            </div>
          )}

          {/* Review Stage */}
          {stage === "review" && (
            <div className="text-center">
              {rerecordingVideo ? (
                // Single video re-recording review
                <>
                  <h2 className="text-2xl font-bold mb-4">Review Your Recording</h2>
                  <p className="text-muted-foreground mb-8">
                    Make sure you're happy with the recording before saving
                  </p>
                  <div className="max-w-md mx-auto mb-8">
                    <VideoPreview
                      label={
                        rerecordingVideo === "mimic" ? "1. Wave" :
                        rerecordingVideo === "script" ? "2. Speak" : "3. Smile"
                      }
                      blob={recordedVideos[rerecordingVideo]}
                      onRedo={() => {
                        if (rerecordingVideo === "mimic") setStage("mimic");
                        else if (rerecordingVideo === "script") setStage("script");
                        else setStage("smile");
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setRerecordingVideo(null);
                        setRecordedVideos({ mimic: null, script: null, smile: null });
                        setStage("has-videos");
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadSingleVideo}
                      disabled={!recordedVideos[rerecordingVideo]}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-6 h-6" />
                      Save Video
                    </button>
                  </div>
                </>
              ) : (
                // Full recording flow review
                <>
                  <h2 className="text-2xl font-bold mb-4">Review Your Videos</h2>
                  <p className="text-muted-foreground mb-8">
                    Make sure you're happy with each recording before uploading
                  </p>
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <VideoPreview
                      label="1. Wave"
                      blob={recordedVideos.mimic}
                      onRedo={() => redoRecording("mimic")}
                    />
                    <VideoPreview
                      label="2. Speak"
                      blob={recordedVideos.script}
                      onRedo={() => redoRecording("script")}
                    />
                    <VideoPreview
                      label="3. Smile"
                      blob={recordedVideos.smile}
                      onRedo={() => redoRecording("smile")}
                    />
                  </div>
                  <button
                    onClick={uploadVideos}
                    disabled={!recordedVideos.mimic || !recordedVideos.script || !recordedVideos.smile}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-6 h-6" />
                    Save & Upload Videos
                  </button>
                </>
              )}
            </div>
          )}

          {/* Uploading Stage */}
          {stage === "uploading" && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Uploading Your Videos</h2>
              <div className="max-w-md mx-auto">
                <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-muted-foreground">{uploadProgress}% complete</p>
              </div>
            </div>
          )}

          {/* Complete Stage */}
          {stage === "complete" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Videos Saved! 🎉</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your pre-recorded intro is ready. Visitors will see these videos until you connect live.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setRecordedVideos({ mimic: null, script: null, smile: null });
                    setStage("intro");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Record New Videos
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Workbench
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressStep({ step, label, active, completed }: { 
  step: number; 
  label: string; 
  active: boolean; 
  completed: boolean; 
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
          completed
            ? "bg-green-500 text-white"
            : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? <Check className="w-5 h-5" /> : step}
      </div>
      <span className={`text-sm font-medium ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function CountdownOverlay({ countdown }: { countdown: number }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-9xl font-bold text-white animate-pulse">
          {countdown}
        </div>
        <p className="text-2xl text-white/80 mt-4">Get ready...</p>
      </div>
    </div>
  );
}

function VideoPreview({ label, blob, onRedo }: { 
  label: string; 
  blob: Blob | null; 
  onRedo: () => void; 
}) {
  const videoUrl = blob ? URL.createObjectURL(blob) : null;

  return (
    <div className="text-center">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No recording
          </div>
        )}
      </div>
      <div className="font-medium mb-2">{label}</div>
      {blob && (
        <button
          onClick={onRedo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Redo
        </button>
      )}
    </div>
  );
}

