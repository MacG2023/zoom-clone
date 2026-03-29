import { useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, joinRoom, getSocket } from '../lib/socket-client';
import type { PeerInfo } from '@zoom-clone/shared';

interface UseSocketOptions {
  meetingId: string;
  displayName: string;
  onPeerJoined: (peer: PeerInfo) => void;
  onPeerLeft: (peerId: string) => void;
  onSignal: (fromPeerId: string, signalData: unknown) => void;
}

export function useSocket({ meetingId, displayName, onPeerJoined, onPeerLeft, onSignal }: UseSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      if (!joinedRef.current) {
        joinedRef.current = true;
        joinRoom(meetingId, displayName).then((result) => {
          if (!result.success) {
            setError(result.error);
            return;
          }
          result.peers.forEach((peer) => onPeerJoined(peer));
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('peer-joined', (peer) => {
      onPeerJoined(peer);
    });

    socket.on('peer-left', (peerId) => {
      onPeerLeft(peerId);
    });

    socket.on('signal', (data) => {
      onSignal(data.fromPeerId, data.signalData);
    });

    return () => {
      joinedRef.current = false;
      disconnectSocket();
    };
  }, [meetingId, displayName]);

  return { connected, error };
}
