import { useState } from 'react';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  onCreateMeeting: (meetingId: string) => void;
  onJoinMeeting: (meetingId: string) => void;
}

export function HomeScreen({ onCreateMeeting, onJoinMeeting }: HomeScreenProps): JSX.Element {
  const [joinId, setJoinId] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const { createRoom } = await import('../lib/socket-client');
    const meetingId = await createRoom();
    setCreatedId(meetingId);
    setIsCreating(false);
  };

  const handleCopyLink = () => {
    if (createdId) {
      navigator.clipboard.writeText(`zoomclone://meeting/${createdId}`);
    }
  };

  const handleJoinCreated = () => {
    if (createdId) onCreateMeeting(createdId);
  };

  const handleJoin = () => {
    const id = extractMeetingId(joinId.trim());
    if (id) onJoinMeeting(id);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ZoomClone</h1>
      <div className={styles.actions}>
        <div className={styles.card}>
          <h2>New Meeting</h2>
          {createdId ? (
            <div className={styles.createdRoom}>
              <p className={styles.meetingId}>{createdId}</p>
              <div className={styles.buttonRow}>
                <button className={styles.secondaryBtn} onClick={handleCopyLink}>
                  Copy Invite Link
                </button>
                <button className={styles.primaryBtn} onClick={handleJoinCreated}>
                  Join Meeting
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.primaryBtn}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Meeting'}
            </button>
          )}
        </div>

        <div className={styles.divider}>or</div>

        <div className={styles.card}>
          <h2>Join Meeting</h2>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter meeting ID or link"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            className={styles.primaryBtn}
            onClick={handleJoin}
            disabled={!joinId.trim()}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function extractMeetingId(input: string): string | null {
  if (input.startsWith('zoomclone://')) {
    const match = input.match(/zoomclone:\/\/meeting\/(.+)/);
    return match ? match[1] : null;
  }
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(input)) {
    return input;
  }
  return input || null;
}
