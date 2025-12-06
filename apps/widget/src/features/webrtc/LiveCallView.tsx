import { useEffect, useRef } from "preact/hooks";
import { RecordingBadge } from "../call/RecordingBadge";

interface LiveCallViewProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onRetry?: () => void;
  isRecordingEnabled?: boolean;
}

export function LiveCallView({
  localStream,
  remoteStream,
  isConnecting,
  isConnected,
  error,
  onRetry,
  isRecordingEnabled = false,
}: LiveCallViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <>
      {/* Remote video (main view) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="gg-video"
        style={{ display: remoteStream ? "block" : "none" }}
        aria-label="Agent video"
      />

      {/* Placeholder when no remote stream */}
      {!remoteStream && (
        <div className="gg-click-to-play" style={{ cursor: "default" }} role="status">
          {error ? (
            // Error state with retry option
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              padding: "16px",
              textAlign: "center"
            }}>
              <div
                className="gg-play-icon"
                style={{ background: "rgba(251, 191, 36, 0.2)", marginBottom: "12px" }}
                aria-hidden="true"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#fbbf24",
                  marginBottom: "8px",
                  lineHeight: 1.4,
                }}
              >
                {error}
              </span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    marginTop: "8px",
                    padding: "8px 16px",
                    background: "rgba(99, 102, 241, 0.9)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Try Again
                </button>
              )}
            </div>
          ) : isConnecting ? (
            // Connecting state - friendlier message
            <>
              <div
                className="gg-play-icon"
                style={{ animation: "gg-pulseSoft 1.5s ease-in-out infinite" }}
                aria-hidden="true"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>Setting up video...</span>
              <span style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>This usually takes a few seconds</span>
            </>
          ) : (
            // Waiting state
            <>
              <div className="gg-play-icon" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>Connecting to agent...</span>
            </>
          )}
        </div>
      )}

      {/* Local video (PiP) */}
      {localStream && (
        <div className="gg-self-view gg-self-view-active">
          <video
            ref={localVideoRef}
            className="gg-self-video"
            autoPlay
            playsInline
            muted
            aria-label="Your camera"
          />
        </div>
      )}

      {/* Live badge */}
      <div className="gg-live-badge" aria-label={error ? "Call error" : "Live call"}>
        <span
          className="gg-live-dot"
          style={{ background: error ? "#888" : "#ef4444" }}
          aria-hidden="true"
        />
        {error ? "ERROR" : "LIVE"}
      </div>

      {/* Connection status */}
      {isConnected && !error && (
        <div className="gg-connected-badge" role="status">
          <span className="gg-connected-dot" aria-hidden="true" />
          Connected
        </div>
      )}

      {/* Recording badge - only shows when call is connected and recording is enabled */}
      {isConnected && !error && <RecordingBadge isRecording={isRecordingEnabled} />}
    </>
  );
}
