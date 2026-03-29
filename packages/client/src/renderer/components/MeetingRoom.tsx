import { useState, useCallback, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useMediaStream } from '../hooks/useMediaStream';
import { usePeerManager } from '../hooks/usePeerManager';
import { useScreenShare } from '../hooks/useScreenShare';
import { VideoGrid } from './VideoGrid';
import { ScreenShareView } from './ScreenShareView';
import { Toolbar } from './Toolbar';
import { RemoteControlOverlay } from './RemoteControlOverlay';
import { ToastContainer, useToasts } from './Toast';
import { ScreenPicker } from './ScreenPicker';
import { leaveRoom } from '../lib/socket-client';
import {
  createMouseMoveEvent,
  createMouseClickEvent,
  createControlRequest,
  createControlGrant,
  createControlDeny,
  createControlRevoke,
  wrapControlEvent,
} from '../lib/remote-control';
import type { RemoteControlMessage } from '@zoom-clone/shared';
import type { PeerInfo } from '@zoom-clone/shared';
import styles from './MeetingRoom.module.css';

interface MeetingRoomProps {
  meetingId: string;
  displayName: string;
  onLeave: () => void;
}

export function MeetingRoom({ meetingId, displayName, onLeave }: MeetingRoomProps): JSX.Element {
  const { stream, videoEnabled, audioEnabled, toggleVideo, toggleAudio } = useMediaStream();
  const { toasts, addToast, dismissToast } = useToasts();

  // Remote control state
  const [allowRemoteControl, setAllowRemoteControl] = useState(false);
  const [controllerId, setControllerId] = useState<string | null>(null);
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState(false);
  const [controlTargetId, setControlTargetId] = useState<string | null>(null);

  // Screen share state
  const [screenSharerPeerId, setScreenSharerPeerId] = useState<string | null>(null);
  const [sharedStream, setSharedStream] = useState<MediaStream | null>(null);
  const [sharerName, setSharerName] = useState<string>('');

  const handleDataMessage = useCallback((peerId: string, data: unknown) => {
    const msg = data as RemoteControlMessage;

    switch (msg.type) {
      case 'request-control':
        if (allowRemoteControl) {
          addToast(`${msg.fromPeerId} is requesting control`, 'info');
          const peer = remotePeersRef.current.find((p) => p.peerId === peerId);
          if (peerManagerRef.current) {
            peerManagerRef.current.sendData(peerId, createControlGrant(peerId));
            setControllerId(peerId);
            setControllerName(peer?.displayName || 'Unknown');
            addToast(`Control granted to ${peer?.displayName || 'peer'}`, 'success');
          }
        } else {
          if (peerManagerRef.current) {
            peerManagerRef.current.sendData(peerId, createControlDeny(peerId));
          }
        }
        break;

      case 'grant-control':
        setIsControlling(true);
        setControlTargetId(peerId);
        addToast('Remote control granted', 'success');
        break;

      case 'deny-control':
        addToast('Remote control denied', 'info');
        break;

      case 'revoke-control':
        setIsControlling(false);
        setControlTargetId(null);
        setControllerId(null);
        setControllerName(null);
        addToast('Remote control revoked', 'info');
        break;

      case 'control-event':
        if (controllerId === peerId) {
          executeRemoteControlEvent(msg.event);
        }
        break;
    }
  }, [allowRemoteControl, controllerId]);

  const remotePeersRef = useRef<any[]>([]);
  const peerManagerRef = useRef<any>(null);

  const { remotePeers, peerManager, addPeer, removePeer, handleSignal } = usePeerManager(
    stream,
    handleDataMessage
  );
  remotePeersRef.current = remotePeers;
  peerManagerRef.current = peerManager;

  const { isSharing, showPicker, openPicker, closePicker, selectSource, stopSharing } = useScreenShare(peerManager, stream);

  const onPeerJoined = useCallback((peer: PeerInfo) => {
    addPeer(peer, true);
    addToast(`${peer.displayName} joined`, 'info');
  }, [addPeer, addToast]);

  const onPeerLeft = useCallback((peerId: string) => {
    const peer = remotePeers.find((p) => p.peerId === peerId);
    removePeer(peerId);
    if (peer) addToast(`${peer.displayName} left`, 'info');
    if (controllerId === peerId) {
      setControllerId(null);
      setControllerName(null);
    }
    if (controlTargetId === peerId) {
      setIsControlling(false);
      setControlTargetId(null);
    }
  }, [removePeer, addToast, remotePeers, controllerId, controlTargetId]);

  const onSignal = useCallback((fromPeerId: string, signalData: unknown) => {
    handleSignal(fromPeerId, signalData);
  }, [handleSignal]);

  const { connected, error } = useSocket({
    meetingId,
    displayName,
    onPeerJoined,
    onPeerLeft,
    onSignal,
  });

  const handleLeave = () => {
    leaveRoom();
    peerManager?.destroyAll();
    stream?.getTracks().forEach((t) => t.stop());
    onLeave();
  };

  const handleToggleScreenShare = () => {
    if (isSharing) {
      stopSharing();
    } else {
      openPicker();
    }
  };

  const handleRevokeControl = () => {
    if (peerManager && controllerId) {
      peerManager.sendData(controllerId, createControlRevoke());
    }
    if (peerManager && controlTargetId) {
      peerManager.sendData(controlTargetId, createControlRevoke());
    }
    setControllerId(null);
    setControllerName(null);
    setIsControlling(false);
    setControlTargetId(null);
  };

  const handleScreenClick = async (relX: number, relY: number, button: 'left' | 'right') => {
    if (!peerManager || !controlTargetId) return;
    const size = await window.electronAPI?.getScreenSize();
    if (!size) return;
    const event = createMouseClickEvent(relX * size.width, relY * size.height, button);
    peerManager.sendData(controlTargetId, wrapControlEvent(event));
  };

  const handleScreenMouseMove = async (relX: number, relY: number) => {
    if (!peerManager || !controlTargetId) return;
    const size = await window.electronAPI?.getScreenSize();
    if (!size) return;
    const event = createMouseMoveEvent(relX * size.width, relY * size.height);
    peerManager.sendData(controlTargetId, wrapControlEvent(event));
  };

  async function executeRemoteControlEvent(event: any) {
    await window.electronAPI?.executeRemoteControl(event);
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Failed to join meeting</h2>
        <p>{error}</p>
        <button onClick={onLeave}>Back to Home</button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={styles.connecting}>
        <p>Connecting to meeting...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.videoArea}>
        {screenSharerPeerId || isSharing ? (
          <ScreenShareView
            sharedStream={sharedStream || stream!}
            sharerName={isSharing ? displayName : sharerName}
            localStream={stream}
            localDisplayName={displayName}
            remotePeers={remotePeers}
            onScreenClick={isControlling ? handleScreenClick : undefined}
            onScreenMouseMove={isControlling ? handleScreenMouseMove : undefined}
            isControlling={isControlling}
          />
        ) : (
          <VideoGrid
            localStream={stream}
            localDisplayName={displayName}
            remotePeers={remotePeers}
          />
        )}
      </div>

      <RemoteControlOverlay
        isSharing={isSharing}
        isBeingControlled={!!controllerId}
        isControlling={isControlling}
        controllerId={controllerId}
        controllerName={controllerName}
        peerManager={peerManager}
        sharerId={controlTargetId}
        onControlRequested={() => {}}
        onControlGranted={() => {}}
        onControlRevoked={() => {}}
        onRevokeControl={handleRevokeControl}
        allowRemoteControl={allowRemoteControl}
        onToggleAllowControl={() => setAllowRemoteControl(!allowRemoteControl)}
      />

      <Toolbar
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        isScreenSharing={isSharing}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeave}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showPicker && (
        <ScreenPicker
          onSelect={selectSource}
          onCancel={closePicker}
        />
      )}
    </div>
  );
}
