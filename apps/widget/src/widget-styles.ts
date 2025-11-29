/**
 * Widget Styles
 * 
 * Extracted from inline styles for maintainability.
 * Uses CSS custom properties for theming support.
 * 
 * Note: These styles are injected into the Shadow DOM for isolation
 * from the host website's styles.
 */

import { SIZE_DIMENSIONS, Z_INDEX, ANIMATION_TIMING } from "./constants";

/**
 * CSS Custom Properties for theming
 * These can be overridden by businesses in their widget config
 * Size-specific variables are set dynamically via inline styles
 */
const CSS_VARIABLES = `
  :host {
    /* Base colors - Dark theme (default) */
    --gg-bg: #0f0f14;
    --gg-surface: #1a1a24;
    --gg-border: #2a2a3a;
    
    /* Text colors */
    --gg-text: #e4e4eb;
    --gg-text-muted: #8888a0;
    
    /* Brand colors */
    --gg-primary: #6366f1;
    --gg-primary-hover: #4f46e5;
    --gg-secondary: #8b5cf6;
    --gg-success: #22c55e;
    --gg-error: #ef4444;
    --gg-error-hover: #dc2626;
    
    /* Dimensions - defaults (medium), can be overridden via inline styles */
    --gg-widget-width: ${SIZE_DIMENSIONS.medium.widgetWidth}px;
    --gg-border-radius: ${SIZE_DIMENSIONS.medium.borderRadius}px;
    --gg-border-radius-sm: ${SIZE_DIMENSIONS.medium.borderRadiusSm}px;
    --gg-control-size: ${SIZE_DIMENSIONS.medium.controlButtonSize}px;
    --gg-self-view-size: ${SIZE_DIMENSIONS.medium.selfViewSize}px;
    --gg-self-view-size-fs: ${SIZE_DIMENSIONS.medium.selfViewSizeFullscreen}px;
    --gg-video-control-size: ${SIZE_DIMENSIONS.medium.videoControlButtonSize}px;
    --gg-minimized-size: ${SIZE_DIMENSIONS.medium.minimizedButtonSize}px;
    --gg-agent-name-size: ${SIZE_DIMENSIONS.medium.agentNameSize}px;
    --gg-agent-status-size: ${SIZE_DIMENSIONS.medium.agentStatusSize}px;
    
    /* Shadows */
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.4);
    --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.3);
    
    /* Transitions */
    --gg-transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    --gg-transition-fast: 0.2s ease;
  }

  /* Light theme - host selector */
  :host(.gg-theme-light) {
    /* Base colors - Light theme */
    --gg-bg: #ffffff;
    --gg-surface: #f8f9fa;
    --gg-border: #e5e7eb;
    
    /* Text colors */
    --gg-text: #1f2937;
    --gg-text-muted: #6b7280;
    
    /* Shadows - lighter for light theme */
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.25);
    --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* Light theme - widget class selector (fallback) */
  .gg-widget.gg-theme-light {
    --gg-bg: #ffffff;
    --gg-surface: #f8f9fa;
    --gg-border: #e5e7eb;
    --gg-text: #1f2937;
    --gg-text-muted: #6b7280;
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.25);
    --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* Auto theme - follows system preference (host selector) */
  @media (prefers-color-scheme: light) {
    :host(.gg-theme-auto) {
      /* Base colors - Light theme */
      --gg-bg: #ffffff;
      --gg-surface: #f8f9fa;
      --gg-border: #e5e7eb;
      
      /* Text colors */
      --gg-text: #1f2937;
      --gg-text-muted: #6b7280;
      
      /* Shadows - lighter for light theme */
      --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.25);
      --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    /* Auto theme - widget class selector (fallback) */
    .gg-widget.gg-theme-auto {
      --gg-bg: #ffffff;
      --gg-surface: #f8f9fa;
      --gg-border: #e5e7eb;
      --gg-text: #1f2937;
      --gg-text-muted: #6b7280;
      --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.25);
      --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  /* Liquid Glass theme - frosted glass effect (host selector) */
  :host(.gg-theme-liquid-glass) {
    /* Base colors - translucent with blur */
    --gg-bg: rgba(255, 255, 255, 0.18);
    --gg-surface: rgba(255, 255, 255, 0.12);
    --gg-border: rgba(255, 255, 255, 0.3);
    
    /* Text colors */
    --gg-text: rgba(255, 255, 255, 0.95);
    --gg-text-muted: rgba(255, 255, 255, 0.7);
    
    /* Shadows - ethereal glow */
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05);
    --gg-shadow-md: 0 8px 32px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15);
    --gg-shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  /* Liquid Glass theme - widget class selector (fallback) */
  .gg-widget.gg-theme-liquid-glass {
    --gg-bg: rgba(255, 255, 255, 0.18);
    --gg-surface: rgba(255, 255, 255, 0.12);
    --gg-border: rgba(255, 255, 255, 0.3);
    --gg-text: rgba(255, 255, 255, 0.95);
    --gg-text-muted: rgba(255, 255, 255, 0.7);
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05);
    --gg-shadow-md: 0 8px 32px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15);
    --gg-shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.25);
  }
`;

