import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../hooks/usePeerManager';
import styles from './VideoGrid.module.css';

interface VideoGridProps {
  localStream: MediaStream | null;
  localDisplayName: string;
  remotePeers: RemotePeer[];
}

export function VideoGrid({ localStream, localDisplayName, remotePeers }: VideoGridProps): JSX.Element {
  const totalParticipants = remotePeers.length + 1;
  const columns = totalParticipants <= 2 ? totalParticipants : totalParticipants <= 4 ? 2 : 3;

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      <VideoTile stream={localStream} displayName={localDisplayName} isSelf />
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.peerId}
          stream={peer.stream}
          displayName={peer.displayName}
        />
      ))}
    </div>
  );
}
