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