/**
 * Get CSS variables for a specific widget size
 */
export function getSizeStyles(size: "small" | "medium" | "large"): string {
  const dims = SIZE_DIMENSIONS[size];
  return `
    --gg-widget-width: ${dims.widgetWidth}px;
    --gg-border-radius: ${dims.borderRadius}px;
    --gg-border-radius-sm: ${dims.borderRadiusSm}px;
    --gg-control-size: ${dims.controlButtonSize}px;
    --gg-self-view-size: ${dims.selfViewSize}px;
    --gg-self-view-size-fs: ${dims.selfViewSizeFullscreen}px;
    --gg-video-control-size: ${dims.videoControlButtonSize}px;
    --gg-minimized-size: ${dims.minimizedButtonSize}px;
    --gg-agent-name-size: ${dims.agentNameSize}px;
    --gg-agent-status-size: ${dims.agentStatusSize}px;
  `;
}

/**
 * Reset styles for Shadow DOM isolation
 */
const RESET_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  /* Focus visible for accessibility */
  :focus-visible {
    outline: 2px solid var(--gg-primary);
    outline-offset: 2px;
  }
  
  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/**
 * Widget container styles
 */
const WIDGET_STYLES = `
  .gg-widget {
    position: fixed;
    z-index: ${Z_INDEX.WIDGET};
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: var(--gg-transition);
  }

  .gg-widget.bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .gg-widget.bottom-left {
    bottom: 20px;
    left: 20px;
  }

  .gg-widget.top-right {
    top: 20px;
    right: 20px;
  }

  .gg-widget.top-left {
    top: 20px;
    left: 20px;
  }

  .gg-widget.center {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .gg-widget.center.gg-dragging,
  .gg-widget.center.gg-snapping {
    transform: none;
  }

  .gg-widget.gg-dragging {
    transition: none;
    cursor: grabbing;
  }

  .gg-widget.gg-snapping {
    transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                top 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .gg-widget.gg-fullscreen {
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    padding: 0;
  }

  .gg-widget.gg-fullscreen .gg-container {
    width: 100%;
    height: 100%;
    max-width: 100%;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }

  .gg-widget.gg-fullscreen .gg-video-container {
    flex: 1;
    aspect-ratio: auto;
  }

  .gg-widget.gg-fullscreen .gg-self-view {
    width: var(--gg-self-view-size-fs);
    height: var(--gg-self-view-size-fs);
    bottom: 100px;
    right: 40px;
    border-radius: 16px;
  }

  .gg-widget.gg-fullscreen .gg-video-controls {
    top: 20px;
    right: 20px;
  }

  .gg-widget.gg-fullscreen .gg-video-control-btn {
    width: 44px;
    height: 44px;
  }

  .gg-widget.gg-fullscreen .gg-live-badge {
    top: 20px;
    left: 20px;
    padding: 8px 14px;
    font-size: 14px;
  }
`;

