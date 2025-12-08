/**
 * RejoinPrompt - Visitor Call Rejoin UI (TKT-024)
 *
 * Shows a prompt when visitor returns after disconnecting during a call.
 * Gives them the option to rejoin the call within the 60-second window.
 *
 * UX Design:
 * - Clear call-to-action: "Rejoin Call" button
 * - Shows time remaining to rejoin
 * - Agent's name/avatar for context
 * - "No Thanks" option to dismiss
 */

import { useEffect, useState } from "preact/hooks";

interface RejoinPromptProps {
  agentName: string;
  agentAvatarUrl?: string;
  timeRemaining: number; // seconds
  onRejoin: () => void;
  onDecline: () => void;
}

export function RejoinPrompt({
  agentName,
  agentAvatarUrl,
  timeRemaining: initialTimeRemaining,
  onRejoin,
  onDecline,
}: RejoinPromptProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      onDecline(); // Auto-dismiss when time expires
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, onDecline]);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        maxWidth: "320px",
        width: "90%",
        zIndex: 10000,
      }}
      role="dialog"
      aria-labelledby="rejoin-title"
      aria-describedby="rejoin-description"
    >
      {/* Agent Avatar */}
      {agentAvatarUrl && (
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <img
            src={agentAvatarUrl}
            alt={agentName}
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* Title */}
      <h2
        id="rejoin-title"
        style={{
          margin: "0 0 8px 0",
          fontSize: "18px",
          fontWeight: "600",
          textAlign: "center",
          color: "#111827",
        }}
      >
        Your call is still active
      </h2>

      {/* Description */}
      <p
        id="rejoin-description"
        style={{
          margin: "0 0 16px 0",
          fontSize: "14px",
          textAlign: "center",
          color: "#6b7280",
          lineHeight: "1.5",
        }}
      >
        {agentName} is waiting for you to rejoin.
        <br />
        <span style={{ fontWeight: "500", color: "#111827" }}>
          {timeRemaining}s remaining
        </span>
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onRejoin}
          style={{
            flex: "1",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            color: "white",
            backgroundColor: "#6366f1",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "#6366f1";
          }}
          aria-label="Rejoin call"
        >
          Rejoin Call
        </button>
        <button
          onClick={onDecline}
          style={{
            flex: "0.5",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#6b7280",
            backgroundColor: "#f3f4f6",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "#e5e7eb";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
          }}
          aria-label="Decline rejoin"
        >
          No Thanks
        </button>
      </div>
    </div>
  );
}
