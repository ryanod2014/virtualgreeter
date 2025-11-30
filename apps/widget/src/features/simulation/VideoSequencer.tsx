import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { VIDEO_TIMING } from "../../constants";

interface VideoSequencerProps {
  /** Plays on loop while muted (before user interaction) */
  waveUrl?: string | null;
  /** Plays once with audio after user interaction */
  introUrl?: string | null;
  /** Loops forever after intro finishes */
  loopUrl?: string | null;
  /** Whether WebRTC is connecting (show "Connecting..." overlay) */
  isConnecting?: boolean;
  /** Whether we're in a live call */
  isLive?: boolean;
  /** Whether audio was already unlocked by parent (from earlier user click) */
  audioUnlocked?: boolean;
  /** Called when a video error occurs */
  onError?: (error: string) => void;
  /** Skip directly to loop video (used when reopening after minimize) */
  skipToLoop?: boolean;
  /** Called when intro sequence completes (reached loop state) */
  onIntroComplete?: () => void;
}

type VideoState = "loading" | "wave" | "intro" | "loop" | "connecting" | "live" | "error";

/**
 * VideoSequencer - Handles the 3-part video sequence
 *
 * Flow:
 * 1. Wave video plays on loop (muted) - must complete at least 1 full playback
 * 2. After wave completes AND user interaction, intro video plays once with audio
 * 3. Loop video plays forever after intro finishes
 *
 * Key features:
 * - Wave video must play through completely at least once before transitioning
 * - Triple buffering (three video tags) to prevent black flash on switch
 * - Starts muted for autoplay, unmutes on first user interaction
 * - Seamless transitions between all videos
 * - Looks like a live video feed (no play button overlay)
 * - Error recovery with retry capability
 */