/**
 * Main container styles
 */
const CONTAINER_STYLES = `
  .gg-container {
    width: var(--gg-widget-width);
    background: var(--gg-bg);
    border-radius: var(--gg-border-radius);
    overflow: hidden;
    box-shadow: var(--gg-shadow-lg);
    animation: gg-slideUp ${ANIMATION_TIMING.WIDGET_ENTRANCE}ms cubic-bezier(0.16, 1, 0.3, 1);
    cursor: grab;
    user-select: none;
  }

  .gg-container:active {
    cursor: grabbing;
  }

  /* Buttons should have pointer cursor, not grab */
  .gg-container button,
  .gg-container video {
    cursor: pointer;
  }

  @keyframes gg-slideUp {
    0% { transform: translateY(100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
`;

/**
 * Video area styles
 */
const VIDEO_STYLES = `
  .gg-video-container {
    position: relative;
    aspect-ratio: 4/3;
    background: var(--gg-surface);
    overflow: hidden;
  }

  .gg-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gg-video-hidden {
    opacity: 0;
    position: absolute;
    pointer-events: none;
  }

  /* Video Controls - top right overlay */
  .gg-video-controls {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: ${Z_INDEX.VIDEO_CONTROLS};
  }

  .gg-video-control-btn {
    width: var(--gg-video-control-size);
    height: var(--gg-video-control-size);
    border: none;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: var(--gg-transition-fast);
  }

  .gg-video-control-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    transform: scale(1.05);
  }
`;

/**
 * Live badge and status indicators
 */
const BADGE_STYLES = `
  .gg-live-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    padding: 6px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }

  .gg-live-dot {
    width: 8px;
    height: 8px;
    background: var(--gg-error);
    border-radius: 50%;
    animation: gg-pulseSoft 2s ease-in-out infinite;
  }

  @keyframes gg-pulseSoft {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Connected badge */
  .gg-connected-badge {
    position: absolute;
    top: 12px;
    right: 50px;
    background: rgba(34, 197, 94, 0.2);
    backdrop-filter: blur(8px);
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--gg-success);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .gg-connected-dot {
    width: 6px;
    height: 6px;
    background: var(--gg-success);
    border-radius: 50%;
  }
`;

/**
 * Agent info section
 */
const AGENT_INFO_STYLES = `
  .gg-agent-info {
    padding: 16px;
    border-bottom: 1px solid var(--gg-border);
  }

  .gg-agent-name {
    font-size: var(--gg-agent-name-size);
    font-weight: 600;
    color: var(--gg-text);
    margin-bottom: 4px;
  }

  .gg-agent-status {
    font-size: var(--gg-agent-status-size);
    color: var(--gg-success);
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

/**
 * Button styles
 */
const BUTTON_STYLES = `
  .gg-actions {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gg-btn {
    width: 100%;
    padding: 14px 20px;
    border-radius: var(--gg-border-radius-sm);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--gg-transition-fast);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .gg-btn-primary {
    background: linear-gradient(135deg, var(--gg-primary) 0%, var(--gg-secondary) 100%);
    color: white;
  }

  .gg-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--gg-shadow-md);
  }

  .gg-btn-secondary {
    background: var(--gg-surface);
    color: var(--gg-text-muted);
    border: 1px solid var(--gg-border);
  }

  .gg-btn-secondary:hover {
    background: var(--gg-border);
    color: var(--gg-text);
  }
`;

/**
 * Modal styles
 */
const MODAL_STYLES = `
  .gg-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: gg-fadeIn 0.2s ease-out;
  }

  @keyframes gg-fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .gg-modal {
    background: var(--gg-bg);
    border-radius: var(--gg-border-radius);
    padding: 24px;
    width: 300px;
    text-align: center;
    box-shadow: var(--gg-shadow-lg);
  }

  .gg-modal-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--gg-primary) 0%, var(--gg-secondary) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    animation: gg-pulseSoft 2s ease-in-out infinite;
  }

  .gg-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--gg-text);
    margin-bottom: 8px;
  }

  .gg-modal-text {
    font-size: 14px;
    color: var(--gg-text-muted);
    margin-bottom: 20px;
  }

  .gg-modal-actions {
    display: flex;
    gap: 12px;
  }
