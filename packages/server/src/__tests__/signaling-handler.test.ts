import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as clientIo, Socket as ClientSocket } from 'socket.io-client';
import { setupSignaling } from '../signaling-handler';
import { RoomManager } from '../room-manager';
import type { ServerToClientEvents, ClientToServerEvents } from '@zoom-clone/shared';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function createClient(port: number): TypedClientSocket {
  return clientIo(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: false,
  }) as TypedClientSocket;
}

function waitForEvent<T>(socket: TypedClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    (socket as any).once(event, (data: T) => resolve(data));
  });
}

describe('Signaling Handler', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer();
    const roomManager = new RoomManager();
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    setupSignaling(ioServer, roomManager);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    ioServer.close();
    httpServer.close();
  });

  it('creates a room and joins it', async () => {
    const client = createClient(port);
    client.connect();

    const roomId = await new Promise<string>((resolve) => {
      client.emit('create-room', (id: string) => resolve(id));
    });

    expect(roomId).toBeTruthy();
    expect(roomId).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);

    const joinResult = await new Promise<any>((resolve) => {
      client.emit('join-room', { roomId, displayName: 'Alice' }, (result: any) => resolve(result));
    });

    expect(joinResult.success).toBe(true);
    expect(joinResult.peers).toEqual([]);

    client.disconnect();
  });

  it('notifies existing peers when a new peer joins', async () => {
    const client1 = createClient(port);
    const client2 = createClient(port);
    client1.connect();
    client2.connect();

    const roomId = await new Promise<string>((resolve) => {
      client1.emit('create-room', (id: string) => resolve(id));
    });

    await new Promise<any>((resolve) => {
      client1.emit('join-room', { roomId, displayName: 'Alice' }, resolve);
    });

    const peerJoinedPromise = waitForEvent(client1, 'peer-joined');

    await new Promise<any>((resolve) => {
      client2.emit('join-room', { roomId, displayName: 'Bob' }, resolve);
    });

    const joinedPeer = await peerJoinedPromise;
    expect((joinedPeer as any).displayName).toBe('Bob');

    client1.disconnect();
    client2.disconnect();
  });

  it('relays signaling data between peers', async () => {
    const client1 = createClient(port);
    const client2 = createClient(port);
    client1.connect();
    client2.connect();

    const roomId = await new Promise<string>((resolve) => {
      client1.emit('create-room', (id: string) => resolve(id));
    });

    await new Promise<any>((resolve) => {
      client1.emit('join-room', { roomId, displayName: 'Alice' }, resolve);
    });

    await new Promise<any>((resolve) => {
      client2.emit('join-room', { roomId, displayName: 'Bob' }, resolve);
    });

    const signalPromise = waitForEvent(client1, 'signal');
    const client2Id = client2.id!;
    const client1Id = client1.id!;

    client2.emit('signal', { targetPeerId: client1Id, signalData: { type: 'offer', sdp: 'test' } });

    const signalData = await signalPromise;
    expect((signalData as any).fromPeerId).toBe(client2Id);
    expect((signalData as any).signalData).toEqual({ type: 'offer', sdp: 'test' });

    client1.disconnect();
    client2.disconnect();
  });
});
