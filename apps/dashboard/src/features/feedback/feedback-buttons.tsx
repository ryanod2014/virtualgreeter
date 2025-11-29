"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bug, Lightbulb, Loader2, X, Check, Bell, ChevronUp, MessageCircle, Camera, Video, Square, Trash2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackButtonsProps {
  organizationId: string;
  userId: string;
}

interface Notification {
  id: string;
  type: "reply" | "upvote" | "status_change";
  message: string;
  feedback_item_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function FeedbackButtons({ organizationId, userId }: FeedbackButtonsProps) {
  const [showBugModal, setShowBugModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Screenshot and recording state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [recording, setRecording] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("feedback_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  }, [supabase, userId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark notifications as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("feedback_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await supabase
        .from("feedback_notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Navigate to feedback page
    setShowNotifications(false);
    router.push("/feedback");
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const openBugReport = () => {
    setShowBugModal(true);
    setTitle("");
    setDescription("");
    setError(null);
    setScreenshot(null);
    setRecording(null);
    setRecordingUrl(null);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const openFeatureRequests = () => {
    // Navigate to the public feature requests forum
    router.push("/feedback");
  };

  // Take screenshot using screen capture API
  const takeScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
      });
      
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      const dataUrl = canvas.toDataURL("image/png");
      setScreenshot(dataUrl);
    } catch (err) {
      console.error("Screenshot error:", err);
      setError("Could not capture screenshot. Please try again.");
    }
  };

  // Start screen recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: true,
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });
      
      recordingChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
        setRecording(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        // Re-open the bug modal after recording completes
        setShowBugModal(true);
      };
      
      // Stop recording if user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Hide the modal while recording
      setShowBugModal(false);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      
      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, 60000);
      
    } catch (err) {
      console.error("Recording error:", err);
      setError("Could not start recording. Please try again.");
    }
  };

  // Stop screen recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, []);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Upload media to Supabase storage
  const uploadMedia = async (file: Blob | string, type: "screenshot" | "recording"): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const ext = type === "screenshot" ? "png" : "webm";
      const fileName = `${organizationId}/${type}_${timestamp}.${ext}`;
      
      let blob: Blob;
      if (typeof file === "string") {
        // Convert base64 to blob
        const res = await fetch(file);
        blob = await res.blob();
      } else {
        blob = file;
      }
      
      const { error: uploadError } = await supabase.storage
        .from("feedback-attachments")
        .upload(fileName, blob);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from("feedback-attachments")
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (err) {
      console.error("Media upload error:", err);
      return null;
    }
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload media if present
      let screenshotUrl: string | null = null;
      let videoUrl: string | null = null;
      
      if (screenshot) {
        screenshotUrl = await uploadMedia(screenshot, "screenshot");
      }
      
      if (recording) {
        videoUrl = await uploadMedia(recording, "recording");
      }
      
      const { error: insertError } = await supabase
        .from("feedback_items")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          type: "bug",
          title: title.trim(),
          description: description.trim(),
          status: "open",
          priority: "medium",
          page_url: pathname,
          browser_info: `${navigator.userAgent} | ${window.screen.width}x${window.screen.height}`,
          screenshot_url: screenshotUrl,
          recording_url: videoUrl,
          steps_to_reproduce: null,
          expected_behavior: null,
          actual_behavior: null,
          use_case: null,
          admin_response: null,
          admin_responded_at: null,
          admin_responded_by: null,
        });

      if (insertError) throw insertError;

      setShowBugModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {showSuccess && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-medium animate-in fade-in slide-in-from-right-2">
            <Check className="w-4 h-4" />
            Bug reported!
          </div>
        )}
        
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all shadow-lg"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-12 w-80 max-h-96 bg-background rounded-xl border border-border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-72">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                          !notification.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notification.type === "upvote"
                              ? "bg-orange-500/10 text-orange-500"
                              : notification.type === "reply"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-green-500/10 text-green-500"
                          }`}>
                            {notification.type === "upvote" ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <MessageCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {timeAgo(notification.created_at)}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={openBugReport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground hover:text-red-500 transition-all shadow-lg"
          title="Report a Bug"
        >
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Report Bug</span>
        </button>
        <button
          onClick={openFeatureRequests}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-amber-500/50 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-500 transition-all shadow-lg"
          title="Request a Feature"
        >
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Request Feature</span>
        </button>
      </div>

      {/* Floating Recording Indicator */}
      {isRecording && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-red-500 text-white shadow-2xl shadow-red-500/30 border border-red-400">
            {/* Pulsing Recording Dot */}
            <div className="relative flex items-center justify-center">
              <Circle className="w-4 h-4 fill-white animate-pulse" />
              <div className="absolute w-6 h-6 rounded-full bg-white/30 animate-ping" />
            </div>
            
            {/* Recording Info */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">Recording Screen</span>
              <span className="text-xs text-red-100 font-mono">{formatTime(recordingTime)} / 1:00</span>
            </div>
            
            {/* Stop Button */}
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors ml-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Recording
            </button>
          </div>
          
          {/* Help Text */}
          <p className="text-center text-xs text-muted-foreground mt-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg mx-auto w-fit">
            Perform the actions you want to capture, then click Stop
          </p>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBugModal(false)}
        >
          <div
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <Bug className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Report a Bug</h3>
                  <p className="text-xs text-muted-foreground">
                    Page: {pathname}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBugModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBug} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What&apos;s the issue?
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the bug"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Tell us more
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What were you trying to do?"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
                />
              </div>

              {/* Screenshot & Recording Section */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Attach evidence <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={takeScreenshot}
                    disabled={isRecording}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {screenshot ? "Retake Screenshot" : "Screenshot"}
                  </button>
                  
                  {!recordingUrl && (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isRecording}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Video className="w-4 h-4" />
                      Record Screen
                    </button>
                  )}
                </div>

                {/* Screenshot Preview */}
                {screenshot && (
                  <div className="relative mb-3">
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1.5">
                      <Camera className="w-3 h-3" />
                      Screenshot attached
                    </div>
                    <img 
                      src={screenshot} 
                      alt="Screenshot" 
                      className="w-full rounded-lg border border-border max-h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                      title="Remove screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Recording Preview */}
                {recordingUrl && (
                  <div className="relative">
                    <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-red-500/90 text-white text-xs font-medium flex items-center gap-1.5">
                      <Video className="w-3 h-3" />
                      Recording attached
                    </div>
                    <video 
                      src={recordingUrl} 
                      controls 
                      className="w-full rounded-lg border border-border max-h-40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRecording(null);
                        setRecordingUrl(null);
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                      title="Remove recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBugModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {screenshot || recording ? "Uploading..." : "Submitting..."}
                    </>
                  ) : (
                    "Submit Bug Report"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

