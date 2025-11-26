import { useState, useEffect, useRef, useCallback } from "preact/hooks";

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
}

type VideoState = "loading" | "wave" | "intro" | "loop" | "connecting" | "live" | "error";

/**
 * VideoSequencer - Handles the 3-part video sequence
 * 
 * Flow:
 * 1. Wave video plays on loop (muted) until user interaction grants audio permission
 * 2. After user interaction, intro video plays once with audio
 * 3. Loop video plays forever after intro finishes
 * 
 * Key features:
 * - Triple buffering (three video tags) to prevent black flash on switch
 * - Starts muted for autoplay, unmutes on first user interaction
 * - Seamless transitions between all videos
 * - Looks like a live video feed (no play button overlay)
 */
export function VideoSequencer({ waveUrl, introUrl, loopUrl, isConnecting, isLive, audioUnlocked = false }: VideoSequencerProps) {
  const [state, setState] = useState<VideoState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<"wave" | "intro" | "loop">("wave");
  const [hasStartedWithAudio, setHasStartedWithAudio] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null);
  
  const waveVideoRef = useRef<HTMLVideoElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);

  // Switch to loop video - ONLY after intro has completed (or no intro exists)
  const switchToLoop = useCallback(() => {
    if (!loopVideoRef.current) return;
    
    // Safety check: don't switch to loop if intro exists and hasn't completed
    if (introUrl && !introCompleted) {
      console.warn("[VideoSequencer] ⚠️ Cannot switch to loop - intro not completed yet");
      return;
    }
    
    console.log("[VideoSequencer] 🔊 Switching to loop with audio");
    
    // Pause other videos
    if (waveVideoRef.current) {
      waveVideoRef.current.pause();
    }
    if (introVideoRef.current) {
      introVideoRef.current.pause();
    }
    
    setState("loop");
    setActiveVideo("loop");
    setIsMuted(false);
    loopVideoRef.current.muted = false;
    loopVideoRef.current.currentTime = 0;
    loopVideoRef.current.play().catch((error) => {
      console.error("Loop autoplay failed:", error);
    });
  }, [introUrl, introCompleted]);

  // Switch to intro video with audio
  const switchToIntro = useCallback(() => {
    if (!introVideoRef.current) {
      // No intro ref, mark as completed and go to loop
      setIntroCompleted(true);
      return;
    }
    
    console.log("[VideoSequencer] 🔊 Switching to intro with audio");
    
    // Pause wave video
    if (waveVideoRef.current) {
      waveVideoRef.current.pause();
    }
    
    setState("intro");
    setActiveVideo("intro");
    setIsMuted(false);
    setIntroStartedAt(Date.now()); // Track when intro started
    introVideoRef.current.muted = false;
    introVideoRef.current.currentTime = 0;
    
    // Play intro - do NOT fallback to loop on error, intro MUST complete
    introVideoRef.current.play().catch((error) => {
      console.error("Intro play failed, will retry:", error);
      // Retry after a short delay instead of skipping to loop
      setTimeout(() => {
        if (introVideoRef.current && !introCompleted) {
          introVideoRef.current.play().catch(e => {
            console.error("Intro retry also failed:", e);
          });
        }
      }, 100);
    });
  }, [introCompleted]);

  // When audioUnlocked becomes true AND intro is ready, switch to intro with audio
  // If there's an intro URL, ALWAYS wait for it - never skip to loop
  useEffect(() => {
    if (!audioUnlocked || hasStartedWithAudio) return;
    
    // If there's an intro URL, wait for it to be ready
    if (introUrl) {
      if (introReady && introVideoRef.current) {
        setHasStartedWithAudio(true);
        switchToIntro();
      }
      // If not ready yet, this effect will re-run when introReady becomes true
      return;
    }
    
    // No intro URL - mark intro as "completed" (nothing to play) and go to loop
    if (loopUrl) {
      setHasStartedWithAudio(true);
      setIntroCompleted(true); // No intro to play
    }
  }, [audioUnlocked, hasStartedWithAudio, introUrl, introReady, loopUrl, switchToIntro]);

  // When intro completes, switch to loop
  useEffect(() => {
    if (introCompleted && loopUrl) {
      switchToLoop();
    }
  }, [introCompleted, loopUrl, switchToLoop]);

  // Handle intro video end -> mark complete and switch to loop
  // Only accept if intro actually played (not a spurious event)
  const handleIntroEnded = useCallback(() => {
    const introVideo = introVideoRef.current;
    
    // Safety checks to prevent premature completion:
    // 1. Intro must have started (introStartedAt is set)
    // 2. At least 500ms must have passed since start
    // 3. Video must be near the end (currentTime close to duration)
    
    if (!introStartedAt) {
      console.warn("[VideoSequencer] ⚠️ Ignoring ended event - intro never started");
      return;
    }
    
    const timeSinceStart = Date.now() - introStartedAt;
    if (timeSinceStart < 500) {
      console.warn("[VideoSequencer] ⚠️ Ignoring ended event - too soon (${timeSinceStart}ms)");
      return;
    }
    
    if (introVideo) {
      const duration = introVideo.duration;
      const currentTime = introVideo.currentTime;
      // Allow some tolerance (within 0.5s of end)
      if (duration > 0 && currentTime < duration - 0.5) {
        console.warn(`[VideoSequencer] ⚠️ Ignoring ended event - video not at end (${currentTime}/${duration})`);
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
    };
    
    introVideo.addEventListener("canplaythrough", handleCanPlay);
    introVideo.src = introUrl;
    introVideo.load();
    
    // Check if already ready (cached)
    if (introVideo.readyState >= 3) {
      setIntroReady(true);
    }
    
    return () => {
      introVideo.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, [introUrl]);

  useEffect(() => {
    if (loopUrl && loopVideoRef.current) {
      loopVideoRef.current.src = loopUrl;
      loopVideoRef.current.load();
    }
  }, [loopUrl]);

  // Start playing wave video MUTED when URLs are available
  // Will switch to intro with audio when audioUnlocked becomes true
  useEffect(() => {
    const videoUrl = waveUrl || introUrl;
    const videoRef = waveVideoRef.current;
    
    if (!videoUrl || !videoRef) return;
    
    videoRef.src = videoUrl;
    videoRef.muted = true; // Must start muted for autoplay
    videoRef.loop = true; // Loop until audio is unlocked
    
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
  }, [waveUrl, introUrl]);

  // Handle connecting state change (show "Connecting..." overlay on loop video)
  useEffect(() => {
    if (isConnecting && !isLive) {
      setState("connecting");
      // Keep the loop video playing in background during connecting
    }
  }, [isConnecting, isLive]);

  // Handle live state change
  useEffect(() => {
    if (isLive) {
      setState("live");
      // Pause all videos when going live
      if (waveVideoRef.current) waveVideoRef.current.pause();
      if (introVideoRef.current) introVideoRef.current.pause();
      if (loopVideoRef.current) loopVideoRef.current.pause();
    }
  }, [isLive]);

  return (
    <div className="gg-video-container">
      {/* Wave Video (loops muted until interaction) */}
      <video
        ref={waveVideoRef}
        className={`gg-video ${activeVideo !== "wave" ? "gg-video-hidden" : ""}`}
        playsInline
        muted
        loop
        onError={() => setState("error")}
      />
      
      {/* Intro Video (plays once with audio after interaction) */}
      <video
        ref={introVideoRef}
        className={`gg-video ${activeVideo !== "intro" ? "gg-video-hidden" : ""}`}
        playsInline
        onEnded={handleIntroEnded}
        onError={() => setState("error")}
      />
      
      {/* Loop Video (loops forever after intro) */}
      <video
        ref={loopVideoRef}
        className={`gg-video ${activeVideo !== "loop" ? "gg-video-hidden" : ""}`}
        playsInline
        loop
        onError={() => setState("error")}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Error state */}
      {state === "error" && (
        <div className="gg-video-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      )}
    </div>
  );
}