`;

/**
 * Minimized state
 */
const MINIMIZED_STYLES = `
  .gg-minimized {
    position: relative;
    width: var(--gg-minimized-size);
    height: var(--gg-minimized-size);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gg-primary) 0%, var(--gg-secondary) 100%);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--gg-shadow-md);
    transition: transform var(--gg-transition-fast);
    animation: gg-slideUp ${ANIMATION_TIMING.WIDGET_ENTRANCE}ms cubic-bezier(0.16, 1, 0.3, 1);
    border: none;
    overflow: hidden;
  }

  .gg-minimized:hover {
    transform: scale(1.05);
  }

  /* When minimized, always position at bottom-right */
  .gg-minimized.gg-minimized-bottom-right {
    position: fixed;
    bottom: 20px;
    right: 20px;
    left: auto;
    top: auto;
  }

  /* Agent avatar in minimized button */
  .gg-minimized-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  /* Loop video in minimized button */
  .gg-minimized-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  /* Pulse animation ring */
  .gg-minimized-pulse {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--gg-primary);
    animation: gg-minimized-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    pointer-events: none;
  }

  @keyframes gg-minimized-ping {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    75%, 100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }
`;

/**
 * Light theme specific overrides
 * These handle elements that need special treatment beyond CSS variables
 * Supports both :host() selector and .gg-widget class selector for compatibility
 */
const LIGHT_THEME_OVERRIDES = `
  /* Light theme container border */
  :host(.gg-theme-light) .gg-container,
  .gg-widget.gg-theme-light .gg-container {
    border: 1px solid var(--gg-border);
  }

  :host(.gg-theme-auto) .gg-container,
  .gg-widget.gg-theme-auto .gg-container {
    border: 1px solid var(--gg-border);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-container,
    .gg-widget.gg-theme-auto .gg-container {
      border: none;
    }
  }

  /* Light theme video controls */
  :host(.gg-theme-light) .gg-video-control-btn,
  .gg-widget.gg-theme-light .gg-video-control-btn {
    background: rgba(255, 255, 255, 0.85);
    color: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :host(.gg-theme-light) .gg-video-control-btn:hover,
  .gg-widget.gg-theme-light .gg-video-control-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    color: #000;
  }

  :host(.gg-theme-auto) .gg-video-control-btn,
  .gg-widget.gg-theme-auto .gg-video-control-btn {
    background: rgba(255, 255, 255, 0.85);
    color: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :host(.gg-theme-auto) .gg-video-control-btn:hover,
  .gg-widget.gg-theme-auto .gg-video-control-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    color: #000;
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-video-control-btn,
    .gg-widget.gg-theme-auto .gg-video-control-btn {
      background: rgba(0, 0, 0, 0.6);
      color: rgba(255, 255, 255, 0.8);
      border: none;
    }
    :host(.gg-theme-auto) .gg-video-control-btn:hover,
    .gg-widget.gg-theme-auto .gg-video-control-btn:hover {
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
    }
  }

  /* Light theme self view */
  :host(.gg-theme-light) .gg-self-view,
  .gg-widget.gg-theme-light .gg-self-view {
    border-color: rgba(0, 0, 0, 0.1);
    background: #f3f4f6;
  }

  :host(.gg-theme-light) .gg-self-view-active,
  .gg-widget.gg-theme-light .gg-self-view-active {
    border-color: rgba(99, 102, 241, 0.5);
  }

  :host(.gg-theme-auto) .gg-self-view,
  .gg-widget.gg-theme-auto .gg-self-view {
    border-color: rgba(0, 0, 0, 0.1);
    background: #f3f4f6;
  }

  :host(.gg-theme-auto) .gg-self-view-active,
  .gg-widget.gg-theme-auto .gg-self-view-active {
    border-color: rgba(99, 102, 241, 0.5);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-self-view,
    .gg-widget.gg-theme-auto .gg-self-view {
      border-color: rgba(255, 255, 255, 0.1);
      background: var(--gg-surface);
    }
  }

  /* Light theme control buttons */
  :host(.gg-theme-light) .gg-control-off,
  .gg-widget.gg-theme-light .gg-control-off {
    background: rgba(239, 68, 68, 0.1);
  }

  :host(.gg-theme-light) .gg-control-on,
  .gg-widget.gg-theme-light .gg-control-on {
    background: rgba(34, 197, 94, 0.1);
  }

  :host(.gg-theme-auto) .gg-control-off,
  .gg-widget.gg-theme-auto .gg-control-off {
    background: rgba(239, 68, 68, 0.1);
  }

  :host(.gg-theme-auto) .gg-control-on,
  .gg-widget.gg-theme-auto .gg-control-on {
    background: rgba(34, 197, 94, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-control-off,
    .gg-widget.gg-theme-auto .gg-control-off {
      background: rgba(239, 68, 68, 0.2);
    }
    :host(.gg-theme-auto) .gg-control-on,
    .gg-widget.gg-theme-auto .gg-control-on {
      background: rgba(34, 197, 94, 0.2);
    }
  }

  /* Light theme badges */
  :host(.gg-theme-light) .gg-live-badge,
  .gg-widget.gg-theme-light .gg-live-badge {
    background: rgba(255, 255, 255, 0.9);
    color: #1f2937;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :host(.gg-theme-auto) .gg-live-badge,
  .gg-widget.gg-theme-auto .gg-live-badge {
    background: rgba(255, 255, 255, 0.9);
    color: #1f2937;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-live-badge,
    .gg-widget.gg-theme-auto .gg-live-badge {
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      border: none;
    }
  }

  /* Light theme waiting indicator */
  :host(.gg-theme-light) .gg-waiting-indicator,
  .gg-widget.gg-theme-light .gg-waiting-indicator {
    background: linear-gradient(to top, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
    color: var(--gg-text);
  }

  :host(.gg-theme-auto) .gg-waiting-indicator,
  .gg-widget.gg-theme-auto .gg-waiting-indicator {
    background: linear-gradient(to top, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
    color: var(--gg-text);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-waiting-indicator,
    .gg-widget.gg-theme-auto .gg-waiting-indicator {
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
      color: var(--gg-text);
    }
  }

  /* Light theme powered by footer */
  :host(.gg-theme-light) .gg-powered-by,
  .gg-widget.gg-theme-light .gg-powered-by {
    background: rgba(0, 0, 0, 0.03);
    border-top-color: var(--gg-border);
  }

  :host(.gg-theme-light) .gg-powered-by:hover,
  .gg-widget.gg-theme-light .gg-powered-by:hover {
    background: rgba(99, 102, 241, 0.05);
  }

  :host(.gg-theme-auto) .gg-powered-by,
  .gg-widget.gg-theme-auto .gg-powered-by {
    background: rgba(0, 0, 0, 0.03);
    border-top-color: var(--gg-border);
  }

  :host(.gg-theme-auto) .gg-powered-by:hover,
  .gg-widget.gg-theme-auto .gg-powered-by:hover {
    background: rgba(99, 102, 241, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    :host(.gg-theme-auto) .gg-powered-by,
    .gg-widget.gg-theme-auto .gg-powered-by {
      background: rgba(0, 0, 0, 0.3);
    }
    :host(.gg-theme-auto) .gg-powered-by:hover,
    .gg-widget.gg-theme-auto .gg-powered-by:hover {
      background: rgba(99, 102, 241, 0.1);
    }
  }

  /* Liquid Glass theme - container with backdrop blur and light refraction */
  :host(.gg-theme-liquid-glass) .gg-container,
  .gg-widget.gg-theme-liquid-glass .gg-container {
    backdrop-filter: blur(20px) saturate(200%) brightness(1.05);
    -webkit-backdrop-filter: blur(20px) saturate(200%) brightness(1.05);
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: 
      linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.15) 100%),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, transparent 30%);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.25),
      0 0 80px rgba(99, 102, 241, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.15),
      inset 0 2px 4px rgba(255, 255, 255, 0.25),
      inset 0 -1px 2px rgba(0, 0, 0, 0.1);
  }

  /* Liquid Glass video controls - with light refraction */
  :host(.gg-theme-liquid-glass) .gg-video-control-btn,
  .gg-widget.gg-theme-liquid-glass .gg-video-control-btn {
    background: 
      linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
    backdrop-filter: blur(8px) saturate(150%);
    -webkit-backdrop-filter: blur(8px) saturate(150%);
    color: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.15);
  }

  :host(.gg-theme-liquid-glass) .gg-video-control-btn:hover,
  .gg-widget.gg-theme-liquid-glass .gg-video-control-btn:hover {
    background: 
      linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.35);
  }

  /* Liquid Glass self view */
  :host(.gg-theme-liquid-glass) .gg-self-view,
  .gg-widget.gg-theme-liquid-glass .gg-self-view {
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  :host(.gg-theme-liquid-glass) .gg-self-view-active,
  .gg-widget.gg-theme-liquid-glass .gg-self-view-active {
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }

  /* Liquid Glass control buttons - with light refraction */
  :host(.gg-theme-liquid-glass) .gg-control-off,
  .gg-widget.gg-theme-liquid-glass .gg-control-off {
    background: 
      linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0.2) 100%);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.2),
      0 2px 8px rgba(239, 68, 68, 0.2);
  }

  :host(.gg-theme-liquid-glass) .gg-control-on,
  .gg-widget.gg-theme-liquid-glass .gg-control-on {
    background: 
      linear-gradient(135deg, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.2) 100%);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.2),
      0 2px 8px rgba(34, 197, 94, 0.2);
  }

  /* Liquid Glass badges - with light refraction */
  :host(.gg-theme-liquid-glass) .gg-live-badge,
  .gg-widget.gg-theme-liquid-glass .gg-live-badge {
    background: 
      linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
    backdrop-filter: blur(10px) saturate(150%);
    -webkit-backdrop-filter: blur(10px) saturate(150%);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      0 2px 6px rgba(0, 0, 0, 0.15);
  }

  /* Liquid Glass waiting indicator */
  :host(.gg-theme-liquid-glass) .gg-waiting-indicator,
  .gg-widget.gg-theme-liquid-glass .gg-waiting-indicator {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.2));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--gg-text);
  }

  /* Liquid Glass powered by footer - extra frosted */
  :host(.gg-theme-liquid-glass) .gg-powered-by,
  .gg-widget.gg-theme-liquid-glass .gg-powered-by {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border-top: 1px solid rgba(255, 255, 255, 0.25);
  }

  :host(.gg-theme-liquid-glass) .gg-powered-by:hover,
  .gg-widget.gg-theme-liquid-glass .gg-powered-by:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  /* Liquid Glass minimized button */
  :host(.gg-theme-liquid-glass) .gg-minimized,
  .gg-widget.gg-theme-liquid-glass .gg-minimized {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.6) 0%, rgba(139, 92, 246, 0.6) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  /* Liquid Glass agent info */
  :host(.gg-theme-liquid-glass) .gg-agent-info,
  .gg-widget.gg-theme-liquid-glass .gg-agent-info {
    background: rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* Liquid Glass call controls - minimal frosting */
  :host(.gg-theme-liquid-glass) .gg-call-controls,
  .gg-widget.gg-theme-liquid-glass .gg-call-controls {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Liquid Glass buttons */
  :host(.gg-theme-liquid-glass) .gg-btn-primary,
  .gg-widget.gg-theme-liquid-glass .gg-btn-primary {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  :host(.gg-theme-liquid-glass) .gg-btn-secondary,
  .gg-widget.gg-theme-liquid-glass .gg-btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--gg-text);
  }

  :host(.gg-theme-liquid-glass) .gg-btn-secondary:hover,
  .gg-widget.gg-theme-liquid-glass .gg-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
`;

/**
 * Muted overlay
 */
const MUTED_OVERLAY_STYLES = `
  .gg-muted-overlay {
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    border-radius: 24px;
    color: #fff;
    animation: gg-fadeIn 0.3s ease-out;
    z-index: 5;
  }

  .gg-muted-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    animation: gg-pulse 2s ease-in-out infinite;
    color: var(--gg-error);
  }

  @keyframes gg-pulse {
    0%, 100% { 
      opacity: 1;
      transform: scale(1);
    }
    50% { 
      opacity: 0.6;
      transform: scale(1.1);
    }
  }

  .gg-muted-text {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.9;
  }