export function VideoSequencer({
  waveUrl,
  introUrl,
  loopUrl,
  isConnecting,
  isLive,
  audioUnlocked = false,
  onError,
  skipToLoop = false,
  onIntroComplete,
}: VideoSequencerProps) {
  const [state, setState] = useState<VideoState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<"wave" | "intro" | "loop">("wave");
  const [hasStartedWithAudio, setHasStartedWithAudio] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [waveCompletedOnce, setWaveCompletedOnce] = useState(false);

  const waveVideoRef = useRef<HTMLVideoElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clear any pending load timeout
   */
  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  /**
   * Switch to loop video - ONLY after intro has completed (or no intro exists or skipToLoop)
   */
  const switchToLoop = useCallback((force = false) => {
    if (!loopVideoRef.current) return;

    // Safety check: don't switch to loop if intro exists and hasn't completed (unless forced)
    if (!force && introUrl && !introCompleted) {
      console.warn("[VideoSequencer] ⚠️ Cannot switch to loop - intro not completed yet");
      return;
    }

    console.log("[VideoSequencer] 🔊 Switching to loop with audio");

    // Pause other videos
    waveVideoRef.current?.pause();
    introVideoRef.current?.pause();

    setState("loop");
    setActiveVideo("loop");
    setIsMuted(false);
    loopVideoRef.current.muted = false;
    loopVideoRef.current.currentTime = 0;
    loopVideoRef.current.play().catch((error) => {
      console.error("Loop autoplay failed:", error);
      // Try muted playback as fallback
      if (loopVideoRef.current) {
        loopVideoRef.current.muted = true;
        loopVideoRef.current.play().catch(() => {
          setLoadError("Failed to play video");
          setState("error");
        });
      }
    });

    // Notify parent that intro sequence is complete
    onIntroComplete?.();
  }, [introUrl, introCompleted, onIntroComplete]);

  /**
   * Switch to intro video with audio
   */
  const switchToIntro = useCallback(() => {
    if (!introVideoRef.current) {
      // No intro ref, mark as completed and go to loop
      setIntroCompleted(true);
      return;
    }

    console.log("[VideoSequencer] 🔊 Switching to intro with audio");

    // Pause wave video
    waveVideoRef.current?.pause();

    setState("intro");
    setActiveVideo("intro");
    setIsMuted(false);
    setIntroStartedAt(Date.now());
    introVideoRef.current.muted = false;
    introVideoRef.current.currentTime = 0;

    // Play intro with retry logic
    const playIntro = () => {
      introVideoRef.current?.play().catch((error) => {
        console.error("Intro play failed:", error);
        
        // Retry after a short delay
        setTimeout(() => {
          if (introVideoRef.current && !introCompleted) {
            introVideoRef.current.play().catch((e) => {
              console.error("Intro retry also failed:", e);
              // Skip to loop as last resort
              setIntroCompleted(true);
            });
          }
        }, VIDEO_TIMING.INTRO_RETRY_DELAY);
      });
    };

    playIntro();
  }, [introCompleted]);

  /**
   * Handle video load error with retry
   */
  const handleVideoError = useCallback(
    (videoType: string) => {
      console.error(`[VideoSequencer] ${videoType} video failed to load`);
      
      if (retryCount < 2) {
        // Retry loading
        setRetryCount((c) => c + 1);
        console.log(`[VideoSequencer] Retrying ${videoType} video (attempt ${retryCount + 1})`);
      } else {
        const errorMsg = `Failed to load ${videoType} video`;
        setLoadError(errorMsg);
        setState("error");
        onError?.(errorMsg);
      }
    },
    [retryCount, onError]
  );

  /**
   * Retry loading videos after error
   */
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setLoadError(null);
    setState("loading");
    
    // Re-trigger video loading
    if (waveVideoRef.current && (waveUrl || introUrl)) {
      waveVideoRef.current.load();
      waveVideoRef.current.play().catch(() => {});
    }
  }, [waveUrl, introUrl]);

  // Track when wave video completes at least one full playback
  // Since wave video loops, we detect completion via timeupdate when it reaches near the end
  useEffect(() => {
    const waveVideo = waveVideoRef.current;
    if (!waveVideo || waveCompletedOnce) return;

    const handleTimeUpdate = () => {
      const duration = waveVideo.duration;
      const currentTime = waveVideo.currentTime;
      
      // Consider wave complete when within 0.3s of the end
      if (duration > 0 && currentTime >= duration - 0.3) {
        console.log("[VideoSequencer] ✅ Wave video completed at least once");
        setWaveCompletedOnce(true);
      }
    };

    waveVideo.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      waveVideo.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [waveCompletedOnce]);

  // When audioUnlocked becomes true AND intro is ready AND wave has completed once, switch to intro with audio
  useEffect(() => {
    if (!audioUnlocked || hasStartedWithAudio) return;

    // Wave video must complete at least once before transitioning
    if (!waveCompletedOnce) {
      console.log("[VideoSequencer] ⏳ Waiting for wave video to complete before switching to intro");
      return;
    }

    // If there's an intro URL, wait for it to be ready
    if (introUrl) {
      if (introReady && introVideoRef.current) {
        setHasStartedWithAudio(true);
        switchToIntro();
      }
      return;
    }

    // No intro URL - mark intro as "completed" (nothing to play) and go to loop
    if (loopUrl) {
      setHasStartedWithAudio(true);
      setIntroCompleted(true);
    }
  }, [audioUnlocked, hasStartedWithAudio, introUrl, introReady, loopUrl, switchToIntro, waveCompletedOnce]);

  // When intro completes, switch to loop
  useEffect(() => {
    if (introCompleted && loopUrl) {
      switchToLoop();
    }
  }, [introCompleted, loopUrl, switchToLoop]);

  /**
   * Handle intro video end -> mark complete and switch to loop
   * Only accept if intro actually played (not a spurious event)
   */
  const handleIntroEnded = useCallback(() => {
    const introVideo = introVideoRef.current;

    // Safety checks to prevent premature completion:
    // 1. Intro must have started (introStartedAt is set)
    // 2. At least MIN_PLAY_DURATION must have passed since start
    // 3. Video must be near the end (currentTime close to duration)

    if (!introStartedAt) {
      console.warn("[VideoSequencer] ⚠️ Ignoring ended event - intro never started");
      return;
    }

    const timeSinceStart = Date.now() - introStartedAt;
    if (timeSinceStart < VIDEO_TIMING.INTRO_MIN_PLAY_DURATION) {
      console.warn(`[VideoSequencer] ⚠️ Ignoring ended event - too soon (${timeSinceStart}ms)`);
      return;
    }

    if (introVideo) {
      const duration = introVideo.duration;
      const currentTime = introVideo.currentTime;
      // Allow some tolerance (within END_DETECTION_TOLERANCE of end)
      if (duration > 0 && currentTime < duration - VIDEO_TIMING.END_DETECTION_TOLERANCE) {
        console.warn(
          `[VideoSequencer] ⚠️ Ignoring ended event - video not at end (${currentTime}/${duration})`
        );
        return;
      }
    }

    console.log("[VideoSequencer] ✅ Intro video finished playing");
    setIntroCompleted(true);
  }, [introStartedAt]);

  // Preload intro video and track when it's ready
  useEffect(() => {
    const introVideo = introVideoRef.current;
    if (!introUrl || !introVideo) return;

    const handleCanPlay = () => {
      console.log("[VideoSequencer] ✅ Intro video ready to play");
      setIntroReady(true);
      clearLoadTimeout();
    };

    const handleError = () => {
      handleVideoError("intro");
    };

    introVideo.addEventListener("canplaythrough", handleCanPlay);
    introVideo.addEventListener("error", handleError);
    introVideo.src = introUrl;
    introVideo.load();

    // Check if already ready (cached)
    if (introVideo.readyState >= 3) {
      setIntroReady(true);
    }

    return () => {
      introVideo.removeEventListener("canplaythrough", handleCanPlay);
      introVideo.removeEventListener("error", handleError);
    };
  }, [introUrl, handleVideoError, clearLoadTimeout]);

  // Preload loop video
  useEffect(() => {
    if (loopUrl && loopVideoRef.current) {
      loopVideoRef.current.src = loopUrl;
      loopVideoRef.current.load();
    }
  }, [loopUrl]);

  // Skip directly to loop if skipToLoop is true (e.g., reopening after minimize)
  useEffect(() => {
    if (skipToLoop && loopUrl && loopVideoRef.current) {
      console.log("[VideoSequencer] ⏭️ Skipping to loop (reopening widget)");
      
      // Wait for loop video to be ready
      const loopVideo = loopVideoRef.current;
      
      const startLoop = () => {
        switchToLoop(true); // force=true to bypass intro check
      };
      
      if (loopVideo.readyState >= 3) {
        // Already ready
        startLoop();
      } else {
        // Wait for it to be ready
        loopVideo.addEventListener("canplaythrough", startLoop, { once: true });
        return () => {
          loopVideo.removeEventListener("canplaythrough", startLoop);
        };
      }
    }
  }, [skipToLoop, loopUrl, switchToLoop]);

  // Start playing wave video MUTED when URLs are available (skip if skipToLoop)
  useEffect(() => {
    // Don't start wave sequence if we're skipping to loop
    if (skipToLoop) return;

    const videoUrl = waveUrl || introUrl;
    const videoRef = waveVideoRef.current;

    if (!videoUrl || !videoRef) return;

    const handleError = () => {
      handleVideoError("wave");
    };

    videoRef.addEventListener("error", handleError);
    videoRef.src = videoUrl;
    videoRef.muted = true;
    videoRef.loop = true;

    const playPromise = videoRef.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setState("wave");
          setActiveVideo("wave");
        })
        .catch((error) => {
          console.warn("Autoplay prevented:", error);
          setState("wave");
        });
    }

    return () => {
      videoRef.removeEventListener("error", handleError);
    };
  }, [waveUrl, introUrl, handleVideoError, skipToLoop]);

  // Handle connecting state change
  useEffect(() => {
    if (isConnecting && !isLive) {
      setState("connecting");
    }
  }, [isConnecting, isLive]);

  // Handle live state change
  useEffect(() => {
    if (isLive) {
      setState("live");
      // Pause all videos when going live
      waveVideoRef.current?.pause();
      introVideoRef.current?.pause();
      loopVideoRef.current?.pause();
    }
  }, [isLive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLoadTimeout();
    };
  }, [clearLoadTimeout]);

  return (
    <div className="gg-video-container">
      {/* Wave Video (loops muted until interaction) */}
      <video
        ref={waveVideoRef}
        className={`gg-video ${activeVideo !== "wave" ? "gg-video-hidden" : ""}`}
        playsInline
        muted
        loop
      />

      {/* Intro Video (plays once with audio after interaction) */}
      <video
        ref={introVideoRef}
        className={`gg-video ${activeVideo !== "intro" ? "gg-video-hidden" : ""}`}
        playsInline
        onEnded={handleIntroEnded}
      />

      {/* Loop Video (loops forever after intro) */}
      <video
        ref={loopVideoRef}
        className={`gg-video ${activeVideo !== "loop" ? "gg-video-hidden" : ""}`}
        playsInline
        loop
      />

      {/* Live Badge */}
      {state !== "loading" && state !== "error" && (
        <div className="gg-live-badge">
          <span className="gg-live-dot" />
          LIVE
        </div>
      )}

      {/* Pulsing muted indicator - shows audio is muted until interaction */}
      {isMuted && state !== "loading" && state !== "error" && (
        <div className="gg-muted-overlay">
          <div className="gg-muted-icon-wrapper">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </div>
          <span className="gg-muted-text">Tap anywhere to unmute</span>
        </div>
      )}

      {/* Loading state - show while waiting for video */}
      {state === "loading" && !waveUrl && !introUrl && (
        <div className="gg-video-loading">
          <div className="gg-loading-spinner" />
        </div>
      )}

      {/* Connecting state - overlay shown while WebRTC connection is establishing */}
      {state === "connecting" && (
        <div className="gg-connecting-overlay">
          <div className="gg-connecting-content">
            <div className="gg-connecting-spinner">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </div>
            <span className="gg-connecting-text">Connecting...</span>
            <span className="gg-connecting-subtext">Please wait while we connect you</span>
          </div>
        </div>
      )}

      {/* Error state with retry button */}
      {state === "error" && (
        <div className="gg-video-error">
          <div style={{ textAlign: "center" }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {loadError && (
              <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>{loadError}</p>
            )}
            <button
              onClick={handleRetry}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
