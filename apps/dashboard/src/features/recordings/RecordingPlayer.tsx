"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface RecordingPlayerProps {
  recordingId: string;
  className?: string;
  autoplay?: boolean;
}

interface SignedUrlData {
  signedUrl: string;
  expiresAt: string;
}

/**
 * RecordingPlayer component that handles signed URL generation and automatic refresh.
 *
 * Features:
 * - Fetches signed URL from server on mount
 * - Automatically refreshes URL before expiration (45 min mark)
 * - Handles errors gracefully
 * - Maintains playback position across URL refreshes
 */
export function RecordingPlayer({
  recordingId,
  className = "",
  autoplay = false,
}: RecordingPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetches a new signed URL from the server
   */
  const fetchSignedUrl = useCallback(async (shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        console.log("[RecordingPlayer] Refreshing signed URL...");
      } else {
        setIsLoading(true);
        setError(null);
      }

      const response = await fetch("/api/recordings/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get recording URL");
      }

      const data: SignedUrlData & { success: boolean } = await response.json();

      if (!data.success || !data.signedUrl) {
        throw new Error("Invalid response from server");
      }

      // Save current playback position before changing URL
      const currentTime = videoRef.current?.currentTime || 0;
      const wasPaused = videoRef.current?.paused ?? true;

      setSignedUrl(data.signedUrl);
      setExpiresAt(data.expiresAt);

      // Restore playback position after URL change
      if (shouldRefresh && videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (!wasPaused) {
          videoRef.current.play().catch(err => {
            console.warn("[RecordingPlayer] Failed to resume playback:", err);
          });
        }
      }

      // Schedule next refresh 15 minutes before expiration (at 45 min mark)
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const expiresIn = new Date(data.expiresAt).getTime() - Date.now();
      const refreshIn = Math.max(expiresIn - 15 * 60 * 1000, 60 * 1000); // Refresh 15 min before, or in 1 min if already close

      console.log(`[RecordingPlayer] Signed URL expires at ${data.expiresAt}, refreshing in ${Math.round(refreshIn / 1000 / 60)} minutes`);

      refreshTimerRef.current = setTimeout(() => {
        fetchSignedUrl(true);
      }, refreshIn);

      setIsLoading(false);
    } catch (err) {
      console.error("[RecordingPlayer] Error fetching signed URL:", err);
      setError(err instanceof Error ? err.message : "Failed to load recording");
      setIsLoading(false);
    }
  }, [recordingId]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    fetchSignedUrl();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchSignedUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[240px] bg-muted/20 rounded-lg">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[240px] bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm font-medium">Failed to load recording</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return null;
  }

  return (
    <div className={className}>
      <video
        ref={videoRef}
        src={signedUrl}
        controls
        autoPlay={autoplay}
        className="w-full h-full rounded-lg"
        preload="metadata"
      >
        Your browser does not support video playback.
      </video>
      {expiresAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Video URL expires at {new Date(expiresAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
