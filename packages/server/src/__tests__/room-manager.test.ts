import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../room-manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('creates a room and returns a room ID', () => {
    const roomId = manager.createRoom();
    expect(roomId).toBeTruthy();
    expect(typeof roomId).toBe('string');
  });

  it('adds a peer to a room', () => {
    const roomId = manager.createRoom();
    const result = manager.joinRoom(roomId, 'peer-1', 'Alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.peers).toEqual([]);
    }
  });

  it('returns existing peers when joining', () => {
    const roomId = manager.createRoom();
    manager.joinRoom(roomId, 'peer-1', 'Alice');
    const result = manager.joinRoom(roomId, 'peer-2', 'Bob');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.peers).toEqual([{ id: 'peer-1', displayName: 'Alice' }]);
    }
  });

  it('fails to join a non-existent room', () => {
    const result = manager.joinRoom('bad-id', 'peer-1', 'Alice');
    expect(result.success).toBe(false);
  });

  it('removes a peer from a room', () => {
    const roomId = manager.createRoom();
    manager.joinRoom(roomId, 'peer-1', 'Alice');
    manager.joinRoom(roomId, 'peer-2', 'Bob');
    manager.leaveRoom('peer-2');
    const result = manager.joinRoom(roomId, 'peer-3', 'Charlie');
    if (result.success) {
      expect(result.peers).toEqual([{ id: 'peer-1', displayName: 'Alice' }]);
    }
  });

  it('destroys room when last peer leaves', () => {
    const roomId = manager.createRoom();
    manager.joinRoom(roomId, 'peer-1', 'Alice');
    manager.leaveRoom('peer-1');
    const result = manager.joinRoom(roomId, 'peer-2', 'Bob');
    expect(result.success).toBe(false);
  });

  it('returns the room ID for a peer', () => {
    const roomId = manager.createRoom();
    manager.joinRoom(roomId, 'peer-1', 'Alice');
    expect(manager.getRoomIdForPeer('peer-1')).toBe(roomId);
  });

  it('returns peers in a room', () => {
    const roomId = manager.createRoom();
    manager.joinRoom(roomId, 'peer-1', 'Alice');
    manager.joinRoom(roomId, 'peer-2', 'Bob');
    const peers = manager.getPeersInRoom(roomId);
    expect(peers).toEqual([
      { id: 'peer-1', displayName: 'Alice' },
      { id: 'peer-2', displayName: 'Bob' },
    ]);
  });
});
