import { useState, useCallback, useRef } from 'react';
import type { PeerManager } from '../lib/peer-manager';

interface UseScreenShareResult {
  isSharing: boolean;
  showPicker: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectSource: (sourceId: string) => Promise<void>;
  stopSharing: () => void;
}

export function useScreenShare(
  peerManager: PeerManager | null,
  originalStream: MediaStream | null
): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const openPicker = useCallback(() => {
    if (!peerManager) return;
    setShowPicker(true);
  }, [peerManager]);

  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  const selectSource = useCallback(async (sourceId: string) => {
    if (!peerManager) return;
    setShowPicker(false);

    try {
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            minHeight: 720,
          },
        } as any,
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      peerManager.replaceTrackOnAll(screenTrack);
      peerManager.broadcastData({ type: 'screen-share-start' });

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

    if (peerManager) {
      peerManager.broadcastData({ type: 'screen-share-stop' });
      if (originalStream) {
        const cameraTrack = originalStream.getVideoTracks()[0];
        if (cameraTrack) {
          peerManager.replaceTrackOnAll(cameraTrack);
        }
      }
    }

    setIsSharing(false);
  }, [peerManager, originalStream]);

  return { isSharing, showPicker, openPicker, closePicker, selectSource, stopSharing };
}
