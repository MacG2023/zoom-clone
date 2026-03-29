export interface Room {
  id: string;
  peers: Map<string, PeerInfo>;
}

export interface PeerInfo {
  id: string;
  displayName: string;
}

export interface ClientToServerEvents {
  'create-room': (callback: (roomId: string) => void) => void;
  'join-room': (data: { roomId: string; displayName: string }, callback: (result: JoinResult) => void) => void;
  'signal': (data: { targetPeerId: string; signalData: unknown }) => void;
  'leave-room': () => void;
}

export interface ServerToClientEvents {
  'room-created': (roomId: string) => void;
  'peer-joined': (peer: PeerInfo) => void;
  'peer-left': (peerId: string) => void;
  'signal': (data: { fromPeerId: string; signalData: unknown }) => void;
  'existing-peers': (peers: PeerInfo[]) => void;
}

export type JoinResult =
  | { success: true; peers: PeerInfo[] }
  | { success: false; error: string };
