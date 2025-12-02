"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Play,
  Square,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  Mic,
  Volume2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Types
interface PoolInfo {
  id: string;
  name: string;
  intro_script: string;
  example_wave_video_url: string | null;
  example_intro_video_url: string | null;
  example_loop_video_url: string | null;
  membership_id: string;
  wave_video_url: string | null;
  intro_video_url: string | null;
  loop_video_url: string | null;
}

type RecordingStage = 
  | "loading"
  | "pool-select"
  | "has-videos" 
  | "intro" 
  | "mimic" 
  | "countdown-mimic" 
  | "recording-mimic" 
  | "review-mimic"
  | "script" 
  | "countdown-script" 
  | "recording-script" 
  | "review-script"
  | "smile" 
  | "countdown-smile" 
  | "recording-smile" 
  | "review-smile"
  | "review" 
  | "uploading" 
  | "complete";

export default function VideosPage() {
  const router = useRouter();
  const supabase = createClient();

  // Core state
  const [stage, setStage] = useState<RecordingStage>("loading");
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recording state
  const [countdown, setCountdown] = useState(3);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState<{
    mimic: Blob | null;
    script: Blob | null;
    smile: Blob | null;
  }>({ mimic: null, script: null, smile: null });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rerecordingVideo, setRerecordingVideo] = useState<"mimic" | "script" | "smile" | null>(null);

  // User info
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Refs
  const webcamRef = useRef<HTMLVideoElement>(null);
  const exampleVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load pools on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);

        // Get agent profile WITH existing videos
        const { data: profile } = await supabase
          .from("agent_profiles")
          .select("id, organization_id, wave_video_url, intro_video_url, loop_video_url")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setError("Agent profile not found");
          setStage("pool-select");
          return;
        }

        setOrgId(profile.organization_id);

        // Store existing videos from agent_profiles as fallbacks
        const existingVideos = {
          wave: profile.wave_video_url,
          intro: profile.intro_video_url,
          loop: profile.loop_video_url,
        };

        // Get pools with video settings
        const { data: poolData, error: poolError } = await supabase
          .from("agent_pool_members")
          .select(`
            id,
            wave_video_url,
            intro_video_url,
            loop_video_url,
            agent_pools (
              id,
              name,
              intro_script,
              example_wave_video_url,
              example_intro_video_url,
              example_loop_video_url
            )
          `)
          .eq("agent_profile_id", profile.id);

        if (poolError) {
          console.error("Error loading pools:", poolError);
          setStage("pool-select");
          return;
        }

        const transformedPools: PoolInfo[] = (poolData || [])
          .filter(m => m.agent_pools)
          .map(m => {
            const pool = m.agent_pools as unknown as {
              id: string;
              name: string;
              intro_script: string | null;
              example_wave_video_url: string | null;
              example_intro_video_url: string | null;
              example_loop_video_url: string | null;
            };
            
            // Use pool membership videos, falling back to existing agent_profile videos
            const waveUrl = m.wave_video_url || existingVideos.wave;
            const introUrl = m.intro_video_url || existingVideos.intro;
            const loopUrl = m.loop_video_url || existingVideos.loop;
            
            return {
              id: pool.id,
              name: pool.name,
              intro_script: pool.intro_script || "Hey, do you mind turning on your mic real fast? Quick question for you.",
              // Use existing videos as example fallbacks too
              example_wave_video_url: pool.example_wave_video_url || existingVideos.wave,
              example_intro_video_url: pool.example_intro_video_url || existingVideos.intro,
              example_loop_video_url: pool.example_loop_video_url || existingVideos.loop,
              membership_id: m.id,
              wave_video_url: waveUrl,
              intro_video_url: introUrl,
              loop_video_url: loopUrl,
            };
          });

        // Auto-populate pool memberships that don't have videos yet
        for (const pool of transformedPools) {
          const needsUpdate = 
            (existingVideos.wave && !poolData?.find(p => p.id === pool.membership_id)?.wave_video_url) ||
            (existingVideos.intro && !poolData?.find(p => p.id === pool.membership_id)?.intro_video_url) ||
            (existingVideos.loop && !poolData?.find(p => p.id === pool.membership_id)?.loop_video_url);
          
          if (needsUpdate) {
            await supabase
              .from("agent_pool_members")
              .update({
                wave_video_url: pool.wave_video_url,
                intro_video_url: pool.intro_video_url,
                loop_video_url: pool.loop_video_url,
              })
              .eq("id", pool.membership_id);
          }
        }

        setPools(transformedPools);
        setStage("pool-select");
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
        setStage("pool-select");
      }
    };

    loadData();
  }, [supabase, router]);

  // Initialize webcam when needed
  useEffect(() => {
    const needsWebcam = ["intro", "mimic", "countdown-mimic", "recording-mimic", "script", "countdown-script", "recording-script", "smile", "countdown-smile", "recording-smile"].includes(stage);
    
    if (needsWebcam && !streamRef.current) {
      navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      }).then(stream => {
        streamRef.current = stream;
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
        setHasAudioPermission(true);
      }).catch(err => {
        console.error("Failed to access webcam:", err);
        setError("Please allow camera and microphone access to record your intro videos.");
      });
    }
    // Note: Don't clear countdownIntervalRef here - it gets cleared by the countdown logic itself
    // Clearing it here would cancel the countdown when stage changes to countdown-*
  }, [stage]);

  // Re-attach stream when video element changes
  useEffect(() => {
    if (streamRef.current && webcamRef.current && !webcamRef.current.srcObject) {
      webcamRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Pool selection
  const selectPool = (pool: PoolInfo) => {
    setSelectedPool(pool);
    setRecordedVideos({ mimic: null, script: null, smile: null });
    setRerecordingVideo(null);
    
    // Check if pool has existing videos
    if (pool.wave_video_url || pool.intro_video_url || pool.loop_video_url) {
      setStage("has-videos");
    } else {
      setStage("intro");
    }
  };

  // Get example video URL (falls back to agent's existing videos)
  const getExampleWaveUrl = () => {
    return selectedPool?.example_wave_video_url || selectedPool?.wave_video_url || null;
  };

  const getExampleLoopUrl = () => {
    return selectedPool?.example_loop_video_url || selectedPool?.loop_video_url || null;
  };

  // ⚠️ IMPORTANT: startRecording MUST be declared BEFORE startCountdown
  // because startCountdown depends on it in its dependency array.
  // Moving startRecording after startCountdown will cause a TypeScript error:
  // "Block-scoped variable 'startRecording' used before its declaration"
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

    // Play example video for mimic
    if (recordingStage === "recording-mimic" && exampleVideoRef.current) {
      exampleVideoRef.current.currentTime = 0;
      exampleVideoRef.current.play();
    }
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
  }, [startRecording]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (exampleVideoRef.current) {
      exampleVideoRef.current.pause();
    }
  }, []);

  // Handle next after recording - go to review stage
  const handleNextRecording = useCallback(() => {
    stopRecording();
    
    if (rerecordingVideo) {
      setStage("review");
      return;
    }
    
    // Go to per-step review after each recording
    if (stage === "recording-mimic") {
      setStage("review-mimic");
    } else if (stage === "recording-script") {
      setStage("review-script");
    } else if (stage === "recording-smile") {
      setStage("review-smile");
    }
  }, [stage, stopRecording, rerecordingVideo]);

  // Start re-recording a specific video
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

  // Redo a specific recording
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
    if (!rerecordingVideo || !recordedVideos[rerecordingVideo] || !selectedPool || !userId || !orgId) {
      setError("No video to upload.");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);

    try {
      const videoBlob = recordedVideos[rerecordingVideo]!;
      let videoPath: string;
      let dbField: string;
      
      switch (rerecordingVideo) {
        case "mimic":
          videoPath = `${orgId}/${userId}/pools/${selectedPool.id}/wave.webm`;
          dbField = "wave_video_url";
          break;
        case "script":
          videoPath = `${orgId}/${userId}/pools/${selectedPool.id}/intro.webm`;
          dbField = "intro_video_url";
          break;
        case "smile":
          videoPath = `${orgId}/${userId}/pools/${selectedPool.id}/loop.webm`;
          dbField = "loop_video_url";
          break;
      }

      setUploadProgress(30);

      await supabase.storage.from("videos").upload(videoPath, videoBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      setUploadProgress(60);

      const { data: videoUrl } = supabase.storage.from("videos").getPublicUrl(videoPath);

      setUploadProgress(80);

      const { error: updateError } = await supabase
        .from("agent_pool_members")
        .update({ [dbField]: videoUrl.publicUrl })
        .eq("id", selectedPool.membership_id);

      if (updateError) throw updateError;

      setUploadProgress(100);

      // Update local state
      const fieldMap: Record<string, keyof PoolInfo> = {
        mimic: "wave_video_url",
        script: "intro_video_url", 
        smile: "loop_video_url"
      };
      
      setSelectedPool(prev => prev ? { ...prev, [fieldMap[rerecordingVideo]]: videoUrl.publicUrl } : null);
      setPools(prev => prev.map(p => 
        p.id === selectedPool.id ? { ...p, [fieldMap[rerecordingVideo]]: videoUrl.publicUrl } : p
      ));

      setRerecordingVideo(null);
      setRecordedVideos({ mimic: null, script: null, smile: null });
      setStage("has-videos");

    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload video. Please try again.");
      setStage("review");
    }
  }, [rerecordingVideo, recordedVideos, selectedPool, userId, orgId, supabase]);

  // Upload all videos
  const uploadVideos = useCallback(async () => {
    if (!recordedVideos.mimic || !recordedVideos.script || !recordedVideos.smile || !selectedPool || !userId || !orgId) {
      setError("Please record all three videos before uploading.");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);

    try {
      // Upload wave video
      setUploadProgress(10);
      const wavePath = `${orgId}/${userId}/pools/${selectedPool.id}/wave.webm`;
      await supabase.storage.from("videos").upload(wavePath, recordedVideos.mimic, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Upload intro video
      setUploadProgress(40);
      const introPath = `${orgId}/${userId}/pools/${selectedPool.id}/intro.webm`;
      await supabase.storage.from("videos").upload(introPath, recordedVideos.script, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Upload loop video
      setUploadProgress(70);
      const loopPath = `${orgId}/${userId}/pools/${selectedPool.id}/loop.webm`;
      await supabase.storage.from("videos").upload(loopPath, recordedVideos.smile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/webm",
      });

      // Get public URLs
      const { data: waveUrl } = supabase.storage.from("videos").getPublicUrl(wavePath);
      const { data: introUrl } = supabase.storage.from("videos").getPublicUrl(introPath);
      const { data: loopUrl } = supabase.storage.from("videos").getPublicUrl(loopPath);

      setUploadProgress(90);

      // Update database
      const { error: updateError } = await supabase
        .from("agent_pool_members")
        .update({
          wave_video_url: waveUrl.publicUrl,
          intro_video_url: introUrl.publicUrl,
          loop_video_url: loopUrl.publicUrl,
        })
        .eq("id", selectedPool.membership_id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedPool(prev => prev ? {
        ...prev,
        wave_video_url: waveUrl.publicUrl,
        intro_video_url: introUrl.publicUrl,
        loop_video_url: loopUrl.publicUrl,
      } : null);
      
      setPools(prev => prev.map(p => 
        p.id === selectedPool.id ? {
          ...p,
          wave_video_url: waveUrl.publicUrl,
          intro_video_url: introUrl.publicUrl,
          loop_video_url: loopUrl.publicUrl,
        } : p
      ));

      setUploadProgress(100);
      setStage("complete");
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload videos. Please try again.");
      setStage("review");
    }
  }, [recordedVideos, selectedPool, userId, orgId, supabase]);

  // Check if pool has all videos
  const poolHasAllVideos = (pool: PoolInfo) => {
    return pool.wave_video_url && pool.intro_video_url && pool.loop_video_url;
  };

  // Render
  return (
    <div className="min-h-screen bg-background">
      {/* Background effects - matching landing page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[500px] h-[500px] -top-[200px] left-1/2 -translate-x-1/2 bg-primary/15" />
        <div className="glow-orb w-[350px] h-[350px] top-[50%] -left-[150px] bg-purple-600/10" />
        <div className="glow-orb w-[300px] h-[300px] top-[30%] -right-[100px] bg-fuchsia-600/8" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Pre-recorded Intro</h1>
          <p className="text-muted-foreground text-sm">
            {stage === "pool-select" 
              ? "Select a team to record intro videos for"
              : selectedPool 
                ? `Recording for: ${selectedPool.name}`
                : "Record your intro videos to greet visitors"}
          </p>
        </div>

        {/* Progress Steps - only show when recording */}
        {!["loading", "pool-select", "has-videos"].includes(stage) && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <ProgressStep 
              step={1} 
              label="Wave" 
              active={stage.includes("mimic")} 
              completed={recordedVideos.mimic !== null && !stage.includes("mimic")} 
            />
            <div className="w-12 h-0.5 bg-border" />
            <ProgressStep 
              step={2} 
              label="Speak" 
              active={stage.includes("script")} 
              completed={recordedVideos.script !== null && !stage.includes("script")} 
            />
            <div className="w-12 h-0.5 bg-border" />
            <ProgressStep 
              step={3} 
              label="Smile" 
              active={stage.includes("smile")} 
              completed={recordedVideos.smile !== null && !stage.includes("smile")} 
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

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Main Content */}
        <div className="relative backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
          
          {/* Loading */}
          {stage === "loading" && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your teams...</p>
            </div>
          )}

          {/* Pool Selection */}
          {stage === "pool-select" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Select a Team</h2>
              
              {pools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>You're not assigned to any teams yet.</p>
                  <p className="text-sm">Contact your admin to get added to a team.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pools.map(pool => (
                    <button
                      key={pool.id}
                      onClick={() => selectPool(pool)}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left group"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{pool.name}</div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          Script: "{pool.intro_script}"
                        </div>
                        <div className="flex gap-2 mt-3">
                          {pool.wave_video_url && (
                            <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">Wave ✓</span>
                          )}
                          {pool.intro_video_url && (
                            <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">Intro ✓</span>
                          )}
                          {pool.loop_video_url && (
                            <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">Loop ✓</span>
                          )}
                          {!pool.wave_video_url && !pool.intro_video_url && !pool.loop_video_url && (
                            <span className="text-xs px-2.5 py-1 bg-primary/20 text-primary rounded-full font-medium">No videos yet</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-border">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Bullpen
                </button>
              </div>
            </div>
          )}

          {/* Has Existing Videos */}
          {stage === "has-videos" && selectedPool && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Videos Ready for {selectedPool.name}!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your pre-recorded intro is active for this team.
              </p>
              
              <div className="grid grid-cols-3 gap-6 mb-8">
                <VideoPreviewCard
                  label="1. Wave"
                  sublabel="Loops while muted"
                  videoUrl={selectedPool.wave_video_url}
                  onRerecord={() => startRerecordSingle("mimic")}
                />
                <VideoPreviewCard
                  label="2. Speak"
                  sublabel="Plays with audio"
                  videoUrl={selectedPool.intro_video_url}
                  onRerecord={() => startRerecordSingle("script")}
                />
                <VideoPreviewCard
                  label="3. Smile"
                  sublabel="Loops forever"
                  videoUrl={selectedPool.loop_video_url}
                  onRerecord={() => startRerecordSingle("smile")}
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("pool-select")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Other Teams
                </button>
                <button
                  onClick={() => {
                    setRecordedVideos({ mimic: null, script: null, smile: null });
                    setStage("intro");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Record All New
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Bullpen
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Intro Stage */}
          {stage === "intro" && selectedPool && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Let's Record Your Intro</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                You'll record 3 short clips for <span className="font-medium text-foreground">{selectedPool.name}</span>:
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8 text-left max-w-2xl mx-auto">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-primary font-bold text-sm">1</span>
                  </div>
                  <div className="font-semibold mb-1">Wave</div>
                  <div className="text-sm text-muted-foreground">
                    Mimic the example – wave and look engaged
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-primary font-bold text-sm">2</span>
                  </div>
                  <div className="font-semibold mb-1">Speak</div>
                  <div className="text-sm text-muted-foreground">
                    Read the script asking visitors to unmute
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-primary font-bold text-sm">3</span>
                  </div>
                  <div className="font-semibold mb-1">Smile</div>
                  <div className="text-sm text-muted-foreground">
                    Just sit and smile – loops while waiting
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("pool-select")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => setStage("mimic")}
                  disabled={!hasAudioPermission}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
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
            </div>
          )}

          {/* Mimic Stage */}
          {stage === "mimic" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 1: Wave & Engage</h2>
              <p className="text-muted-foreground mb-6">
                {getExampleWaveUrl() 
                  ? "Watch the example, then record yourself doing the same!"
                  : "Wave and look engaged, like you're about to say something important!"}
              </p>
              <div className={`grid ${getExampleWaveUrl() ? "grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"} gap-6 mb-6`}>
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Camera</div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <video
                      ref={webcamRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                </div>
                {getExampleWaveUrl() && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Example (click to play)</div>
                    <VideoWithPlayButton 
                      src={getExampleWaveUrl()!} 
                      className="aspect-video rounded-xl overflow-hidden bg-black"
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Wave, smile, and look like you're about to say something important!
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("intro")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => startCountdown("countdown-mimic", "recording-mimic")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Recording
                </button>
              </div>
            </div>
          )}

          {/* Countdown for Mimic */}
          {stage === "countdown-mimic" && (
            <CountdownOverlay countdown={countdown} />
          )}

          {/* Recording Mimic - Only show user camera */}
          {stage === "recording-mimic" && selectedPool && (
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
              <p className="text-sm text-muted-foreground mb-6">
                Wave, smile, look engaged!
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    stopRecording();
                    setStage("mimic");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextRecording}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Review Mimic Stage - Side-by-side comparison */}
          {stage === "review-mimic" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Review Your Wave</h2>
              <p className="text-muted-foreground mb-6">
                Compare your recording with the example. Happy with it?
              </p>
              <div className={`grid ${getExampleWaveUrl() ? "grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"} gap-6 mb-6 max-w-4xl mx-auto`}>
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Recording</div>
                  <VideoWithPlayButton 
                    blob={recordedVideos.mimic} 
                    className="aspect-video rounded-xl overflow-hidden bg-black"
                  />
                </div>
                {getExampleWaveUrl() && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Example</div>
                    <VideoWithPlayButton 
                      src={getExampleWaveUrl()!} 
                      className="aspect-video rounded-xl overflow-hidden bg-black"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("mimic")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => {
                    setRecordedVideos(prev => ({ ...prev, mimic: null }));
                    setStage("mimic");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Re-record
                </button>
                <button
                  onClick={() => setStage("script")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continue to Speak
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Script Stage */}
          {stage === "script" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 2: Say Your Script</h2>
              <p className="text-muted-foreground mb-6">
                Read the script below naturally, like you're talking to a real visitor
              </p>
              <div className="max-w-2xl mx-auto mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-2 text-left">Your Camera</div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    ref={webcamRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>
              <div className="max-w-lg mx-auto p-6 rounded-2xl bg-primary/10 border border-primary/30 mb-6">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">Your Script</span>
                </div>
                <p className="text-xl font-medium leading-relaxed">
                  "{selectedPool.intro_script}"
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("review-mimic")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => startCountdown("countdown-script", "recording-script")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Recording
                </button>
              </div>
            </div>
          )}

          {/* Countdown for Script */}
          {stage === "countdown-script" && (
            <CountdownOverlay countdown={countdown} />
          )}

          {/* Recording Script */}
          {stage === "recording-script" && selectedPool && (
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
              <div className="max-w-lg mx-auto p-6 rounded-2xl bg-primary/10 border border-primary/30 mb-6">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">Read This</span>
                </div>
                <p className="text-2xl font-medium leading-relaxed">
                  "{selectedPool.intro_script}"
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    stopRecording();
                    setStage("script");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextRecording}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Review Script Stage - Side-by-side comparison */}
          {stage === "review-script" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Review Your Script</h2>
              <p className="text-muted-foreground mb-6">
                Make sure you're happy with how you delivered the script
              </p>
              <div className="grid grid-cols-1 gap-6 mb-6 max-w-2xl mx-auto">
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Recording</div>
                  <VideoWithPlayButton 
                    blob={recordedVideos.script} 
                    className="aspect-video rounded-xl overflow-hidden bg-black"
                  />
                </div>
              </div>
              <div className="max-w-lg mx-auto p-4 rounded-xl bg-muted/50 mb-6">
                <div className="text-sm text-muted-foreground">Script you should have said:</div>
                <p className="font-medium mt-1">"{selectedPool.intro_script}"</p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("script")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => {
                    setRecordedVideos(prev => ({ ...prev, script: null }));
                    setStage("script");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Re-record
                </button>
                <button
                  onClick={() => setStage("smile")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continue to Smile
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Smile Stage */}
          {stage === "smile" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Part 3: Waiting Smile</h2>
              <p className="text-muted-foreground mb-6">
                Just sit there and smile naturally. This loops while waiting for a response.
              </p>
              <div className={`grid ${getExampleLoopUrl() ? "grid-cols-2" : "grid-cols-1"} gap-6 mb-6 max-w-4xl mx-auto`}>
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Camera</div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <video
                      ref={webcamRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                </div>
                {getExampleLoopUrl() && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Example (click to play)</div>
                    <VideoWithPlayButton 
                      src={getExampleLoopUrl()!} 
                      className="aspect-video rounded-xl overflow-hidden bg-black"
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Look friendly and attentive, like you're waiting for them to respond
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("review-script")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => startCountdown("countdown-smile", "recording-smile")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Recording
                </button>
              </div>
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
                Keep smiling naturally...
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    stopRecording();
                    setStage("smile");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextRecording}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Review Smile Stage - Side-by-side comparison */}
          {stage === "review-smile" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Review Your Smile</h2>
              <p className="text-muted-foreground mb-6">
                Compare your recording with the example. This loops while waiting for a response.
              </p>
              <div className={`grid ${getExampleLoopUrl() ? "grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"} gap-6 mb-6 max-w-4xl mx-auto`}>
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Recording</div>
                  <VideoWithPlayButton 
                    blob={recordedVideos.smile} 
                    className="aspect-video rounded-xl overflow-hidden bg-black"
                  />
                </div>
                {getExampleLoopUrl() && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Example</div>
                    <VideoWithPlayButton 
                      src={getExampleLoopUrl()!} 
                      className="aspect-video rounded-xl overflow-hidden bg-black"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStage("smile")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => {
                    setRecordedVideos(prev => ({ ...prev, smile: null }));
                    setStage("smile");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Re-record
                </button>
                <button
                  onClick={() => setStage("review")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Finish & Review All
                </button>
              </div>
            </div>
          )}

          {/* Review Stage */}
          {stage === "review" && selectedPool && (
            <div className="text-center">
              {rerecordingVideo ? (
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
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-6 h-6" />
                      Save Video
                    </button>
                  </div>
                </>
              ) : (
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
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setStage("review-smile")}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={uploadVideos}
                      disabled={!recordedVideos.mimic || !recordedVideos.script || !recordedVideos.smile}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-6 h-6" />
                      Save & Upload Videos
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Uploading */}
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

          {/* Complete */}
          {stage === "complete" && selectedPool && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Videos Saved! 🎉</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your pre-recorded intro for {selectedPool.name} is ready.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setRecordedVideos({ mimic: null, script: null, smile: null });
                    setStage("pool-select");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Record More Teams
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Bullpen
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

// Progress Step Component
function ProgressStep({ step, label, active, completed }: { 
  step: number; 
  label: string; 
  active: boolean; 
  completed: boolean; 
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
          completed
            ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
            : active
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "bg-muted/50 border border-border/50 text-muted-foreground"
        }`}
      >
        {completed ? <Check className="w-5 h-5" /> : step}
      </div>
      <span className={`text-xs font-medium ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

// Animated Countdown Overlay (Loom-style) - Contained within card
function CountdownOverlay({ countdown }: { countdown: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div 
        key={countdown}
        className="relative w-36 h-36 flex items-center justify-center"
        style={{
          animation: 'countdownPulse 1s ease-in-out',
        }}
      >
        {/* Circle background */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        {/* Animated progress ring */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="289"
            style={{
              strokeDashoffset: 0,
              animation: 'countdownRing 1s linear forwards',
            }}
          />
        </svg>
        {/* Number */}
        <span 
          className="text-6xl font-bold text-foreground"
          style={{
            animation: 'countdownNumber 1s ease-in-out forwards',
          }}
        >
          {countdown}
        </span>
      </div>
      <p className="text-lg text-muted-foreground mt-6 font-medium">Get ready...</p>
      <style>{`
        @keyframes countdownNumber {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.1); opacity: 1; }
          30% { transform: scale(1); }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes countdownRing {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 289; }
        }
        @keyframes countdownPulse {
          0% { transform: scale(0.9); }
          20% { transform: scale(1.05); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// Video Preview (for review stage)
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

// Video Preview Card (for has-videos stage)
function VideoPreviewCard({ 
  label, 
  sublabel, 
  videoUrl, 
  onRerecord 
}: { 
  label: string; 
  sublabel: string;
  videoUrl: string | null; 
  onRerecord: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="text-center">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2 group">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {/* Big centered play button */}
            {!isPlaying && (
              <button
                onClick={handlePlayClick}
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
              >
                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 text-black ml-1" fill="currentColor" />
                </div>
              </button>
            )}
            {/* Click to pause when playing */}
            {isPlaying && (
              <button
                onClick={handlePlayClick}
                className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center bg-black/20 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center">
                  <Square className="w-7 h-7 text-black" fill="currentColor" />
                </div>
              </button>
            )}
            {/* Re-record button on hover */}
            <button
              onClick={onRerecord}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-medium hover:bg-black/90"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record
            </button>
          </>
        ) : (
          <button
            onClick={onRerecord}
            className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
          >
            <Play className="w-6 h-6 mb-1" />
            Record
          </button>
        )}
      </div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </div>
  );
}

// Video with Big Play Button (for review stages and example videos)
function VideoWithPlayButton({ 
  src, 
  blob, 
  className = "" 
}: { 
  src?: string; 
  blob?: Blob | null; 
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = blob ? URL.createObjectURL(blob) : src;

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  if (!videoUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-black text-muted-foreground`}>
        No video
      </div>
    );
  }

  return (
    <div className={`${className} relative group`}>
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        className="w-full h-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      {/* Big centered play button */}
      {!isPlaying && (
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
        >
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
            <Play className="w-10 h-10 text-black ml-1" fill="currentColor" />
          </div>
        </button>
      )}
      {/* Click to pause when playing */}
      {isPlaying && (
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center bg-black/20 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center">
            <Square className="w-7 h-7 text-black" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}
