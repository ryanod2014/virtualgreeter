import { render } from "preact";
import { Widget } from "./Widget";
import { getWidgetStyles } from "./widget-styles";
import { CONFIG_DEFAULTS, ERROR_MESSAGES } from "./constants";

// Widget configuration from script tag or global
interface GhostGreeterConfig {
  orgId: string;
  serverUrl?: string;
  position?: "bottom-right" | "bottom-left";
  triggerDelay?: number;
}

declare global {
  interface Window {
    GhostGreeter?: {
      config?: GhostGreeterConfig;
      init?: (config: GhostGreeterConfig) => void;
      destroy?: () => void;
    };
  }
}

/**
 * Validates widget configuration and returns normalized config with defaults.
 * Throws descriptive errors for invalid configurations.
 */
function validateConfig(config: unknown): GhostGreeterConfig {
  // Check if config exists and is an object
  if (!config || typeof config !== "object") {
    throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} Missing configuration object.`);
  }

  const cfg = config as Record<string, unknown>;

  // Validate required orgId
  if (!cfg.orgId || typeof cfg.orgId !== "string" || cfg.orgId.trim() === "") {
    throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} 'orgId' is required and must be a non-empty string.`);
  }

  // Validate optional serverUrl
  if (cfg.serverUrl !== undefined) {
    if (typeof cfg.serverUrl !== "string") {
      throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} 'serverUrl' must be a string.`);
    }
    try {
      new URL(cfg.serverUrl);
    } catch {
      throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} 'serverUrl' must be a valid URL.`);
    }
  }

  // Validate optional position
  if (cfg.position !== undefined) {
    if (cfg.position !== "bottom-right" && cfg.position !== "bottom-left") {
      throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} 'position' must be "bottom-right" or "bottom-left".`);
    }
  }

  // Validate optional triggerDelay
  if (cfg.triggerDelay !== undefined) {
    if (typeof cfg.triggerDelay !== "number" || cfg.triggerDelay < 0) {
      throw new Error(`${ERROR_MESSAGES.INVALID_CONFIG} 'triggerDelay' must be a non-negative number.`);
    }
  }

  // Return normalized config with defaults
  return {
    orgId: cfg.orgId.trim(),
    serverUrl: (cfg.serverUrl as string | undefined) ?? CONFIG_DEFAULTS.serverUrl,
    position: (cfg.position as "bottom-right" | "bottom-left" | undefined) ?? CONFIG_DEFAULTS.position,
    triggerDelay: (cfg.triggerDelay as number | undefined) ?? CONFIG_DEFAULTS.triggerDelay,
  };
}

/**
 * Initialize the widget with the given configuration.
 * Creates a Shadow DOM container for style isolation.
 */
function init(rawConfig: GhostGreeterConfig): void {
  // Validate configuration
  let config: GhostGreeterConfig;
  try {
    config = validateConfig(rawConfig);
  } catch (error) {
    console.error("[Ghost-Greeter]", error instanceof Error ? error.message : "Configuration error");
    return;
  }

  // Prevent duplicate initialization
  if (document.getElementById("ghost-greeter-widget")) {
    console.warn("[Ghost-Greeter] Widget already initialized");
    return;
  }

  // Create container
  const container = document.createElement("div");
  container.id = "ghost-greeter-widget";
  document.body.appendChild(container);

  // Create shadow root for style isolation
  const shadow = container.attachShadow({ mode: "open" });

  // Create style element with extracted styles
  const style = document.createElement("style");
  style.textContent = getWidgetStyles();
  shadow.appendChild(style);

  // Create render target
  const root = document.createElement("div");
  root.id = "ghost-greeter-root";
  shadow.appendChild(root);

  // Render widget
  render(<Widget config={config} />, root);

  console.log("[Ghost-Greeter] Widget initialized", { orgId: config.orgId, position: config.position });
}

/**
 * Destroy the widget and clean up.
 */
function destroy(): void {
  const container = document.getElementById("ghost-greeter-widget");
  if (container) {
    container.remove();
    console.log("[Ghost-Greeter] Widget destroyed");
  }
}

// Auto-init if config is already set
if (window.GhostGreeter?.config) {
  // Use requestAnimationFrame to ensure DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.GhostGreeter?.config) {
        init(window.GhostGreeter.config);
      }
    });
  } else {
    init(window.GhostGreeter.config);
  }
}

// Expose API
window.GhostGreeter = {
  ...window.GhostGreeter,
  init,
  destroy,
};

// Process queued commands from the embed snippet
// The embed snippet uses: gg('init', { orgId: '...', serverUrl: '...' })
// which queues commands as: gg.q = [Arguments, Arguments, ...]
// where each Arguments is like {0: 'command', 1: config, ...}
declare global {
  interface Window {
    gg?: ((...args: unknown[]) => void) & {
      q?: IArguments[];
    };
  }
}

function processQueue(): void {
  try {
    const ggFunc = window.gg as (((...args: unknown[]) => void) & { q?: IArguments[] }) | undefined;
    const queue = ggFunc?.q;
    
    if (queue && Array.isArray(queue) && queue.length > 0) {
      console.log("[Ghost-Greeter] Processing queued commands:", queue.length);
      
      for (let i = 0; i < queue.length; i++) {
        const args = queue[i];
        // Args is an Arguments object (array-like)
        const command = args[0];
        const config = args[1];
        
        console.log("[Ghost-Greeter] Queue item:", { command, config });
        
        if (command === "init" && config) {
          init(config as GhostGreeterConfig);
        }
      }
    } else {
      console.log("[Ghost-Greeter] No queued commands found");
    }
  } catch (e) {
    console.error("[Ghost-Greeter] Error processing queue:", e);
  }

  // Replace the queue function with a real implementation
  window.gg = function (...args: unknown[]) {
    const command = args[0];
    const config = args[1];
    
    if (command === "init" && config) {
      init(config as GhostGreeterConfig);
    } else if (command === "destroy") {
      destroy();
    }
  };
}

// Process queue when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", processQueue);
} else {
  processQueue();
}

export { init, destroy };
