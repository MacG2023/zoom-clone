import { useEffect } from 'react';
import type { PeerManager } from '../lib/peer-manager';
import type { RemoteControlEvent, RemoteControlMessage } from '@zoom-clone/shared';
import {
  createKeyDownEvent,
  createKeyUpEvent,
  createMouseScrollEvent,
  getModifiers,
  wrapControlEvent,
  createControlRequest,
  createControlGrant,
  createControlDeny,
  createControlRevoke,
} from '../lib/remote-control';
import styles from './RemoteControlOverlay.module.css';

interface RemoteControlOverlayProps {
  isSharing: boolean;
  isBeingControlled: boolean;
  isControlling: boolean;
  controllerId: string | null;
  controllerName: string | null;
  peerManager: PeerManager | null;
  sharerId: string | null;
  onControlRequested: (fromPeerId: string) => void;
  onControlGranted: () => void;
  onControlRevoked: () => void;
  onRevokeControl: () => void;
  allowRemoteControl: boolean;
  onToggleAllowControl: () => void;
}

export function RemoteControlOverlay({
  isSharing,
  isBeingControlled,
  isControlling,
  controllerId,
  controllerName,
  peerManager,
  sharerId,
  onControlRequested,
  onControlGranted,
  onControlRevoked,
  onRevokeControl,
  allowRemoteControl,
  onToggleAllowControl,
}: RemoteControlOverlayProps): JSX.Element | null {
  useEffect(() => {
    if (!isControlling || !peerManager || !sharerId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const event = createKeyDownEvent(e.key, getModifiers(e));
      peerManager.sendData(sharerId, wrapControlEvent(event));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      const event = createKeyUpEvent(e.key, getModifiers(e));
      peerManager.sendData(sharerId, wrapControlEvent(event));
    };

    const handleWheel = (e: WheelEvent) => {
      const event = createMouseScrollEvent(e.deltaX, e.deltaY);
      peerManager.sendData(sharerId, wrapControlEvent(event));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isControlling, peerManager, sharerId]);

  if (!isSharing && !isControlling && !isBeingControlled) return null;

  return (
    <div className={styles.overlay}>
      {isSharing && (
        <div className={styles.sharerControls}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={allowRemoteControl}
              onChange={onToggleAllowControl}
            />
            Allow remote control
          </label>
          {isBeingControlled && controllerName && (
            <div className={styles.controlInfo}>
              <span>{controllerName} is controlling your screen</span>
              <button className={styles.stopBtn} onClick={onRevokeControl}>
                Stop Control
              </button>
            </div>
          )}
        </div>
      )}

      {isControlling && (
        <div className={styles.controllerInfo}>
          <span>You are controlling the shared screen</span>
          <button className={styles.stopBtn} onClick={onRevokeControl}>
            Release Control
          </button>
        </div>
      )}
    </div>
  );
}
