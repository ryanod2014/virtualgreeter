/**
 * Widget Styles
 * 
 * Extracted from inline styles for maintainability.
 * Uses CSS custom properties for theming support.
 * 
 * Note: These styles are injected into the Shadow DOM for isolation
 * from the host website's styles.
 */

import { DIMENSIONS, Z_INDEX, ANIMATION_TIMING } from "./constants";

/**
 * CSS Custom Properties for theming
 * These can be overridden by businesses in their widget config
 */
const CSS_VARIABLES = `
  :host {
    /* Base colors */
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
    
    /* Dimensions */
    --gg-widget-width: ${DIMENSIONS.WIDGET_WIDTH}px;
    --gg-border-radius: 20px;
    --gg-border-radius-sm: 12px;
    --gg-control-size: ${DIMENSIONS.CONTROL_BUTTON_SIZE}px;
    
    /* Shadows */
    --gg-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    --gg-shadow-md: 0 4px 20px rgba(99, 102, 241, 0.4);
    --gg-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.3);
    
    /* Transitions */
    --gg-transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    --gg-transition-fast: 0.2s ease;
  }
`;

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

  .gg-widget.gg-dragging {
    transition: none;
    cursor: grabbing;
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
    width: ${DIMENSIONS.SELF_VIEW_SIZE_FULLSCREEN}px;
    height: ${DIMENSIONS.SELF_VIEW_SIZE_FULLSCREEN}px;
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
    width: ${DIMENSIONS.VIDEO_CONTROL_BUTTON_SIZE}px;
    height: ${DIMENSIONS.VIDEO_CONTROL_BUTTON_SIZE}px;
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
    font-size: 16px;
    font-weight: 600;
    color: var(--gg-text);
    margin-bottom: 4px;
  }

  .gg-agent-status {
    font-size: 13px;
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
    width: ${DIMENSIONS.MINIMIZED_BUTTON_SIZE}px;
    height: ${DIMENSIONS.MINIMIZED_BUTTON_SIZE}px;
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
  }

  .gg-minimized:hover {
    transform: scale(1.05);
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
    width: ${DIMENSIONS.SELF_VIEW_SIZE}px;
    height: ${DIMENSIONS.SELF_VIEW_SIZE}px;
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
  ].join("\n");
}

