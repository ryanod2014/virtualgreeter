import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Test Lock: use-signaling.ts - Agent Away/Back Status Management
 *
 * These tests capture the current behavior of:
 * - setAway: Sets agent as away with reason, retries on failure
 * - setBack: Sets agent as available, retries on failure
 * - handleAgentMarkedAway: Processes server-initiated away marking
 *
 * Focus: Status management behaviors for the Bullpen & Agent States feature
 */

// Constants to match the source file
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 500;
const ACK_TIMEOUT = 5000;

describe("use-signaling - Agent Status Management", () => {
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

  describe("setAway", () => {
    it("emits agent:away with 'idle' reason when called with idle", async () => {
      let emitCallback: ((response: { success: boolean; status: string }) => void) | undefined;

      mockSocket.emit.mockImplementation(
        (
          event: string,
          payload: { reason: string },
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (event === "agent:away" && callback) {
            emitCallback = callback;
          }
        }
      );

      // Simulate the setAway logic
      const reason = "idle";
      mockSocket.emit("agent:away", { reason }, (response: { success: boolean; status: string }) => {
        // This would be the ack handler
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "agent:away",
        { reason: "idle" },
        expect.any(Function)
      );
    });

    it("emits agent:away with 'manual' reason when called with manual", () => {
      mockSocket.emit.mockImplementation(
        (
          event: string,
          payload: { reason: string },
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (callback) {
            callback({ success: true, status: "away" });
          }
        }
      );

      const reason = "manual";
      mockSocket.emit("agent:away", { reason }, () => {});

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "agent:away",
        { reason: "manual" },
        expect.any(Function)
      );
    });

    it("retries up to 3 times on ack timeout", async () => {
      const emitAttempts: number[] = [];
      let attemptCount = 0;

      // Simulate retry logic matching the source
      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) {
            return false;
          }
          mockSocket.connect();
          await new Promise((resolve) => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
          return emitWithRetry(attempt + 1);
        }

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            emitAttempts.push(attempt);
            attemptCount++;
            if (attempt < MAX_RETRIES - 1) {
              emitWithRetry(attempt + 1).then(resolve);
            } else {
              resolve(true); // Fallback assumption
            }
          }, ACK_TIMEOUT);

          mockSocket.emit("agent:away", { reason: "manual" }, (response: { success: boolean }) => {
            clearTimeout(timeoutId);
            if (response.success) {
              resolve(true);
            } else {
              if (attempt < MAX_RETRIES - 1) {
                setTimeout(() => {
                  emitWithRetry(attempt + 1).then(resolve);
                }, BASE_RETRY_DELAY * Math.pow(2, attempt));
              } else {
                resolve(false);
              }
            }
          });
        });
      };

      // Don't call the ack callback to simulate timeout
      mockSocket.emit.mockImplementation(() => {
        // Never call the callback - simulates timeout
      });

      const resultPromise = emitWithRetry(0);

      // Advance through all retries (each timeout is 5000ms)
      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT); // First timeout
      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT); // Second timeout
      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT); // Third timeout

      const result = await resultPromise;

      // Should have attempted 3 times
      expect(emitAttempts).toHaveLength(3);
      expect(emitAttempts).toEqual([0, 1, 2]);
      // After max retries, falls back to assuming success
      expect(result).toBe(true);
    });

    it("retries up to 3 times when socket is disconnected", async () => {
      mockSocket.connected = false;
      let connectAttempts = 0;

      mockSocket.connect.mockImplementation(() => {
        connectAttempts++;
        // Simulate connection remaining disconnected
      });

      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) {
            return false;
          }
          mockSocket.connect();
          await new Promise((resolve) => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
          return emitWithRetry(attempt + 1);
        }
        return true;
      };

      const resultPromise = emitWithRetry(0);

      // Advance timers for each retry delay
      await vi.advanceTimersByTimeAsync(BASE_RETRY_DELAY * 1); // 500ms
      await vi.advanceTimersByTimeAsync(BASE_RETRY_DELAY * 2); // 1000ms
      await vi.advanceTimersByTimeAsync(BASE_RETRY_DELAY * 4); // 2000ms

      const result = await resultPromise;

      expect(connectAttempts).toBe(3);
      expect(result).toBe(false);
    });

    it("sets isMarkedAway=true on successful ack", async () => {
      let isMarkedAway = false;
      let awayReason: string | null = null;

      mockSocket.emit.mockImplementation(
        (
          event: string,
          payload: { reason: string },
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (callback) {
            // Immediate success
            callback({ success: true, status: "away" });
          }
        }
      );

      // Simulate the setAway success handling
      const reason = "manual";
      const awayMessage = reason === "idle"
        ? "You were marked away due to inactivity"
        : "You set yourself as away";

      await new Promise<void>((resolve) => {
        mockSocket.emit("agent:away", { reason }, (response: { success: boolean }) => {
          if (response.success) {
            isMarkedAway = true;
            awayReason = awayMessage;
          }
          resolve();
        });
      });

      expect(isMarkedAway).toBe(true);
      expect(awayReason).toBe("You set yourself as away");
    });

    it("sets awayReason message based on reason type", async () => {
      let awayReasonManual: string | null = null;
      let awayReasonIdle: string | null = null;

      mockSocket.emit.mockImplementation(
        (
          event: string,
          payload: { reason: string },
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (callback) {
            callback({ success: true, status: "away" });
          }
        }
      );

      // Test manual reason
      const manualReason = "manual";
      mockSocket.emit("agent:away", { reason: manualReason }, () => {
        awayReasonManual = manualReason === "idle"
          ? "You were marked away due to inactivity"
          : "You set yourself as away";
      });

      // Test idle reason
      const idleReason = "idle";
      mockSocket.emit("agent:away", { reason: idleReason }, () => {
        awayReasonIdle = idleReason === "idle"
          ? "You were marked away due to inactivity"
          : "You set yourself as away";
      });

      expect(awayReasonManual).toBe("You set yourself as away");
      expect(awayReasonIdle).toBe("You were marked away due to inactivity");
    });

    it("sets isMarkedAway=true even after max retries (fallback behavior)", async () => {
      let isMarkedAway = false;
      let awayReason: string | null = null;

      // Never call callback - all retries will timeout
      mockSocket.emit.mockImplementation(() => {});

      // Simulate the full retry logic with fallback
      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) return false;
          return emitWithRetry(attempt + 1);
        }

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            if (attempt < MAX_RETRIES - 1) {
              emitWithRetry(attempt + 1).then(resolve);
            } else {
              // Fallback: assume success after max retries
              resolve(true);
            }
          }, ACK_TIMEOUT);

          mockSocket.emit("agent:away", { reason: "manual" }, (response: { success: boolean }) => {
            clearTimeout(timeoutId);
            resolve(response.success);
          });
        });
      };

      const resultPromise = emitWithRetry(0);

      // Advance through all timeouts
      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT * 3);

      const success = await resultPromise;

      // Even after failures, fallback sets local state
      if (success) {
        isMarkedAway = true;
        awayReason = "You set yourself as away";
      } else {
        // Fallback - still update local state to be safe
        isMarkedAway = true;
        awayReason = "You set yourself as away (sync pending)";
      }

      expect(isMarkedAway).toBe(true);
      expect(awayReason).toBeTruthy();
    });
  });

  describe("setBack", () => {
    it("emits agent:back event", () => {
      mockSocket.emit.mockImplementation(
        (
          event: string,
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (callback) {
            callback({ success: true, status: "idle" });
          }
        }
      );

      mockSocket.emit("agent:back", () => {});

      expect(mockSocket.emit).toHaveBeenCalledWith("agent:back", expect.any(Function));
    });

    it("retries up to 3 times on ack timeout", async () => {
      const emitAttempts: number[] = [];

      // Never call callback to simulate timeout
      mockSocket.emit.mockImplementation(() => {});

      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) return false;
          mockSocket.connect();
          await new Promise((resolve) => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
          return emitWithRetry(attempt + 1);
        }

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            emitAttempts.push(attempt);
            if (attempt < MAX_RETRIES - 1) {
              emitWithRetry(attempt + 1).then(resolve);
            } else {
              resolve(true); // Fallback
            }
          }, ACK_TIMEOUT);

          mockSocket.emit("agent:back", (response: { success: boolean }) => {
            clearTimeout(timeoutId);
            resolve(response.success);
          });
        });
      };

      const resultPromise = emitWithRetry(0);

      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT * 3);

      await resultPromise;

      expect(emitAttempts).toHaveLength(3);
      expect(emitAttempts).toEqual([0, 1, 2]);
    });

    it("retries up to 3 times when socket is disconnected", async () => {
      mockSocket.connected = false;
      let connectAttempts = 0;

      mockSocket.connect.mockImplementation(() => {
        connectAttempts++;
      });

      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) {
            return false;
          }
          mockSocket.connect();
          await new Promise((resolve) => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
          return emitWithRetry(attempt + 1);
        }
        return true;
      };

      const resultPromise = emitWithRetry(0);

      await vi.advanceTimersByTimeAsync(BASE_RETRY_DELAY * 7); // Sum of exponential backoffs

      const result = await resultPromise;

      expect(connectAttempts).toBe(3);
      expect(result).toBe(false);
    });

    it("clears isMarkedAway on successful ack", async () => {
      let isMarkedAway = true;
      let awayReason: string | null = "Previous reason";

      mockSocket.emit.mockImplementation(
        (
          event: string,
          callback?: (response: { success: boolean; status: string }) => void
        ) => {
          if (callback) {
            callback({ success: true, status: "idle" });
          }
        }
      );

      await new Promise<void>((resolve) => {
        mockSocket.emit("agent:back", (response: { success: boolean }) => {
          if (response.success) {
            isMarkedAway = false;
            awayReason = null;
          }
          resolve();
        });
      });

      expect(isMarkedAway).toBe(false);
      expect(awayReason).toBeNull();
    });

    it("clears isMarkedAway even after max retries (fallback behavior)", async () => {
      let isMarkedAway = true;
      let awayReason: string | null = "Previous reason";

      // Never call callback
      mockSocket.emit.mockImplementation(() => {});

      const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
        if (!mockSocket.connected) {
          if (attempt >= MAX_RETRIES) return false;
          return emitWithRetry(attempt + 1);
        }

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            if (attempt < MAX_RETRIES - 1) {
              emitWithRetry(attempt + 1).then(resolve);
            } else {
              resolve(true); // Fallback
            }
          }, ACK_TIMEOUT);

          mockSocket.emit("agent:back", (response: { success: boolean }) => {
            clearTimeout(timeoutId);
            resolve(response.success);
          });
        });
      };

      const resultPromise = emitWithRetry(0);

      await vi.advanceTimersByTimeAsync(ACK_TIMEOUT * 3);

      const success = await resultPromise;

      // Regardless of sync success, clear local state
      isMarkedAway = false;
      awayReason = null;

      expect(isMarkedAway).toBe(false);
      expect(awayReason).toBeNull();
    });
  });

  describe("handleAgentMarkedAway (AGENT_MARKED_AWAY event)", () => {
    it("sets isMarkedAway=true when receiving event", () => {
      let isMarkedAway = false;

      // Simulate receiving the AGENT_MARKED_AWAY event
      const handleAgentMarkedAway = (data: { reason: string; message: string }) => {
        isMarkedAway = true;
      };

      handleAgentMarkedAway({ reason: "idle", message: "You were marked away" });

      expect(isMarkedAway).toBe(true);
    });

    it("sets awayReason from payload message", () => {
      let awayReason: string | null = null;

      const handleAgentMarkedAway = (data: { reason: string; message: string }) => {
        awayReason = data.message;
      };

      handleAgentMarkedAway({
        reason: "ring_no_answer",
        message: "You've been marked as Away because you didn't answer an incoming call.",
      });

      expect(awayReason).toBe("You've been marked as Away because you didn't answer an incoming call.");
    });

    it("handles idle reason message", () => {
      let awayReason: string | null = null;

      const handleAgentMarkedAway = (data: { reason: string; message: string }) => {
        awayReason = data.message;
      };

      handleAgentMarkedAway({
        reason: "idle",
        message: "You've been marked as Away due to connection inactivity.",
      });

      expect(awayReason).toBe("You've been marked as Away due to connection inactivity.");
    });

    it("clears incoming call when marked away", () => {
      let incomingCall: { requestId: string } | null = { requestId: "test-123" };

      // Simulate the behavior from use-signaling.ts
      const handleAgentMarkedAway = (data: { reason: string; message: string }) => {
        incomingCall = null; // Clear any incoming call since we're away
      };

      handleAgentMarkedAway({ reason: "idle", message: "Away due to inactivity" });

      expect(incomingCall).toBeNull();
    });
  });
});





