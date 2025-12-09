/**
 * @vitest-environment jsdom
 *
 * exportCSV.ts Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportCallLogsToCSV, type ExportOptions } from "./exportCSV";
import type { CallLogData, WorkerOutput } from "./csvWorker";

describe("exportCallLogsToCSV", () => {
  let mockWorker: {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    onmessage: ((event: MessageEvent<WorkerOutput>) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
  };

  let mockLink: HTMLAnchorElement;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };

    global.Worker = vi.fn().mockImplementation(() => mockWorker) as any;

    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
      configurable: true,
    });

    mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    } as any;

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);

    createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.fn();

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = createObjectURLSpy;
    } else {
      vi.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectURLSpy);
    }

    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = revokeObjectURLSpy;
    } else {
      vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(revokeObjectURLSpy);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createCallLog = (overrides: Partial<CallLogData> = {}): CallLogData => ({
    id: "call-123",
    created_at: "2024-01-15T10:30:00Z",
    status: "completed",
    duration_seconds: 120,
    visitor_city: "San Francisco",
    visitor_region: "California",
    visitor_country: "USA",
    page_url: "https://example.com/page",
    recording_url: "https://cdn.example.com/recording.webm",
    agent: { display_name: "John Doe" },
    disposition: { name: "Sale" },
    ...overrides,
  });

  describe("Worker initialization", () => {
    it("creates Web Worker with module type", () => {
      exportCallLogsToCSV({
        calls: [createCallLog()],
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-01-31T23:59:59Z",
      });

      expect(global.Worker).toHaveBeenCalledWith(expect.any(URL), { type: "module" });
    });

    it("sends data to worker with stripped dates", () => {
      const calls = [createCallLog()];
      exportCallLogsToCSV({
        calls,
        fromDate: "2024-01-15T14:30:00Z",
        toDate: "2024-02-28T23:59:59Z",
      });

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        calls,
        origin: "http://localhost:3000",
        fromDate: "2024-01-15",
        toDate: "2024-02-28",
      });
    });
  });

  describe("Progress handling", () => {
    it("calls onProgress callback when worker reports progress", () => {
      const onProgress = vi.fn();
      exportCallLogsToCSV({
        calls: [createCallLog()],
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-01-31T23:59:59Z",
        onProgress,
      });

      if (mockWorker.onmessage) {
        mockWorker.onmessage(new MessageEvent("message", { data: { type: "progress", progress: 50 } }));
      }

      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });

  describe("Completion handling", () => {
    it("creates blob and triggers download on completion", () => {
      const blobSpy = vi.spyOn(global, "Blob");
      exportCallLogsToCSV({
        calls: [createCallLog()],
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-01-31T23:59:59Z",
      });

      if (mockWorker.onmessage) {
        mockWorker.onmessage(new MessageEvent("message", {
          data: { type: "complete", csvContent: "Date,Time,Agent", filename: "test.csv" }
        }));
      }

      expect(blobSpy).toHaveBeenCalledWith(["Date,Time,Agent"], { type: "text/csv;charset=utf-8;" });
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("calls onError and terminates worker on error", () => {
      const onError = vi.fn();
      exportCallLogsToCSV({
        calls: [createCallLog()],
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-01-31T23:59:59Z",
        onError,
      });

      if (mockWorker.onmessage) {
        mockWorker.onmessage(new MessageEvent("message", {
          data: { type: "error", error: "Test error" }
        }));
      }

      expect(onError).toHaveBeenCalledWith("Test error");
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });
});
