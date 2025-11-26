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
export function VideoSequencer({ waveUrl, introUrl, loopUrl, isConnecting, isLive }: VideoSequencerProps) {
  const [state, setState] = useState<VideoState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<"wave" | "intro" | "loop">("wave");
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const waveVideoRef = useRef<HTMLVideoElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);

  // Handle user interaction - unmute and switch to intro
  useEffect(() => {
    if (hasInteracted) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      setIsMuted(false);
      
      // If we have an intro video, switch to it
      if (introUrl && introVideoRef.current) {
        // Pause wave video
        if (waveVideoRef.current) {
          waveVideoRef.current.pause();
        }
        
        setState("intro");
        setActiveVideo("intro");
        introVideoRef.current.muted = false;
        introVideoRef.current.currentTime = 0;
        introVideoRef.current.play().catch((error) => {
          console.error("Intro play failed:", error);
          // Fallback to loop if intro fails
          switchToLoop();
        });
      } else {
        // No intro, go straight to loop
        switchToLoop();
      }
    };

    const events = ["click", "scroll", "touchstart", "keydown"];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [hasInteracted, introUrl]);

  // Switch to loop video
  const switchToLoop = useCallback(() => {
    if (!loopVideoRef.current) return;
    
    // Pause other videos
    if (waveVideoRef.current) {
      waveVideoRef.current.pause();
    }
    if (introVideoRef.current) {
      introVideoRef.current.pause();
    }
    
    setState("loop");
    setActiveVideo("loop");
    loopVideoRef.current.muted = false;
    loopVideoRef.current.currentTime = 0;
    loopVideoRef.current.play().catch((error) => {
      console.error("Loop autoplay failed:", error);
    });
  }, []);

  // Handle intro video end -> switch to loop
  const handleIntroEnded = useCallback(() => {
    switchToLoop();
  }, [switchToLoop]);

  // Preload intro and loop videos
  useEffect(() => {
    if (introUrl && introVideoRef.current) {
      introVideoRef.current.src = introUrl;
      introVideoRef.current.load();
    }
  }, [introUrl]);

  useEffect(() => {
    if (loopUrl && loopVideoRef.current) {
      loopVideoRef.current.src = loopUrl;
      loopVideoRef.current.load();
    }
  }, [loopUrl]);

  // Start playing wave video when URL is available (or fallback to old intro behavior)
  useEffect(() => {
    const videoUrl = waveUrl || introUrl;
    const videoRef = waveVideoRef.current;
    
    if (!videoUrl || !videoRef) return;
    
    videoRef.src = videoUrl;
    videoRef.muted = true; // Must start muted for autoplay
    videoRef.loop = true; // Loop until interaction
    
    const playPromise = videoRef.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setState("wave");
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
