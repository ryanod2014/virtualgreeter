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

// Web Worker code for idle detection - runs independently of main thread throttling
const IDLE_WORKER_CODE = `
  let timeout = 300000;
  let elapsed = 0;
  let intervalId = null;

  self.onmessage = function(e) {
    const { type, timeout: newTimeout } = e.data;
    
    switch (type) {
      case 'start':
        if (newTimeout) timeout = newTimeout;
        elapsed = 0;
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(function() {
          elapsed += 1000;
          self.postMessage({ type: 'tick', elapsed: elapsed, remaining: timeout - elapsed });
          if (elapsed >= timeout) {
            self.postMessage({ type: 'idle' });
            clearInterval(intervalId);
            intervalId = null;
          }
        }, 1000);
        self.postMessage({ type: 'started' });
        break;
        
      case 'reset':
        elapsed = 0;
        self.postMessage({ type: 'tick', elapsed: 0, remaining: timeout });
        break;
        
      case 'stop':
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        self.postMessage({ type: 'stopped' });
        break;
    }
  };
`;

/**
 * Hook to detect user inactivity and trigger auto-away
 * 
 * Features:
 * - Uses Web Worker for reliable timing even in background tabs
 * - Tracks mouse, keyboard, scroll, and touch events
 * - Configurable timeout (default 5 minutes)
 * - Provides time remaining for UI countdown
 * - Can be disabled during active calls
 * - Shows notification when tab is hidden before marking away
 * - Provides grace period when notifications aren't permitted
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
  
  const workerRef = useRef<Worker | null>(null);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const notificationRef = useRef<Notification | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);

  // Keep callbacks fresh
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  // Clean up notification and visibility grace
  const clearNotification = useCallback(() => {
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    if (visibilityGraceRef.current) {
      clearTimeout(visibilityGraceRef.current);
      visibilityGraceRef.current = null;
    }
    if (visibilityListenerRef.current) {
      document.removeEventListener("visibilitychange", visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
  }, []);

  // Mark as idle
  const markIdle = useCallback(() => {
    setIsIdle(true);
    onIdleRef.current?.();
    clearNotification();
  }, [clearNotification]);

  // Reset the idle timer (send reset to worker)
  const resetTimer = useCallback(() => {
    setTimeUntilIdle(timeout);
    clearNotification();
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "reset" });
    }
  }, [timeout, clearNotification]);

  // Handle idle timeout from worker
  const handleIdleTimeout = useCallback(() => {
    // If tab is hidden, we need special handling
    if (document.visibilityState === "hidden") {
      if (Notification.permission === "granted") {
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
          // Restart the worker timer
          workerRef.current?.postMessage({ type: "start", timeout });
        };

        // If no response within grace period, mark as away
        notificationTimeoutRef.current = setTimeout(() => {
          markIdle();
        }, NOTIFICATION_GRACE_PERIOD);
      } else {
        // No notification permission - start visibility grace period
        // If tab becomes visible within 60s, cancel the away marking
        visibilityGraceRef.current = setTimeout(() => {
          markIdle();
        }, NOTIFICATION_GRACE_PERIOD);
        
        // Listen for visibility change to cancel
        const handleVisible = () => {
          if (document.visibilityState === "visible") {
            clearNotification();
            resetTimer();
            // Restart the worker timer
            workerRef.current?.postMessage({ type: "start", timeout });
          }
        };
        visibilityListenerRef.current = handleVisible;
        document.addEventListener("visibilitychange", handleVisible);
      }
    } else {
      // Tab is visible - mark idle immediately
      markIdle();
    }
  }, [resetTimer, clearNotification, markIdle, timeout]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled) return;

    // If user was idle, mark as active
    if (isIdle) {
      setIsIdle(false);
      onActiveRef.current?.();
      // Restart the worker timer when coming back from idle
      workerRef.current?.postMessage({ type: "start", timeout });
    }

    resetTimer();
  }, [enabled, isIdle, resetTimer, timeout]);

  // Mark user as active (for "I'm Back" button)
  const markActive = useCallback(() => {
    setIsIdle(false);
    onActiveRef.current?.();
    resetTimer();
    // Restart the worker timer
    workerRef.current?.postMessage({ type: "start", timeout });
  }, [resetTimer, timeout]);

  // Create worker and set up listeners
  useEffect(() => {
    if (!enabled) {
      // Stop worker and clear everything when disabled
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "stop" });
      }
      clearNotification();
      return;
    }

    // Create Web Worker
    try {
      const blob = new Blob([IDLE_WORKER_CODE], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      URL.revokeObjectURL(workerUrl);
      
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, remaining } = e.data;
        
        switch (type) {
          case "tick":
            setTimeUntilIdle(Math.max(0, remaining));
            break;
          case "idle":
            handleIdleTimeout();
            break;
          case "started":
            console.log("[IdleTimer] Worker started");
            break;
          case "stopped":
            console.log("[IdleTimer] Worker stopped");
            break;
        }
      };

      worker.onerror = (error) => {
        console.error("[IdleTimer] Worker error:", error);
      };

      // Start the worker
      worker.postMessage({ type: "start", timeout });

    } catch (error) {
      console.warn("[IdleTimer] Failed to create worker, falling back to setTimeout:", error);
      
      // Fallback to setTimeout-based implementation (may be throttled in background)
      let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
      
      const startFallback = () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        fallbackTimeout = setTimeout(() => {
          handleIdleTimeout();
        }, timeout);
      };
      
      // Store reference for reset
      workerRef.current = {
        postMessage: (data: { type: string; timeout?: number }) => {
          if (data.type === "start" || data.type === "reset") {
            startFallback();
          } else if (data.type === "stop" && fallbackTimeout) {
            clearTimeout(fallbackTimeout);
          }
        },
        terminate: () => {
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
        },
      } as unknown as Worker;
      
      startFallback();
    }

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      // Clean up
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (workerRef.current) {
        if ('terminate' in workerRef.current) {
          workerRef.current.terminate();
        }
        workerRef.current = null;
      }
      clearNotification();
    };
  }, [enabled, timeout, handleActivity, handleIdleTimeout, clearNotification]);

  return {
    isIdle,
    timeUntilIdle,
    resetTimer,
    markActive,
  };
}
