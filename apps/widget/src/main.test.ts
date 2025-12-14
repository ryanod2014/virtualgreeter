/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// MOCKS - must be before imports
// =============================================================================

// Mock preact render
vi.mock("preact", () => ({
  render: vi.fn(),
}));

// Mock Widget component
vi.mock("./Widget", () => ({
  Widget: vi.fn(() => null),
}));

// Mock getWidgetStyles
vi.mock("./widget-styles", () => ({
  getWidgetStyles: vi.fn(() => ".gg-widget { position: fixed; }"),
}));

describe("main.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the DOM
    document.body.innerHTML = "";
    
    // Clear module cache to get fresh imports
    vi.resetModules();
    
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Clear any existing GreetNow globals
    delete (window as Record<string, unknown>).GreetNow;
    delete (window as Record<string, unknown>).GhostGreeter;
    delete (window as Record<string, unknown>).gg;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    
    // Clean up globals
    delete (window as Record<string, unknown>).GreetNow;
    delete (window as Record<string, unknown>).GhostGreeter;
    delete (window as Record<string, unknown>).gg;
  });

  // =============================================================================
  // validateConfig TESTS
  // These test the validation logic by observing init() behavior
  // =============================================================================

  describe("validateConfig (via init behavior)", () => {
    it("1. Returns error for missing orgId", async () => {
      // Dynamic import to get fresh module
      const { init } = await import("./main");
      
      // Call init with missing orgId
      init({ orgId: "" } as Parameters<typeof init>[0]);

      // Should log error about invalid config
      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("orgId")
      );

      // Widget should not be created
      expect(document.getElementById("greetnow-widget")).toBeNull();
    });

    it("2. Returns error for invalid serverUrl", async () => {
      const { init } = await import("./main");
      
      // Call init with invalid URL
      init({ 
        orgId: "valid-org", 
        serverUrl: "not-a-valid-url" 
      } as Parameters<typeof init>[0]);

      // Should log error about serverUrl
      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("serverUrl")
      );

      // Widget should not be created
      expect(document.getElementById("greetnow-widget")).toBeNull();
    });

    it("3. Returns success for valid config", async () => {
      const { init } = await import("./main");
      
      // Call init with valid config
      init({ 
        orgId: "valid-org-123", 
        serverUrl: "http://localhost:3001" 
      });

      // Should NOT log error
      expect(console.error).not.toHaveBeenCalled();

      // Widget container should be created
      expect(document.getElementById("greetnow-widget")).not.toBeNull();
    });

    it("validates non-empty orgId string", async () => {
      const { init } = await import("./main");
      
      // Call with whitespace-only orgId
      init({ orgId: "   " } as Parameters<typeof init>[0]);

      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("orgId")
      );
    });

    it("validates position values", async () => {
      const { init } = await import("./main");
      
      // Call with invalid position
      init({ 
        orgId: "valid-org",
        position: "invalid-position" as "bottom-right" | "bottom-left"
      });

      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("position")
      );
    });

    it("validates triggerDelay is non-negative", async () => {
      const { init } = await import("./main");
      
      // Call with negative triggerDelay
      init({ 
        orgId: "valid-org",
        triggerDelay: -5
      });

      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("triggerDelay")
      );
    });

    it("accepts valid position values", async () => {
      const { init } = await import("./main");
      
      init({ 
        orgId: "valid-org",
        position: "bottom-left"
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(document.getElementById("greetnow-widget")).not.toBeNull();
    });

    it("handles missing config object", async () => {
      const { init } = await import("./main");
      
      init(null as unknown as Parameters<typeof init>[0]);

      expect(console.error).toHaveBeenCalledWith(
        "[GreetNow]",
        expect.stringContaining("configuration")
      );
    });
  });

  // =============================================================================
  // init TESTS
  // =============================================================================

  describe("init", () => {
    beforeEach(() => {
      // Clear any existing widget
      const existing = document.getElementById("greetnow-widget");
      if (existing) existing.remove();
    });

    it("4. Prevents duplicate initialization (checks existing element)", async () => {
      const { init } = await import("./main");
      
      // First init
      init({ orgId: "org-1", serverUrl: "http://localhost:3001" });
      
      expect(document.getElementById("greetnow-widget")).not.toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        "[GreetNow] Widget initialized",
        expect.any(Object)
      );

      // Reset mock to track second call
      vi.mocked(console.warn).mockClear();
      vi.mocked(console.log).mockClear();

      // Second init attempt
      init({ orgId: "org-2", serverUrl: "http://localhost:3001" });

      // Should warn about duplicate
      expect(console.warn).toHaveBeenCalledWith("[GreetNow] Widget already initialized");
      
      // Should only have one widget container
      expect(document.querySelectorAll("#greetnow-widget").length).toBe(1);
    });

    it("5. Creates Shadow DOM container", async () => {
      const { init } = await import("./main");
      
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });

      const container = document.getElementById("greetnow-widget");
      expect(container).not.toBeNull();
      
      // Check shadow root exists
      expect(container?.shadowRoot).toBeTruthy();
      expect(container?.shadowRoot?.mode).toBe("open");
    });

    it("6. Injects styles into shadow root", async () => {
      const { init } = await import("./main");
      const { getWidgetStyles } = await import("./widget-styles");
      
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });

      const container = document.getElementById("greetnow-widget");
      const shadowRoot = container?.shadowRoot;
      
      // Should have style element
      const styleElement = shadowRoot?.querySelector("style");
      expect(styleElement).not.toBeNull();
      
      // Should have called getWidgetStyles
      expect(getWidgetStyles).toHaveBeenCalled();
    });

    it("creates render target in shadow root", async () => {
      const { init } = await import("./main");
      
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });

      const container = document.getElementById("greetnow-widget");
      const shadowRoot = container?.shadowRoot;
      
      // Should have render target
      const renderTarget = shadowRoot?.getElementById("greetnow-root");
      expect(renderTarget).not.toBeNull();
    });

    it("appends container to document body", async () => {
      const { init } = await import("./main");
      
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });

      const container = document.getElementById("greetnow-widget");
      expect(container?.parentElement).toBe(document.body);
    });

    it("logs initialization with config details", async () => {
      const { init } = await import("./main");
      
      init({ 
        orgId: "org-123", 
        serverUrl: "http://localhost:3001",
        position: "bottom-left"
      });

      expect(console.log).toHaveBeenCalledWith(
        "[GreetNow] Widget initialized",
        expect.objectContaining({
          orgId: "org-123",
          position: "bottom-left"
        })
      );
    });
  });

  // =============================================================================
  // destroy TESTS
  // =============================================================================

  describe("destroy", () => {
    it("removes widget container from DOM", async () => {
      const { init, destroy } = await import("./main");
      
      // First create a widget
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });
      expect(document.getElementById("greetnow-widget")).not.toBeNull();

      // Destroy it
      destroy();

      expect(document.getElementById("greetnow-widget")).toBeNull();
    });

    it("logs destruction message", async () => {
      const { init, destroy } = await import("./main");
      
      init({ orgId: "org-123", serverUrl: "http://localhost:3001" });
      vi.mocked(console.log).mockClear();
      
      destroy();

      expect(console.log).toHaveBeenCalledWith("[GreetNow] Widget destroyed");
    });

    it("handles destroy when no widget exists", async () => {
      const { destroy } = await import("./main");
      
      // Ensure no widget exists
      const existing = document.getElementById("greetnow-widget");
      if (existing) existing.remove();

      // Should not throw
      expect(() => destroy()).not.toThrow();
    });

    it("removes legacy ghost-greeter-widget container", async () => {
      // Create legacy container manually
      const legacyContainer = document.createElement("div");
      legacyContainer.id = "ghost-greeter-widget";
      document.body.appendChild(legacyContainer);

      const { destroy } = await import("./main");
      
      destroy();

      expect(document.getElementById("ghost-greeter-widget")).toBeNull();
    });
  });

  // =============================================================================
  // Global API TESTS
  // =============================================================================

  describe("Global API", () => {
    it("exposes GreetNow.init on window", async () => {
      await import("./main");
      
      expect(window.GreetNow).toBeDefined();
      expect(typeof window.GreetNow?.init).toBe("function");
    });

    it("exposes GreetNow.destroy on window", async () => {
      await import("./main");
      
      expect(window.GreetNow).toBeDefined();
      expect(typeof window.GreetNow?.destroy).toBe("function");
    });

    it("exposes legacy GhostGreeter API for backwards compatibility", async () => {
      await import("./main");
      
      expect(window.GhostGreeter).toBeDefined();
      expect(typeof window.GhostGreeter?.init).toBe("function");
      expect(typeof window.GhostGreeter?.destroy).toBe("function");
    });
  });
});





