import { useState, useEffect, useCallback } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { PreJoinScreen } from './components/PreJoinScreen';
import { MeetingRoom } from './components/MeetingRoom';

type Screen =
  | { type: 'home' }
  | { type: 'pre-join'; meetingId: string; isHost: boolean }
  | { type: 'meeting'; meetingId: string; displayName: string };

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ type: 'home' });

  useEffect(() => {
    window.electronAPI?.onDeepLink((meetingId: string) => {
      setScreen({ type: 'pre-join', meetingId, isHost: false });
    });
  }, []);

  const handleCreateMeeting = useCallback((meetingId: string) => {
    setScreen({ type: 'pre-join', meetingId, isHost: true });
  }, []);

  const handleJoinMeeting = useCallback((meetingId: string) => {
    setScreen({ type: 'pre-join', meetingId, isHost: false });
  }, []);

  const handleReadyToJoin = useCallback((displayName: string, meetingId: string) => {
    setScreen({ type: 'meeting', meetingId, displayName });
  }, []);

  const handleLeaveMeeting = useCallback(() => {
    setScreen({ type: 'home' });
  }, []);

  switch (screen.type) {
    case 'home':
      return (
        <HomeScreen
          onCreateMeeting={handleCreateMeeting}
          onJoinMeeting={handleJoinMeeting}
        />
      );
    case 'pre-join':
      return (
        <PreJoinScreen
          meetingId={screen.meetingId}
          isHost={screen.isHost}
          onJoin={handleReadyToJoin}
          onBack={() => setScreen({ type: 'home' })}
        />
      );
    case 'meeting':
      return (
        <MeetingRoom
          meetingId={screen.meetingId}
          displayName={screen.displayName}
          onLeave={handleLeaveMeeting}
        />
      );
  }
}
