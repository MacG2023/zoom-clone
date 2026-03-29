import type { RemoteControlEvent, RemoteControlMessage } from '@zoom-clone/shared';

export function createMouseMoveEvent(x: number, y: number): RemoteControlEvent {
  return { type: 'mouse-move', x, y };
}

export function createMouseClickEvent(
  x: number,
  y: number,
  button: 'left' | 'right'
): RemoteControlEvent {
  return { type: 'mouse-click', button, x, y };
}

export function createMouseScrollEvent(deltaX: number, deltaY: number): RemoteControlEvent {
  return { type: 'mouse-scroll', deltaX, deltaY };
}

export function createKeyDownEvent(key: string, modifiers: string[]): RemoteControlEvent {
  return { type: 'key-down', key, modifiers };
}

export function createKeyUpEvent(key: string, modifiers: string[]): RemoteControlEvent {
  return { type: 'key-up', key, modifiers };
}

export function getModifiers(e: KeyboardEvent): string[] {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('ctrl');
  if (e.shiftKey) mods.push('shift');
  if (e.altKey) mods.push('alt');
  if (e.metaKey) mods.push('meta');
  return mods;
}

export function createControlRequest(fromPeerId: string): RemoteControlMessage {
  return { type: 'request-control', fromPeerId };
}

export function createControlGrant(toPeerId: string): RemoteControlMessage {
  return { type: 'grant-control', toPeerId };
}

export function createControlDeny(toPeerId: string): RemoteControlMessage {
  return { type: 'deny-control', toPeerId };
}

export function createControlRevoke(): RemoteControlMessage {
  return { type: 'revoke-control' };
}

export function wrapControlEvent(event: RemoteControlEvent): RemoteControlMessage {
  return { type: 'control-event', event };
}
