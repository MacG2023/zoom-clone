export type RemoteControlEvent =
  | { type: 'mouse-move'; x: number; y: number }
  | { type: 'mouse-click'; button: 'left' | 'right'; x: number; y: number }
  | { type: 'mouse-scroll'; deltaX: number; deltaY: number }
  | { type: 'key-down'; key: string; modifiers: string[] }
  | { type: 'key-up'; key: string; modifiers: string[] };

export type RemoteControlMessage =
  | { type: 'request-control'; fromPeerId: string }
  | { type: 'grant-control'; toPeerId: string }
  | { type: 'deny-control'; toPeerId: string }
  | { type: 'revoke-control' }
  | { type: 'control-event'; event: RemoteControlEvent };

export interface ScreenShareState {
  isSharing: boolean;
  sharerId: string | null;
  allowRemoteControl: boolean;
  controllerId: string | null;
}
