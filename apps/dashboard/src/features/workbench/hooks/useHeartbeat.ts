"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Socket } from "socket.io-client";

interface UseHeartbeatOptions {
  /** Socket.io instance */
  socket: Socket | null;
  /** Heartbeat interval in milliseconds (default: 25 seconds) */
  interval?: number;
  /** Whether heartbeat is enabled */
  enabled?: boolean;
  /** Callback when connection is detected as stale */
  onConnectionStale?: () => void;
}

interface UseHeartbeatReturn {
  /** Whether the worker is active */
  isWorkerActive: boolean;
  /** Last heartbeat timestamp */
  lastHeartbeat: number | null;
  /** Whether connection appears healthy */
  isConnectionHealthy: boolean;
}

const DEFAULT_HEARTBEAT_INTERVAL = 25 * 1000; // 25 seconds
const STALE_THRESHOLD = 60 * 1000; // 60 seconds without response = stale

/**
 * Worker-based heartbeat to prevent Chrome tab freezing
 * 
 * Problem: Chrome freezes background tabs after 5 minutes, killing socket connections.
 * Solution: Use a Web Worker with setInterval to keep heartbeat alive.
 * 
 * The worker runs independently of the main thread's timer throttling.
 */
export function useHeartbeat(options: UseHeartbeatOptions): UseHeartbeatReturn {
  const {
    socket,
    interval = DEFAULT_HEARTBEAT_INTERVAL,
    enabled = true,
    onConnectionStale,
  } = options;

  const [isWorkerActive, setIsWorkerActive] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [isConnectionHealthy, setIsConnectionHealthy] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const onConnectionStaleRef = useRef(onConnectionStale);

  // Keep callback ref fresh
  useEffect(() => {
    onConnectionStaleRef.current = onConnectionStale;
  }, [onConnectionStale]);

  // Create inline worker blob
  const createWorker = useCallback(() => {
    const workerCode = `
      let intervalId = null;
      let heartbeatInterval = 25000;

      self.onmessage = function(e) {
        const { type, interval } = e.data;
        
        switch (type) {
          case 'start':
            if (interval) heartbeatInterval = interval;
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => {
              self.postMessage({ type: 'heartbeat', timestamp: Date.now() });
            }, heartbeatInterval);
            self.postMessage({ type: 'started' });
            break;
            
          case 'stop':
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            self.postMessage({ type: 'stopped' });
            break;
            
          case 'ping':
            self.postMessage({ type: 'pong', timestamp: Date.now() });
            break;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Clean up blob URL after worker is created
    URL.revokeObjectURL(workerUrl);

    return worker;
  }, []);

  // Handle socket heartbeat
  const sendHeartbeat = useCallback(() => {
    if (!socket?.connected) {
      console.log("[Heartbeat] Socket not connected, skipping heartbeat");
      return;
    }

    // Socket.io has built-in ping/pong, but we can also emit custom heartbeat
    // The act of emitting keeps the connection alive
    socket.emit("heartbeat" as unknown as never, { timestamp: Date.now() });
    setLastHeartbeat(Date.now());
  }, [socket]);

  // Check connection health
  const checkConnectionHealth = useCallback(() => {
    if (!lastHeartbeat) return;

    const timeSinceHeartbeat = Date.now() - lastHeartbeat;
    if (timeSinceHeartbeat > STALE_THRESHOLD) {
      setIsConnectionHealthy(false);
      onConnectionStaleRef.current?.();
    } else {
      setIsConnectionHealthy(true);
    }
  }, [lastHeartbeat]);

  // Initialize and manage worker
  useEffect(() => {
    if (!enabled || typeof Worker === "undefined") {
      return;
    }

    try {
      const worker = createWorker();
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type } = e.data;

        switch (type) {
          case "started":
            setIsWorkerActive(true);
            console.log("[Heartbeat] Worker started");
            break;

          case "stopped":
            setIsWorkerActive(false);
            console.log("[Heartbeat] Worker stopped");
            break;

          case "heartbeat":
            sendHeartbeat();
            checkConnectionHealth();
            break;

          case "pong":
            // Worker is responsive
            break;
        }
      };

      worker.onerror = (error) => {
        console.error("[Heartbeat] Worker error:", error);
        setIsWorkerActive(false);
      };

      // Start the worker
      worker.postMessage({ type: "start", interval });

      return () => {
        worker.postMessage({ type: "stop" });
        worker.terminate();
        workerRef.current = null;
        setIsWorkerActive(false);
      };
    } catch (error) {
      console.warn("[Heartbeat] Failed to create worker, falling back to setInterval:", error);
      
      // Fallback to regular setInterval (may be throttled in background)
      const fallbackInterval = setInterval(() => {
        sendHeartbeat();
        checkConnectionHealth();
      }, interval);

      setIsWorkerActive(true);

      return () => {
        clearInterval(fallbackInterval);
        setIsWorkerActive(false);
      };
    }
  }, [enabled, interval, createWorker, sendHeartbeat, checkConnectionHealth]);

  // Handle visibility change - reconnect if needed when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Heartbeat] Tab became visible, checking connection");
        
        // Immediately send a heartbeat to verify connection
        sendHeartbeat();
        checkConnectionHealth();

        // If socket disconnected while in background, it should auto-reconnect
        // but we can trigger a manual reconnect if needed
        if (socket && !socket.connected) {
          console.log("[Heartbeat] Socket disconnected, attempting reconnect");
          socket.connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [socket, sendHeartbeat, checkConnectionHealth]);

  return {
    isWorkerActive,
    lastHeartbeat,
    isConnectionHealthy,
  };
}

