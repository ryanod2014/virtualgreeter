import { useEffect, useRef } from "preact/hooks";

interface LiveCallViewProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

export function LiveCallView({
  localStream,
  remoteStream,
  isConnecting,
  isConnected,
  error,
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
      />

      {/* Placeholder when no remote stream */}
      {!remoteStream && (
        <div className="gg-click-to-play" style={{ cursor: "default" }}>
          {error ? (
            // Error state
            <>
              <div
                className="gg-play-icon"
                style={{ background: "rgba(239, 68, 68, 0.2)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#ef4444", padding: "0 16px", textAlign: "center" }}>
                {error}
              </span>
            </>
          ) : isConnecting ? (
            // Connecting state
            <>
              <div
                className="gg-play-icon"
                style={{ animation: "pulseSoft 1.5s ease-in-out infinite" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                Connecting camera...
              </span>
            </>
          ) : (
            // Waiting state
            <>
              <div className="gg-play-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                Waiting for agent video...
              </span>
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
          />
        </div>
      )}

      {/* Live badge */}
      <div className="gg-live-badge">
        <span className="gg-live-dot" style={{ background: error ? "#888" : "#ef4444" }} />
        {error ? "ERROR" : "LIVE"}
      </div>

      {/* Connection status */}
      {isConnected && !error && (
        <div className="gg-connected-badge">
          <span className="gg-connected-dot" />
          Connected
        </div>
      )}
    </>
  );
}
