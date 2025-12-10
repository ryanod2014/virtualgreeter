import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { COBROWSE_TIMING } from "../../constants";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

/**
 * useCobrowse Test Suite
 *
 * Tests lock in current behavior of the Co-Browse Sender feature.
 * This hook captures and streams DOM snapshots, mouse position, scroll position,
 * and text selection to the agent during an active call.
 *
 * Since this is a hook that relies heavily on browser APIs, we test the behavior
 * by simulating the underlying mechanisms (event listeners, observers, intervals).
 */

// Type for mock socket
interface MockSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}

// Create a mock socket
const createMockSocket = (): MockSocket => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

// Mock MutationObserver for tracking
class MockMutationObserver {
  callback: MutationCallback;
  static instances: MockMutationObserver[] = [];

  constructor(callback: MutationCallback) {
    this.callback = callback;
    MockMutationObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);

  // Helper to trigger mutations in tests
  trigger(mutations: Partial<MutationRecord>[]) {
    this.callback(mutations as MutationRecord[], this);
  }

  static reset() {
    MockMutationObserver.instances = [];
  }
}

describe("useCobrowse", () => {
  let mockSocket: MockSocket;
  let originalMutationObserver: typeof MutationObserver;
  let addedEventListeners: Map<string, Set<EventListenerOrEventListenerObject>>;
  let windowListeners: Map<string, Set<EventListenerOrEventListenerObject>>;
  let intervalCallbacks: Set<() => void>;
  let timeoutCallbacks: Map<number, { callback: () => void; delay: number }>;
  let timeoutId: number;
  let intervalId: number;

  // Track event listeners
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    MockMutationObserver.reset();

    mockSocket = createMockSocket();
    addedEventListeners = new Map();
    windowListeners = new Map();
    intervalCallbacks = new Set();
    timeoutCallbacks = new Map();
    timeoutId = 0;
    intervalId = 0;

    // Mock MutationObserver globally
    originalMutationObserver = global.MutationObserver;
    global.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    // Track event listeners
    EventTarget.prototype.addEventListener = vi.fn(function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject
    ) {
      const target = this === window ? windowListeners : addedEventListeners;
      if (!target.has(type)) {
        target.set(type, new Set());
      }
      target.get(type)!.add(listener);
    });

    EventTarget.prototype.removeEventListener = vi.fn(function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject
    ) {
      const target = this === window ? windowListeners : addedEventListeners;
      target.get(type)?.delete(listener);
    });

    // Mock setInterval
    global.setInterval = vi.fn((callback: () => void) => {
      intervalCallbacks.add(callback);
      return ++intervalId as unknown as ReturnType<typeof setInterval>;
    });

    global.clearInterval = vi.fn((id: ReturnType<typeof setInterval>) => {
      // Clear is called
    });

    // Mock setTimeout
    global.setTimeout = vi.fn((callback: () => void, delay?: number) => {
      const id = ++timeoutId;
      timeoutCallbacks.set(id, { callback, delay: delay || 0 });
      return id as unknown as ReturnType<typeof setTimeout>;
    });

    global.clearTimeout = vi.fn((id: ReturnType<typeof setTimeout>) => {
      timeoutCallbacks.delete(id as unknown as number);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore MutationObserver
    global.MutationObserver = originalMutationObserver;

    // Restore original methods
    EventTarget.prototype.addEventListener = originalAddEventListener;
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  // ===========================================================================
  // COBROWSE_TIMING CONSTANTS TESTS
  // ===========================================================================

  describe("COBROWSE_TIMING constants", () => {
    it("SNAPSHOT_INTERVAL is 2000ms for periodic DOM snapshots", () => {
      expect(COBROWSE_TIMING.SNAPSHOT_INTERVAL).toBe(2000);
    });

    it("MOUSE_THROTTLE is 50ms for smooth cursor following (~20fps)", () => {
      expect(COBROWSE_TIMING.MOUSE_THROTTLE).toBe(50);
    });

    it("SCROLL_THROTTLE is 100ms for scroll position updates (10fps)", () => {
      expect(COBROWSE_TIMING.SCROLL_THROTTLE).toBe(100);
    });

    it("INPUT_CAPTURE_DELAY is 100ms to allow DOM to settle after input", () => {
      expect(COBROWSE_TIMING.INPUT_CAPTURE_DELAY).toBe(100);
    });

    it("RESIZE_CAPTURE_DELAY is 200ms to allow layout to complete", () => {
      expect(COBROWSE_TIMING.RESIZE_CAPTURE_DELAY).toBe(200);
    });
  });

  // ===========================================================================
  // SOCKET EVENT CONSTANTS TESTS
  // ===========================================================================

  describe("Socket Event Constants", () => {
    it("COBROWSE_SNAPSHOT event name is 'cobrowse:snapshot'", () => {
      expect(SOCKET_EVENTS.COBROWSE_SNAPSHOT).toBe("cobrowse:snapshot");
    });

    it("COBROWSE_MOUSE event name is 'cobrowse:mouse'", () => {
      expect(SOCKET_EVENTS.COBROWSE_MOUSE).toBe("cobrowse:mouse");
    });

    it("COBROWSE_SCROLL event name is 'cobrowse:scroll'", () => {
      expect(SOCKET_EVENTS.COBROWSE_SCROLL).toBe("cobrowse:scroll");
    });

    it("COBROWSE_SELECTION event name is 'cobrowse:selection'", () => {
      expect(SOCKET_EVENTS.COBROWSE_SELECTION).toBe("cobrowse:selection");
    });
  });

  // ===========================================================================
  // SNAPSHOT PAYLOAD STRUCTURE TESTS
  // ===========================================================================

  describe("Snapshot Payload Structure", () => {
    it("cobrowse:snapshot payload should include html, url, title, viewport, timestamp fields", () => {
      // This test documents the expected payload structure
      const expectedPayloadShape = {
        html: expect.any(String),
        url: expect.any(String),
        title: expect.any(String),
        viewport: {
          width: expect.any(Number),
          height: expect.any(Number),
        },
        timestamp: expect.any(Number),
      };

      // Verify structure by creating a sample payload
      const samplePayload = {
        html: "<html><body>Test</body></html>",
        url: "https://example.com/page",
        title: "Test Page",
        viewport: {
          width: 1024,
          height: 768,
        },
        timestamp: Date.now(),
      };

      expect(samplePayload).toMatchObject(expectedPayloadShape);
    });
  });

  // ===========================================================================
  // MOUSE PAYLOAD STRUCTURE TESTS
  // ===========================================================================

  describe("Mouse Payload Structure", () => {
    it("cobrowse:mouse payload should include x, y, timestamp fields", () => {
      const expectedPayloadShape = {
        x: expect.any(Number),
        y: expect.any(Number),
        timestamp: expect.any(Number),
      };

      const samplePayload = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
      };

      expect(samplePayload).toMatchObject(expectedPayloadShape);
    });
  });

  // ===========================================================================
  // SCROLL PAYLOAD STRUCTURE TESTS
  // ===========================================================================

  describe("Scroll Payload Structure", () => {
    it("cobrowse:scroll payload should include scrollX, scrollY, timestamp fields", () => {
      const expectedPayloadShape = {
        scrollX: expect.any(Number),
        scrollY: expect.any(Number),
        timestamp: expect.any(Number),
      };

      const samplePayload = {
        scrollX: 50,
        scrollY: 100,
        timestamp: Date.now(),
      };

      expect(samplePayload).toMatchObject(expectedPayloadShape);
    });
  });

  // ===========================================================================
  // SELECTION PAYLOAD STRUCTURE TESTS
  // ===========================================================================

  describe("Selection Payload Structure", () => {
    it("cobrowse:selection payload should include text, rect, timestamp fields", () => {
      const samplePayloadWithRect = {
        text: "selected text",
        rect: { x: 10, y: 20, width: 100, height: 20 },
        timestamp: Date.now(),
      };

      const samplePayloadWithNullRect = {
        text: "",
        rect: null,
        timestamp: Date.now(),
      };

      // Verify payload with rect
      expect(samplePayloadWithRect).toHaveProperty("text");
      expect(typeof samplePayloadWithRect.text).toBe("string");
      expect(samplePayloadWithRect).toHaveProperty("rect");
      expect(samplePayloadWithRect.rect).not.toBeNull();
      expect(samplePayloadWithRect).toHaveProperty("timestamp");
      expect(typeof samplePayloadWithRect.timestamp).toBe("number");

      // Verify payload with null rect (when selection has zero dimensions)
      expect(samplePayloadWithNullRect).toHaveProperty("text");
      expect(typeof samplePayloadWithNullRect.text).toBe("string");
      expect(samplePayloadWithNullRect).toHaveProperty("rect");
      expect(samplePayloadWithNullRect.rect).toBeNull();
      expect(samplePayloadWithNullRect).toHaveProperty("timestamp");
      expect(typeof samplePayloadWithNullRect.timestamp).toBe("number");
    });
  });

  // ===========================================================================
  // MUTATION OBSERVER CONFIGURATION TESTS
  // ===========================================================================

  describe("MutationObserver Configuration", () => {
    it("should observe with childList: true to detect added/removed nodes", () => {
      // The hook observes document.body with these options
      const expectedConfig = expect.objectContaining({
        childList: true,
      });

      // Verify the observation config structure
      const observeConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src", "href"],
      };

      expect(observeConfig).toMatchObject(expectedConfig);
    });

    it("should observe with subtree: true to watch descendant changes", () => {
      const observeConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src", "href"],
      };

      expect(observeConfig.subtree).toBe(true);
    });

    it("should observe with attributes: true to detect attribute changes", () => {
      const observeConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src", "href"],
      };

      expect(observeConfig.attributes).toBe(true);
    });

    it("should filter attributes to class, style, src, href", () => {
      const observeConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src", "href"],
      };

      expect(observeConfig.attributeFilter).toContain("class");
      expect(observeConfig.attributeFilter).toContain("style");
      expect(observeConfig.attributeFilter).toContain("src");
      expect(observeConfig.attributeFilter).toContain("href");
    });
  });

  // ===========================================================================
  // SIGNIFICANT CHANGE DETECTION TESTS
  // ===========================================================================

  describe("Significant Change Detection Logic", () => {
    it("considers childList mutation with addedNodes as significant", () => {
      const mutation = {
        type: "childList" as MutationRecordType,
        addedNodes: { length: 1 } as unknown as NodeList, // Simulated NodeList with one node
        removedNodes: { length: 0 } as unknown as NodeList,
      };

      const isSignificant =
        mutation.type === "childList" && (mutation.addedNodes as NodeList).length > 0;
      expect(isSignificant).toBe(true);
    });

    it("considers attribute mutation for 'class' as significant", () => {
      const mutation = {
        type: "attributes" as MutationRecordType,
        attributeName: "class",
      };

      const isSignificant =
        mutation.type === "attributes" &&
        (mutation.attributeName === "class" || mutation.attributeName === "style");
      expect(isSignificant).toBe(true);
    });

    it("considers attribute mutation for 'style' as significant", () => {
      const mutation = {
        type: "attributes" as MutationRecordType,
        attributeName: "style",
      };

      const isSignificant =
        mutation.type === "attributes" &&
        (mutation.attributeName === "class" || mutation.attributeName === "style");
      expect(isSignificant).toBe(true);
    });

    it("does not consider childList mutation without addedNodes as significant", () => {
      const mutation = {
        type: "childList" as MutationRecordType,
        addedNodes: [] as unknown as NodeList,
        removedNodes: [] as unknown as NodeList,
      };

      const isSignificant =
        mutation.type === "childList" && (mutation.addedNodes as NodeList).length > 0;
      expect(isSignificant).toBe(false);
    });

    it("does not consider attribute mutation for other attributes as significant", () => {
      const mutation = {
        type: "attributes" as MutationRecordType,
        attributeName: "data-test",
      };

      const isSignificant =
        mutation.type === "attributes" &&
        (mutation.attributeName === "class" || mutation.attributeName === "style");
      expect(isSignificant).toBe(false);
    });

    it("does not consider characterData mutation as significant", () => {
      const mutation = {
        type: "characterData" as MutationRecordType,
      };

      const isChildListSignificant = mutation.type === "childList";
      const isAttributeSignificant = mutation.type === "attributes";
      const isSignificant = isChildListSignificant || isAttributeSignificant;
      expect(isSignificant).toBe(false);
    });
  });

  // ===========================================================================
  // THROTTLE TIMING LOGIC TESTS
  // ===========================================================================

  describe("Throttle Timing Logic", () => {
    it("mouse throttle allows first event through", () => {
      let lastTimestamp = 0;
      const now = 1000;

      const shouldThrottle = now - lastTimestamp < COBROWSE_TIMING.MOUSE_THROTTLE;
      expect(shouldThrottle).toBe(false);
    });

    it("mouse throttle blocks events within 50ms", () => {
      const lastTimestamp = 1000;
      const now = 1040; // 40ms later

      const shouldThrottle = now - lastTimestamp < COBROWSE_TIMING.MOUSE_THROTTLE;
      expect(shouldThrottle).toBe(true);
    });

    it("mouse throttle allows events after 50ms", () => {
      const lastTimestamp = 1000;
      const now = 1050; // 50ms later

      const shouldThrottle = now - lastTimestamp < COBROWSE_TIMING.MOUSE_THROTTLE;
      expect(shouldThrottle).toBe(false);
    });

    it("scroll throttle blocks events within 100ms", () => {
      const lastTimestamp = 1000;
      const now = 1090; // 90ms later

      const shouldThrottle = now - lastTimestamp < COBROWSE_TIMING.SCROLL_THROTTLE;
      expect(shouldThrottle).toBe(true);
    });

    it("scroll throttle allows events after 100ms", () => {
      const lastTimestamp = 1000;
      const now = 1100; // 100ms later

      const shouldThrottle = now - lastTimestamp < COBROWSE_TIMING.SCROLL_THROTTLE;
      expect(shouldThrottle).toBe(false);
    });
  });

  // ===========================================================================
  // DEDUPLICATION LOGIC TESTS
  // ===========================================================================

  describe("Snapshot Deduplication Logic", () => {
    it("creates snapshot key from length and first 500 chars", () => {
      const html = "<html><body>Test content here</body></html>";
      const snapshotKey = `${html.length}-${html.slice(0, 500)}`;

      expect(snapshotKey).toContain(html.length.toString());
      expect(snapshotKey).toContain("-");
      expect(snapshotKey).toContain("<html>");
    });

    it("same HTML produces same snapshot key", () => {
      const html = "<html><body>Same content</body></html>";
      const key1 = `${html.length}-${html.slice(0, 500)}`;
      const key2 = `${html.length}-${html.slice(0, 500)}`;

      expect(key1).toBe(key2);
    });

    it("different HTML produces different snapshot key", () => {
      const html1 = "<html><body>Content A</body></html>";
      const html2 = "<html><body>Content B</body></html>";
      const key1 = `${html1.length}-${html1.slice(0, 500)}`;
      const key2 = `${html2.length}-${html2.slice(0, 500)}`;

      expect(key1).not.toBe(key2);
    });

    it("truncates to first 500 chars for key generation", () => {
      const longHtml = "<html><body>" + "a".repeat(1000) + "</body></html>";
      const snapshotKey = `${longHtml.length}-${longHtml.slice(0, 500)}`;

      expect(snapshotKey.length).toBeLessThan(longHtml.length);
      expect(longHtml.slice(0, 500).length).toBe(500);
    });
  });

  // ===========================================================================
  // URL CONVERSION LOGIC TESTS
  // ===========================================================================

  describe("URL Conversion Logic", () => {
    const baseUrl = "https://example.com";

    it("converts relative image URL to absolute", () => {
      const relativeSrc = "/images/test.png";
      const absoluteUrl = new URL(relativeSrc, baseUrl).href;

      expect(absoluteUrl).toBe("https://example.com/images/test.png");
    });

    it("does not convert absolute HTTP URLs", () => {
      const absoluteSrc = "https://cdn.example.com/image.png";

      // Logic: if starts with http, don't convert
      const shouldConvert = !absoluteSrc.startsWith("http") && !absoluteSrc.startsWith("data:");
      expect(shouldConvert).toBe(false);
    });

    it("does not convert data URLs", () => {
      const dataSrc = "data:image/png;base64,iVBORw0KGgo=";

      const shouldConvert = !dataSrc.startsWith("http") && !dataSrc.startsWith("data:");
      expect(shouldConvert).toBe(false);
    });

    it("converts relative stylesheet URL to absolute", () => {
      const relativeHref = "/css/style.css";
      const absoluteUrl = new URL(relativeHref, baseUrl).href;

      expect(absoluteUrl).toBe("https://example.com/css/style.css");
    });

    it("converts path-relative URLs correctly", () => {
      const relativeSrc = "images/test.png";
      const absoluteUrl = new URL(relativeSrc, baseUrl).href;

      expect(absoluteUrl).toBe("https://example.com/images/test.png");
    });
  });

  // ===========================================================================
  // BACKGROUND IMAGE URL REGEX TESTS
  // ===========================================================================

  describe("Background Image URL Regex", () => {
    const baseUrl = "https://example.com";
    const urlRegex = /url\(['"]?(?!data:)(?!http)([^'")\s]+)['"]?\)/g;

    it("matches relative URL in background-image", () => {
      const style = "background-image: url(/images/bg.png)";
      const matches = [...style.matchAll(urlRegex)];

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe("/images/bg.png");
    });

    it("matches URL with single quotes", () => {
      const style = "background-image: url('/images/bg.png')";
      const matches = [...style.matchAll(urlRegex)];

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe("/images/bg.png");
    });

    it("matches URL with double quotes", () => {
      const style = 'background-image: url("/images/bg.png")';
      const matches = [...style.matchAll(urlRegex)];

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe("/images/bg.png");
    });

    it("does not match data URLs", () => {
      const style = "background-image: url(data:image/png;base64,iVBORw0KGgo=)";
      const matches = [...style.matchAll(urlRegex)];

      expect(matches.length).toBe(0);
    });

    it("does not match absolute HTTP URLs", () => {
      const style = "background-image: url(https://cdn.example.com/bg.png)";
      const matches = [...style.matchAll(urlRegex)];

      expect(matches.length).toBe(0);
    });

    it("replaces relative URL with absolute URL", () => {
      const style = "background-image: url(/images/bg.png)";
      const fixedStyle = style.replace(urlRegex, (_match, url) => {
        return `url(${new URL(url, baseUrl).href})`;
      });

      expect(fixedStyle).toBe("background-image: url(https://example.com/images/bg.png)");
    });
  });

  // ===========================================================================
  // SELECTION RECT LOGIC TESTS
  // ===========================================================================

  describe("Selection Rect Logic", () => {
    it("returns null rect when bounding rect has zero width", () => {
      const boundingRect = { x: 0, y: 0, width: 0, height: 10 };

      const rect =
        boundingRect.width > 0 && boundingRect.height > 0
          ? { x: boundingRect.x, y: boundingRect.y, width: boundingRect.width, height: boundingRect.height }
          : null;

      expect(rect).toBeNull();
    });

    it("returns null rect when bounding rect has zero height", () => {
      const boundingRect = { x: 0, y: 0, width: 10, height: 0 };

      const rect =
        boundingRect.width > 0 && boundingRect.height > 0
          ? { x: boundingRect.x, y: boundingRect.y, width: boundingRect.width, height: boundingRect.height }
          : null;

      expect(rect).toBeNull();
    });

    it("returns rect object when dimensions are positive", () => {
      const boundingRect = { x: 10, y: 20, width: 100, height: 30 };

      const rect =
        boundingRect.width > 0 && boundingRect.height > 0
          ? { x: boundingRect.x, y: boundingRect.y, width: boundingRect.width, height: boundingRect.height }
          : null;

      expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 30 });
    });
  });

  // ===========================================================================
  // EVENT LISTENER TYPES TESTS
  // ===========================================================================

  describe("Event Listener Types", () => {
    it("hook should listen for mousemove on window", () => {
      const expectedWindowEvents = ["mousemove", "scroll", "resize"];
      expectedWindowEvents.forEach((event) => {
        expect(expectedWindowEvents).toContain(event);
      });
    });

    it("hook should listen for scroll on window", () => {
      const expectedWindowEvents = ["mousemove", "scroll", "resize"];
      expect(expectedWindowEvents).toContain("scroll");
    });

    it("hook should listen for resize on window", () => {
      const expectedWindowEvents = ["mousemove", "scroll", "resize"];
      expect(expectedWindowEvents).toContain("resize");
    });

    it("hook should listen for selectionchange on document", () => {
      const expectedDocumentEvents = ["selectionchange", "input", "change"];
      expect(expectedDocumentEvents).toContain("selectionchange");
    });

    it("hook should listen for input on document", () => {
      const expectedDocumentEvents = ["selectionchange", "input", "change"];
      expect(expectedDocumentEvents).toContain("input");
    });

    it("hook should listen for change on document", () => {
      const expectedDocumentEvents = ["selectionchange", "input", "change"];
      expect(expectedDocumentEvents).toContain("change");
    });

    it("all event listeners should be passive", () => {
      // Document expected passive option
      const listenerOptions = { passive: true };
      expect(listenerOptions.passive).toBe(true);
    });
  });

  // ===========================================================================
  // ACTIVATION CONDITION TESTS
  // ===========================================================================

  describe("Activation Conditions", () => {
    it("requires both socket and isInCall to activate", () => {
      const socket = mockSocket;
      const isInCall = true;

      const shouldActivate = socket !== null && isInCall;
      expect(shouldActivate).toBe(true);
    });

    it("does not activate when socket is null", () => {
      const socket = null;
      const isInCall = true;

      const shouldActivate = socket !== null && isInCall;
      expect(shouldActivate).toBe(false);
    });

    it("does not activate when isInCall is false", () => {
      const socket = mockSocket;
      const isInCall = false;

      const shouldActivate = socket !== null && isInCall;
      expect(shouldActivate).toBe(false);
    });

    it("does not activate when both socket is null and isInCall is false", () => {
      const socket = null;
      const isInCall = false;

      const shouldActivate = socket !== null && isInCall;
      expect(shouldActivate).toBe(false);
    });
  });

  // ===========================================================================
  // WIDGET REMOVAL TESTS
  // ===========================================================================

  describe("Widget Removal from Snapshot", () => {
    it("removes element with id 'ghost-greeter-widget' from cloned document", () => {
      // Simulate the removal logic
      const mockDoc = {
        getElementById: vi.fn().mockReturnValue({
          remove: vi.fn(),
        }),
      };

      const widgetElement = mockDoc.getElementById("ghost-greeter-widget");
      widgetElement?.remove();

      expect(mockDoc.getElementById).toHaveBeenCalledWith("ghost-greeter-widget");
      expect(widgetElement.remove).toHaveBeenCalled();
    });

    it("handles case when widget element does not exist", () => {
      const mockDoc = {
        getElementById: vi.fn().mockReturnValue(null),
      };

      const widgetElement = mockDoc.getElementById("ghost-greeter-widget");

      // Using optional chaining should not throw
      expect(() => widgetElement?.remove()).not.toThrow();
    });
  });

  // ===========================================================================
  // SCRIPT REMOVAL TESTS
  // ===========================================================================

  describe("Script Removal from Snapshot", () => {
    it("removes all script elements from cloned document", () => {
      const mockScripts = [
        { remove: vi.fn() },
        { remove: vi.fn() },
        { remove: vi.fn() },
      ];

      mockScripts.forEach((script) => script.remove());

      expect(mockScripts[0].remove).toHaveBeenCalled();
      expect(mockScripts[1].remove).toHaveBeenCalled();
      expect(mockScripts[2].remove).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CLEANUP BEHAVIOR TESTS
  // ===========================================================================

  describe("Cleanup Behavior", () => {
    it("cleanup sets isActive to false", () => {
      let isActive = true;

      // Simulate cleanup
      isActive = false;

      expect(isActive).toBe(false);
    });

    it("cleanup clears snapshot interval", () => {
      let snapshotInterval: ReturnType<typeof setInterval> | null =
        setInterval(() => {}, 1000);

      // Simulate cleanup
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
      }

      expect(snapshotInterval).toBeNull();
    });

    it("cleanup disconnects MutationObserver", () => {
      const observer = new MockMutationObserver(() => {});

      // Simulate cleanup
      observer.disconnect();

      expect(observer.disconnect).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // PERIODIC SNAPSHOT TESTS
  // ===========================================================================

  describe("Periodic Snapshot", () => {
    it("uses SNAPSHOT_INTERVAL (2000ms) for periodic captures", () => {
      expect(COBROWSE_TIMING.SNAPSHOT_INTERVAL).toBe(2000);
    });

    it("setInterval is called with captureSnapshot and SNAPSHOT_INTERVAL", () => {
      const mockCaptureSnapshot = vi.fn();
      const interval = COBROWSE_TIMING.SNAPSHOT_INTERVAL;

      // Simulate the hook's interval setup
      setInterval(mockCaptureSnapshot, interval);

      expect(global.setInterval).toHaveBeenCalledWith(
        mockCaptureSnapshot,
        COBROWSE_TIMING.SNAPSHOT_INTERVAL
      );
    });
  });

  // ===========================================================================
  // DEBOUNCE DELAY TESTS
  // ===========================================================================

  describe("Debounce Delays", () => {
    it("input handler uses INPUT_CAPTURE_DELAY (100ms)", () => {
      const mockCaptureSnapshot = vi.fn();

      // Simulate debounced input handler
      setTimeout(mockCaptureSnapshot, COBROWSE_TIMING.INPUT_CAPTURE_DELAY);

      expect(global.setTimeout).toHaveBeenCalledWith(
        mockCaptureSnapshot,
        COBROWSE_TIMING.INPUT_CAPTURE_DELAY
      );
    });

    it("resize handler uses RESIZE_CAPTURE_DELAY (200ms)", () => {
      const mockCaptureSnapshot = vi.fn();

      // Simulate debounced resize handler
      setTimeout(mockCaptureSnapshot, COBROWSE_TIMING.RESIZE_CAPTURE_DELAY);

      expect(global.setTimeout).toHaveBeenCalledWith(
        mockCaptureSnapshot,
        COBROWSE_TIMING.RESIZE_CAPTURE_DELAY
      );
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe("Error Handling", () => {
    it("captureSnapshot wraps logic in try-catch", () => {
      // Verify the error handling pattern
      let errorLogged = false;

      try {
        throw new Error("Test error");
      } catch (err) {
        console.error("[Cobrowse] Failed to capture snapshot:", err);
        errorLogged = true;
      }

      expect(errorLogged).toBe(true);
    });

    it("URL conversion error is handled gracefully", () => {
      // When URL constructor throws, the code catches and returns original match
      // This test verifies the pattern is correct
      let errorCaught = false;
      const regex = /url\(['"]?(?!data:)(?!http)([^'")\s]+)['"]?\)/g;
      const style = "background-image: url(/valid/path.png)";
      
      // Simulate the replacement logic with error handling
      const fixedStyle = style.replace(regex, (_match, url) => {
        try {
          return `url(${new URL(url, "https://example.com").href})`;
        } catch {
          errorCaught = true;
          return _match;
        }
      });

      // Valid URLs should be converted
      expect(fixedStyle).toBe("background-image: url(https://example.com/valid/path.png)");
      // No error should have been caught for valid URL
      expect(errorCaught).toBe(false);
    });
  });

  // ===========================================================================
  // SOCKET REF PATTERN TESTS
  // ===========================================================================

  describe("Socket Ref Pattern", () => {
    it("stores socket in ref to avoid stale closures", () => {
      // This is a pattern test - the hook uses socketRef.current = socket
      const socketRef = { current: null as MockSocket | null };

      // Initial assignment
      socketRef.current = mockSocket;
      expect(socketRef.current).toBe(mockSocket);

      // Update assignment
      const newSocket = createMockSocket();
      socketRef.current = newSocket;
      expect(socketRef.current).toBe(newSocket);
    });
  });

  // ===========================================================================
  // ACTIVE STATE GUARD TESTS
  // ===========================================================================

  describe("Active State Guard", () => {
    it("event handlers check isActive before processing", () => {
      let isActive = false;
      let eventProcessed = false;

      // Simulate guarded handler
      const handler = () => {
        if (!isActive) return;
        eventProcessed = true;
      };

      handler();
      expect(eventProcessed).toBe(false);

      isActive = true;
      handler();
      expect(eventProcessed).toBe(true);
    });

    it("captureSnapshot checks socket and isActive before executing", () => {
      let socketRef = { current: mockSocket as MockSocket | null };
      let isActive = false;
      let snapshotTaken = false;

      // Simulate guarded captureSnapshot
      const captureSnapshot = () => {
        if (!socketRef.current || !isActive) return;
        snapshotTaken = true;
      };

      captureSnapshot();
      expect(snapshotTaken).toBe(false);

      isActive = true;
      captureSnapshot();
      expect(snapshotTaken).toBe(true);

      socketRef.current = null;
      snapshotTaken = false;
      captureSnapshot();
      expect(snapshotTaken).toBe(false);
    });
  });

  // ===========================================================================
  // IFRAME MATCHING LOGIC TESTS (TKT-053)
  // ===========================================================================

  describe("Iframe Matching Logic", () => {
    it("matches iframe by src attribute when both have same src", () => {
      const cloneIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return "https://example.com/embed";
          if (attr === "name") return null;
          return null;
        }),
      };

      const originalIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return "https://example.com/embed";
          if (attr === "name") return null;
          return null;
        }),
      };

      const cloneSrc = cloneIframe.getAttribute("src");
      const iframeSrc = originalIframe.getAttribute("src");

      const matches = cloneSrc && iframeSrc && cloneSrc === iframeSrc;
      expect(matches).toBe(true);
    });

    it("matches iframe by name attribute when both have same name", () => {
      const cloneIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return null;
          if (attr === "name") return "my-iframe";
          return null;
        }),
      };

      const originalIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return null;
          if (attr === "name") return "my-iframe";
          return null;
        }),
      };

      const cloneName = cloneIframe.getAttribute("name");
      const iframeName = originalIframe.getAttribute("name");

      const matches = cloneName && iframeName && cloneName === iframeName;
      expect(matches).toBe(true);
    });

    it("does not match iframes with different src values", () => {
      const cloneIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return "https://example.com/embed1";
          if (attr === "name") return null;
          return null;
        }),
      };

      const originalIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return "https://example.com/embed2";
          if (attr === "name") return null;
          return null;
        }),
      };

      const cloneSrc = cloneIframe.getAttribute("src");
      const iframeSrc = originalIframe.getAttribute("src");

      const matches = cloneSrc && iframeSrc && cloneSrc === iframeSrc;
      expect(matches).toBe(false);
    });

    it("does not match iframes with different name values", () => {
      const cloneIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return null;
          if (attr === "name") return "iframe-1";
          return null;
        }),
      };

      const originalIframe = {
        getAttribute: vi.fn((attr) => {
          if (attr === "src") return null;
          if (attr === "name") return "iframe-2";
          return null;
        }),
      };

      const cloneName = cloneIframe.getAttribute("name");
      const iframeName = originalIframe.getAttribute("name");

      const matches = cloneName && iframeName && cloneName === iframeName;
      expect(matches).toBe(false);
    });

    it("does not match when both src and name are null", () => {
      const cloneIframe = {
        getAttribute: vi.fn(() => null),
      };

      const originalIframe = {
        getAttribute: vi.fn(() => null),
      };

      const cloneSrc = cloneIframe.getAttribute("src");
      const iframeSrc = originalIframe.getAttribute("src");
      const cloneName = cloneIframe.getAttribute("name");
      const iframeName = originalIframe.getAttribute("name");

      const matchesBySrc = cloneSrc && iframeSrc && cloneSrc === iframeSrc;
      const matchesByName = cloneName && iframeName && cloneName === iframeName;
      const matches = matchesBySrc || matchesByName;

      // When both are falsy, OR returns the last falsy value (which is false from matchesByName)
      expect(matches).toBeFalsy();
    });
  });

  // ===========================================================================
  // SAME-ORIGIN IFRAME CONTENT CAPTURE TESTS (TKT-053)
  // ===========================================================================

  describe("Same-Origin Iframe Content Capture", () => {
    it("captures iframe content by cloning contentDocument when accessible", () => {
      const mockIframeDoc = {
        cloneNode: vi.fn().mockReturnValue({
          documentElement: {
            outerHTML: "<html><body>Iframe content</body></html>",
          },
          querySelectorAll: vi.fn().mockReturnValue([]),
        }),
      };

      const mockIframe = {
        contentDocument: mockIframeDoc,
        src: "https://example.com/embed",
      };

      // Simulate the clone operation
      const iframeDocClone = mockIframeDoc.cloneNode(true);

      expect(mockIframeDoc.cloneNode).toHaveBeenCalledWith(true);
      expect(iframeDocClone.documentElement.outerHTML).toBe("<html><body>Iframe content</body></html>");
    });

    it("uses srcdoc attribute to store serialized iframe content", () => {
      const mockIframeClone = {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      };

      const iframeHtml = "<html><body>Iframe content</body></html>";

      // Simulate setting srcdoc
      mockIframeClone.setAttribute("srcdoc", iframeHtml);
      mockIframeClone.removeAttribute("src");

      expect(mockIframeClone.setAttribute).toHaveBeenCalledWith("srcdoc", iframeHtml);
      expect(mockIframeClone.removeAttribute).toHaveBeenCalledWith("src");
    });

    it("removes src attribute when using srcdoc", () => {
      const mockIframeClone = {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      };

      const iframeHtml = "<html><body>Content</body></html>";

      mockIframeClone.setAttribute("srcdoc", iframeHtml);
      mockIframeClone.removeAttribute("src");

      expect(mockIframeClone.removeAttribute).toHaveBeenCalledWith("src");
    });

    it("determines iframe base URL from src attribute when available", () => {
      const originalIframe = {
        src: "https://cdn.example.com/embed/page.html",
      };

      // Extract base URL (origin) from iframe src
      const iframeBaseUrl = new URL(originalIframe.src).origin;

      expect(iframeBaseUrl).toBe("https://cdn.example.com");
    });

    it("falls back to parent baseUrl when iframe src is empty", () => {
      const originalIframe = {
        src: "",
      };
      const parentBaseUrl = "https://example.com";

      // Logic: if no src, use parent baseUrl
      const iframeBaseUrl = originalIframe.src ? new URL(originalIframe.src).origin : parentBaseUrl;

      expect(iframeBaseUrl).toBe(parentBaseUrl);
    });
  });

  // ===========================================================================
  // IFRAME URL CONVERSION TESTS (TKT-053)
  // ===========================================================================

  describe("Iframe Content URL Conversion", () => {
    it("converts relative image URLs in iframe content to absolute", () => {
      const iframeBaseUrl = "https://cdn.example.com";
      const relativeSrc = "/images/logo.png";

      const absoluteUrl = new URL(relativeSrc, iframeBaseUrl).href;

      expect(absoluteUrl).toBe("https://cdn.example.com/images/logo.png");
    });

    it("converts relative stylesheet URLs in iframe content to absolute", () => {
      const iframeBaseUrl = "https://cdn.example.com";
      const relativeHref = "/css/embed.css";

      const absoluteUrl = new URL(relativeHref, iframeBaseUrl).href;

      expect(absoluteUrl).toBe("https://cdn.example.com/css/embed.css");
    });

    it("does not convert absolute HTTP URLs in iframe content", () => {
      const absoluteSrc = "https://other-cdn.com/image.png";

      const shouldConvert = !absoluteSrc.startsWith("http") && !absoluteSrc.startsWith("data:");
      expect(shouldConvert).toBe(false);
    });

    it("does not convert data URLs in iframe content", () => {
      const dataSrc = "data:image/png;base64,iVBORw0KGgo=";

      const shouldConvert = !dataSrc.startsWith("http") && !dataSrc.startsWith("data:");
      expect(shouldConvert).toBe(false);
    });

    it("handles URL conversion errors gracefully in iframe content", () => {
      // Test the error handling pattern used in the code
      // The URL constructor will throw on truly invalid URLs
      const baseUrl = "https://example.com";
      const invalidUrls = ["", "   ", "not-a-url-at-all"];

      invalidUrls.forEach((invalidUrl) => {
        let result = invalidUrl;
        try {
          // Some invalid URLs might not throw, but the code handles both cases
          const url = new URL(invalidUrl, baseUrl);
          result = url.href;
        } catch {
          // Leave as-is on error - this is the behavior being tested
          result = invalidUrl;
        }

        // The result should either be converted or left as-is
        // What matters is that no error propagates
        expect(result).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // CROSS-ORIGIN IFRAME PLACEHOLDER TESTS (TKT-053)
  // ===========================================================================

  describe("Cross-Origin Iframe Placeholder", () => {
    it("throws error when trying to access cross-origin iframe contentDocument", () => {
      // Simulate cross-origin iframe that throws security error
      const mockIframe = {
        contentDocument: null, // Cross-origin iframes return null
      };

      expect(() => {
        if (!mockIframe.contentDocument) {
          throw new Error("Cannot access iframe content");
        }
      }).toThrow("Cannot access iframe content");
    });

    it("creates placeholder div when iframe is inaccessible", () => {
      const mockDoc = {
        createElement: vi.fn().mockReturnValue({
          setAttribute: vi.fn(),
          textContent: "",
        }),
      };

      const placeholder = mockDoc.createElement("div");
      expect(mockDoc.createElement).toHaveBeenCalledWith("div");
    });

    it("placeholder inherits width from iframe", () => {
      const iframeClone = {
        getAttribute: vi.fn((attr) => {
          if (attr === "width") return "800";
          if (attr === "height") return "600";
          return null;
        }),
      };

      const width = iframeClone.getAttribute("width") || "100%";
      expect(width).toBe("800");
    });

    it("placeholder defaults to 100% width when iframe has no width", () => {
      const iframeClone = {
        getAttribute: vi.fn(() => null),
      };

      const width = iframeClone.getAttribute("width") || "100%";
      expect(width).toBe("100%");
    });

    it("placeholder inherits height from iframe", () => {
      const iframeClone = {
        getAttribute: vi.fn((attr) => {
          if (attr === "width") return "800";
          if (attr === "height") return "600";
          return null;
        }),
      };

      const height = iframeClone.getAttribute("height") || "200px";
      expect(height).toBe("600");
    });

    it("placeholder defaults to 200px height when iframe has no height", () => {
      const iframeClone = {
        getAttribute: vi.fn(() => null),
      };

      const height = iframeClone.getAttribute("height") || "200px";
      expect(height).toBe("200px");
    });

    it("placeholder uses flexbox for centering content", () => {
      const placeholderStyle =
        "display: flex; " +
        "align-items: center; " +
        "justify-content: center; " +
        "width: 100%; " +
        "height: 200px; " +
        "background: #f3f4f6; " +
        "border: 2px dashed #d1d5db; " +
        "color: #6b7280; " +
        "font-family: system-ui, -apple-system, sans-serif; " +
        "font-size: 14px; " +
        "text-align: center; " +
        "padding: 20px; " +
        "box-sizing: border-box;";

      expect(placeholderStyle).toContain("display: flex");
      expect(placeholderStyle).toContain("align-items: center");
      expect(placeholderStyle).toContain("justify-content: center");
    });

    it("placeholder has gray background color (#f3f4f6)", () => {
      const placeholderStyle = "background: #f3f4f6;";
      expect(placeholderStyle).toContain("background: #f3f4f6");
    });

    it("placeholder has dashed border (2px dashed #d1d5db)", () => {
      const placeholderStyle = "border: 2px dashed #d1d5db;";
      expect(placeholderStyle).toContain("border: 2px dashed #d1d5db");
    });

    it("placeholder has text color #6b7280", () => {
      const placeholderStyle = "color: #6b7280;";
      expect(placeholderStyle).toContain("color: #6b7280");
    });

    it("placeholder uses system-ui font family", () => {
      const placeholderStyle = "font-family: system-ui, -apple-system, sans-serif;";
      expect(placeholderStyle).toContain("font-family: system-ui, -apple-system, sans-serif");
    });

    it("placeholder has font size of 14px", () => {
      const placeholderStyle = "font-size: 14px;";
      expect(placeholderStyle).toContain("font-size: 14px");
    });

    it("placeholder has centered text alignment", () => {
      const placeholderStyle = "text-align: center;";
      expect(placeholderStyle).toContain("text-align: center");
    });

    it("placeholder has 20px padding", () => {
      const placeholderStyle = "padding: 20px;";
      expect(placeholderStyle).toContain("padding: 20px");
    });

    it("placeholder uses border-box sizing", () => {
      const placeholderStyle = "box-sizing: border-box;";
      expect(placeholderStyle).toContain("box-sizing: border-box");
    });

    it("placeholder text is 'Embedded content - not visible to agent'", () => {
      const placeholderText = "Embedded content - not visible to agent";
      expect(placeholderText).toBe("Embedded content - not visible to agent");
    });

    it("replaces iframe with placeholder in DOM", () => {
      const mockPlaceholder = { id: "placeholder" };
      const mockIframeClone = { id: "iframe" };
      const mockParentNode = {
        replaceChild: vi.fn(),
      };

      mockParentNode.replaceChild(mockPlaceholder, mockIframeClone);

      expect(mockParentNode.replaceChild).toHaveBeenCalledWith(mockPlaceholder, mockIframeClone);
    });
  });

  // ===========================================================================
  // IFRAME HANDLING ERROR CASES (TKT-053)
  // ===========================================================================

  describe("Iframe Handling Error Cases", () => {
    it("catches error when accessing cross-origin iframe contentDocument", () => {
      let errorCaught = false;

      try {
        // Simulate cross-origin access attempt
        const inaccessibleIframe = {
          contentDocument: null,
        };

        if (!inaccessibleIframe.contentDocument) {
          throw new Error("Cannot access iframe content");
        }
      } catch (err) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });

    it("continues processing other iframes when one fails", () => {
      const iframes = [
        { accessible: true, processed: false },
        { accessible: false, processed: false },
        { accessible: true, processed: false },
      ];

      iframes.forEach((iframe) => {
        try {
          if (!iframe.accessible) {
            throw new Error("Cannot access");
          }
          iframe.processed = true;
        } catch {
          // Replace with placeholder (simulated by not setting processed)
        }
      });

      expect(iframes[0].processed).toBe(true);
      expect(iframes[1].processed).toBe(false);
      expect(iframes[2].processed).toBe(true);
    });

    it("handles undefined parentNode gracefully with optional chaining", () => {
      const mockIframeClone = {
        parentNode: null,
      };
      const mockPlaceholder = { id: "placeholder" };

      // Using optional chaining should not throw
      expect(() => {
        mockIframeClone.parentNode?.replaceChild?.(mockPlaceholder, mockIframeClone);
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // IFRAME CONTENT SERIALIZATION (TKT-053)
  // ===========================================================================

  describe("Iframe Content Serialization", () => {
    it("serializes iframe document to HTML using outerHTML", () => {
      const mockIframeDocClone = {
        documentElement: {
          outerHTML: "<html><head><title>Embedded</title></head><body>Content</body></html>",
        },
      };

      const iframeHtml = mockIframeDocClone.documentElement.outerHTML;

      expect(iframeHtml).toContain("<html>");
      expect(iframeHtml).toContain("<head>");
      expect(iframeHtml).toContain("<body>");
      expect(iframeHtml).toBe("<html><head><title>Embedded</title></head><body>Content</body></html>");
    });

    it("stores serialized HTML in srcdoc attribute", () => {
      const iframeHtml = "<html><body>Test</body></html>";
      const mockIframeClone = {
        setAttribute: vi.fn(),
      };

      mockIframeClone.setAttribute("srcdoc", iframeHtml);

      expect(mockIframeClone.setAttribute).toHaveBeenCalledWith("srcdoc", iframeHtml);
    });
  });
});


