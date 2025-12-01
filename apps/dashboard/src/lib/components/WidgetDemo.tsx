"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, VideoOff, Phone, Maximize2 } from "lucide-react";

/**
 * Animated Widget Demo Component
 * 
 * Shows the exact GreetNow widget UI with an animated cursor
 * demonstrating how a visitor connects with a live agent.
 * 
 * Performance optimizations:
 * - Intersection Observer to pause animation when off-screen
 * - Reduced blur effects
 */

// Default sample video URLs (same as used in production seeding)
const DEMO_LOOP_VIDEO_URL = "https://qrumylwziqidtoflwtdy.supabase.co/storage/v1/object/public/videos/8b89aa6f-2fd2-40a1-b003-ef48717c67c4/3e6151e4-1bab-49fa-adf8-8bb49f6799c8/wave-intro.webm";

// Animation phases
type AnimationPhase = 
  | "website_idle"      // Initial state - website shown, no widget
  | "widget_appears"    // Full widget card slides in
  | "widget_shown"      // Widget is fully visible, pause for viewing
  | "cursor_moves"      // Cursor moves toward camera button
  | "cursor_hovers"     // Cursor hovers over camera button
  | "cursor_clicks"     // Click animation
  | "connecting"        // "Connecting you to Sarah..." overlay
  | "call_connected"    // Live call view with self-view
  | "call_active"       // Brief moment showing active call
  | "call_ends"         // Call ends, fade out
  | "reset";            // Brief pause before loop

const PHASE_DURATIONS: Record<AnimationPhase, number> = {
  website_idle: 1200,
  widget_appears: 600,
  widget_shown: 1500,
  cursor_moves: 1200,
  cursor_hovers: 400,
  cursor_clicks: 300,
  connecting: 2000,
  call_connected: 500,
  call_active: 3000,
  call_ends: 600,
  reset: 800,
};

const NEXT_PHASE_MAP: Record<AnimationPhase, AnimationPhase> = {
  website_idle: "widget_appears",
  widget_appears: "widget_shown",
  widget_shown: "cursor_moves",
  cursor_moves: "cursor_hovers",
  cursor_hovers: "cursor_clicks",
  cursor_clicks: "connecting",
  connecting: "call_connected",
  call_connected: "call_active",
  call_active: "call_ends",
  call_ends: "reset",
  reset: "website_idle",
};

