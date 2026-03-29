import styles from './Toolbar.module.css';

interface ToolbarProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function Toolbar({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeave,
}: ToolbarProps): JSX.Element {
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
