import type { PeerInfo, JoinResult } from '@zoom-clone/shared';

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment(3)}-${segment(4)}-${segment(3)}`;
}

export class RoomManager {
  private rooms = new Map<string, Map<string, PeerInfo>>();
  private peerToRoom = new Map<string, string>();

  createRoom(): string {
    const roomId = generateRoomId();
    this.rooms.set(roomId, new Map());
    return roomId;
  }

  joinRoom(roomId: string, peerId: string, displayName: string): JoinResult {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    const existingPeers: PeerInfo[] = Array.from(room.values());
    room.set(peerId, { id: peerId, displayName });
    this.peerToRoom.set(peerId, roomId);
    return { success: true, peers: existingPeers };
  }

  leaveRoom(peerId: string): string | null {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(peerId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.peerToRoom.delete(peerId);
    return roomId;
  }

  getRoomIdForPeer(peerId: string): string | undefined {
    return this.peerToRoom.get(peerId);
  }

  getPeersInRoom(roomId: string): PeerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values());
  }
}
