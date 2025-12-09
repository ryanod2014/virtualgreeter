// Web Worker for CSV generation
// This runs off the main thread to prevent UI blocking during large exports

export interface CallLogData {
  id: string;
  created_at: string;
  status: string;
  duration_seconds: number | null;
  visitor_city: string | null;
  visitor_region: string | null;
  visitor_country: string | null;
  page_url: string | null;
  recording_url: string | null;
  agent?: {
    display_name: string;
  } | null;
  disposition?: {
    name: string;
  } | null;
}

export interface WorkerInput {
  calls: CallLogData[];
  origin: string;
  fromDate: string;
  toDate: string;
}

export interface WorkerOutput {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  csvContent?: string;
  filename?: string;
  error?: string;
}

// Escape CSV values that contain special characters
function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Format a single call log row
function formatCallRow(call: CallLogData, origin: string): string[] {
  const date = new Date(call.created_at);
  const recordingLink = call.recording_url
    ? `${origin}/admin/calls?callId=${call.id}&autoplay=true`
    : "";

  return [
    date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    call.agent?.display_name ?? "",
    call.status,
    call.duration_seconds?.toString() ?? "",
    call.visitor_city ?? "",
    call.visitor_region ?? "",
    call.visitor_country ?? "",
    call.page_url ?? "",
    call.disposition?.name ?? "",
    recordingLink,
  ];
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  try {
    const { calls, origin, fromDate, toDate } = event.data;

    // Define CSV headers
    const headers = [
      "Date",
      "Time",
      "Agent",
      "Status",
      "Duration (seconds)",
      "City",
      "Region",
      "Country",
      "Page URL",
      "Disposition",
      "Recording",
    ];

    // Process rows in batches to report progress
    const batchSize = 100;
    const rows: string[] = [];

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      const rowData = formatCallRow(call, origin);
      rows.push(rowData.map(escapeCSV).join(","));

      // Report progress every batch
      if ((i + 1) % batchSize === 0 || i === calls.length - 1) {
        const progress = Math.round(((i + 1) / calls.length) * 100);
        self.postMessage({
          type: 'progress',
          progress,
        } as WorkerOutput);
      }
    }

    // Build final CSV content
    const csvContent = [headers.join(","), ...rows].join("\n");
    const filename = `call-logs_${fromDate}_to_${toDate}.csv`;

    // Send completion message
    self.postMessage({
      type: 'complete',
      csvContent,
      filename,
    } as WorkerOutput);
  } catch (error) {
    // Send error message
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerOutput);
  }
};
