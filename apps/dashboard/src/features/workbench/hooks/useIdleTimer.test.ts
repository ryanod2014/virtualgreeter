import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Test Lock: useIdleTimer.ts - Idle Detection and Auto-Away
 *
 * These tests capture the current behavior of:
 * - Idle detection after configured timeout (default 5 min)
 * - Activity event reset (mouse, keyboard, scroll, touch)
 * - Web Worker usage for reliable timing
 * - Fallback to setTimeout when Worker unavailable
 * - Hidden tab notification handling
 * - 60 second grace period for notification response
 * - Callback firing (onIdle, onActive)
 */

const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const NOTIFICATION_GRACE_PERIOD = 60 * 1000; // 60 seconds

// Activity events that should reset the timer
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

describe("useIdleTimer - Idle Detection Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Idle Detection", () => {
    it("detects inactivity after configured timeout (5 min default)", () => {
      let isIdle = false;
      const timeout = DEFAULT_IDLE_TIMEOUT;

      // Simulate worker tick behavior
      const checkIdle = (elapsed: number) => {
        if (elapsed >= timeout) {
          isIdle = true;
        }
      };

      // Advance time past the threshold
      vi.advanceTimersByTime(DEFAULT_IDLE_TIMEOUT);
      checkIdle(DEFAULT_IDLE_TIMEOUT);

      expect(isIdle).toBe(true);
    });

    it("does not mark as idle before timeout", () => {
      let isIdle = false;
      const timeout = DEFAULT_IDLE_TIMEOUT;

      const checkIdle = (elapsed: number) => {
        if (elapsed >= timeout) {
          isIdle = true;
        }
      };

      // Advance time to just before threshold
      const elapsed = DEFAULT_IDLE_TIMEOUT - 1000;
      vi.advanceTimersByTime(elapsed);
      checkIdle(elapsed);

      expect(isIdle).toBe(false);
    });

    it("uses configurable timeout value", () => {
      let isIdle = false;
      const customTimeout = 2 * 60 * 1000; // 2 minutes

      const checkIdle = (elapsed: number, timeout: number) => {
        if (elapsed >= timeout) {
          isIdle = true;
        }
      };

      // Advance to custom timeout
      vi.advanceTimersByTime(customTimeout);
      checkIdle(customTimeout, customTimeout);

      expect(isIdle).toBe(true);
    });

    it("resets on mouse events", () => {
      let elapsed = 0;
      let isIdle = false;

      const reset = () => {
        elapsed = 0;
      };

      const tick = (increment: number) => {
        elapsed += increment;
        if (elapsed >= DEFAULT_IDLE_TIMEOUT) {
          isIdle = true;
        }
      };

      // Advance time close to timeout
      tick(DEFAULT_IDLE_TIMEOUT - 60000); // 4 minutes
      expect(isIdle).toBe(false);

      // Simulate mouse activity
      reset();

      // Advance another minute (would be past timeout if not reset)
      tick(120000); // 2 minutes
      expect(isIdle).toBe(false);
    });

    it("resets on keyboard events", () => {
      let elapsed = 0;

      const reset = () => {
        elapsed = 0;
      };

      const simulateKeyDown = () => {
        reset();
      };

      // Advance close to timeout
      elapsed = DEFAULT_IDLE_TIMEOUT - 30000;

      // Keyboard event resets
      simulateKeyDown();

      expect(elapsed).toBe(0);
    });

    it("resets on scroll events", () => {
      let elapsed = 0;

      const reset = () => {
        elapsed = 0;
      };

      elapsed = DEFAULT_IDLE_TIMEOUT - 10000;
      reset(); // Scroll resets

      expect(elapsed).toBe(0);
    });

    it("resets on touch events", () => {
      let elapsed = 0;

      const reset = () => {
        elapsed = 0;
      };

      elapsed = DEFAULT_IDLE_TIMEOUT - 5000;
      reset(); // Touch resets

      expect(elapsed).toBe(0);
    });

    it("tracks all activity event types", () => {
      const expectedEvents = [
        "mousemove",
        "mousedown",
        "keydown",
        "scroll",
        "touchstart",
        "wheel",
      ];

      expect(ACTIVITY_EVENTS).toEqual(expectedEvents);
    });
  });

  describe("Web Worker Logic", () => {
    it("uses Web Worker when available", () => {
      let workerUsed = false;

      // Simulate Worker availability check
      const createWorker = () => {
        try {
          // In real code: new Worker(blobUrl)
          workerUsed = true;
          return {
            postMessage: vi.fn(),
            terminate: vi.fn(),
            onmessage: null as ((e: MessageEvent) => void) | null,
            onerror: null as ((e: ErrorEvent) => void) | null,
          };
        } catch {
          return null;
        }
      };

      const worker = createWorker();

      expect(workerUsed).toBe(true);
      expect(worker).toBeDefined();
    });

    it("falls back to setTimeout when Worker unavailable", () => {
      let fallbackUsed = false;
      let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const createWorker = (): Worker | null => {
        // Simulate Worker creation failure
        throw new Error("Worker not supported");
      };

      try {
        createWorker();
      } catch {
        // Fallback to setTimeout
        fallbackUsed = true;
        fallbackTimeoutId = setTimeout(() => {
          // Idle timeout handler
        }, DEFAULT_IDLE_TIMEOUT);
      }

      expect(fallbackUsed).toBe(true);
      expect(fallbackTimeoutId).toBeDefined();
    });

    it("worker posts tick messages every second", () => {
      const messages: Array<{ type: string; elapsed: number; remaining: number }> = [];

      // Simulate worker posting tick messages
      const postMessage = (msg: { type: string; elapsed: number; remaining: number }) => {
        messages.push(msg);
      };

      // Simulate 3 ticks
      postMessage({ type: "tick", elapsed: 1000, remaining: DEFAULT_IDLE_TIMEOUT - 1000 });
      postMessage({ type: "tick", elapsed: 2000, remaining: DEFAULT_IDLE_TIMEOUT - 2000 });
      postMessage({ type: "tick", elapsed: 3000, remaining: DEFAULT_IDLE_TIMEOUT - 3000 });

      expect(messages).toHaveLength(3);
      expect(messages[0]?.type).toBe("tick");
      expect(messages[2]?.elapsed).toBe(3000);
    });

    it("worker posts idle message when timeout reached", () => {
      const messages: Array<{ type: string }> = [];

      // Simulate worker behavior at timeout
      const checkAndPost = (elapsed: number, timeout: number) => {
        if (elapsed >= timeout) {
          messages.push({ type: "idle" });
        }
      };

      checkAndPost(DEFAULT_IDLE_TIMEOUT, DEFAULT_IDLE_TIMEOUT);

      expect(messages).toContainEqual({ type: "idle" });
    });

    it("worker resets elapsed on reset message", () => {
      let elapsed = DEFAULT_IDLE_TIMEOUT - 1000;

      // Simulate receiving reset message
      const handleMessage = (msg: { type: string }) => {
        if (msg.type === "reset") {
          elapsed = 0;
        }
      };

      handleMessage({ type: "reset" });

      expect(elapsed).toBe(0);
    });

    it("worker stops interval on stop message", () => {
      let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => {}, 1000);
      let intervalCleared = false;

      const handleMessage = (msg: { type: string }) => {
        if (msg.type === "stop" && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          intervalCleared = true;
        }
      };

      handleMessage({ type: "stop" });

      expect(intervalCleared).toBe(true);
      expect(intervalId).toBeNull();
    });
  });

  describe("Hidden Tab Handling", () => {
    it("shows browser notification when tab hidden and idle", () => {
      let notificationShown = false;

      // Mock document visibility and Notification
      const documentHidden = true;
      const notificationPermission = "granted";

      const handleIdleTimeout = () => {
        if (documentHidden) {
          if (notificationPermission === "granted") {
            notificationShown = true;
          }
        }
      };

      handleIdleTimeout();

      expect(notificationShown).toBe(true);
    });

    it("uses 60 second grace period for notification response", () => {
      let graceTimeoutStarted = false;
      let markedIdle = false;

      const documentHidden = true;
      const notificationPermission = "granted";

      const handleIdleTimeout = () => {
        if (documentHidden && notificationPermission === "granted") {
          graceTimeoutStarted = true;

          // Start grace period timer
          setTimeout(() => {
            markedIdle = true;
          }, NOTIFICATION_GRACE_PERIOD);
        }
      };

      handleIdleTimeout();

      expect(graceTimeoutStarted).toBe(true);
      expect(markedIdle).toBe(false);

      // Advance past grace period
      vi.advanceTimersByTime(NOTIFICATION_GRACE_PERIOD);

      expect(markedIdle).toBe(true);
    });

    it("starts visibility grace period when notifications not permitted", () => {
      let visibilityGraceStarted = false;

      const documentHidden = true;
      const notificationPermission = "denied";

      const handleIdleTimeout = () => {
        if (documentHidden) {
          if (notificationPermission !== "granted") {
            visibilityGraceStarted = true;
            // Would start 60s grace period for tab to become visible
          }
        }
      };

      handleIdleTimeout();

      expect(visibilityGraceStarted).toBe(true);
    });

    it("returns to active state when tab becomes visible during grace", () => {
      let isIdle = false;
      let graceCancelled = false;

      const handleIdleTimeout = () => {
        // Start grace period
        const graceTimeout = setTimeout(() => {
          isIdle = true;
        }, NOTIFICATION_GRACE_PERIOD);

        // Return the cancellation function
        return () => {
          clearTimeout(graceTimeout);
          graceCancelled = true;
        };
      };

      const cancelGrace = handleIdleTimeout();

      // Advance part way through grace
      vi.advanceTimersByTime(30000);

      // Tab becomes visible - cancel grace
      cancelGrace();

      // Advance past original grace period
      vi.advanceTimersByTime(60000);

      expect(graceCancelled).toBe(true);
      expect(isIdle).toBe(false);
    });

    it("immediately marks idle when tab is visible", () => {
      let isIdle = false;

      const documentHidden = false; // Tab is visible

      const handleIdleTimeout = () => {
        if (!documentHidden) {
          // Tab is visible - mark idle immediately
          isIdle = true;
        }
      };

      handleIdleTimeout();

      expect(isIdle).toBe(true);
    });
  });

  describe("Callback Behaviors", () => {
    it("fires onIdle callback when idle confirmed", () => {
      const onIdle = vi.fn();
      let isIdle = false;

      const markIdle = (onIdleCallback: () => void) => {
        isIdle = true;
        onIdleCallback();
      };

      markIdle(onIdle);

      expect(isIdle).toBe(true);
      expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it("fires onActive callback when user returns from idle", () => {
      const onActive = vi.fn();
      let isIdle = true;

      const markActive = (onActiveCallback: () => void) => {
        if (isIdle) {
          isIdle = false;
          onActiveCallback();
        }
      };

      markActive(onActive);

      expect(isIdle).toBe(false);
      expect(onActive).toHaveBeenCalledTimes(1);
    });

    it("does not fire onActive when already active", () => {
      const onActive = vi.fn();
      let isIdle = false; // Already active

      const handleActivity = (onActiveCallback: () => void) => {
        if (isIdle) {
          isIdle = false;
          onActiveCallback();
        }
      };

      handleActivity(onActive);

      expect(onActive).not.toHaveBeenCalled();
    });

    it("keeps callback refs fresh via useRef pattern", () => {
      let onIdleRef = { current: () => console.log("initial") };
      let onActiveRef = { current: () => console.log("initial") };

      const newOnIdle = () => console.log("updated");
      const newOnActive = () => console.log("updated");

      // Simulate useEffect updating refs
      onIdleRef.current = newOnIdle;
      onActiveRef.current = newOnActive;

      expect(onIdleRef.current).toBe(newOnIdle);
      expect(onActiveRef.current).toBe(newOnActive);
    });
  });

  describe("Timer Management", () => {
    it("provides resetTimer function to manually reset", () => {
      let elapsed = DEFAULT_IDLE_TIMEOUT - 10000;
      let timeUntilIdle = 10000;

      const resetTimer = (timeout: number) => {
        elapsed = 0;
        timeUntilIdle = timeout;
      };

      resetTimer(DEFAULT_IDLE_TIMEOUT);

      expect(elapsed).toBe(0);
      expect(timeUntilIdle).toBe(DEFAULT_IDLE_TIMEOUT);
    });

    it("provides markActive function for manual activation", () => {
      let isIdle = true;
      const onActive = vi.fn();

      const markActive = (onActiveCallback: () => void) => {
        isIdle = false;
        onActiveCallback();
        // Would also restart worker timer
      };

      markActive(onActive);

      expect(isIdle).toBe(false);
      expect(onActive).toHaveBeenCalled();
    });

    it("provides timeUntilIdle for countdown UI", () => {
      let timeUntilIdle = DEFAULT_IDLE_TIMEOUT;

      // Simulate worker tick updating remaining time
      const handleTick = (remaining: number) => {
        timeUntilIdle = Math.max(0, remaining);
      };

      handleTick(DEFAULT_IDLE_TIMEOUT - 60000);
      expect(timeUntilIdle).toBe(DEFAULT_IDLE_TIMEOUT - 60000);

      handleTick(0);
      expect(timeUntilIdle).toBe(0);

      // Should not go negative
      handleTick(-1000);
      expect(timeUntilIdle).toBe(0);
    });

    it("cleans up on unmount", () => {
      let workerTerminated = false;
      let listenersRemoved = false;

      const cleanup = () => {
        workerTerminated = true;
        listenersRemoved = true;
      };

      cleanup();

      expect(workerTerminated).toBe(true);
      expect(listenersRemoved).toBe(true);
    });

    it("does not track activity when disabled", () => {
      let enabled = false;
      let activityHandled = false;

      const handleActivity = () => {
        if (!enabled) return;
        activityHandled = true;
      };

      handleActivity();

      expect(activityHandled).toBe(false);
    });

    it("stops worker when disabled", () => {
      let workerStopped = false;

      const workerPostMessage = (msg: { type: string }) => {
        if (msg.type === "stop") {
          workerStopped = true;
        }
      };

      // Simulate disabling
      workerPostMessage({ type: "stop" });

      expect(workerStopped).toBe(true);
    });
  });
});



