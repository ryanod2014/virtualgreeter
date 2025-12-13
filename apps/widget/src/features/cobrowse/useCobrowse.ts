import { useEffect, useRef, useCallback } from "preact/hooks";
import type { Socket } from "socket.io-client";
import type { ServerToWidgetEvents, WidgetToServerEvents } from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { COBROWSE_TIMING } from "../../constants";

interface UseCobrowseOptions {
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
  isInCall: boolean;
}

/**
 * Compress HTML string using gzip compression
 * Falls back to uncompressed if CompressionStream is not available
 */
async function compressHTML(html: string): Promise<{ compressed: string; isCompressed: boolean; originalSize: number; compressedSize: number }> {
  const originalSize = new Blob([html]).size;

  // Check if CompressionStream is available (modern browsers)
  if (typeof CompressionStream === 'undefined') {
    console.warn('[Cobrowse] CompressionStream not available, sending uncompressed');
    return {
      compressed: html,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  try {
    // Create a blob from the HTML string
    const blob = new Blob([html]);
    const stream = blob.stream();

    // Compress using gzip
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));

    // Convert compressed stream to base64 string for transmission
    const compressedBlob = await new Response(compressedStream).blob();
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]!);
    }
    const compressed = btoa(binary);

    const compressedSize = new Blob([compressed]).size;

    return {
      compressed,
      isCompressed: true,
      originalSize,
      compressedSize,
    };
  } catch (err) {
    console.error('[Cobrowse] Compression failed, sending uncompressed:', err);
    return {
      compressed: html,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }
}

/**
 * useCobrowse - Captures DOM, mouse position, and scroll for co-browsing
 *
 * When in a call, this hook streams the visitor's screen to the agent:
 * - DOM snapshots (initial + on significant changes)
 * - Mouse position (throttled)
 * - Scroll position (throttled)
 *
 * All event listeners are properly cleaned up to prevent memory leaks.
 */
