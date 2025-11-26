"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { CallIncomingPayload } from "@ghost-greeter/domain";

interface UseIncomingCallOptions {
  onCallAnswered?: () => void;
  onCallMissed?: () => void;
}

interface UseIncomingCallReturn {
  /** Whether browser notification permission is granted */
  notificationPermission: NotificationPermission;
  /** Request notification permission (call on user interaction) */
  requestNotificationPermission: () => Promise<boolean>;
  /** Start ringing for an incoming call */
  startRinging: (call: CallIncomingPayload) => void;
  /** Stop ringing (call answered or missed) */
  stopRinging: () => void;
  /** Whether audio context has been initialized (requires user interaction) */
  isAudioReady: boolean;
  /** Initialize audio context (call on first user click) */
  initializeAudio: () => void;
}

// Ringtone frequencies for a pleasant phone-like ring
const RING_PATTERN = {
  frequencies: [440, 480], // Dual-tone like a phone ring
  ringDuration: 1000, // ms
  pauseDuration: 2000, // ms between rings
};

// Title flash messages for tab attention
const TITLE_FLASH_MESSAGES = ["📞 INCOMING CALL", "🔔 ANSWER NOW"];

// Fallback: Create a floating alert div when notifications don't work
function showFallbackAlert(message: string, onClick?: () => void): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  
  // Remove any existing alert
  const existing = document.getElementById("gg-incoming-call-alert");
  if (existing) existing.remove();
  
  const alert = document.createElement("div");
  alert.id = "gg-incoming-call-alert";
  alert.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      animation: slideIn 0.3s ease-out, pulse 2s infinite;
      max-width: 350px;
    ">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">📞 Incoming Call</div>
      <div style="font-size: 14px; opacity: 0.9;">${message}</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Click to answer</div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 10px 40px rgba(99,102,241,0.5); }
      }
    </style>
  `;
  
  if (onClick) {
    alert.onclick = () => {
      onClick();
      alert.remove();
    };
  }
  
  document.body.appendChild(alert);
  return alert;
}

function hideFallbackAlert(): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("gg-incoming-call-alert");
  if (existing) existing.remove();
}

/**
 * Hook to handle incoming call notifications, audio, and tab focus
 * 
 * Features:
 * - Plays a looping ringtone when call comes in
 * - Shows system notification when tab is in background
 * - Clicking notification focuses the dashboard tab
 * - Handles AudioContext restrictions (must init on user click)
 */
export function useIncomingCall(options: UseIncomingCallOptions = {}): UseIncomingCallReturn {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isAudioReady, setIsAudioReady] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const titleFlashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>("");
  const notificationRef = useRef<Notification | null>(null);
  const isRingingRef = useRef(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === "granted";
    } catch (error) {
      console.warn("[IncomingCall] Failed to request notification permission:", error);
      return false;
    }
  }, []);

  // Initialize AudioContext (must be called on user interaction)
  const initializeAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        setIsAudioReady(true);
        console.log("[IncomingCall] AudioContext initialized");
      } catch (error) {
        console.warn("[IncomingCall] Failed to create AudioContext:", error);
      }
    } else if (audioContextRef.current.state === "suspended") {
      // Resume if suspended
      audioContextRef.current.resume().then(() => {
        setIsAudioReady(true);
      });
    }
  }, []);

  // Play a single ring tone
  const playRingTone = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state !== "running") return;

    const { frequencies, ringDuration } = RING_PATTERN;
    const now = ctx.currentTime;
    const duration = ringDuration / 1000;

    // Create oscillators for dual-tone
    frequencies.forEach((freq) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      // Envelope: quick attack, sustain, quick decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02); // Attack
      gainNode.gain.setValueAtTime(0.15, now + duration - 0.1); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay

      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  }, []);

  // Start flashing the tab title to get attention
  const startTitleFlash = useCallback(() => {
    if (typeof document === "undefined") return;
    
    // Save original title
    originalTitleRef.current = document.title;
    let flashIndex = 0;

    // Flash between messages
    titleFlashIntervalRef.current = setInterval(() => {
      document.title = TITLE_FLASH_MESSAGES[flashIndex % TITLE_FLASH_MESSAGES.length];
      flashIndex++;
    }, 800);

    console.log("[IncomingCall] 📺 Started title flash");
  }, []);

  // Stop title flashing and restore original title
  const stopTitleFlash = useCallback(() => {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }
    if (originalTitleRef.current && typeof document !== "undefined") {
      document.title = originalTitleRef.current;
    }
    console.log("[IncomingCall] 📺 Stopped title flash");
  }, []);

  // Show browser notification
  const showNotification = useCallback((call: CallIncomingPayload) => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("[IncomingCall] Notifications not supported");
      return;
    }

    // Check permission directly (not from state, to avoid stale closure)
    const permission = Notification.permission;
    console.log("[IncomingCall] 📢 Attempting notification, permission:", permission, "visibility:", document.visibilityState);

    if (permission !== "granted") {
      console.log("[IncomingCall] Notification permission not granted");
      return;
    }

    try {
      const notification = new Notification("📞 Incoming Call", {
        body: `Visitor from ${call.visitor.pageUrl} wants to connect`,
        icon: "/favicon.ico",
        tag: "incoming-call",
        requireInteraction: true,
        silent: false, // Allow sound
      });

      notification.onclick = () => {
        console.log("[IncomingCall] Notification clicked - focusing window");
        window.focus();
        notification.close();
      };

      notificationRef.current = notification;
      console.log("[IncomingCall] ✅ Notification shown successfully");
    } catch (error) {
      console.warn("[IncomingCall] Failed to show notification:", error);
    }
  }, []);

  // Start ringing loop
  const startRinging = useCallback((call: CallIncomingPayload) => {
    if (isRingingRef.current) return;
    isRingingRef.current = true;

    console.log("[IncomingCall] 🔔 Starting ring for call:", call.request.requestId);
    console.log("[IncomingCall] Tab visibility:", document.visibilityState);
    console.log("[IncomingCall] Notification permission:", Notification.permission);

    // Resume AudioContext if suspended
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    // Play initial ring
    playRingTone();

    // Set up ring loop
    const totalInterval = RING_PATTERN.ringDuration + RING_PATTERN.pauseDuration;
    ringIntervalRef.current = setInterval(() => {
      if (isRingingRef.current) {
        playRingTone();
      }
    }, totalInterval);

    // Show notification - always show it (not just when tab is hidden)
    // This ensures agents see the notification whether they're looking at the tab or not
    showNotification(call);

    // Flash the tab title to get attention in the tab bar
    startTitleFlash();

    // Show fallback in-browser alert (always works, even if OS notifications are blocked)
    showFallbackAlert(
      `Visitor from ${call.visitor.pageUrl} wants to connect`,
      () => {
        window.focus();
      }
    );
  }, [playRingTone, showNotification, startTitleFlash]);

  // Stop ringing
  const stopRinging = useCallback(() => {
    if (!isRingingRef.current) return;
    isRingingRef.current = false;

    console.log("[IncomingCall] 🔕 Stopping ring");

    // Clear ring interval
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }

    // Stop title flash
    stopTitleFlash();

    // Hide fallback alert
    hideFallbackAlert();

    // Close notification
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
  }, [stopTitleFlash]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging();
      stopTitleFlash();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopRinging, stopTitleFlash]);

  // Auto-request notification permission on mount (will prompt user)
  useEffect(() => {
    if (notificationPermission === "default") {
      // Request permission after a short delay to not block initial load
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notificationPermission, requestNotificationPermission]);

  return {
    notificationPermission,
    requestNotificationPermission,
    startRinging,
    stopRinging,
    isAudioReady,
    initializeAudio,
  };
}

