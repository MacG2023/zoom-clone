import { useState, useRef, useEffect } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  meetingId: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function Toolbar({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  participantCount,
  meetingId,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeave,
}: ToolbarProps): JSX.Element {
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPanel) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPanel]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`zoomclone://meeting/${meetingId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.btn} ${!audioEnabled ? styles.off : ''}`}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        <span className={styles.icon}>{audioEnabled ? '🎤' : '🔇'}</span>
        <span className={styles.label}>{audioEnabled ? 'Mute' : 'Unmute'}</span>
      </button>

      <button
        className={`${styles.btn} ${!videoEnabled ? styles.off : ''}`}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        <span className={styles.icon}>{videoEnabled ? '📷' : '📷'}</span>
        <span className={styles.label}>{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
      </button>

      <button
        className={`${styles.btn} ${isScreenSharing ? styles.active : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        <span className={styles.icon}>🖥️</span>
        <span className={styles.label}>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      <div className={styles.participantsWrapper} ref={panelRef}>
        <button
          className={`${styles.btn} ${showPanel ? styles.active : ''}`}
          onClick={() => setShowPanel(!showPanel)}
          title="Participants"
        >
          <span className={styles.icon}>👥</span>
          <span className={styles.label}>Participants ({participantCount})</span>
        </button>

        {showPanel && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span>Participants ({participantCount})</span>
            </div>
            <div className={styles.panelBody}>
              <button className={styles.copyBtn} onClick={handleCopyLink}>
                {copied ? '✓ Copied!' : '🔗 Copy Invite Link'}
              </button>
              <p className={styles.meetingIdText}>Meeting ID: {meetingId}</p>
            </div>
          </div>
        )}
      </div>

      <button
        className={`${styles.btn} ${styles.leave}`}
        onClick={onLeave}
        title="Leave meeting"
      >
        <span className={styles.icon}>📞</span>
        <span className={styles.label}>Leave</span>
      </button>
    </div>
  );
}
