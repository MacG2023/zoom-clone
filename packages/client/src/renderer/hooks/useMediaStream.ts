import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMediaStreamResult {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export function useMediaStream(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        streamRef.current = s;
        setStream(s);
      })
      .catch((err) => {
        console.error('Failed to get media:', err);
      });

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const enabled = !videoEnabled;
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled));
      setVideoEnabled(enabled);
    }
  }, [videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const enabled = !audioEnabled;
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
      setAudioEnabled(enabled);
    }
  }, [audioEnabled]);

  return { stream, videoEnabled, audioEnabled, toggleVideo, toggleAudio };
}