`;

/**
 * Placeholder and loading states
 */
const PLACEHOLDER_STYLES = `
  .gg-video-placeholder {
    position: absolute;
    inset: 0;
    background: var(--gg-surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 12px;
  }

  .gg-placeholder-icon {
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Legacy placeholder (used by LiveCallView) */
  .gg-click-to-play {
    position: absolute;
    inset: 0;
    background: var(--gg-surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 12px;
  }

  .gg-play-icon {
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gg-video-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gg-surface);
  }

  .gg-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--gg-primary);
    border-radius: 50%;
    animation: gg-spin 1s linear infinite;
  }

  .gg-video-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gg-surface);
  }

  @keyframes gg-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

/**
 * Connecting overlay
 */
const CONNECTING_STYLES = `
  .gg-connecting-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 20, 0.85);
    backdrop-filter: blur(8px);
    z-index: ${Z_INDEX.CONNECTING_OVERLAY};
    animation: gg-fadeIn 0.3s ease-out;
  }

  .gg-connecting-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .gg-connecting-spinner {
    color: var(--gg-primary);
  }

  .gg-connecting-text {
    font-size: 16px;
    font-weight: 600;
    color: var(--gg-text);
  }

  .gg-connecting-subtext {
    font-size: 12px;
    color: var(--gg-text-muted);
  }
`;

