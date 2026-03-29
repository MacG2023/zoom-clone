import { useEffect, useRef, useState } from 'react';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream: MediaStream | null;
  displayName: string;
  isSelf?: boolean;
  muted?: boolean;
  showVideoOnly?: boolean; // only show video if there's an active video track
}

export function VideoTile({ stream, displayName, isSelf = false, muted = false, showVideoOnly = false }: VideoTileProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    // Check if stream has an active (enabled + not ended) video track
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const active = videoTrack && videoTrack.enabled && videoTrack.readyState === 'live';
      setHasVideo(!!active);

      // Listen for track changes
      const onEnded = () => setHasVideo(false);
      const onMute = () => setHasVideo(false);
      const onUnmute = () => setHasVideo(true);

      if (videoTrack) {
        videoTrack.addEventListener('ended', onEnded);
        videoTrack.addEventListener('mute', onMute);
        videoTrack.addEventListener('unmute', onUnmute);
        return () => {
          videoTrack.removeEventListener('ended', onEnded);
          videoTrack.removeEventListener('mute', onMute);
          videoTrack.removeEventListener('unmute', onUnmute);
        };
      }
    } else {
      setHasVideo(false);
    }
  }, [stream]);

  const showVideo = stream && (!showVideoOnly || hasVideo);

  return (
    <div className={styles.tile}>
      {showVideo ? (
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
