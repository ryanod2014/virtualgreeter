import { useState, useEffect, useRef, useCallback } from "preact/hooks";

interface VideoSequencerProps {
  introUrl?: string;
  loopUrl?: string;
  isLive?: boolean;
}

type VideoState = "loading" | "intro" | "loop" | "live" | "error";

/**
 * VideoSequencer - Handles the Intro -> Loop video transition
 * 
 * Key features:
 * - Double buffering (two video tags) to prevent black flash on switch
 * - Starts muted for autoplay, unmutes on first user interaction
 * - Seamless transition from intro to loop
 * - Looks like a live video feed (no play button overlay)
 */
export function VideoSequencer({ introUrl, loopUrl, isLive }: VideoSequencerProps) {
  const [state, setState] = useState<VideoState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<"primary" | "secondary">("primary");
  
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);

  // Unmute videos on any page interaction
  useEffect(() => {
    if (!isMuted) return;

    const unmute = () => {
      setIsMuted(false);
      
      // Unmute the active video
      if (primaryVideoRef.current) {
        primaryVideoRef.current.muted = false;
      }
      if (secondaryVideoRef.current) {
        secondaryVideoRef.current.muted = false;
      }
    };

    const events = ["click", "scroll", "touchstart", "keydown"];
    events.forEach((event) => {
      window.addEventListener(event, unmute, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, unmute);
      });
    };
  }, [isMuted]);

  // Preload the loop video while intro plays
  useEffect(() => {
    if (!loopUrl || !secondaryVideoRef.current) return;
    
    secondaryVideoRef.current.src = loopUrl;
    secondaryVideoRef.current.load();
  }, [loopUrl]);

  // Handle intro video end -> switch to loop
  const handleIntroEnded = useCallback(() => {
    if (!secondaryVideoRef.current) return;
    
    setState("loop");
    setActiveVideo("secondary");
    
    // Ensure loop video has same muted state
    secondaryVideoRef.current.muted = isMuted;
    secondaryVideoRef.current.play().catch((error) => {
      console.error("Loop autoplay failed:", error);
    });
  }, [isMuted]);

  // Start playing intro when URL is available
  useEffect(() => {
    if (!introUrl || !primaryVideoRef.current) return;
    
    const video = primaryVideoRef.current;
    video.src = introUrl;
    video.muted = true; // Must start muted for autoplay
    
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setState("intro");
        })
        .catch((error) => {
          console.warn("Autoplay prevented:", error);
          setState("intro");
        });
    }
  }, [introUrl]);

  // Handle live state change
  useEffect(() => {
    if (isLive) {
      setState("live");
    }
  }, [isLive]);

  return (
    <div className="gg-video-container">
      {/* Primary Video (Intro) */}
      <video
        ref={primaryVideoRef}
        className={`gg-video ${activeVideo !== "primary" ? "gg-video-hidden" : ""}`}
        playsInline
        muted={isMuted}
        onEnded={handleIntroEnded}
        onError={() => setState("error")}
      />
      
      {/* Secondary Video (Loop) - Double buffer */}
      <video
        ref={secondaryVideoRef}
        className={`gg-video ${activeVideo !== "secondary" ? "gg-video-hidden" : ""}`}
        playsInline
        muted={isMuted}
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
      {state === "loading" && !introUrl && (
        <div className="gg-video-loading">
          <div className="gg-loading-spinner" />
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