/**
 * Self-view PiP
 */
const SELF_VIEW_STYLES = `
  .gg-self-view {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: var(--gg-self-view-size);
    height: var(--gg-self-view-size);
    border-radius: var(--gg-border-radius-sm);
    background: var(--gg-surface);
    border: 2px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .gg-self-view-active {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: var(--gg-shadow-sm);
  }

  .gg-self-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .gg-self-placeholder {
    color: #4a4a5a;
  }

  .gg-self-camera-off {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background: rgba(239, 68, 68, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
`;

/**
 * Call controls
 */
const CALL_CONTROLS_STYLES = `
  .gg-call-controls {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    background: var(--gg-bg);
  }

  .gg-control-btn {
    width: var(--gg-control-size);
    height: var(--gg-control-size);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--gg-transition-fast);
  }

  .gg-control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .gg-control-off {
    background: rgba(239, 68, 68, 0.2);
    color: var(--gg-error);
  }

  .gg-control-off:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
    transform: scale(1.05);
  }

  .gg-control-on {
    background: rgba(34, 197, 94, 0.2);
    color: var(--gg-success);
  }

  .gg-control-on:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.3);
    transform: scale(1.05);
  }

  .gg-control-end {
    background: var(--gg-error);
    color: white;
  }

  .gg-control-end:hover {
    background: var(--gg-error-hover);
    transform: scale(1.05);
  }

  .gg-control-screen-off {
    background: rgba(99, 102, 241, 0.2);
    color: var(--gg-primary);
  }

  .gg-control-screen-off:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.3);
    transform: scale(1.05);
  }

  .gg-control-screen-on {
    background: var(--gg-primary);
    color: white;
    animation: gg-pulseScreen 2s ease-in-out infinite;
  }

  .gg-control-screen-on:hover:not(:disabled) {
    background: var(--gg-primary-hover);
    transform: scale(1.05);
  }

  @keyframes gg-pulseScreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
  }
`;

