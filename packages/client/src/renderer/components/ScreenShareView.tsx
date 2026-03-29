import { useEffect, useRef } from 'react';
import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../hooks/usePeerManager';
import styles from './ScreenShareView.module.css';

interface ScreenShareViewProps {
  sharedStream: MediaStream;
  sharerName: string;
  localStream: MediaStream | null;
  localDisplayName: string;
  remotePeers: RemotePeer[];
  onScreenClick?: (x: number, y: number, button: 'left' | 'right') => void;
  onScreenMouseMove?: (x: number, y: number) => void;
  isControlling?: boolean;
}

export function ScreenShareView({
  sharedStream,
  sharerName,
  localStream,
  localDisplayName,
  remotePeers,
  onScreenClick,
  onScreenMouseMove,
  isControlling = false,
}: ScreenShareViewProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = sharedStream;
    }
  }, [sharedStream]);

  const handleMouseEvent = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isControlling || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (e.type === 'click') {
      onScreenClick?.(x, y, 'left');
    } else if (e.type === 'contextmenu') {
      e.preventDefault();
      onScreenClick?.(x, y, 'right');
    } else if (e.type === 'mousemove') {
      onScreenMouseMove?.(x, y);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainView}>
        <div className={styles.sharerLabel}>{sharerName} is sharing their screen</div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`${styles.screenVideo} ${isControlling ? styles.controlling : ''}`}
          onClick={handleMouseEvent}
          onContextMenu={handleMouseEvent}
          onMouseMove={isControlling ? handleMouseEvent : undefined}
        />
      </div>
      <div className={styles.sidebar}>
        <VideoTile stream={localStream} displayName={localDisplayName} isSelf />
        {remotePeers.map((peer) => (
          <VideoTile
            key={peer.peerId}
            stream={peer.stream}
            displayName={peer.displayName}
          />
        ))}
      </div>
    </div>
  );
}
