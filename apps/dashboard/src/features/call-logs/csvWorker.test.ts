/**
 * csvWorker.ts Tests - Type definitions and behavior documentation
 */
import { describe, it, expect } from "vitest";
import type { CallLogData, WorkerInput, WorkerOutput } from "./csvWorker";

describe("csvWorker", () => {
  describe("Type definitions", () => {
    it("defines CallLogData interface with all required fields", () => {
      const callLog: CallLogData = {
        id: "call-123",
        created_at: "2024-01-15T10:30:00Z",
        status: "completed",
        duration_seconds: 120,
        visitor_city: "San Francisco",
        visitor_region: "California",
        visitor_country: "USA",
        page_url: "https://example.com",
        recording_url: "https://cdn.example.com/rec.webm",
        agent: { display_name: "John Doe" },
        disposition: { name: "Sale" },
      };

      expect(callLog).toBeDefined();
      expect(callLog.id).toBe("call-123");
    });

    it("defines WorkerInput interface", () => {
      const input: WorkerInput = {
        calls: [],
        origin: "http://localhost:3000",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      expect(input.calls).toEqual([]);
    });

    it("defines WorkerOutput interface with discriminated union types", () => {
      const progressOutput: WorkerOutput = {
        type: "progress",
        progress: 50,
      };

      const completeOutput: WorkerOutput = {
        type: "complete",
        csvContent: "test",
        filename: "test.csv",
      };

      const errorOutput: WorkerOutput = {
        type: "error",
        error: "Test error",
      };

      expect(progressOutput.type).toBe("progress");
      expect(completeOutput.type).toBe("complete");
      expect(errorOutput.type).toBe("error");
    });
  });
});