/**
 * Waiting indicator
 */
const WAITING_STYLES = `
  .gg-waiting-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
    color: var(--gg-text);
    font-size: 13px;
  }

  .gg-waiting-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--gg-primary);
    border-radius: 50%;
    animation: gg-spin 1s linear infinite;
  }

  .gg-waiting-subtext {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 2px;
  }
`;

/**
 * Call timeout overlay - shown when connection takes too long
 */
const TIMEOUT_STYLES = `
  .gg-timeout-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(8px);
    z-index: ${Z_INDEX.CONNECTING_OVERLAY};
    animation: gg-fadeIn 0.3s ease-out;
  }

  .gg-timeout-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
    max-width: 280px;
  }

  .gg-timeout-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: #fbbf24;
  }

  .gg-timeout-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--gg-text);
    margin-bottom: 8px;
  }

  .gg-timeout-message {
    font-size: 13px;
    color: var(--gg-text-muted);
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .gg-timeout-actions {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  /* Button styles for timeout overlay */
  .gg-btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--gg-transition-fast);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .gg-btn-primary {
    background: var(--gg-primary);
    color: white;
  }

  .gg-btn-primary:hover {
    background: var(--gg-primary-hover);
    transform: translateY(-1px);
  }

  .gg-btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: var(--gg-text);
  }

  .gg-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

/**
 * Handoff message
 */
const HANDOFF_STYLES = `
  .gg-handoff-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
    max-width: 80%;
    line-height: 1.4;
    animation: gg-fadeInOut ${ANIMATION_TIMING.HANDOFF_MESSAGE_DURATION}ms ease-in-out;
    z-index: ${Z_INDEX.HANDOFF_MESSAGE};
  }

  @keyframes gg-fadeInOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  }
