// CSV Export with Web Worker
// Moves CSV generation off the main thread to prevent UI blocking

import type { CallLogData, WorkerOutput } from './csvWorker';

export interface ExportOptions {
  calls: CallLogData[];
  fromDate: string;
  toDate: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Export call logs to CSV using a Web Worker
 * This prevents UI blocking during large exports (5000+ rows)
 */
export function exportCallLogsToCSV(options: ExportOptions): void {
  const { calls, fromDate, toDate, onProgress, onComplete, onError } = options;

  try {
    // Create worker instance
    const worker = new Worker(
      new URL('./csvWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
      const { type, progress, csvContent, filename, error } = event.data;

      if (type === 'progress' && progress !== undefined) {
        // Report progress to caller
        onProgress?.(progress);
      } else if (type === 'complete' && csvContent && filename) {
        // Download the CSV file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Clean up worker
        worker.terminate();

        // Notify completion
        onComplete?.();
      } else if (type === 'error') {
        // Handle error
        worker.terminate();
        onError?.(error || 'Unknown error during CSV generation');
      }
    };

    // Handle worker errors
    worker.onerror = (event) => {
      worker.terminate();
      onError?.(event.message || 'Worker error occurred');
    };

    // Send data to worker
    worker.postMessage({
      calls,
      origin: window.location.origin,
      fromDate: fromDate.split("T")[0],
      toDate: toDate.split("T")[0],
    });
  } catch (error) {
    // Handle synchronous errors (e.g., worker creation failure)
    onError?.(error instanceof Error ? error.message : 'Failed to start export');
  }
}
