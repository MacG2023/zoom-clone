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
        // If user chose camera off, stop the video track immediately to release camera
        if (!initVideo) {
          s.getVideoTracks().forEach((t) => t.stop());
        }
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

  const toggleVideo = useCallback(async () => {
    if (!streamRef.current) return;

    if (videoEnabled) {
      // Turn off: stop video track to release camera hardware
      streamRef.current.getVideoTracks().forEach((t) => t.stop());
      setVideoEnabled(false);
    } else {
      // Turn on: get a new video track, replace the stopped one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];

        // Remove old stopped video tracks
        streamRef.current.getVideoTracks().forEach((t) => {
          streamRef.current!.removeTrack(t);
        });

        // Add new track to existing stream
        streamRef.current.addTrack(newTrack);
        setVideoEnabled(true);
      } catch (err) {
        console.error('Failed to restart camera:', err);
      }
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
