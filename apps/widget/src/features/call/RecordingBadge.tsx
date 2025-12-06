interface RecordingBadgeProps {
  isRecording: boolean;
}

export function RecordingBadge({ isRecording }: RecordingBadgeProps) {
  if (!isRecording) {
    return null;
  }

  return (
    <div className="gg-recording-badge" aria-label="This call is being recorded">
      <span className="gg-recording-dot" aria-hidden="true" />
      Recording
    </div>
  );
}
