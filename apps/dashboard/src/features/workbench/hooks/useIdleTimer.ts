"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseIdleTimerOptions {
  /** Idle timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Callback when user goes idle */
  onIdle?: () => void;
  /** Callback when user becomes active again */
  onActive?: () => void;
  /** Whether to track activity (disable during calls) */
  enabled?: boolean;
}

interface UseIdleTimerReturn {
  /** Whether the user is currently idle */
  isIdle: boolean;
  /** Time remaining until idle (ms) */
  timeUntilIdle: number;
  /** Manually reset the idle timer */
  resetTimer: () => void;
  /** Mark user as active (e.g., when clicking "I'm Back" button) */
  markActive: () => void;
}

const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const NOTIFICATION_GRACE_PERIOD = 60 * 1000; // 60 seconds to respond

// Events that indicate user activity
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

/**
 * Hook to detect user inactivity and trigger auto-away
 * 
 * Features:
 * - Tracks mouse, keyboard, scroll, and touch events
 * - Configurable timeout (default 5 minutes)
 * - Provides time remaining for UI countdown
 * - Can be disabled during active calls
 * - Shows notification when tab is hidden before marking away
 */
export function useIdleTimer(options: UseIdleTimerOptions = {}): UseIdleTimerReturn {
  const {
    timeout = DEFAULT_IDLE_TIMEOUT,
    onIdle,
    onActive,
    enabled = true,
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const [timeUntilIdle, setTimeUntilIdle] = useState(timeout);
  
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const notificationRef = useRef<Notification | null>(null);

  // Keep callbacks fresh
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  // Clean up notification
  const clearNotification = useCallback(() => {
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  }, []);

  // Mark as idle
  const markIdle = useCallback(() => {
    setIsIdle(true);
    onIdleRef.current?.();
    clearNotification();
  }, [clearNotification]);

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeUntilIdle(timeout);

    // Close any existing notification
    clearNotification();

    // Clear existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new timeout
    idleTimeoutRef.current = setTimeout(() => {
      // If tab is hidden, show notification instead of immediately marking away
      if (document.visibilityState === "hidden" && Notification.permission === "granted") {
        // Show "still there?" notification
        notificationRef.current = new Notification("Still there?", {
          body: "Click to stay available for calls",
          icon: "/favicon.ico",
          requireInteraction: true,
          tag: "idle-check",
        });

        notificationRef.current.onclick = () => {
          resetTimer();
          window.focus();
          clearNotification();
        };

        // If no response within grace period, mark as away
        notificationTimeoutRef.current = setTimeout(() => {
          markIdle();
        }, NOTIFICATION_GRACE_PERIOD);
      } else {
        // Tab is visible or no notification permission - mark idle immediately
        markIdle();
      }
    }, timeout);
  }, [timeout, clearNotification, markIdle]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled) return;

    // If user was idle, mark as active
    if (isIdle) {
      setIsIdle(false);
      onActiveRef.current?.();
    }

    resetTimer();
  }, [enabled, isIdle, resetTimer]);

  // Mark user as active (for "I'm Back" button)
  const markActive = useCallback(() => {
    setIsIdle(false);
    onActiveRef.current?.();
    resetTimer();
  }, [resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) {
      // Clear timers when disabled
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      clearNotification();
      return;
    }

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    return () => {
      // Clean up
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      clearNotification();
    };
  }, [enabled, timeout, handleActivity, resetTimer, clearNotification]);

  return {
    isIdle,
    timeUntilIdle,
    resetTimer,
    markActive,
  };
}

