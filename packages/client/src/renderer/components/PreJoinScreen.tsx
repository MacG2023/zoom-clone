import { useState, useEffect, useRef } from 'react';
import styles from './PreJoinScreen.module.css';

interface PreJoinScreenProps {
  meetingId: string;
  isHost: boolean;
  onJoin: (displayName: string, meetingId: string) => void;
  onBack: () => void;
}

export function PreJoinScreen({ meetingId, isHost, onJoin, onBack }: PreJoinScreenProps): JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        // Camera/mic unavailable
      });

    return () => {
      currentStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
    }
  }, [videoEnabled, stream]);

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
    }
  }, [audioEnabled, stream]);

  const handleJoin = () => {
    if (displayName.trim()) {
      stream?.getTracks().forEach((track) => track.stop());
      onJoin(displayName.trim(), meetingId);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>
      <div className={styles.content}>
        <div className={styles.preview}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />
          {!videoEnabled && (
            <div className={styles.videoOff}>Camera Off</div>
          )}
          <div className={styles.previewControls}>
            <button
              className={`${styles.toggleBtn} ${!videoEnabled ? styles.off : ''}`}
              onClick={() => setVideoEnabled(!videoEnabled)}
            >
              {videoEnabled ? '📷' : '📷‍🚫'}
            </button>
            <button
              className={`${styles.toggleBtn} ${!audioEnabled ? styles.off : ''}`}
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </button>
          </div>
        </div>
        <div className={styles.form}>
          <h2>Ready to join?</h2>
          <p className={styles.meetingInfo}>
            Meeting: <span>{meetingId}</span>
          </p>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={!displayName.trim()}
          >
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
