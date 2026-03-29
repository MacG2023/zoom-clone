import { useEffect, useRef, useState } from 'react';
import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../hooks/usePeerManager';
import styles from './ScreenShareView.module.css';

interface SharedScreen {
  id: string;
  name: string;
  stream: MediaStream;
}

interface ScreenShareViewProps {
  sharedScreens: SharedScreen[];
  localStream: MediaStream | null;
  localDisplayName: string;
  remotePeers: RemotePeer[];
  onScreenClick?: (x: number, y: number, button: 'left' | 'right') => void;
  onScreenMouseMove?: (x: number, y: number) => void;
  isControlling?: boolean;
}

export function ScreenShareView({
  sharedScreens,
  localStream,
  localDisplayName,
  remotePeers,
  onScreenClick,
  onScreenMouseMove,
  isControlling = false,
}: ScreenShareViewProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreenId, setActiveScreenId] = useState<string>(sharedScreens[0]?.id || '');

  // Update active screen if it was removed
  useEffect(() => {
    if (sharedScreens.length > 0 && !sharedScreens.find((s) => s.id === activeScreenId)) {
      setActiveScreenId(sharedScreens[0].id);
    }
  }, [sharedScreens, activeScreenId]);

  const activeScreen = sharedScreens.find((s) => s.id === activeScreenId) || sharedScreens[0];

  useEffect(() => {
    if (!activeScreen) return;
    setLoading(true);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.srcObject = activeScreen.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [activeScreen?.id, activeScreen?.stream]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        setLoading(false);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  const handlePlaying = () => {
    setLoading(false);
  };

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
        {sharedScreens.length > 1 && (
          <div className={styles.tabs}>
            {sharedScreens.map((screen) => (
              <button
                key={screen.id}
                className={`${styles.tab} ${screen.id === activeScreenId ? styles.activeTab : ''}`}
                onClick={() => setActiveScreenId(screen.id)}
              >
                🖥️ {screen.name}
              </button>
            ))}
          </div>
        )}
        {sharedScreens.length === 1 && (
          <div className={styles.sharerLabel}>🖥️ {activeScreen?.name} is sharing their screen</div>
        )}
        <div className={styles.videoWrapper}>
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Loading shared screen...</span>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onPlaying={handlePlaying}
            className={`${styles.screenVideo} ${isControlling ? styles.controlling : ''}`}
            onClick={handleMouseEvent}
            onContextMenu={handleMouseEvent}
            onMouseMove={isControlling ? handleMouseEvent : undefined}
          />
        </div>
      </div>
      <div className={styles.sidebar}>
        <VideoTile stream={localStream} displayName={localDisplayName} isSelf showVideoOnly />
        {remotePeers.map((peer) => (
          <VideoTile
            key={peer.peerId}
            stream={peer.stream}
            displayName={peer.displayName}
            showVideoOnly
          />
        ))}
      </div>
    </div>
  );
}

export type { SharedScreen };