`;

/**
 * Error toast styles
 */
const ERROR_TOAST_STYLES = `
  .gg-error-toast {
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    max-width: 90%;
    animation: gg-fadeIn 0.3s ease-out;
    z-index: ${Z_INDEX.HANDOFF_MESSAGE};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gg-error-toast-dismiss {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
  }

  .gg-error-toast-dismiss:hover {
    opacity: 1;
  }
`;

/**
 * Powered by footer
 */
const POWERED_BY_STYLES = `
  .gg-powered-by {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.3);
    color: var(--gg-text-muted);
    font-size: 11px;
    text-decoration: none;
    cursor: pointer;
    transition: all var(--gg-transition-fast);
    border-top: 1px solid var(--gg-border);
  }

  .gg-powered-by:hover {
    background: rgba(99, 102, 241, 0.1);
    color: var(--gg-text);
  }

  .gg-powered-by:hover strong {
    color: var(--gg-primary);
  }

  .gg-powered-by strong {
    font-weight: 600;
    transition: color var(--gg-transition-fast);
  }

  .gg-powered-by svg {
    opacity: 0.5;
    transition: opacity var(--gg-transition-fast);
  }

  .gg-powered-by:hover svg {
    opacity: 0.8;
  }
`;

/**
 * Responsive styles
 */
const RESPONSIVE_STYLES = `
  @media (max-width: 400px) {
    .gg-container {
      width: calc(100vw - 40px);
    }
  }
`;

/**
 * Get all widget styles as a single string
 */
export function getWidgetStyles(): string {
  return [
    CSS_VARIABLES,
    RESET_STYLES,
    WIDGET_STYLES,
    CONTAINER_STYLES,
    VIDEO_STYLES,
    BADGE_STYLES,
    AGENT_INFO_STYLES,
    BUTTON_STYLES,
    MODAL_STYLES,
    MINIMIZED_STYLES,
    MUTED_OVERLAY_STYLES,
    PLACEHOLDER_STYLES,
    CONNECTING_STYLES,
    SELF_VIEW_STYLES,
    CALL_CONTROLS_STYLES,
    WAITING_STYLES,
    TIMEOUT_STYLES,
    HANDOFF_STYLES,
    ERROR_TOAST_STYLES,
    POWERED_BY_STYLES,
    RESPONSIVE_STYLES,
    LIGHT_THEME_OVERRIDES,
  ].join("\n");
}

