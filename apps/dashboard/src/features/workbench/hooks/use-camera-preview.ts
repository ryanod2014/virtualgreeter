"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseCameraPreviewOptions {
  enabled: boolean;
}

interface UseCameraPreviewReturn {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  retry: () => void;
}

export function useCameraPreview({ enabled }: UseCameraPreviewOptions): UseCameraPreviewReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      // Already have a stream
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false, // Don't need audio for preview
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);
      setIsLoading(false);
    } catch (err) {
      console.error("[CameraPreview] Failed to get camera:", err);
      setIsLoading(false);
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera access denied. Please allow camera access in your browser settings.");
          setHasPermission(false);
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("No camera found. Please connect a camera to continue.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setError("Camera is in use by another application.");
        } else {
          setError("Could not access camera: " + err.message);
        }
      } else {
        setError("Could not access camera");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const retry = useCallback(() => {
    stopCamera();
    startCamera();
  }, [stopCamera, startCamera]);

  // Start/stop camera based on enabled state
  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [enabled, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    isLoading,
    error,
    hasPermission,
    retry,
  };
}