export function WidgetDemo() {
  const [phase, setPhase] = useState<AnimationPhase>("website_idle");
  const [cursorPosition, setCursorPosition] = useState({ x: 60, y: 40 });
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Intersection Observer to detect visibility (for pausing animation when off-screen)
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Animation sequence controller - only runs when visible
  const runPhase = useCallback((currentPhase: AnimationPhase) => {
    if (!isVisible) return;
    
    timeoutRef.current = setTimeout(() => {
      setPhase(NEXT_PHASE_MAP[currentPhase]);
    }, PHASE_DURATIONS[currentPhase]);
  }, [isVisible]);

  useEffect(() => {
    // Clear any existing timeout when visibility changes or phase changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only run animation when visible
    if (!isVisible) return;
    
    runPhase(phase);

    // Handle cursor position updates
    if (phase === "cursor_moves") {
      setCursorPosition({ x: 75.5, y: 83 }); 
    } else if (phase === "website_idle" || phase === "reset") {
      setCursorPosition({ x: 50, y: 40 });
    }

    // Handle click animation
    if (phase === "cursor_clicks") {
      setIsClicking(true);
      setTimeout(() => setIsClicking(false), 150);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [phase, isVisible, runPhase]);

  // Pause/play video based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isVisible) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, that's okay
      });
    } else {
      videoRef.current.pause();
    }
  }, [isVisible]);

  const isWidgetVisible = !["website_idle", "reset"].includes(phase);
  const isConnecting = phase === "connecting";
  const isCallActive = ["call_connected", "call_active"].includes(phase);
  const isMicOn = isCallActive || phase === "cursor_clicks" || phase === "connecting";

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      {/* Glow effects - reduced blur for performance */}
      <div className="absolute -inset-10 bg-gradient-to-r from-primary/20 via-purple-500/15 to-fuchsia-500/20 rounded-3xl blur-2xl opacity-40" />
      
      {/* Main container - Mock browser window */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/20 bg-slate-950">
        {/* Browser chrome */}
        <div className="flex items-center justify-between px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 bg-slate-900/80 border-b border-white/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-red-500" />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-green-500" />
            </div>
          </div>
          <div className="flex-1 mx-2 sm:mx-4 md:mx-8">
            <div className="bg-slate-800 rounded-md sm:rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 text-center">
              <span className="text-white/40 text-[10px] sm:text-xs md:text-sm">https://</span>
              <span className="text-white/80 text-[10px] sm:text-xs md:text-sm">yourwebsite.com/pricing</span>
            </div>
          </div>
          <div className="w-8 sm:w-12 md:w-20" />
        </div>

        {/* Website content mockup - uses aspect ratio for proper browser proportions */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
          {/* Mock website content */}
          <div className="absolute inset-0 p-3 sm:p-5 md:p-8">
            {/* Mock header */}
            <div className="flex items-center justify-between mb-4 sm:mb-8 md:mb-12">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-md sm:rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500" />
                <div className="w-12 sm:w-16 md:w-24 h-2 sm:h-2.5 md:h-3 bg-white/20 rounded" />
              </div>
              <div className="hidden sm:flex gap-2 md:gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 md:w-16 h-1.5 md:h-2 bg-white/10 rounded" />
                ))}
                <div className="w-12 md:w-20 h-5 md:h-7 bg-blue-500/30 rounded-md md:rounded-lg" />
              </div>
            </div>

            {/* Mock hero content */}
            <div className="max-w-lg">
              <div className="w-3/4 h-4 sm:h-6 md:h-8 bg-white/20 rounded mb-2 sm:mb-3 md:mb-4" />
              <div className="w-full h-2 sm:h-3 md:h-4 bg-white/10 rounded mb-1 sm:mb-1.5 md:mb-2" />
              <div className="w-5/6 h-2 sm:h-3 md:h-4 bg-white/10 rounded mb-4 sm:mb-6 md:mb-8" />
              
              {/* Mock pricing cards */}
              <div className="flex gap-1.5 sm:gap-2.5 md:gap-4 mt-4 sm:mt-6 md:mt-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 p-1.5 sm:p-2.5 md:p-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                    <div className="w-8 sm:w-10 md:w-12 h-2 sm:h-2.5 md:h-3 bg-white/20 rounded mb-1.5 sm:mb-2 md:mb-3" />
                    <div className="w-10 sm:w-12 md:w-16 h-3 sm:h-4 md:h-6 bg-white/15 rounded mb-1.5 sm:mb-2 md:mb-3" />
                    <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="w-full h-1 sm:h-1.5 md:h-2 bg-white/10 rounded" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The Widget - Exact replica */}
          <div 
            className={`
              absolute bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-5 md:right-5 z-10 
              transition-[opacity,transform] duration-500 ease-out
              ${isWidgetVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}
            `}
          >
            {/* Full widget card - appears directly, scales proportionally on mobile */}
            {isWidgetVisible && (
              <div 
                className="w-32 xs:w-36 sm:w-48 md:w-56 lg:w-72 bg-[#0f0f14] rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              >
                {/* Video container */}
                <div className="relative aspect-[4/3] bg-[#1a1a24] overflow-hidden">
                  {/* Agent video - lazy loaded */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    src={DEMO_LOOP_VIDEO_URL}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />

                  {/* Live badge */}
                  {isCallActive && (
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 md:top-3 md:left-3 flex items-center gap-0.5 sm:gap-1 md:gap-1.5 bg-black/60 backdrop-blur-sm px-1 py-0.5 sm:px-1.5 md:px-2.5 md:py-1 rounded-full">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-[6px] sm:text-[8px] md:text-[10px] font-semibold">LIVE</span>
                    </div>
                  )}

                  {/* Top right controls */}
                  <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 flex gap-1">
                    <button className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded sm:rounded-md md:rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white">
                      <Maximize2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" />
                    </button>
                  </div>

                  {/* Self-view PiP - camera stays off, only mic is clicked */}
                  <div className="absolute bottom-1 right-1 w-7 h-7 sm:bottom-2 sm:right-2 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-md sm:rounded-lg md:rounded-xl overflow-hidden border border-white/10 sm:border-2 bg-[#1a1a24]">
                    {/* Camera off placeholder */}
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    {/* Camera off badge */}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:bottom-0.5 sm:right-0.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full bg-red-500/90 flex items-center justify-center">
                      <VideoOff className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 text-white" />
                    </div>
                  </div>

                  {/* Connecting overlay */}
                  {isConnecting && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-black/60 py-1.5 px-2 sm:py-2 sm:px-3 md:py-3 md:px-4 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                      <span className="text-white text-[8px] sm:text-[10px] md:text-xs">Connecting you to Sarah...</span>
                    </div>
                  )}
                </div>

                {/* Agent info */}
                <div className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 lg:px-4 lg:py-3 border-b border-white/10">
                  <div className="text-white font-semibold text-[10px] sm:text-xs md:text-sm">Sarah Johnson</div>
                  <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 text-green-400 text-[8px] sm:text-[10px] md:text-xs">
                    <svg className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5" viewBox="0 0 12 12" fill="currentColor">
                      <circle cx="6" cy="6" r="6" />
                    </svg>
                    {isCallActive ? "Live with you" : isConnecting ? "Connecting..." : "Joined you live"}
                  </div>
                </div>

                {/* Call controls */}
                <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 p-1.5 sm:p-2 md:p-3 lg:p-4 bg-[#0f0f14]">
                  {/* Mic button - the target for cursor click */}
                  <button 
                    className={`
                      w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center
                      transition-[background-color,transform,box-shadow] duration-200
                      ${isMicOn 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-red-500/20 text-red-400"}
                      ${phase === "cursor_hovers" || phase === "cursor_clicks" 
                        ? "ring-2 ring-white/30 scale-110" 
                        : ""}
                    `}
                  >
                    {isMicOn ? (
                      <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                    ) : (
                      <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                    )}
                  </button>

                  {/* Camera button - stays off */}
                  <button className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                    <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                  </button>

                  {/* End call button - only shown when in call */}
                  {(isCallActive || isConnecting) && (
                    <button className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rotate-[135deg]" />
                    </button>
                  )}
                </div>

                {/* Powered by footer */}
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 py-0.5 sm:py-1 md:py-1.5 bg-black/30 border-t border-white/5 text-white/40 text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px]">
                  <span>Powered by</span>
                  <span className="relative">
                    <span className="font-bold text-white/60">GREET</span>
                    <span className="font-light text-white/40">NOW</span>
                    <span className="absolute -top-0.5 -right-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Animated cursor */}
          <div 
            className={`
              absolute z-20 pointer-events-none
              transition-[opacity,left,top,transform] duration-700 ease-out
              ${phase === "website_idle" || phase === "reset" ? "opacity-0" : "opacity-100"}
            `}
            style={{
              left: `${cursorPosition.x}%`,
              top: `${cursorPosition.y}%`,
              transform: `translate(-50%, -50%) ${isClicking ? "scale(0.9)" : "scale(1)"}`,
            }}
          >
            {/* Cursor SVG */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={`drop-shadow-lg transition-transform duration-150 ${isClicking ? "scale-90" : ""}`}
            >
              <path 
                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 3.35c-.34-.34-.85-.11-.85.38v-.52Z" 
                fill="white" 
                stroke="black" 
                strokeWidth="1.5"
              />
            </svg>
            {/* Click ripple effect */}
            {isClicking && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 rounded-full bg-white/30 animate-ping" />
              </div>
            )}
          </div>

          {/* Instructions overlay - subtle hint */}
          {phase === "website_idle" && (
            <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-full bg-muted/30 border border-border/50 text-muted-foreground text-xs sm:text-sm animate-pulse">
                Watch how it works...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption below the demo */}
      <div className="mt-3 sm:mt-4 md:mt-6 flex justify-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 rounded-full bg-muted/30 border border-border/50 text-xs sm:text-sm md:text-base text-muted-foreground">
          {phase === "website_idle" && "🌐 Visitor lands on your website..."}
          {(phase === "widget_appears" || phase === "widget_shown") && "👋 Your live greeter appears automatically"}
          {(phase === "cursor_moves" || phase === "cursor_hovers") && "👀 Visitor sees someone ready to help"}
          {phase === "cursor_clicks" && "👆 One click to connect"}
          {phase === "connecting" && "⚡ Instant connection - no forms, no waiting"}
          {(phase === "call_connected" || phase === "call_active") && "🤝 Face-to-face in seconds"}
          {phase === "call_ends" && "✨ Every visitor becomes a conversation"}
          {phase === "reset" && ""}
        </div>
      </div>
    </div>
  );
}
