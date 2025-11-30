"use client";

import { useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseCallRecordingOptions {
  organizationId: string;
  callLogId: string | null;
  isRecordingEnabled: boolean;
}

interface UseCallRecordingReturn {
  isRecording: boolean;
  recordingError: string | null;
  startRecording: (
    localStream: MediaStream,
    remoteStream: MediaStream
  ) => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

export function useCallRecording({
  organizationId,
  callLogId,
  isRecordingEnabled,
}: UseCallRecordingOptions): UseCallRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const callLogIdRef = useRef<string | null>(null); // Store callLogId at start

  const startRecording = useCallback(
    async (localStream: MediaStream, remoteStream: MediaStream) => {
      console.log("[Recording] startRecording called with:", {
        isRecordingEnabled,
        isRecording,
        callLogId,
        hasLocalStream: !!localStream,
        hasRemoteStream: !!remoteStream,
      });
      
      if (!isRecordingEnabled) {
        console.log("[Recording] ❌ Skipping: recording is disabled in settings");
        return;
      }
      
      if (isRecording) {
        console.log("[Recording] ❌ Skipping: already recording");
        return;
      }
      
      if (!callLogId) {
        console.log("[Recording] ❌ Skipping: no call log ID available");
        return;
      }

      try {
        console.log("[Recording] 🎬 Starting recording...");
        setRecordingError(null);
        
        // Store callLogId at start so we have it when recording ends
        callLogIdRef.current = callLogId;

        // Create AudioContext for mixing audio
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        // Create a destination for the mixed audio
        const destination = audioContext.createMediaStreamDestination();

        // Add local audio to the mix
        if (localStream.getAudioTracks().length > 0) {
          const localAudioSource = audioContext.createMediaStreamSource(
            new MediaStream(localStream.getAudioTracks())
          );
          localAudioSource.connect(destination);
        }

        // Add remote audio to the mix
        if (remoteStream.getAudioTracks().length > 0) {
          const remoteAudioSource = audioContext.createMediaStreamSource(
            new MediaStream(remoteStream.getAudioTracks())
          );
          remoteAudioSource.connect(destination);
        }

        // Create a canvas to composite both videos side by side
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // Set canvas size for side-by-side layout (2 videos)
        canvas.width = 1280;
        canvas.height = 480;

        // Create video elements for local and remote streams
        const localVideo = document.createElement("video");
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        localVideo.playsInline = true;
        await localVideo.play();

        const remoteVideo = document.createElement("video");
        remoteVideo.srcObject = remoteStream;
        remoteVideo.muted = true;
        remoteVideo.playsInline = true;
        await remoteVideo.play();

        // Animation loop to draw both videos to canvas
        let animationId: number;
        const drawFrame = () => {
          // Clear canvas
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw remote video on the left (larger - visitor)
          if (remoteVideo.readyState >= 2) {
            ctx.drawImage(remoteVideo, 0, 0, 640, 480);
          }

          // Draw local video on the right (smaller - agent)
          if (localVideo.readyState >= 2) {
            ctx.drawImage(localVideo, 640, 0, 640, 480);
          }

          // Add labels
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(10, 450, 80, 24);
          ctx.fillRect(650, 450, 60, 24);

          ctx.fillStyle = "#ffffff";
          ctx.font = "14px system-ui";
          ctx.fillText("Visitor", 20, 466);
          ctx.fillText("Agent", 660, 466);

          animationId = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // Get video stream from canvas
        const canvasStream = canvas.captureStream(30);

        // Combine canvas video with mixed audio
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
        mixedStreamRef.current = mixedStream;

        // Start recording
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const mediaRecorder = new MediaRecorder(mixedStream, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });

        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error("[Recording] MediaRecorder error:", event);
          setRecordingError("Recording failed");
          setIsRecording(false);
        };

        // Store animation cleanup function
        (mediaRecorder as MediaRecorder & { _cleanup?: () => void })._cleanup = () => {
          cancelAnimationFrame(animationId);
          localVideo.srcObject = null;
          remoteVideo.srcObject = null;
        };

        mediaRecorder.start(1000); // Collect data every second
        setIsRecording(true);
        console.log("[Recording] ✅ Recording started successfully!");
      } catch (err) {
        console.error("[Recording] ❌ Failed to start:", err);
        setRecordingError(
          err instanceof Error ? err.message : "Failed to start recording"
        );
      }
    },
    [isRecordingEnabled, isRecording, callLogId]
  );

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    console.log("[Recording] Stopping recording...");

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        try {
          // Clean up the canvas animation
          const cleanup = (mediaRecorder as MediaRecorder & { _cleanup?: () => void })._cleanup;
          if (cleanup) cleanup();

          // Close audio context
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }

          // Stop mixed stream tracks
          if (mixedStreamRef.current) {
            mixedStreamRef.current.getTracks().forEach((track) => track.stop());
            mixedStreamRef.current = null;
          }

          // Create the recording blob
          const blob = new Blob(recordedChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          console.log("[Recording] Recording size:", blob.size, "bytes");
          
          // Use stored callLogId from when recording started
          const storedCallLogId = callLogIdRef.current;

          if (blob.size === 0 || !storedCallLogId) {
            console.warn("[Recording] Empty recording or no call log ID. Blob size:", blob.size, "callLogId:", storedCallLogId);
            resolve(null);
            return;
          }

          // Upload to Supabase storage
          const supabase = createClient();
          const timestamp = Date.now();
          const filePath = `${organizationId}/${storedCallLogId}_${timestamp}.webm`;

          console.log("[Recording] Uploading to:", filePath);

          const { error: uploadError } = await supabase.storage
            .from("recordings")
            .upload(filePath, blob, {
              contentType: mediaRecorder.mimeType,
              upsert: false,
            });

          if (uploadError) {
            console.error("[Recording] Upload failed:", uploadError);
            setRecordingError("Failed to upload recording");
            resolve(null);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("recordings")
            .getPublicUrl(filePath);

          const recordingUrl = urlData.publicUrl;
          console.log("[Recording] Recording uploaded:", recordingUrl);

          // Update call log with recording URL
          const { error: updateError } = await supabase
            .from("call_logs")
            .update({ recording_url: recordingUrl })
            .eq("id", storedCallLogId);

          if (updateError) {
            console.error("[Recording] Failed to update call log:", updateError);
          }

          // Trigger transcription processing in background (fire and forget)
          // This will transcribe and optionally generate AI summary based on org settings
          fetch("/api/transcription/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callLogId: storedCallLogId }),
          }).then(response => {
            if (response.ok) {
              console.log("[Recording] Transcription processing triggered");
            } else {
              console.warn("[Recording] Transcription trigger failed:", response.status);
            }
          }).catch(err => {
            console.warn("[Recording] Failed to trigger transcription:", err);
          });

          resolve(recordingUrl);
        } catch (err) {
          console.error("[Recording] Error processing recording:", err);
          setRecordingError("Failed to save recording");
          resolve(null);
        } finally {
          setIsRecording(false);
          mediaRecorderRef.current = null;
          recordedChunksRef.current = [];
          callLogIdRef.current = null;
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, callLogId, organizationId]);

  return {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
  };
}

