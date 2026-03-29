import { useRef, useState, useCallback, useEffect } from 'react';
import { PeerManager } from '../lib/peer-manager';
import type { PeerInfo } from '@zoom-clone/shared';

export interface RemotePeer {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
}

interface UsePeerManagerResult {
  remotePeers: RemotePeer[];
  peerManager: PeerManager | null;
  addPeer: (peer: PeerInfo, initiator: boolean) => void;
  removePeer: (peerId: string) => void;
  handleSignal: (fromPeerId: string, signalData: unknown) => void;
}

export function usePeerManager(
  localStream: MediaStream | null,
  onData?: (peerId: string, data: unknown) => void
): UsePeerManagerResult {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const managerRef = useRef<PeerManager | null>(null);

  useEffect(() => {
    const manager = new PeerManager({
      onStream: (peerId, stream) => {
        setRemotePeers((prev) => {
          // If peer isn't in the list yet (created via handleSignal), add it
          const exists = prev.some((p) => p.peerId === peerId);
          if (!exists) {
            return [...prev, { peerId, displayName: 'Peer', stream }];
          }
          return prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p));
        });
      },
      onClose: (peerId) => {
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
      },
      onData: (peerId, data) => {
        onData?.(peerId, data);
      },
    });
    managerRef.current = manager;

    return () => {
      manager.destroyAll();
    };
  }, []);

  useEffect(() => {
    if (managerRef.current && localStream) {
      managerRef.current.setLocalStream(localStream);
    }
  }, [localStream]);

  const addPeer = useCallback((peer: PeerInfo, initiator: boolean) => {
    if (!managerRef.current) return;
    setRemotePeers((prev) => {
      if (prev.some((p) => p.peerId === peer.id)) return prev;
      return [...prev, { peerId: peer.id, displayName: peer.displayName, stream: null }];
    });
    managerRef.current.createPeer(peer.id, peer.displayName, initiator);
  }, []);

  const removePeer = useCallback((peerId: string) => {
    managerRef.current?.removePeer(peerId);
    setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const handleSignal = useCallback((fromPeerId: string, signalData: unknown) => {
    managerRef.current?.handleSignal(fromPeerId, signalData);
  }, []);

  return { remotePeers, peerManager: managerRef.current, addPeer, removePeer, handleSignal };
}
