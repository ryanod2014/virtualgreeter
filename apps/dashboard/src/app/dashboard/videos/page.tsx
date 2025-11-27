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
  ArrowLeft,
  RotateCcw,
  Loader2,
  Mic,
  Volume2,
  ChevronDown,
  Users,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Default example videos (fall back to these if pool doesn't have custom ones)
const DEFAULT_WAVE_EXAMPLE = "/examples/wave-example.mp4";
const DEFAULT_LOOP_EXAMPLE = "/examples/loop-example.mp4";

// Types
interface PoolWithVideos {
  id: string;
  name: string;
  intro_script: string;
  example_wave_video_url: string | null;
  example_loop_video_url: string | null;
  // Agent's recorded videos for this pool
  membership_id: string;
  wave_video_url: string | null;
  intro_video_url: string | null;
  loop_video_url: string | null;
}

interface ExistingVideo {
  poolId: string;
  poolName: string;
  url: string;
  script?: string; // For intro videos, the script it was recorded with
}

type VideoType = "wave" | "intro" | "loop";
type RecordingStage = 
  | "pool-list" 
  | "select-videos" 
  | "record-wave" 
  | "countdown-wave" 
  | "recording-wave"
  | "record-intro" 
  | "countdown-intro" 
  | "recording-intro"
  | "record-loop" 
  | "countdown-loop" 
  | "recording-loop"
  | "review" 
  | "uploading" 
  | "complete";

export default function VideosPage() {
  const router = useRouter();
  const supabase = createClient();

  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [stage, setStage] = useState<RecordingStage>("pool-list");
  const [pools, setPools] = useState<PoolWithVideos[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolWithVideos | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Video selection state (null = record new, string = use existing URL)
  const [selectedWaveVideo, setSelectedWaveVideo] = useState<string | null>(null);
  const [selectedIntroVideo, setSelectedIntroVideo] = useState<string | null>(null);
  const [selectedLoopVideo, setSelectedLoopVideo] = useState<string | null>(null);
  const [uploadingVideoType, setUploadingVideoType] = useState<VideoType | null>(null);

  // Recording state
  const [countdown, setCountdown] = useState(3);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState<{
    wave: Blob | null;
    intro: Blob | null;
    loop: Blob | null;
  }>({ wave: null, intro: null, loop: null });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [agentProfileId, setAgentProfileId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Refs
  const webcamRef = useRef<HTMLVideoElement>(null);
  const exampleVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load pools and agent data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);

        // Get agent profile
        const { data: profile } = await supabase
          .from("agent_profiles")
          .select("id, organization_id")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setError("Agent profile not found");
          setIsLoading(false);
          return;
        }

        setAgentProfileId(profile.id);
        setOrgId(profile.organization_id);

        // Get pools the agent is a member of, with their video settings
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
              example_loop_video_url
            )
          `)
          .eq("agent_profile_id", profile.id);

        if (poolError) {
          console.error("Error loading pools:", poolError);
          setError("Failed to load pools");
          setIsLoading(false);
          return;
        }

        // Transform into our PoolWithVideos format
        const transformedPools: PoolWithVideos[] = (poolData || [])
          .filter(m => m.agent_pools)
          .map(m => {
            // Supabase returns single object for belongsTo relation
            const pool = m.agent_pools as unknown as {
              id: string;
              name: string;
              intro_script: string | null;
              example_wave_video_url: string | null;
              example_loop_video_url: string | null;
            };
            return {
              id: pool.id,
              name: pool.name,
              intro_script: pool.intro_script || "Hey, do you mind turning on your mic real fast? Quick question for you.",
              example_wave_video_url: pool.example_wave_video_url,
              example_loop_video_url: pool.example_loop_video_url,
              membership_id: m.id,
              wave_video_url: m.wave_video_url,
              intro_video_url: m.intro_video_url,
              loop_video_url: m.loop_video_url,
            };
          });

        setPools(transformedPools);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
        setIsLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  // Initialize webcam when entering recording stages
  useEffect(() => {
    const needsWebcam = stage.includes("record") || stage.includes("countdown") || stage.includes("recording");
    
    if (needsWebcam && !streamRef.current) {
      navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      }).then(stream => {
        streamRef.current = stream;
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
        setHasPermission(true);
      }).catch(err => {
        console.error("Failed to access webcam:", err);
        setError("Please allow camera and microphone access");
      });
    }

    return () => {
      // Cleanup webcam when leaving recording flow
      if (!needsWebcam && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setHasPermission(false);
      }
    };
  }, [stage]);

  // Re-attach stream to video element when stage changes
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

  // Get existing videos for dropdown options
  const getExistingVideos = (type: VideoType): ExistingVideo[] => {
    return pools
      .filter(p => {
        if (type === "wave") return p.wave_video_url;
        if (type === "intro") return p.intro_video_url;
        if (type === "loop") return p.loop_video_url;
        return false;
      })
      .map(p => ({
        poolId: p.id,
        poolName: p.name,
        url: type === "wave" ? p.wave_video_url! : type === "intro" ? p.intro_video_url! : p.loop_video_url!,
        script: type === "intro" ? p.intro_script : undefined,
      }));
  };

  // Check if pool has all videos
  const poolHasAllVideos = (pool: PoolWithVideos) => {
    return pool.wave_video_url && pool.intro_video_url && pool.loop_video_url;
  };

  // Start recording for a pool
  const startPoolRecording = (pool: PoolWithVideos) => {
    setSelectedPool(pool);
    setSelectedWaveVideo(null);
    setSelectedIntroVideo(null);
    setSelectedLoopVideo(null);
    setRecordedBlobs({ wave: null, intro: null, loop: null });
    setStage("select-videos");
  };

  // Proceed from video selection to recording
  const proceedToRecording = () => {
    // Figure out what we need to record
    if (selectedWaveVideo === null) {
      setStage("record-wave");
    } else if (selectedIntroVideo === null) {
      setStage("record-intro");
    } else if (selectedLoopVideo === null) {
      setStage("record-loop");
    } else {
      // All selected from existing, go to review
      setStage("review");
    }
  };

  // Handle video upload
  const handleVideoUpload = async (type: VideoType, file: File) => {
    if (!selectedPool || !userId || !orgId) return;

    setUploadingVideoType(type);
    
    try {
      const path = `${orgId}/${userId}/pools/${selectedPool.id}/${type}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("videos").getPublicUrl(path);
      const videoUrl = data.publicUrl;

      // Set the selected video to the uploaded URL
      if (type === "wave") setSelectedWaveVideo(videoUrl);
      else if (type === "intro") setSelectedIntroVideo(videoUrl);
      else if (type === "loop") setSelectedLoopVideo(videoUrl);
      
    } catch (error) {
      console.error("Upload failed:", error);
      setError("Failed to upload video. Please try again.");
    } finally {
      setUploadingVideoType(null);
    }
  };

  // Start countdown
  const startCountdown = (type: VideoType) => {
    const countdownStage = `countdown-${type}` as RecordingStage;
    const recordingStage = `recording-${type}` as RecordingStage;
    
    setStage(countdownStage);
    setCountdown(3);

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        startRecording(type, recordingStage);
      }
    }, 1000);
  };

  // Start recording
  const startRecording = (type: VideoType, recordingStage: RecordingStage) => {
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
      setRecordedBlobs(prev => ({ ...prev, [type]: blob }));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    // Play example video for wave and loop
    if ((type === "wave" || type === "loop") && exampleVideoRef.current) {
      exampleVideoRef.current.currentTime = 0;
      exampleVideoRef.current.play();
    }
  };

  // Stop recording and move to next step
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (exampleVideoRef.current) {
      exampleVideoRef.current.pause();
    }
  };

  const handleStopAndNext = (currentType: VideoType) => {
    stopRecording();
    
    // Small delay to let the blob be created
    setTimeout(() => {
      if (currentType === "wave") {
        if (selectedIntroVideo === null) {
          setStage("record-intro");
        } else if (selectedLoopVideo === null) {
          setStage("record-loop");
        } else {
          setStage("review");
        }
      } else if (currentType === "intro") {
        if (selectedLoopVideo === null) {
          setStage("record-loop");
        } else {
          setStage("review");
        }
      } else {
        setStage("review");
      }
    }, 100);
  };

  // Upload videos for the selected pool
  const uploadVideos = async () => {
    if (!selectedPool || !userId || !orgId) return;

    setStage("uploading");
    setUploadProgress(0);

    try {
      let waveUrl = selectedWaveVideo;
      let introUrl = selectedIntroVideo;
      let loopUrl = selectedLoopVideo;

      // Upload recorded blobs
      if (recordedBlobs.wave) {
        setUploadProgress(10);
        const path = `${orgId}/${userId}/pools/${selectedPool.id}/wave.webm`;
        await supabase.storage.from("videos").upload(path, recordedBlobs.wave, {
          cacheControl: "3600",
          upsert: true,
          contentType: "video/webm",
        });
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        waveUrl = data.publicUrl;
      }

      if (recordedBlobs.intro) {
        setUploadProgress(40);
        const path = `${orgId}/${userId}/pools/${selectedPool.id}/intro.webm`;
        await supabase.storage.from("videos").upload(path, recordedBlobs.intro, {
          cacheControl: "3600",
          upsert: true,
          contentType: "video/webm",
        });
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        introUrl = data.publicUrl;
      }

      if (recordedBlobs.loop) {
        setUploadProgress(70);
        const path = `${orgId}/${userId}/pools/${selectedPool.id}/loop.webm`;
        await supabase.storage.from("videos").upload(path, recordedBlobs.loop, {
          cacheControl: "3600",
          upsert: true,
          contentType: "video/webm",
        });
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        loopUrl = data.publicUrl;
      }

      setUploadProgress(90);

      // Update agent_pool_members with video URLs
      const { error: updateError } = await supabase
        .from("agent_pool_members")
        .update({
          wave_video_url: waveUrl,
          intro_video_url: introUrl,
          loop_video_url: loopUrl,
        })
        .eq("id", selectedPool.membership_id);

      if (updateError) throw updateError;

      // Update local state
      setPools(prev => prev.map(p => 
        p.id === selectedPool.id 
          ? { ...p, wave_video_url: waveUrl, intro_video_url: introUrl, loop_video_url: loopUrl }
          : p
      ));

      setUploadProgress(100);
      setStage("complete");
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload videos. Please try again.");
      setStage("review");
    }
  };

  // Get example video URL for current recording
  const getExampleUrl = (type: VideoType) => {
    if (!selectedPool) return DEFAULT_WAVE_EXAMPLE;
    if (type === "wave") return selectedPool.example_wave_video_url || DEFAULT_WAVE_EXAMPLE;
    if (type === "loop") return selectedPool.example_loop_video_url || DEFAULT_LOOP_EXAMPLE;
    return null;
  };

  // Render
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ghost className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Record Videos</h1>
          </div>
          <p className="text-muted-foreground">
            Record intro videos for each team you're on
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Main Content */}
        <div className="glass rounded-2xl p-8">
          
          {/* Pool List */}
          {stage === "pool-list" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Your Teams</h2>
              
              {pools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>You're not assigned to any teams yet.</p>
                  <p className="text-sm">Contact your admin to get added to a team.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pools.map(pool => (
                    <div
                      key={pool.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-lg">{pool.name}</div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          Script: "{pool.intro_script}"
                        </div>
                        <div className="flex gap-2 mt-2">
                          {pool.wave_video_url && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded">Wave ✓</span>
                          )}
                          {pool.intro_video_url && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded">Intro ✓</span>
                          )}
                          {pool.loop_video_url && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded">Loop ✓</span>
                          )}
                          {!pool.wave_video_url && !pool.intro_video_url && !pool.loop_video_url && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">No videos</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startPoolRecording(pool)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                      >
                        {poolHasAllVideos(pool) ? "Re-record" : "Record"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-border">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Workbench
                </button>
              </div>
            </div>
          )}

          {/* Select Videos (Dropdowns) */}
          {stage === "select-videos" && selectedPool && (
            <div>
              <button
                onClick={() => setStage("pool-list")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to teams
              </button>

              <h2 className="text-xl font-semibold mb-2">Recording for: {selectedPool.name}</h2>
              <p className="text-muted-foreground mb-8">
                Select existing videos or record new ones
              </p>

              <div className="space-y-6">
                {/* Wave Video Selection */}
                <VideoSelector
                  label="1. Wave Video"
                  description="Grabs attention, plays while muted"
                  existingVideos={getExistingVideos("wave")}
                  selectedUrl={selectedWaveVideo}
                  onSelect={setSelectedWaveVideo}
                  onUpload={(file) => handleVideoUpload("wave", file)}
                  isUploading={uploadingVideoType === "wave"}
                />

                {/* Intro Video Selection */}
                <VideoSelector
                  label="2. Intro Video"
                  description="Your script - plays with audio"
                  existingVideos={getExistingVideos("intro").filter(v => v.script === selectedPool.intro_script)}
                  selectedUrl={selectedIntroVideo}
                  onSelect={setSelectedIntroVideo}
                  onUpload={(file) => handleVideoUpload("intro", file)}
                  isUploading={uploadingVideoType === "intro"}
                  currentScript={selectedPool.intro_script}
                />

                {/* Loop Video Selection */}
                <VideoSelector
                  label="3. Loop Video"
                  description="Smiling/waiting, loops forever"
                  existingVideos={getExistingVideos("loop")}
                  selectedUrl={selectedLoopVideo}
                  onSelect={setSelectedLoopVideo}
                  onUpload={(file) => handleVideoUpload("loop", file)}
                  isUploading={uploadingVideoType === "loop"}
                />
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={proceedToRecording}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Record Wave */}
          {(stage === "record-wave" || stage === "countdown-wave" || stage === "recording-wave") && selectedPool && (
            <RecordingView
              title="Part 1: Wave & Engage"
              description="Mimic the example - wave and look engaged!"
              stage={stage}
              countdown={countdown}
              exampleUrl={getExampleUrl("wave")}
              webcamRef={webcamRef}
              exampleVideoRef={exampleVideoRef}
              hasPermission={hasPermission}
              onStartRecording={() => startCountdown("wave")}
              onStopRecording={() => handleStopAndNext("wave")}
            />
          )}

          {/* Record Intro */}
          {(stage === "record-intro" || stage === "countdown-intro" || stage === "recording-intro") && selectedPool && (
            <RecordingView
              title="Part 2: Say Your Script"
              description="Read the script naturally, like talking to a visitor"
              stage={stage}
              countdown={countdown}
              script={selectedPool.intro_script}
              webcamRef={webcamRef}
              exampleVideoRef={exampleVideoRef}
              hasPermission={hasPermission}
              onStartRecording={() => startCountdown("intro")}
              onStopRecording={() => handleStopAndNext("intro")}
            />
          )}

          {/* Record Loop */}
          {(stage === "record-loop" || stage === "countdown-loop" || stage === "recording-loop") && selectedPool && (
            <RecordingView
              title="Part 3: Waiting Smile"
              description="Just sit and smile naturally - this loops while waiting"
              stage={stage}
              countdown={countdown}
              exampleUrl={getExampleUrl("loop")}
              webcamRef={webcamRef}
              exampleVideoRef={exampleVideoRef}
              hasPermission={hasPermission}
              onStartRecording={() => startCountdown("loop")}
              onStopRecording={() => handleStopAndNext("loop")}
            />
          )}

          {/* Review */}
          {stage === "review" && selectedPool && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Review Your Videos</h2>
              <p className="text-muted-foreground mb-8">for {selectedPool.name}</p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <VideoPreviewCard
                  label="1. Wave"
                  blob={recordedBlobs.wave}
                  existingUrl={selectedWaveVideo}
                />
                <VideoPreviewCard
                  label="2. Intro"
                  blob={recordedBlobs.intro}
                  existingUrl={selectedIntroVideo}
                />
                <VideoPreviewCard
                  label="3. Loop"
                  blob={recordedBlobs.loop}
                  existingUrl={selectedLoopVideo}
                />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStage("select-videos")}
                  className="px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4 inline mr-2" />
                  Start Over
                </button>
                <button
                  onClick={uploadVideos}
                  className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-5 h-5 inline mr-2" />
                  Save Videos
                </button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {stage === "uploading" && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Uploading...</h2>
              <div className="max-w-md mx-auto">
                <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-muted-foreground">{uploadProgress}%</p>
              </div>
            </div>
          )}

          {/* Complete */}
          {stage === "complete" && selectedPool && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Done! 🎉</h2>
              <p className="text-muted-foreground mb-8">
                Videos saved for {selectedPool.name}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setSelectedPool(null);
                    setStage("pool-list");
                  }}
                  className="px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Record More Teams
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Workbench
                  <ArrowRight className="w-5 h-5 inline ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Video Selector Dropdown with Upload
function VideoSelector({
  label,
  description,
  existingVideos,
  selectedUrl,
  onSelect,
  onUpload,
  isUploading,
  currentScript,
}: {
  label: string;
  description: string;
  existingVideos: ExistingVideo[];
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  onUpload: (file: File) => void;
  isUploading?: boolean;
  currentScript?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSelectedLabel = () => {
    if (selectedUrl === null) return "Record New";
    if (selectedUrl === "uploading") return "Uploading...";
    const existing = existingVideos.find(v => v.url === selectedUrl);
    if (existing) return existing.poolName;
    return "Uploaded Video";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      setIsOpen(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>

      {currentScript && (
        <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="text-xs text-primary font-medium mb-1">Script for this team:</div>
          <div className="text-sm">"{currentScript}"</div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUploading}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          <span className={selectedUrl === null ? "text-primary font-medium" : ""}>
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : getSelectedLabel()}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && !isUploading && (
          <div className="absolute z-10 w-full mt-2 py-2 rounded-lg border border-border bg-background shadow-lg">
            <button
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${selectedUrl === null ? "text-primary font-medium bg-primary/5" : ""}`}
            >
              🎬 Record New
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
            
            {existingVideos.length > 0 && (
              <>
                <div className="border-t border-border my-2" />
                <div className="px-4 py-1 text-xs text-muted-foreground">Use existing from:</div>
                {existingVideos.map(video => (
                  <button
                    key={video.poolId}
                    onClick={() => { onSelect(video.url); setIsOpen(false); }}
                    className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${selectedUrl === video.url ? "text-primary font-medium bg-primary/5" : ""}`}
                  >
                    {video.poolName}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedUrl && selectedUrl !== "uploading" && (
        <div className="mt-3">
          <video 
            src={selectedUrl} 
            controls 
            className="w-full rounded-lg max-h-32 object-cover"
          />
        </div>
      )}
    </div>
  );
}

// Recording View Component
function RecordingView({
  title,
  description,
  stage,
  countdown,
  exampleUrl,
  script,
  webcamRef,
  exampleVideoRef,
  hasPermission,
  onStartRecording,
  onStopRecording,
}: {
  title: string;
  description: string;
  stage: string;
  countdown: number;
  exampleUrl?: string | null;
  script?: string;
  webcamRef: React.RefObject<HTMLVideoElement>;
  exampleVideoRef: React.RefObject<HTMLVideoElement>;
  hasPermission: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  const isCountdown = stage.includes("countdown");
  const isRecording = stage.includes("recording-");

  // Countdown overlay
  if (isCountdown) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-9xl font-bold text-white animate-pulse">{countdown}</div>
          <p className="text-2xl text-white/80 mt-4">Get ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>

      {/* Video Grid */}
      <div className={exampleUrl ? "grid grid-cols-2 gap-6 mb-6" : "max-w-2xl mx-auto mb-6"}>
        <div className={`relative aspect-video rounded-xl overflow-hidden bg-black ${isRecording ? "ring-4 ring-red-500/50" : ""}`}>
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className={`absolute top-3 left-3 px-2 py-1 rounded text-white text-sm font-medium ${isRecording ? "bg-red-500 flex items-center gap-1" : "bg-black/50"}`}>
            {isRecording && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            {isRecording ? "REC" : "Your Camera"}
          </div>
        </div>

        {exampleUrl && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <video
              ref={exampleVideoRef}
              src={exampleUrl}
              playsInline
              loop
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-sm font-medium">
              {isRecording ? "Follow Along" : "Example"}
            </div>
            {!isRecording && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-16 h-16 text-white/80" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Script display for intro */}
      {script && (
        <div className="max-w-lg mx-auto p-6 rounded-xl bg-primary/10 border border-primary/20 mb-6">
          <div className="flex items-center gap-2 text-primary mb-3">
            {isRecording ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="font-semibold">{isRecording ? "Read This" : "Your Script"}</span>
          </div>
          <p className={`font-medium leading-relaxed ${isRecording ? "text-2xl" : "text-xl"}`}>
            "{script}"
          </p>
        </div>
      )}

      {/* Action Button */}
      {isRecording ? (
        <button
          onClick={onStopRecording}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
        >
          <Square className="w-5 h-5" />
          Stop & Continue
        </button>
      ) : (
        <button
          onClick={onStartRecording}
          disabled={!hasPermission}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {hasPermission ? (
            <>
              <Play className="w-5 h-5" />
              Start Recording
            </>
          ) : (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Waiting for camera...
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Video Preview Card
function VideoPreviewCard({
  label,
  blob,
  existingUrl,
}: {
  label: string;
  blob: Blob | null;
  existingUrl: string | null;
}) {
  const videoUrl = blob ? URL.createObjectURL(blob) : existingUrl;

  return (
    <div className="text-center">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2">
        {videoUrl ? (
          <video src={videoUrl} controls playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No video
          </div>
        )}
      </div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">
        {blob ? "New recording" : existingUrl ? "Using existing" : "Missing"}
      </div>
    </div>
  );
}
