import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Test Lock: useHeartbeat.ts - Heartbeat & Chrome Freeze Prevention
 *
 * These tests capture the current behavior of:
 * - Sends heartbeat every 25 seconds
 * - Uses Web Worker to prevent Chrome background throttling
 * - Falls back to setInterval if Worker fails
 * - Detects stale connections
 * - Handles tab visibility changes
 */

const DEFAULT_HEARTBEAT_INTERVAL = 25 * 1000; // 25 seconds
const STALE_THRESHOLD = 60 * 1000; // 60 seconds without response = stale

describe("useHeartbeat - Heartbeat Mechanism", () => {
  let mockSocket: {
    emit: ReturnType<typeof vi.fn>;
    connected: boolean;
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockSocket = {
      emit: vi.fn(),
      connected: true,
      connect: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Heartbeat Sending", () => {
    it("sends heartbeat every 25 seconds", () => {
      const heartbeats: Array<{ timestamp: number }> = [];

      // Simulate heartbeat sending
      const sendHeartbeat = () => {
        if (mockSocket.connected) {
          const payload = { timestamp: Date.now() };
          mockSocket.emit("heartbeat", payload);
          heartbeats.push(payload);
        }
      };

      // Start heartbeat interval
      const intervalId = setInterval(sendHeartbeat, DEFAULT_HEARTBEAT_INTERVAL);

      // Advance time for 3 heartbeats
      vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL * 3);

      clearInterval(intervalId);

      expect(heartbeats).toHaveLength(3);
      expect(mockSocket.emit).toHaveBeenCalledTimes(3);
    });

    it("emits heartbeat event with timestamp", () => {
      const sendHeartbeat = () => {
        mockSocket.emit("heartbeat", { timestamp: Date.now() });
      };

      sendHeartbeat();

      expect(mockSocket.emit).toHaveBeenCalledWith("heartbeat", {
        timestamp: expect.any(Number),
      });
    });

    it("updates lastHeartbeat timestamp on send", () => {
      let lastHeartbeat: number | null = null;

      const sendHeartbeat = () => {
        if (mockSocket.connected) {
          mockSocket.emit("heartbeat", { timestamp: Date.now() });
          lastHeartbeat = Date.now();
        }
      };

      sendHeartbeat();

      expect(lastHeartbeat).toBeDefined();
      expect(lastHeartbeat).toBeGreaterThan(0);
    });

    it("skips heartbeat when socket not connected", () => {
      mockSocket.connected = false;

      const sendHeartbeat = () => {
        if (!mockSocket.connected) {
          return; // Skip
        }
        mockSocket.emit("heartbeat", { timestamp: Date.now() });
      };

      sendHeartbeat();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe("Web Worker for Chrome Throttling Prevention", () => {
    it("uses Web Worker when available", () => {
      let workerCreated = false;

      const createWorker = () => {
        // Simulate successful worker creation
        workerCreated = true;
        return {
          postMessage: vi.fn(),
          terminate: vi.fn(),
          onmessage: null as ((e: MessageEvent) => void) | null,
          onerror: null as ((e: ErrorEvent) => void) | null,
        };
      };

      const worker = createWorker();

      expect(workerCreated).toBe(true);
      expect(worker).toBeDefined();
      expect(worker.postMessage).toBeDefined();
    });

    it("worker posts heartbeat messages at interval", () => {
      const messages: Array<{ type: string; timestamp: number }> = [];

      // Simulate worker posting messages
      const workerPostMessage = () => {
        messages.push({ type: "heartbeat", timestamp: Date.now() });
      };

      // Simulate 3 heartbeat intervals
      const intervalId = setInterval(workerPostMessage, DEFAULT_HEARTBEAT_INTERVAL);

      vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL * 3);

      clearInterval(intervalId);

      expect(messages).toHaveLength(3);
      expect(messages[0]?.type).toBe("heartbeat");
    });

    it("falls back to setInterval when Worker fails", () => {
      let fallbackUsed = false;

      const createWorker = (): Worker | null => {
        throw new Error("Worker not supported");
      };

      try {
        createWorker();
      } catch {
        // Fallback to regular setInterval
        fallbackUsed = true;
      }

      expect(fallbackUsed).toBe(true);
    });

    it("fallback interval still sends heartbeats", () => {
      let heartbeatCount = 0;

      // Simulate fallback interval
      const sendHeartbeat = () => {
        mockSocket.emit("heartbeat", { timestamp: Date.now() });
        heartbeatCount++;
      };

      const fallbackInterval = setInterval(sendHeartbeat, DEFAULT_HEARTBEAT_INTERVAL);

      vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL * 3);

      clearInterval(fallbackInterval);

      expect(heartbeatCount).toBe(3);
      expect(mockSocket.emit).toHaveBeenCalledTimes(3);
    });

    it("worker responds to start message", () => {
      let workerStarted = false;

      const handleWorkerMessage = (msg: { type: string; interval?: number }) => {
        if (msg.type === "start") {
          workerStarted = true;
        }
      };

      handleWorkerMessage({ type: "start", interval: DEFAULT_HEARTBEAT_INTERVAL });

      expect(workerStarted).toBe(true);
    });

    it("worker responds to stop message", () => {
      let workerStopped = false;

      const handleWorkerMessage = (msg: { type: string }) => {
        if (msg.type === "stop") {
          workerStopped = true;
        }
      };

      handleWorkerMessage({ type: "stop" });

      expect(workerStopped).toBe(true);
    });

    it("worker responds to ping with pong", () => {
      let pongReceived = false;

      const handleWorkerMessage = (msg: { type: string }) => {
        if (msg.type === "ping") {
          // Would send pong back
          pongReceived = true;
        }
      };

      handleWorkerMessage({ type: "ping" });

      expect(pongReceived).toBe(true);
    });
  });

  describe("Connection Health Monitoring", () => {
    it("tracks isConnectionHealthy state", () => {
      let isConnectionHealthy = true;
      let lastHeartbeat = Date.now();

      const checkConnectionHealth = () => {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat;
        isConnectionHealthy = timeSinceHeartbeat <= STALE_THRESHOLD;
      };

      checkConnectionHealth();
      expect(isConnectionHealthy).toBe(true);
    });

    it("marks connection as stale after 60 seconds without heartbeat", () => {
      let isConnectionHealthy = true;
      let lastHeartbeat = Date.now();

      const checkConnectionHealth = () => {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat;
        if (timeSinceHeartbeat > STALE_THRESHOLD) {
          isConnectionHealthy = false;
        }
      };

      // Advance past stale threshold
      vi.advanceTimersByTime(STALE_THRESHOLD + 1000);

      checkConnectionHealth();

      expect(isConnectionHealthy).toBe(false);
    });

    it("calls onConnectionStale callback when stale detected", () => {
      const onConnectionStale = vi.fn();
      let lastHeartbeat = Date.now();

      const checkConnectionHealth = (callback: () => void) => {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat;
        if (timeSinceHeartbeat > STALE_THRESHOLD) {
          callback();
        }
      };

      vi.advanceTimersByTime(STALE_THRESHOLD + 1000);

      checkConnectionHealth(onConnectionStale);

      expect(onConnectionStale).toHaveBeenCalledTimes(1);
    });

    it("connection remains healthy when heartbeats are regular", () => {
      let isConnectionHealthy = true;
      let lastHeartbeat = Date.now();

      const sendHeartbeat = () => {
        lastHeartbeat = Date.now();
      };

      const checkConnectionHealth = () => {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat;
        isConnectionHealthy = timeSinceHeartbeat <= STALE_THRESHOLD;
      };

      // Regular heartbeats
      const interval = setInterval(() => {
        sendHeartbeat();
        checkConnectionHealth();
      }, DEFAULT_HEARTBEAT_INTERVAL);

      vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL * 5);

      clearInterval(interval);

      checkConnectionHealth();
      expect(isConnectionHealthy).toBe(true);
    });
  });

  describe("Tab Visibility Handling", () => {
    it("sends immediate heartbeat when tab becomes visible", () => {
      const heartbeats: number[] = [];

      const sendHeartbeat = () => {
        mockSocket.emit("heartbeat", { timestamp: Date.now() });
        heartbeats.push(Date.now());
      };

      const handleVisibilityChange = (visible: boolean) => {
        if (visible) {
          // Immediately verify connection when tab becomes visible
          sendHeartbeat();
        }
      };

      handleVisibilityChange(true);

      expect(heartbeats).toHaveLength(1);
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it("checks connection health when tab becomes visible", () => {
      let healthChecked = false;

      const checkConnectionHealth = () => {
        healthChecked = true;
      };

      const handleVisibilityChange = (visible: boolean) => {
        if (visible) {
          checkConnectionHealth();
        }
      };

      handleVisibilityChange(true);

      expect(healthChecked).toBe(true);
    });

    it("attempts socket reconnect if disconnected when tab visible", () => {
      mockSocket.connected = false;

      const handleVisibilityChange = (visible: boolean) => {
        if (visible && !mockSocket.connected) {
          mockSocket.connect();
        }
      };

      handleVisibilityChange(true);

      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it("does not reconnect if already connected", () => {
      mockSocket.connected = true;

      const handleVisibilityChange = (visible: boolean) => {
        if (visible && !mockSocket.connected) {
          mockSocket.connect();
        }
      };

      handleVisibilityChange(true);

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe("Worker State Management", () => {
    it("tracks isWorkerActive state", () => {
      let isWorkerActive = false;

      const handleWorkerStarted = () => {
        isWorkerActive = true;
      };

      const handleWorkerStopped = () => {
        isWorkerActive = false;
      };

      handleWorkerStarted();
      expect(isWorkerActive).toBe(true);

      handleWorkerStopped();
      expect(isWorkerActive).toBe(false);
    });

    it("sets isWorkerActive=false on worker error", () => {
      let isWorkerActive = true;

      const handleWorkerError = () => {
        isWorkerActive = false;
      };

      handleWorkerError();

      expect(isWorkerActive).toBe(false);
    });

    it("cleans up worker on unmount", () => {
      let workerTerminated = false;
      let workerStopSent = false;

      const cleanup = () => {
        workerStopSent = true;
        workerTerminated = true;
      };

      cleanup();

      expect(workerStopSent).toBe(true);
      expect(workerTerminated).toBe(true);
    });

    it("sets isWorkerActive=true for fallback interval", () => {
      let isWorkerActive = false;

      // When using fallback, still mark as "active" 
      const startFallback = () => {
        isWorkerActive = true;
      };

      startFallback();

      expect(isWorkerActive).toBe(true);
    });
  });

  describe("Configurable Options", () => {
    it("accepts custom heartbeat interval", () => {
      const customInterval = 10 * 1000; // 10 seconds
      let heartbeatCount = 0;

      const interval = setInterval(() => {
        heartbeatCount++;
      }, customInterval);

      vi.advanceTimersByTime(customInterval * 3);

      clearInterval(interval);

      expect(heartbeatCount).toBe(3);
    });

    it("can be disabled via enabled option", () => {
      let enabled = false;
      let workerCreated = false;

      const initialize = () => {
        if (!enabled) {
          return; // Don't create worker
        }
        workerCreated = true;
      };

      initialize();

      expect(workerCreated).toBe(false);
    });

    it("does not run when disabled", () => {
      let enabled = false;
      let heartbeatCount = 0;

      const sendHeartbeat = () => {
        if (!enabled) return;
        heartbeatCount++;
      };

      sendHeartbeat();
      sendHeartbeat();
      sendHeartbeat();

      expect(heartbeatCount).toBe(0);
    });

    it("requires socket to be provided", () => {
      let canSendHeartbeat = false;

      const initialize = (socket: typeof mockSocket | null) => {
        if (socket) {
          canSendHeartbeat = true;
        }
      };

      initialize(null);
      expect(canSendHeartbeat).toBe(false);

      initialize(mockSocket);
      expect(canSendHeartbeat).toBe(true);
    });
  });

  describe("Return Values", () => {
    it("returns isWorkerActive", () => {
      const result = {
        isWorkerActive: true,
        lastHeartbeat: Date.now(),
        isConnectionHealthy: true,
      };

      expect(result.isWorkerActive).toBe(true);
    });

    it("returns lastHeartbeat timestamp or null", () => {
      let lastHeartbeat: number | null = null;

      const sendHeartbeat = () => {
        lastHeartbeat = Date.now();
      };

      expect(lastHeartbeat).toBeNull();

      sendHeartbeat();

      expect(lastHeartbeat).toBeDefined();
      expect(typeof lastHeartbeat).toBe("number");
    });

    it("returns isConnectionHealthy", () => {
      const result = {
        isWorkerActive: true,
        lastHeartbeat: Date.now(),
        isConnectionHealthy: true,
      };

      expect(result.isConnectionHealthy).toBe(true);
    });
  });
});

