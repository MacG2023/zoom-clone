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
    const constraints: MediaStreamConstraints = {
      video: initVideo,
      audio: true,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((s) => {
        s.getAudioTracks().forEach((t) => (t.enabled = initAudio));
        streamRef.current = s;
        setStream(s);
      })
      .catch((err) => {
        console.error('Failed to get media:', err);
        // Try audio-only if video failed
        if (initVideo) {
          navigator.mediaDevices
            .getUserMedia({ video: false, audio: true })
            .then((s) => {
              s.getAudioTracks().forEach((t) => (t.enabled = initAudio));
              streamRef.current = s;
              setStream(s);
            })
            .catch(() => {});
        }
      });

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!streamRef.current) return;

    if (videoEnabled) {
      // Turn off: stop and remove video track (releases camera)
      streamRef.current.getVideoTracks().forEach((t) => {
        t.stop();
        streamRef.current!.removeTrack(t);
      });
      setVideoEnabled(false);
    } else {
      // Turn on: get a new video track and add it
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        streamRef.current.addTrack(newTrack);
        setVideoEnabled(true);
        // Force re-render by updating stream reference
        setStream(new MediaStream(streamRef.current.getTracks()));
        streamRef.current = new MediaStream(streamRef.current.getTracks());
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
