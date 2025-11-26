interface UnmuteModalProps {
  agentName: string;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * UnmuteModal - "John is requesting to unmute" conversion modal
 * 
 * This is the key conversion point - the visitor has engaged
 * and now we're asking permission to connect them to a real agent.
 */
export function UnmuteModal({ agentName, onAccept, onCancel }: UnmuteModalProps) {
  return (
    <div className="gg-modal-overlay" onClick={onCancel}>
      <div className="gg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Pulsing video icon */}
        <div className="gg-modal-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>

        <h3 className="gg-modal-title">{agentName} is requesting to unmute</h3>
        
        <p className="gg-modal-text">
          Accept to start a live video conversation. Your camera will be enabled.
        </p>

        <div className="gg-modal-actions">
          <button
            className="gg-btn gg-btn-secondary"
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            Decline
          </button>
          <button
            className="gg-btn gg-btn-primary"
            onClick={onAccept}
            style={{ flex: 1 }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

