import { render } from "preact";
import { Widget } from "./Widget";
import "./styles.css";

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
    };
  }
}

// Initialize widget
function init(config: GhostGreeterConfig) {
  // Create container
  const container = document.createElement("div");
  container.id = "ghost-greeter-widget";
  document.body.appendChild(container);

  // Create shadow root for style isolation
  const shadow = container.attachShadow({ mode: "open" });

  // Create style element
  const style = document.createElement("style");
  style.textContent = getStyles();
  shadow.appendChild(style);

  // Create render target
  const root = document.createElement("div");
  root.id = "ghost-greeter-root";
  shadow.appendChild(root);

  // Render widget
  render(<Widget config={config} />, root);
}

// Get inline styles (in production, this would be the built CSS)
function getStyles() {
  return `
    :host {
      all: initial;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .gg-widget {
      position: fixed;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
      width: 200px;
      height: 200px;
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

    .gg-container {
      width: 320px;
      background: #0f0f14;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                  0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: grab;
      user-select: none;
    }

    .gg-container:active {
      cursor: grabbing;
    }

    /* Video Controls - top right overlay */
    .gg-video-controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      z-index: 10;
    }

    .gg-video-control-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .gg-video-control-btn:hover {
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      transform: scale(1.05);
    }

    /* Buttons should have pointer cursor, not grab */
    .gg-container button,
    .gg-container video {
      cursor: pointer;
    }

    @keyframes slideUp {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    .gg-video-container {
      position: relative;
      aspect-ratio: 4/3;
      background: #1a1a24;
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
      background: #ef4444;
      border-radius: 50%;
      animation: pulseSoft 2s ease-in-out infinite;
    }

    @keyframes pulseSoft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .gg-agent-info {
      padding: 16px;
      border-bottom: 1px solid #2a2a3a;
    }

    .gg-agent-name {
      font-size: 16px;
      font-weight: 600;
      color: #e4e4eb;
      margin-bottom: 4px;
    }

    .gg-agent-status {
      font-size: 13px;
      color: #22c55e;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .gg-actions {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gg-btn {
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .gg-btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }

    .gg-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .gg-btn-secondary {
      background: #1a1a24;
      color: #8888a0;
      border: 1px solid #2a2a3a;
    }

    .gg-btn-secondary:hover {
      background: #2a2a3a;
      color: #e4e4eb;
    }

    .gg-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    .gg-modal {
      background: #0f0f14;
      border-radius: 20px;
      padding: 24px;
      width: 300px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .gg-modal-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      animation: pulseSoft 2s ease-in-out infinite;
    }

    .gg-modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #e4e4eb;
      margin-bottom: 8px;
    }

    .gg-modal-text {
      font-size: 14px;
      color: #8888a0;
      margin-bottom: 20px;
    }

    .gg-modal-actions {
      display: flex;
      gap: 12px;
    }

    .gg-minimized {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .gg-minimized:hover {
      transform: scale(1.05);
    }

    /* Pulsing muted overlay */
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
      animation: fadeIn 0.3s ease-out;
      z-index: 5;
    }

    .gg-muted-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s ease-in-out infinite;
      color: #ef4444;
    }

    @keyframes pulse {
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
      color: #22c55e;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .gg-connected-dot {
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
    }

    /* Video placeholder states */
    .gg-video-placeholder {
      position: absolute;
      inset: 0;
      background: #1a1a24;
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
      background: #1a1a24;
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
      background: #1a1a24;
    }

    .gg-loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .gg-video-error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a24;
    }

    /* Connecting overlay - shown while WebRTC establishes connection */
    .gg-connecting-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 15, 20, 0.85);
      backdrop-filter: blur(8px);
      z-index: 15;
      animation: fadeIn 0.3s ease-out;
    }

    .gg-connecting-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }

    .gg-connecting-spinner {
      color: #6366f1;
    }

    .gg-connecting-text {
      font-size: 16px;
      font-weight: 600;
      color: #e4e4eb;
    }

    .gg-connecting-subtext {
      font-size: 12px;
      color: #8888a0;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Self-view Picture-in-Picture */
    .gg-self-view {
      position: absolute;
      bottom: 12px;
      right: 12px;
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background: #1a1a24;
      border: 2px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .gg-self-view-active {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

    /* Call Controls */
    .gg-call-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 16px;
      background: #0f0f14;
    }

    .gg-control-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .gg-control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .gg-control-off {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .gg-control-off:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.3);
      transform: scale(1.05);
    }

    .gg-control-on {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .gg-control-on:hover:not(:disabled) {
      background: rgba(34, 197, 94, 0.3);
      transform: scale(1.05);
    }

    .gg-control-end {
      background: #ef4444;
      color: white;
    }

    .gg-control-end:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    .gg-control-screen-off {
      background: rgba(99, 102, 241, 0.2);
      color: #6366f1;
    }

    .gg-control-screen-off:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.3);
      transform: scale(1.05);
    }

    .gg-control-screen-on {
      background: #6366f1;
      color: white;
      animation: pulseScreen 2s ease-in-out infinite;
    }

    .gg-control-screen-on:hover:not(:disabled) {
      background: #4f46e5;
      transform: scale(1.05);
    }

    @keyframes pulseScreen {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
    }

    /* Waiting Indicator */
    .gg-waiting-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
      color: #e4e4eb;
      font-size: 13px;
    }

    .gg-waiting-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .gg-waiting-indicator {
      flex-direction: column;
    }

    .gg-waiting-subtext {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 2px;
    }

    /* Agent Handoff Message */
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
      animation: fadeInOut 5s ease-in-out;
      z-index: 20;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }

    @media (max-width: 400px) {
      .gg-container {
        width: calc(100vw - 40px);
      }
    }
  `;
}

// Auto-init if config is already set
if (window.GhostGreeter?.config) {
  init(window.GhostGreeter.config);
}

// Expose init function
window.GhostGreeter = {
  ...window.GhostGreeter,
  init,
};

export { init };

