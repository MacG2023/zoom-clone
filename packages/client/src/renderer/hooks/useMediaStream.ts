import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMediaStreamOptions {
  initialVideo?: boolean;
  initialAudio?: boolean;
}

interface UseMediaStreamResult {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export function useMediaStream(options?: UseMediaStreamOptions): UseMediaStreamResult {
  const initVideo = options?.initialVideo ?? true;
  const initAudio = options?.initialAudio ?? true;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(initVideo);
  const [audioEnabled, setAudioEnabled] = useState(initAudio);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        // Apply initial toggle states
        s.getVideoTracks().forEach((t) => (t.enabled = initVideo));
        s.getAudioTracks().forEach((t) => (t.enabled = initAudio));
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