export function useCobrowse({ socket, isInCall }: UseCobrowseOptions): void {
  const lastSnapshotRef = useRef<string>("");
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseThrottleRef = useRef<number>(0);
  const scrollThrottleRef = useRef<number>(0);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const isActiveRef = useRef(false);

  // Store socket ref to avoid stale closures in event handlers
  const socketRef = useRef(socket);
  socketRef.current = socket;

  /**
   * Capture DOM snapshot and send to agent
   */
  const captureSnapshot = useCallback(async () => {
    if (!socketRef.current || !isActiveRef.current) return;

    try {
      // Clone the document to avoid modifying the original
      const docClone = document.cloneNode(true) as Document;

      // Remove the widget itself from the snapshot
      const widgetElement = docClone.getElementById("ghost-greeter-widget");
      widgetElement?.remove();

      // Remove scripts to prevent execution in the agent's view
      const scripts = docClone.querySelectorAll("script");
      scripts.forEach((script) => script.remove());

      // Convert relative URLs to absolute for images, stylesheets, etc.
      const baseUrl = window.location.origin;

      // Fix image sources
      docClone.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src");
        if (src && !src.startsWith("http") && !src.startsWith("data:")) {
          try {
            img.setAttribute("src", new URL(src, baseUrl).href);
          } catch {
            // Invalid URL, leave as-is
          }
        }
      });

      // Fix stylesheet links
      docClone.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("http")) {
          try {
            link.setAttribute("href", new URL(href, baseUrl).href);
          } catch {
            // Invalid URL, leave as-is
          }
        }
      });

      // Fix background images in inline styles
      docClone.querySelectorAll("[style]").forEach((el) => {
        const style = el.getAttribute("style");
        if (style && style.includes("url(")) {
          const fixedStyle = style.replace(
            /url\(['"]?(?!data:)(?!http)([^'")\s]+)['"]?\)/g,
            (_match, url) => {
              try {
                return `url(${new URL(url, baseUrl).href})`;
              } catch {
                return _match;
              }
            }
          );
          el.setAttribute("style", fixedStyle);
        }
      });

      // Serialize to HTML
      const html = docClone.documentElement.outerHTML;

      // Only send if changed significantly (simple length check + prefix hash)
      const snapshotKey = `${html.length}-${html.slice(0, 500)}`;
      if (snapshotKey === lastSnapshotRef.current) {
        return;
      }
      lastSnapshotRef.current = snapshotKey;

      // Compress the HTML
      const { compressed, isCompressed, originalSize, compressedSize } = await compressHTML(html);

      // Log if DOM is large (>500KB uncompressed)
      if (originalSize > 500 * 1024) {
        console.warn('[Cobrowse] Large DOM detected:', {
          originalSize: `${Math.round(originalSize / 1024)}KB`,
          compressedSize: `${Math.round(compressedSize / 1024)}KB`,
          compressionRatio: `${Math.round((1 - compressedSize / originalSize) * 100)}%`,
          url: window.location.href,
        });
      }

      const payload = {
        html: compressed,
        isCompressed,
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: Date.now(),
      };

      socketRef.current.emit(SOCKET_EVENTS.COBROWSE_SNAPSHOT, payload);
    } catch (err) {
      console.error("[Cobrowse] Failed to capture snapshot:", err);
    }
  }, []);

  /**
   * Send mouse position (throttled to reduce bandwidth)
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!socketRef.current || !isActiveRef.current) return;

    const now = Date.now();
    if (now - mouseThrottleRef.current < COBROWSE_TIMING.MOUSE_THROTTLE) return;
    mouseThrottleRef.current = now;

    socketRef.current.emit(SOCKET_EVENTS.COBROWSE_MOUSE, {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
    });
  }, []);

  /**
   * Send scroll position (throttled)
   */
  const handleScroll = useCallback(() => {
    if (!socketRef.current || !isActiveRef.current) return;

    const now = Date.now();
    if (now - scrollThrottleRef.current < COBROWSE_TIMING.SCROLL_THROTTLE) return;
    scrollThrottleRef.current = now;

    socketRef.current.emit(SOCKET_EVENTS.COBROWSE_SCROLL, {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: now,
    });
  }, []);

  /**
   * Send text selection
   */
  const handleSelection = useCallback(() => {
    if (!socketRef.current || !isActiveRef.current) return;

    const selection = window.getSelection();
    const text = selection?.toString() || "";

    let rect = null;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const boundingRect = range.getBoundingClientRect();
      if (boundingRect.width > 0 && boundingRect.height > 0) {
        rect = {
          x: boundingRect.x,
          y: boundingRect.y,
          width: boundingRect.width,
          height: boundingRect.height,
        };
      }
    }

    socketRef.current.emit(SOCKET_EVENTS.COBROWSE_SELECTION, {
      text,
      rect,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Handle form input changes
   */
  const handleInput = useCallback(() => {
    if (!isActiveRef.current) return;
    
    // Delay snapshot to capture the change
    setTimeout(captureSnapshot, COBROWSE_TIMING.INPUT_CAPTURE_DELAY);
  }, [captureSnapshot]);

  /**
   * Handle window resize
   */
  const handleResize = useCallback(() => {
    if (!isActiveRef.current) return;
    
    // Delay snapshot to let layout complete
    setTimeout(captureSnapshot, COBROWSE_TIMING.RESIZE_CAPTURE_DELAY);
  }, [captureSnapshot]);

  /**
   * Clean up all listeners and intervals
   */
  const cleanup = useCallback(() => {
    isActiveRef.current = false;

    // Clear snapshot interval
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }

    // Disconnect mutation observer
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
      mutationObserverRef.current = null;
    }

    // Remove event listeners (these are named function refs so safe to remove)
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("selectionchange", handleSelection);
    document.removeEventListener("input", handleInput);
    document.removeEventListener("change", handleInput);
  }, [handleMouseMove, handleScroll, handleResize, handleSelection, handleInput]);

  // Start/stop co-browsing based on call state
  useEffect(() => {
    if (!socket || !isInCall) {
      cleanup();
      return;
    }

    isActiveRef.current = true;

    // Send initial snapshot
    captureSnapshot();

    // Set up periodic snapshot capture
    snapshotIntervalRef.current = setInterval(captureSnapshot, COBROWSE_TIMING.SNAPSHOT_INTERVAL);

    // Set up DOM mutation observer for immediate updates on significant changes
    mutationObserverRef.current = new MutationObserver((mutations) => {
      if (!isActiveRef.current) return;

      // Only trigger snapshot for significant changes
      const hasSignificantChange = mutations.some((mutation) => {
        // Ignore text-only changes and attribute changes on small elements
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          return true;
        }
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "style")
        ) {
          return true;
        }
        return false;
      });

      if (hasSignificantChange) {
        captureSnapshot();
      }
    });

    mutationObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "src", "href"],
    });

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("selectionchange", handleSelection, { passive: true });
    document.addEventListener("input", handleInput, { passive: true });
    document.addEventListener("change", handleInput, { passive: true });

    // Cleanup on effect change or unmount
    return cleanup;
  }, [socket, isInCall, captureSnapshot, handleMouseMove, handleScroll, handleResize, handleSelection, handleInput, cleanup]);
}
