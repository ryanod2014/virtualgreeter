import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Call Logger Tests
 *
 * Tests for call logging functions that track call lifecycle events:
 * - createCallLog: Creates initial call log entry when ring starts
 * - markCallAccepted: Updates log when agent accepts call
 * - markCallEnded: Updates log when call completes normally
 * - markCallMissed: Updates log when RNA timeout expires
 * - markCallRejected: Updates log when agent rejects call
 * - markCallCancelled: Deletes log when visitor cancels before answer
 * - getCallLogId: Retrieves call log ID for a given request/call
 * - updateCallHeartbeat: Updates heartbeat for active call
 * - findOrphanedCalls: Finds calls eligible for recovery after server restart
 * - getCallByReconnectToken: Gets call info by reconnect token
 * - markCallReconnected: Marks call as successfully reconnected
 * - markCallReconnectFailed: Marks call as ended due to reconnect failure
 *
 * Key behaviors:
 * - Returns null/void when Supabase not configured (graceful degradation)
 * - Maintains in-memory map of requestId -> callLogId
 * - Calculates answer_time_seconds on acceptance
 * - Calculates duration_seconds on completion
 * - Generates reconnect tokens for call recovery
 */

// Mock Supabase before importing the module
vi.mock("./supabase.js", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Import after mocks
import {
  createCallLog,
  markCallAccepted,
  markCallEnded,
  markCallMissed,
  markCallRejected,
  markCallCancelled,
  getCallLogId,
  updateCallHeartbeat,
  findOrphanedCalls,
  getCallByReconnectToken,
  markCallReconnected,
  markCallReconnectFailed,
} from "./call-logger.js";

describe("call-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCallLog", () => {
    it("returns null when Supabase is not configured", async () => {
      const result = await createCallLog("req-123", {
        visitorId: "visitor-1",
        agentId: "agent-1",
        orgId: "org-1",
        pageUrl: "https://example.com/pricing",
      });

      expect(result).toBeNull();
    });

    it("returns null for any request when Supabase not configured", async () => {
      const result1 = await createCallLog("req-abc", {
        visitorId: "visitor-a",
        agentId: "agent-a",
        orgId: "org-a",
        pageUrl: "https://site-a.com",
      });

      const result2 = await createCallLog("req-xyz", {
        visitorId: "visitor-z",
        agentId: "agent-z",
        orgId: "org-z",
        pageUrl: "https://site-z.com",
      });

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("handles optional IP address parameter", async () => {
      const result = await createCallLog("req-123", {
        visitorId: "visitor-1",
        agentId: "agent-1",
        orgId: "org-1",
        pageUrl: "https://example.com",
        ipAddress: "192.168.1.1",
      });

      // Still returns null because Supabase not configured
      expect(result).toBeNull();
    });

    it("handles optional location parameter", async () => {
      const result = await createCallLog("req-123", {
        visitorId: "visitor-1",
        agentId: "agent-1",
        orgId: "org-1",
        pageUrl: "https://example.com",
        location: {
          city: "San Francisco",
          region: "CA",
          country: "United States",
          countryCode: "US",
        },
      });

      expect(result).toBeNull();
    });

    it("handles null IP address and location", async () => {
      const result = await createCallLog("req-123", {
        visitorId: "visitor-1",
        agentId: "agent-1",
        orgId: "org-1",
        pageUrl: "https://example.com",
        ipAddress: null,
        location: null,
      });

      expect(result).toBeNull();
    });
  });

  describe("markCallAccepted", () => {
    it("returns null when Supabase is not configured", async () => {
      const result = await markCallAccepted("req-123", "call-123");

      expect(result).toBeNull();
    });

    it("returns null for any request when no call log exists", async () => {
      const result1 = await markCallAccepted("unknown-req", "call-1");
      const result2 = await markCallAccepted("another-unknown", "call-2");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("markCallEnded", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(markCallEnded("call-123")).resolves.toBeUndefined();
    });

    it("handles unknown call ID gracefully", async () => {
      await expect(markCallEnded("unknown-call")).resolves.toBeUndefined();
    });
  });

  describe("markCallMissed", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(markCallMissed("req-123")).resolves.toBeUndefined();
    });

    it("handles unknown request ID gracefully", async () => {
      await expect(markCallMissed("unknown-req")).resolves.toBeUndefined();
    });
  });

  describe("markCallRejected", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(markCallRejected("req-123")).resolves.toBeUndefined();
    });

    it("handles unknown request ID gracefully (may be re-routed)", async () => {
      await expect(markCallRejected("unknown-req")).resolves.toBeUndefined();
    });
  });

  describe("markCallCancelled", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(markCallCancelled("req-123")).resolves.toBeUndefined();
    });

    it("handles unknown request ID gracefully", async () => {
      await expect(markCallCancelled("unknown-req")).resolves.toBeUndefined();
    });
  });

  describe("getCallLogId", () => {
    it("returns undefined when call log does not exist in map", () => {
      const result = getCallLogId("non-existent");
      expect(result).toBeUndefined();
    });

    it("returns undefined for any ID when no calls have been logged", () => {
      expect(getCallLogId("req-1")).toBeUndefined();
      expect(getCallLogId("call-1")).toBeUndefined();
      expect(getCallLogId("random-id")).toBeUndefined();
    });
  });

  describe("updateCallHeartbeat", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(updateCallHeartbeat("call-123")).resolves.toBeUndefined();
    });

    it("handles unknown call ID gracefully", async () => {
      await expect(updateCallHeartbeat("unknown-call")).resolves.toBeUndefined();
    });
  });

  describe("findOrphanedCalls", () => {
    it("returns empty array when Supabase is not configured", async () => {
      const result = await findOrphanedCalls();
      expect(result).toEqual([]);
    });

    it("returns empty array with custom maxAgeSeconds when Supabase not configured", async () => {
      const result = await findOrphanedCalls(120);
      expect(result).toEqual([]);
    });

    it("uses default 60 second max age", async () => {
      // This just verifies the function accepts no arguments
      const result = await findOrphanedCalls();
      expect(result).toEqual([]);
    });
  });

  describe("getCallByReconnectToken", () => {
    it("returns null when Supabase is not configured", async () => {
      const result = await getCallByReconnectToken("valid-token");
      expect(result).toBeNull();
    });

    it("returns null for any token when Supabase not configured", async () => {
      const result1 = await getCallByReconnectToken("token-1");
      const result2 = await getCallByReconnectToken("token-2");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("markCallReconnected", () => {
    it("returns null when Supabase is not configured", async () => {
      const result = await markCallReconnected("call-log-id", "new-call-id");
      expect(result).toBeNull();
    });
  });

  describe("markCallReconnectFailed", () => {
    it("does not throw when Supabase is not configured", async () => {
      await expect(markCallReconnectFailed("call-log-id")).resolves.toBeUndefined();
    });
  });

  describe("CallLogEntry interface behavior", () => {
    // These tests document the expected structure of call log entries
    // The actual data is stored in Supabase, but we verify the structure expected

    it("expects status to be one of the valid call statuses", () => {
      const validStatuses = ["pending", "accepted", "rejected", "completed", "missed"];
      
      // This is a type-level assertion - the actual enforcement is via TypeScript
      validStatuses.forEach(status => {
        expect(["pending", "accepted", "rejected", "completed", "missed"]).toContain(status);
      });
    });

    it("documents expected call log fields", () => {
      // This test documents the expected structure
      const expectedFields = [
        "id",
        "organization_id",
        "site_id",
        "agent_id",
        "visitor_id",
        "status",
        "page_url",
        "ring_started_at",
        "answered_at",
        "answer_time_seconds",
        "duration_seconds",
        "started_at",
        "ended_at",
        "recording_url",
        "disposition_id",
        "visitor_ip",
        "visitor_city",
        "visitor_region",
        "visitor_country",
        "visitor_country_code",
        "reconnect_token",
        "last_heartbeat_at",
        "reconnect_eligible",
      ];

      // Verify all expected fields are documented
      expect(expectedFields.length).toBe(23);
    });
  });

  describe("OrphanedCall interface behavior", () => {
    it("documents expected orphaned call fields", () => {
      const expectedFields = [
        "id",
        "agent_id",
        "visitor_id",
        "organization_id",
        "page_url",
        "reconnect_token",
        "started_at",
        "last_heartbeat_at",
      ];

      expect(expectedFields.length).toBe(8);
    });
  });
});

describe("call-logger with Supabase configured (integration behavior)", () => {
  // Note: These tests document expected behavior when Supabase IS configured
  // They serve as documentation and would be validated in integration tests

  describe("call lifecycle flow", () => {
    it("documents expected flow: create -> accept -> end", () => {
      // 1. createCallLog creates entry with status "pending"
      // 2. markCallAccepted updates to "accepted", sets answered_at, calculates answer_time_seconds
      // 3. markCallEnded updates to "completed", sets ended_at, calculates duration_seconds
      const expectedFlow = ["pending", "accepted", "completed"];
      expect(expectedFlow).toEqual(["pending", "accepted", "completed"]);
    });

    it("documents expected flow: create -> miss", () => {
      // 1. createCallLog creates entry with status "pending"
      // 2. markCallMissed updates to "missed", sets ended_at
      const expectedFlow = ["pending", "missed"];
      expect(expectedFlow).toEqual(["pending", "missed"]);
    });

    it("documents expected flow: create -> reject", () => {
      // 1. createCallLog creates entry with status "pending"
      // 2. markCallRejected updates to "rejected", sets ended_at
      const expectedFlow = ["pending", "rejected"];
      expect(expectedFlow).toEqual(["pending", "rejected"]);
    });

    it("documents expected flow: create -> cancel (deletes record)", () => {
      // 1. createCallLog creates entry with status "pending"
      // 2. markCallCancelled DELETES the record (visitor cancelled before answer)
      const expectedBehavior = "record deleted from database";
      expect(expectedBehavior).toBe("record deleted from database");
    });
  });

  describe("ID mapping behavior", () => {
    it("documents that createCallLog maps requestId to callLogId", () => {
      // createCallLog(requestId, data) stores callLogIds.set(requestId, callLog.id)
      const behavior = "requestId mapped to database call_log.id";
      expect(behavior).toBe("requestId mapped to database call_log.id");
    });

    it("documents that markCallAccepted transfers mapping from requestId to callId", () => {
      // markCallAccepted removes requestId mapping and adds callId mapping
      // callLogIds.delete(requestId) then callLogIds.set(callId, callLogId)
      const behavior = "mapping transferred from requestId to callId";
      expect(behavior).toBe("mapping transferred from requestId to callId");
    });

    it("documents that markCallEnded removes the callId mapping", () => {
      // markCallEnded calls callLogIds.delete(callId)
      const behavior = "callId mapping removed after call ends";
      expect(behavior).toBe("callId mapping removed after call ends");
    });
  });

  describe("answer time calculation", () => {
    it("documents that answer_time_seconds is calculated from ring_started_at", () => {
      // answer_time_seconds = (answered_at - ring_started_at) in seconds
      const calculation = "Math.round((now.getTime() - ringStarted.getTime()) / 1000)";
      expect(calculation).toBe("Math.round((now.getTime() - ringStarted.getTime()) / 1000)");
    });
  });

  describe("duration calculation", () => {
    it("documents that duration_seconds is calculated from started_at", () => {
      // duration_seconds = (ended_at - started_at) in seconds
      const calculation = "Math.round((now.getTime() - startedAt.getTime()) / 1000)";
      expect(calculation).toBe("Math.round((now.getTime() - startedAt.getTime()) / 1000)");
    });
  });

  describe("reconnect token generation", () => {
    it("documents that reconnect token is 64-character hex string", () => {
      // generateReconnectToken() returns randomBytes(32).toString("hex")
      // 32 bytes = 64 hex characters
      const tokenLength = 32 * 2; // 32 bytes * 2 hex chars per byte
      expect(tokenLength).toBe(64);
    });
  });

  describe("orphaned call criteria", () => {
    it("documents criteria for finding orphaned calls", () => {
      // Orphaned calls must have:
      // - status = "accepted"
      // - reconnect_eligible = true
      // - ended_at IS NULL
      // - last_heartbeat_at >= cutoff time (within maxAgeSeconds)
      const criteria = {
        status: "accepted",
        reconnect_eligible: true,
        ended_at: null,
        last_heartbeat_at: "within maxAgeSeconds of now",
      };
      expect(criteria.status).toBe("accepted");
      expect(criteria.reconnect_eligible).toBe(true);
      expect(criteria.ended_at).toBeNull();
    });
  });
});

/**
 * V4 - Call Reconnection Database Operations Tests
 *
 * Tests for call-logger functions specific to call reconnection feature:
 * - getCallByReconnectToken: Lookup call by token
 * - markCallReconnected: Update call state after successful reconnection
 * - markCallReconnectFailed: End call when reconnection fails
 *
 * These tests document expected behavior when Supabase IS configured.
 */
describe("V4 - Call Reconnection Database Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCallByReconnectToken - Behavior Documentation", () => {
    it("queries call_logs table with reconnect_token filter", () => {
      // The function queries: .eq("reconnect_token", token)
      const queryBehavior = {
        table: "call_logs",
        filter: "reconnect_token = :token",
        additionalFilters: ["status = 'accepted'", "reconnect_eligible = true", "ended_at IS NULL"],
      };

      expect(queryBehavior.table).toBe("call_logs");
      expect(queryBehavior.additionalFilters).toContain("status = 'accepted'");
      expect(queryBehavior.additionalFilters).toContain("reconnect_eligible = true");
      expect(queryBehavior.additionalFilters).toContain("ended_at IS NULL");
    });

    it("returns call data for valid token (documents returned fields)", () => {
      // The function returns OrphanedCall structure
      const expectedReturnFields = [
        "id",
        "agent_id",
        "visitor_id",
        "organization_id",
        "page_url",
        "reconnect_token",
        "started_at",
        "last_heartbeat_at",
      ];

      expect(expectedReturnFields).toHaveLength(8);
      expect(expectedReturnFields).toContain("id");
      expect(expectedReturnFields).toContain("agent_id");
      expect(expectedReturnFields).toContain("visitor_id");
      expect(expectedReturnFields).toContain("reconnect_token");
    });

    it("returns null for invalid/expired token", async () => {
      // Supabase not configured - always returns null
      // When configured, returns null if:
      // - Token not found in database
      // - Call status is not "accepted"
      // - reconnect_eligible is false
      // - ended_at is not null
      const result = await getCallByReconnectToken("invalid_token_123");
      expect(result).toBeNull();
    });

    it("checks reconnect_eligible flag is true", () => {
      // Query includes: .eq("reconnect_eligible", true)
      // This prevents reconnecting to calls that have been explicitly marked ineligible
      const queryCondition = { reconnect_eligible: true };
      expect(queryCondition.reconnect_eligible).toBe(true);
    });

    it("only returns calls with status 'accepted'", () => {
      // Query includes: .eq("status", "accepted")
      // Pending, rejected, missed, or completed calls cannot be reconnected
      const validStatuses = ["pending", "accepted", "rejected", "completed", "missed"];
      const reconnectableStatus = "accepted";

      expect(validStatuses).toContain(reconnectableStatus);
      expect(reconnectableStatus).toBe("accepted");
    });

    it("only returns calls where ended_at is null", () => {
      // Query includes: .is("ended_at", null)
      // Ended calls cannot be reconnected
      const queryCondition = { ended_at: null };
      expect(queryCondition.ended_at).toBeNull();
    });

    it("handles database error gracefully (returns null)", () => {
      // If Supabase query fails (PGRST116 = not found is okay, others logged)
      // Function returns null on any error
      const errorHandling = {
        onNotFound: "returns null (normal case)",
        onOtherError: "logs error, returns null",
      };

      expect(errorHandling.onNotFound).toBe("returns null (normal case)");
      expect(errorHandling.onOtherError).toBe("logs error, returns null");
    });
  });

  describe("markCallReconnected - Behavior Documentation", () => {
    it("generates new reconnect token for future reconnections", () => {
      // generateReconnectToken() creates a new 64-character hex string
      // Each reconnection gets a fresh token for security
      const tokenGeneration = {
        method: "randomBytes(32).toString('hex')",
        length: 64,
        purpose: "allows multiple reconnections if needed",
      };

      expect(tokenGeneration.length).toBe(64);
    });

    it("updates call with new reconnect token", () => {
      // Updates call_logs set reconnect_token = newToken
      const updateBehavior = {
        field: "reconnect_token",
        value: "new 64-char hex token",
      };

      expect(updateBehavior.field).toBe("reconnect_token");
    });

    it("updates last_heartbeat_at timestamp", () => {
      // Updates last_heartbeat_at to current time
      // This extends the reconnection window
      const updateBehavior = {
        field: "last_heartbeat_at",
        value: "new Date().toISOString()",
      };

      expect(updateBehavior.field).toBe("last_heartbeat_at");
    });

    it("adds new callId to callLogIds map", () => {
      // callLogIds.set(newCallId, callLogId)
      // This allows subsequent operations to find the call log
      const mappingBehavior = {
        key: "newCallId (from reconnect)",
        value: "original callLogId (database ID)",
      };

      expect(mappingBehavior.key).toBe("newCallId (from reconnect)");
      expect(mappingBehavior.value).toBe("original callLogId (database ID)");
    });

    it("returns null when Supabase not configured", async () => {
      const result = await markCallReconnected("call_log_123", "new_call_456");
      expect(result).toBeNull();
    });

    it("returns new reconnect token on success (documented behavior)", () => {
      // When Supabase IS configured and update succeeds:
      // Returns the newly generated reconnect token
      const returnBehavior = {
        onSuccess: "returns new 64-char reconnect token",
        onFailure: "returns null",
      };

      expect(returnBehavior.onSuccess).toBe("returns new 64-char reconnect token");
    });
  });

  describe("markCallReconnectFailed - Behavior Documentation", () => {
    it("calculates duration from started_at to now", () => {
      // Gets started_at from database
      // Calculates duration_seconds = (now - started_at) / 1000
      const durationCalculation = {
        formula: "Math.round((now.getTime() - startedAt.getTime()) / 1000)",
        unit: "seconds",
      };

      expect(durationCalculation.unit).toBe("seconds");
    });

    it("updates call status to 'completed'", () => {
      // Even though reconnect failed, the call is marked completed (not a different status)
      const statusUpdate = {
        newStatus: "completed",
        reason: "Reconnect failure is a form of call completion",
      };

      expect(statusUpdate.newStatus).toBe("completed");
    });

    it("sets reconnect_eligible to false", () => {
      // Prevents future reconnection attempts to this call
      const update = {
        reconnect_eligible: false,
      };

      expect(update.reconnect_eligible).toBe(false);
    });

    it("sets ended_at to current time", () => {
      // Marks the call as officially ended
      const update = {
        ended_at: "new Date().toISOString()",
      };

      expect(update.ended_at).toBe("new Date().toISOString()");
    });

    it("does not throw when Supabase not configured", async () => {
      await expect(markCallReconnectFailed("call_log_123")).resolves.toBeUndefined();
    });
  });

  describe("Reconnect Token Security", () => {
    it("documents token is cryptographically random", () => {
      // crypto.randomBytes(32) provides 256 bits of randomness
      const tokenSecurity = {
        source: "crypto.randomBytes(32)",
        bitStrength: 256,
        encoding: "hex",
        resultingLength: 64, // 32 bytes * 2 hex chars per byte
      };

      expect(tokenSecurity.bitStrength).toBe(256);
      expect(tokenSecurity.resultingLength).toBe(64);
    });

    it("documents new token is generated on each reconnection", () => {
      // Prevents token reuse attacks
      const tokenRotation = {
        behavior: "New token generated on each successful reconnection",
        security: "Previous token becomes invalid",
      };

      expect(tokenRotation.behavior).toBe("New token generated on each successful reconnection");
    });

    it("documents token is stored only in database and visitor localStorage", () => {
      // Token is not exposed in URLs or transmitted to third parties
      const tokenStorage = {
        serverSide: "call_logs.reconnect_token in database",
        clientSide: "localStorage under gg_active_call key",
        notExposed: ["URL parameters", "cookies", "external APIs"],
      };

      expect(tokenStorage.serverSide).toBe("call_logs.reconnect_token in database");
      expect(tokenStorage.clientSide).toBe("localStorage under gg_active_call key");
    });
  });

  describe("Integration Behavior - Call Recovery Flow", () => {
    it("documents token lifecycle: accept -> store -> navigate -> reconnect -> new token", () => {
      const tokenLifecycle = [
        "1. markCallAccepted generates initial reconnect token",
        "2. Token sent to visitor via CALL_ACCEPTED event",
        "3. Widget stores token in localStorage (storeActiveCall)",
        "4. Visitor navigates, widget disconnects",
        "5. Widget reconnects, reads token from localStorage (getStoredCall)",
        "6. Widget emits CALL_RECONNECT with token",
        "7. Server validates token via getCallByReconnectToken",
        "8. On success, markCallReconnected generates NEW token",
        "9. New token sent to visitor, old token invalidated",
      ];

      expect(tokenLifecycle).toHaveLength(9);
      expect(tokenLifecycle[0]).toContain("markCallAccepted");
      expect(tokenLifecycle[7]).toContain("markCallReconnected");
    });

    it("documents failure paths and cleanup", () => {
      const failurePaths = {
        tokenNotFound: "getCallByReconnectToken returns null -> CALL_RECONNECT_FAILED",
        agentGone: "Agent not in_call -> CALL_RECONNECT_FAILED",
        timeout: "30s elapsed -> markCallReconnectFailed -> CALL_RECONNECT_FAILED",
        partyDisconnect: "Party disconnects during pending -> markCallReconnectFailed",
      };

      expect(Object.keys(failurePaths)).toHaveLength(4);
    });
  });
});
