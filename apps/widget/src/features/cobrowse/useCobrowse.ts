import { useEffect, useRef, useCallback } from "preact/hooks";
import type { Socket } from "socket.io-client";
import type { ServerToWidgetEvents, WidgetToServerEvents } from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

interface UseCobrowseOptions {
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
  isInCall: boolean;
}

/**
 * useCobrowse - Captures DOM, mouse position, and scroll for co-browsing
 * 
 * When in a call, this hook streams the visitor's screen to the agent:
 * - DOM snapshots (initial + on significant changes)
 * - Mouse position (throttled)
 * - Scroll position (throttled)
 */
export function useCobrowse({ socket, isInCall }: UseCobrowseOptions) {
  const lastSnapshotRef = useRef<string>("");
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseThrottleRef = useRef<number>(0);
  const scrollThrottleRef = useRef<number>(0);

  // Capture DOM snapshot
  const captureSnapshot = useCallback(() => {
    if (!socket || !isInCall) return;

    try {
      // Clone the document to avoid modifying the original
      const docClone = document.cloneNode(true) as Document;
      
      // Remove the widget itself from the snapshot
      const widgetElement = docClone.getElementById("ghost-greeter-widget");
      if (widgetElement) {
        widgetElement.remove();
      }

      // Remove scripts to prevent execution in the agent's view
      const scripts = docClone.querySelectorAll("script");
      scripts.forEach(script => script.remove());

      // Convert relative URLs to absolute for images, stylesheets, etc.
      const baseUrl = window.location.origin;
      
      // Fix image sources
      docClone.querySelectorAll("img").forEach(img => {
        const src = img.getAttribute("src");
        if (src && !src.startsWith("http") && !src.startsWith("data:")) {
          img.setAttribute("src", new URL(src, baseUrl).href);
        }
      });

      // Fix stylesheet links
      docClone.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("http")) {
          link.setAttribute("href", new URL(href, baseUrl).href);
        }
      });

      // Fix background images in inline styles
      docClone.querySelectorAll("[style]").forEach(el => {
        const style = el.getAttribute("style");
        if (style && style.includes("url(")) {
          const fixedStyle = style.replace(/url\(['"]?(?!data:)(?!http)([^'")\s]+)['"]?\)/g, (match, url) => {
            return `url(${new URL(url, baseUrl).href})`;
          });
          el.setAttribute("style", fixedStyle);
        }
      });

      // Serialize to HTML
      const html = docClone.documentElement.outerHTML;

      // Only send if changed significantly (simple length check + hash)
      const snapshotKey = `${html.length}-${html.slice(0, 500)}`;
      if (snapshotKey === lastSnapshotRef.current) {
        return;
      }
      lastSnapshotRef.current = snapshotKey;

      const payload = {
        html,
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: Date.now(),
      };
      
      console.log("[Cobrowse] Sending snapshot:", {
        url: payload.url,
        viewport: payload.viewport,
        htmlLength: payload.html.length,
      });
      
      socket.emit(SOCKET_EVENTS.COBROWSE_SNAPSHOT, payload);
    } catch (err) {
      console.error("[Cobrowse] Failed to capture snapshot:", err);
    }
  }, [socket, isInCall]);

  // Send mouse position (throttled to reduce bandwidth)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!socket || !isInCall) return;
    
    const now = Date.now();
    if (now - mouseThrottleRef.current < 50) return; // ~20fps for mouse (was 60)
    mouseThrottleRef.current = now;

    const payload = {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
    };
    
    // Log every second
    if (now % 1000 < 50) {
      console.log("[Cobrowse] Sending mouse:", payload);
    }

    socket.emit(SOCKET_EVENTS.COBROWSE_MOUSE, payload);
  }, [socket, isInCall]);

  // Send scroll position (throttled)
  const handleScroll = useCallback(() => {
    if (!socket || !isInCall) return;
    
    const now = Date.now();
    if (now - scrollThrottleRef.current < 100) return; // 10fps for scroll
    scrollThrottleRef.current = now;

    socket.emit(SOCKET_EVENTS.COBROWSE_SCROLL, {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: now,
    });
  }, [socket, isInCall]);

  // Send text selection
  const handleSelection = useCallback(() => {
    if (!socket || !isInCall) return;
    
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

    socket.emit(SOCKET_EVENTS.COBROWSE_SELECTION, {
      text,
      rect,
      timestamp: Date.now(),
    });
  }, [socket, isInCall]);

  // Start/stop co-browsing based on call state
  useEffect(() => {
    if (!socket || !isInCall) {
      // Cleanup when not in call
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
      return;
    }

    // Send initial snapshot
    captureSnapshot();

    // Set up periodic snapshot capture (every 2 seconds for changes)
    snapshotIntervalRef.current = setInterval(captureSnapshot, 2000);

    // Set up DOM mutation observer for immediate updates on significant changes
    const observer = new MutationObserver((mutations) => {
      // Only trigger snapshot for significant changes
      const hasSignificantChange = mutations.some(mutation => {
        // Ignore text-only changes and attribute changes on small elements
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          return true;
        }
        if (mutation.type === "attributes" && 
            (mutation.attributeName === "class" || mutation.attributeName === "style")) {
          return true;
        }
        return false;
      });

      if (hasSignificantChange) {
        captureSnapshot();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "src", "href"],
    });

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("selectionchange", handleSelection, { passive: true });

    // Also capture on form interactions
    const handleInput = () => {
      setTimeout(captureSnapshot, 100); // Small delay to capture the change
    };
    document.addEventListener("input", handleInput, { passive: true });
    document.addEventListener("change", handleInput, { passive: true });

    // Capture on window resize (viewport change)
    const handleResize = () => {
      setTimeout(captureSnapshot, 200); // Small delay to let resize complete
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("input", handleInput);
      document.removeEventListener("change", handleInput);
    };
  }, [socket, isInCall, captureSnapshot, handleMouseMove, handleScroll, handleSelection]);
}

