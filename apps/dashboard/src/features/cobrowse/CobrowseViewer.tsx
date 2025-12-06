"use client";

import { useEffect, useRef, useState } from "react";
import type { CobrowseSnapshotPayload } from "@ghost-greeter/domain";
import { Monitor, MousePointer2, Eye, Lock, Smartphone, Tablet, MonitorIcon, Loader2 } from "lucide-react";

interface CobrowseViewerProps {
  snapshot: CobrowseSnapshotPayload | null;
  mousePosition: { x: number; y: number } | null;
  scrollPosition: { x: number; y: number } | null;
  selection: { text: string; rect: { x: number; y: number; width: number; height: number } | null } | null;
}

export function CobrowseViewer({ snapshot, mousePosition, scrollPosition, selection }: CobrowseViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportFrameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [hasReceivedFirstSnapshot, setHasReceivedFirstSnapshot] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Debug logging
  useEffect(() => {
    if (snapshot) {
      console.log("[CobrowseViewer] Snapshot received:", {
        url: snapshot.url,
        viewport: snapshot.viewport,
        htmlLength: snapshot.html?.length,
      });
    }
  }, [snapshot]);

  useEffect(() => {
    if (mousePosition) {
      console.log("[CobrowseViewer] Mouse:", mousePosition);
    }
  }, [mousePosition]);

  // Determine device type based on viewport width
  const getDeviceInfo = (width: number) => {
    if (width <= 480) return { type: 'mobile', icon: Smartphone, label: 'Mobile' };
    if (width <= 1024) return { type: 'tablet', icon: Tablet, label: 'Tablet' };
    return { type: 'desktop', icon: MonitorIcon, label: 'Desktop' };
  };

  const deviceInfo = snapshot ? getDeviceInfo(snapshot.viewport.width) : null;
  const DeviceIcon = deviceInfo?.icon || MonitorIcon;

  // Calculate scale to fit visitor viewport within container
  useEffect(() => {
    if (!snapshot || !containerRef.current) return;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      // Get the flex-1 content area dimensions (subtract header ~100px and footer ~60px)
      const availableHeight = container.clientHeight - 160;
      const availableWidth = container.clientWidth - 32; // padding

      const visitorWidth = snapshot.viewport.width;
      const visitorHeight = snapshot.viewport.height;

      // Calculate scale to fit while maintaining aspect ratio
      const scaleX = availableWidth / visitorWidth;
      const scaleY = availableHeight / visitorHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

      console.log("[CobrowseViewer] Scale calculation:", {
        availableWidth,
        availableHeight,
        visitorWidth,
        visitorHeight,
        scale: newScale,
      });

      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [snapshot]);

  // Update iframe content when snapshot changes
  useEffect(() => {
    if (!snapshot || !iframeRef.current) return;

    // Track first snapshot
    if (!hasReceivedFirstSnapshot) {
      setHasReceivedFirstSnapshot(true);
    } else {
      // Show updating indicator for subsequent updates
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 500);
      return () => clearTimeout(timer);
    }

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    // Write the HTML content with strict view-only styles
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${new URL(snapshot.url).origin}">
          <style>
            /* Completely disable all interactions */
            *, *::before, *::after {
              pointer-events: none !important;
              user-select: none !important;
              cursor: default !important;
            }
            /* Disable scrolling completely - agent cannot scroll */
            html, body {
              overflow: hidden !important;
              position: fixed !important;
              width: 100% !important;
              height: 100% !important;
            }
            /* Hide scrollbars */
            html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
            html, body { scrollbar-width: none !important; }
            /* Disable text selection */
            html, body { -webkit-user-select: none !important; }
            /* Disable all form interactions */
            input, textarea, select, button { pointer-events: none !important; }
            /* Disable links */
            a { pointer-events: none !important; cursor: default !important; }
          </style>
        </head>
        <body>
          ${snapshot.html}
        </body>
      </html>
    `);
    iframeDoc.close();
    setIsLoaded(true);
  }, [snapshot, hasReceivedFirstSnapshot]);

  // Apply scroll position by transforming the content (since we disabled native scrolling)
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDoc && iframeDoc.body) {
      const scrollX = scrollPosition?.x ?? 0;
      const scrollY = scrollPosition?.y ?? 0;
      
      // Use transform to "scroll" since we've disabled actual scrolling
      iframeDoc.body.style.transform = `translate(-${scrollX}px, -${scrollY}px)`;
      iframeDoc.body.style.position = 'absolute';
      iframeDoc.body.style.width = `${snapshot?.viewport.width || window.innerWidth}px`;
      
      console.log("[CobrowseViewer] Applied scroll:", { scrollX, scrollY });
    }
  }, [scrollPosition, snapshot?.viewport.width]);

  // Show loading state while waiting for first snapshot
  if (!snapshot && !hasReceivedFirstSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-muted/50 rounded-xl border border-dashed border-border">
        <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin" />
        <p className="text-foreground text-center font-medium">
          Loading visitor's screen...
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Waiting for first snapshot
        </p>
      </div>
    );
  }

  // Show placeholder when no active call
  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-muted/50 rounded-xl border border-dashed border-border">
        <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          Visitor's screen will appear here<br />
          <span className="text-sm">during an active call</span>
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] bg-zinc-900 rounded-xl overflow-hidden select-none flex flex-col"
      style={{ touchAction: 'none' }}
      onScroll={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      {/* Header with page info */}
      <div className="flex-shrink-0 z-10 bg-zinc-800 border-b border-zinc-700 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 rounded-full">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Live View</span>
          </div>
          {isUpdating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 rounded-full">
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-xs font-medium text-blue-400">Updating...</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 rounded-full">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">View Only</span>
          </div>
          <div className="flex-1 px-3 py-1.5 bg-zinc-700/50 rounded-lg overflow-hidden">
            <p className="text-xs text-zinc-300 truncate">{snapshot.url}</p>
          </div>
        </div>
      </div>

      {/* Device info bar */}
      <div className="flex-shrink-0 z-10 bg-zinc-800/50 border-b border-zinc-700/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DeviceIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-300">{deviceInfo?.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">
            <span className="font-mono text-zinc-200 font-bold">{snapshot.viewport.width}</span>
            <span className="mx-1">×</span>
            <span className="font-mono text-zinc-200 font-bold">{snapshot.viewport.height}</span>
            <span className="ml-1 text-zinc-500">px</span>
          </div>
          {scale < 1 && (
            <div className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
              {Math.round(scale * 100)}% scale
            </div>
          )}
          {mousePosition && (
            <div className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
              Mouse: {Math.round(mousePosition.x)}, {Math.round(mousePosition.y)}
            </div>
          )}
        </div>
      </div>

      {/* Viewport frame - shows exact visitor dimensions */}
      <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950/50 overflow-hidden">
        <div 
          ref={viewportFrameRef}
          className="relative bg-white shadow-2xl"
          style={{
            width: snapshot.viewport.width * scale,
            height: snapshot.viewport.height * scale,
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            overflow: 'hidden',
            pointerEvents: 'none',
            touchAction: 'none',
          }}
        >
          {/* Iframe scaled to fit */}
          <iframe
            ref={iframeRef}
            className="border-0 bg-white select-none"
            sandbox="allow-same-origin"
            title="Visitor Screen"
            style={{
              width: snapshot.viewport.width,
              height: snapshot.viewport.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              touchAction: 'none',
            }}
          />

          {/* Text selection highlight - scaled */}
          {selection?.rect && isLoaded && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                left: selection.rect.x * scale,
                top: selection.rect.y * scale,
                width: selection.rect.width * scale,
                height: selection.rect.height * scale,
                backgroundColor: "rgba(99, 102, 241, 0.3)",
                border: "2px solid rgba(99, 102, 241, 0.6)",
                borderRadius: "2px",
              }}
            />
          )}

          {/* Mouse cursor overlay - scaled position */}
          {mousePosition && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                left: mousePosition.x * scale,
                top: mousePosition.y * scale,
                transform: "translate(-4px, -4px)",
              }}
            >
              {/* Bright cursor dot */}
              <div 
                className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"
                style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.5)' }}
              />
              {/* Cursor icon */}
              <MousePointer2 
                className="absolute -top-1 -left-1 w-6 h-6 text-red-500 drop-shadow-lg" 
                fill="white"
                stroke="currentColor"
                strokeWidth={2}
              />
            </div>
          )}

          {/* Debug: Show mouse position if no cursor visible */}
          {!mousePosition && isLoaded && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-30">
              Waiting for mouse data...
            </div>
          )}
        </div>
      </div>

      {/* Footer with page title and selection info */}
      <div className="flex-shrink-0 z-10 bg-zinc-800 border-t border-zinc-700 p-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-300 font-medium truncate flex-1">
            {snapshot.title || "Untitled Page"}
          </p>
          {selection?.text && (
            <div className="flex-shrink-0 max-w-[300px] bg-primary/20 text-primary px-3 py-1.5 rounded-lg">
              <p className="text-xs truncate">
                <span className="opacity-70">Selected: </span>
                "{selection.text}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

