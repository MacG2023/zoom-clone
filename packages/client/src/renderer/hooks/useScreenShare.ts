import { useState, useCallback, useRef } from 'react';
import type { PeerManager } from '../lib/peer-manager';

interface UseScreenShareResult {
  isSharing: boolean;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
}

export function useScreenShare(
  peerManager: PeerManager | null,
  originalStream: MediaStream | null
): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startSharing = useCallback(async () => {
    if (!peerManager) return;

    const sources = await window.electronAPI?.getDesktopSources();
    if (!sources || sources.length === 0) return;

    const sourceId = sources[0].id;

    try {
      const screenStream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      peerManager.replaceTrackOnAll(screenTrack);

      screenTrack.onended = () => {
        stopSharing();
      };

      setIsSharing(true);
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  }, [peerManager, originalStream]);

  const stopSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (peerManager && originalStream) {
      const cameraTrack = originalStream.getVideoTracks()[0];
      if (cameraTrack) {
        peerManager.replaceTrackOnAll(cameraTrack);
      }
    }

    setIsSharing(false);
  }, [peerManager, originalStream]);

  return { isSharing, startSharing, stopSharing };
}
