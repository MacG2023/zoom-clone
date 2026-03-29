import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, PeerInfo, JoinResult } from '@zoom-clone/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = 'http://localhost:3001';

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: false,
    }) as TypedSocket;
  }
  return socket;
}

export function connectSocket(): TypedSocket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export async function createRoom(): Promise<string> {
  const s = connectSocket();
  return new Promise((resolve) => {
    s.emit('create-room', (roomId: string) => {
      resolve(roomId);
    });
  });
}

export async function joinRoom(roomId: string, displayName: string): Promise<JoinResult> {
  const s = connectSocket();
  return new Promise((resolve) => {
    s.emit('join-room', { roomId, displayName }, (result: JoinResult) => {
      resolve(result);
    });
  });
}

export function sendSignal(targetPeerId: string, signalData: unknown): void {
  const s = getSocket();
  s.emit('signal', { targetPeerId, signalData });
}

export function leaveRoom(): void {
  const s = getSocket();
  s.emit('leave-room');
}
