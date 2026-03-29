import { useEffect, useRef } from 'react';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream: MediaStream | null;
  displayName: string;
  isSelf?: boolean;
  muted?: boolean;
}

export function VideoTile({ stream, displayName, isSelf = false, muted = false }: VideoTileProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.tile}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf || muted}
          className={`${styles.video} ${isSelf ? styles.mirror : ''}`}
        />
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.avatar}>{displayName[0]?.toUpperCase()}</span>
        </div>
      )}
      <span className={styles.name}>{displayName}{isSelf ? ' (You)' : ''}</span>
    </div>
  );
}
