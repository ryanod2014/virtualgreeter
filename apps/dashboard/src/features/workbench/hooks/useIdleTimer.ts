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
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);

  // Keep callbacks fresh
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeUntilIdle(timeout);

    // Clear existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new timeout
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdleRef.current?.();
    }, timeout);
  }, [timeout]);

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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setTimeUntilIdle(timeout);
      return;
    }

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    // Start countdown interval to update timeUntilIdle
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setTimeUntilIdle(remaining);
    }, 1000);

    return () => {
      // Clean up
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [enabled, timeout, handleActivity, resetTimer]);

  return {
    isIdle,
    timeUntilIdle,
    resetTimer,
    markActive,
  };
}

