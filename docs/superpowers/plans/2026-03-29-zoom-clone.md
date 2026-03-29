# Zoom Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop video conferencing app with screen sharing, remote control, and invite links for a 4-6 person team.

**Architecture:** Electron + React monorepo with three packages (client, server, shared). WebRTC mesh for peer-to-peer media. Socket.IO signaling server for connection setup. nut.js for remote control input execution.

**Tech Stack:** Electron, React, TypeScript, simple-peer, Socket.IO, nut.js, npm workspaces, electron-builder

---

## File Structure

```
zoom-clone/
├── package.json                                  # Root workspace config
├── tsconfig.base.json                            # Shared TS config
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                          # Re-exports all types
│   │       ├── signaling.ts                      # Socket.IO event types
│   │       └── remote-control.ts                 # Remote control event types
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                          # Entry point, starts HTTP + Socket.IO
│   │       ├── room-manager.ts                   # Room create/join/leave/destroy logic
│   │       ├── signaling-handler.ts              # Socket.IO event handlers
│   │       └── __tests__/
│   │           ├── room-manager.test.ts
│   │           └── signaling-handler.test.ts
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── electron-builder.json                 # Electron packaging config
│       └── src/
│           ├── main/
│           │   ├── index.ts                      # Electron main process entry
│           │   ├── protocol.ts                   # Custom zoomclone:// protocol handler
│           │   └── remote-control-executor.ts    # nut.js integration (main process only)
│           ├── preload/
│           │   └── index.ts                      # Context bridge exposing IPC APIs
│           └── renderer/
│               ├── index.html                    # HTML entry
│               ├── index.tsx                     # React entry
│               ├── App.tsx                       # Router: Home / PreJoin / MeetingRoom
│               ├── global.css                    # Global dark theme styles
│               ├── hooks/
│               │   ├── useSocket.ts              # Socket.IO connection hook
│               │   ├── usePeerManager.ts         # WebRTC mesh management hook
│               │   ├── useMediaStream.ts         # Camera/mic capture hook
│               │   └── useScreenShare.ts         # Screen sharing hook
│               ├── components/
│               │   ├── HomeScreen.tsx             # New Meeting / Join Meeting
│               │   ├── HomeScreen.module.css
│               │   ├── PreJoinScreen.tsx          # Name entry, device preview
│               │   ├── PreJoinScreen.module.css
│               │   ├── MeetingRoom.tsx            # Main meeting view orchestrator
│               │   ├── MeetingRoom.module.css
│               │   ├── VideoGrid.tsx              # Participant video grid layout
│               │   ├── VideoGrid.module.css
│               │   ├── VideoTile.tsx              # Single participant video
│               │   ├── VideoTile.module.css
│               │   ├── Toolbar.tsx                # Bottom meeting controls
│               │   ├── Toolbar.module.css
│               │   ├── ScreenShareView.tsx        # Large screen share + sidebar
│               │   ├── ScreenShareView.module.css
│               │   ├── RemoteControlOverlay.tsx   # Remote control UI + event capture
│               │   ├── RemoteControlOverlay.module.css
│               │   ├── Toast.tsx                  # Toast notification component
│               │   └── Toast.module.css
│               └── lib/
│                   ├── peer-manager.ts            # PeerManager class
│                   ├── socket-client.ts           # Socket.IO client wrapper
│                   └── remote-control.ts          # Remote control event capture/send
```

---

### Task 1: Project Scaffolding & Workspace Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`

- [ ] **Step 1: Initialize git repo**

```bash
cd /c/Upwork/Zoom
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "zoom-clone",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/server",
    "packages/client"
  ],
  "scripts": {
    "dev:server": "npm run dev --workspace=packages/server",
    "dev:client": "npm run dev --workspace=packages/client",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces --if-present"
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 4: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@zoom-clone/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create server package**

`packages/server/package.json`:
```json
{
  "name": "@zoom-clone/server",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@zoom-clone/shared": "*",
    "socket.io": "^4.7.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0",
    "@types/uuid": "^9.0.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": undefined
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 6: Create client package**

`packages/client/package.json`:
```json
{
  "name": "@zoom-clone/client",
  "version": "1.0.0",
  "private": true,
  "main": "./src/main/index.ts",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@zoom-clone/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "electron": "^30.0.0",
    "electron-vite": "^2.2.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/simple-peer": "^9.11.0"
  }
}
```

`packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
out/
.env
*.log
```

- [ ] **Step 8: Install dependencies and verify**

```bash
npm install
```

Expected: no errors, node_modules created, workspaces linked.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo with shared, server, and client packages"
```

---

### Task 2: Shared Types

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/signaling.ts`
- Create: `packages/shared/src/remote-control.ts`

- [ ] **Step 1: Create signaling types**

`packages/shared/src/signaling.ts`:
```typescript
export interface Room {
  id: string;
  peers: Map<string, PeerInfo>;
}

export interface PeerInfo {
  id: string;
  displayName: string;
}

// Client → Server events
export interface ClientToServerEvents {
  'create-room': (callback: (roomId: string) => void) => void;
  'join-room': (data: { roomId: string; displayName: string }, callback: (result: JoinResult) => void) => void;
  'signal': (data: { targetPeerId: string; signalData: unknown }) => void;
  'leave-room': () => void;
}

// Server → Client events
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
```

- [ ] **Step 2: Create remote control types**

`packages/shared/src/remote-control.ts`:
```typescript
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
```

- [ ] **Step 3: Create index re-export**

`packages/shared/src/index.ts`:
```typescript
export * from './signaling';
export * from './remote-control';
```

- [ ] **Step 4: Verify types compile**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types for signaling and remote control"
```

---

### Task 3: Signaling Server — Room Manager

**Files:**
- Create: `packages/server/src/room-manager.ts`
- Create: `packages/server/src/__tests__/room-manager.test.ts`

- [ ] **Step 1: Write failing tests for RoomManager**

`packages/server/src/__tests__/room-manager.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && npx vitest run
```

Expected: FAIL — module `../room-manager` not found.

- [ ] **Step 3: Implement RoomManager**

`packages/server/src/room-manager.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && npx vitest run
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/room-manager.ts packages/server/src/__tests__/room-manager.test.ts
git commit -m "feat: implement RoomManager with tests"
```

---

### Task 4: Signaling Server — Socket.IO Handler & Entry Point

**Files:**
- Create: `packages/server/src/signaling-handler.ts`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/__tests__/signaling-handler.test.ts`

- [ ] **Step 1: Write failing tests for signaling handler**

`packages/server/src/__tests__/signaling-handler.test.ts`:
```typescript
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

    const joinResult = await new Promise<any>((resolve) => {
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && npx vitest run
```

Expected: FAIL — `../signaling-handler` not found.

- [ ] **Step 3: Implement signaling handler**

`packages/server/src/signaling-handler.ts`:
```typescript
import type { Server, Socket } from 'socket.io';
import type { RoomManager } from './room-manager';
import type { ClientToServerEvents, ServerToClientEvents } from '@zoom-clone/shared';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSignaling(io: TypedServer, roomManager: RoomManager): void {
  io.on('connection', (socket: TypedSocket) => {
    socket.on('create-room', (callback) => {
      const roomId = roomManager.createRoom();
      callback(roomId);
    });

    socket.on('join-room', (data, callback) => {
      const result = roomManager.joinRoom(data.roomId, socket.id, data.displayName);
      if (result.success) {
        socket.join(data.roomId);
        socket.to(data.roomId).emit('peer-joined', {
          id: socket.id,
          displayName: data.displayName,
        });
      }
      callback(result);
    });

    socket.on('signal', (data) => {
      io.to(data.targetPeerId).emit('signal', {
        fromPeerId: socket.id,
        signalData: data.signalData,
      });
    });

    socket.on('leave-room', () => {
      handleDisconnect(socket, roomManager);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, roomManager);
    });
  });
}

function handleDisconnect(socket: TypedSocket, roomManager: RoomManager): void {
  const roomId = roomManager.getRoomIdForPeer(socket.id);
  if (roomId) {
    roomManager.leaveRoom(socket.id);
    socket.to(roomId).emit('peer-left', socket.id);
    socket.leave(roomId);
  }
}
```

- [ ] **Step 4: Create server entry point**

`packages/server/src/index.ts`:
```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager';
import { setupSignaling } from './signaling-handler';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
setupSignaling(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/server && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Run the server manually to verify it starts**

```bash
cd packages/server && npx tsx src/index.ts &
# Expected output: "Signaling server running on port 3001"
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/
git commit -m "feat: implement signaling server with Socket.IO handler"
```

---

### Task 5: Electron Main Process & Custom Protocol

**Files:**
- Create: `packages/client/src/main/index.ts`
- Create: `packages/client/src/main/protocol.ts`
- Create: `packages/client/src/preload/index.ts`
- Create: `packages/client/electron-builder.json`

- [ ] **Step 1: Create custom protocol handler**

`packages/client/src/main/protocol.ts`:
```typescript
import { app } from 'electron';

const PROTOCOL = 'zoomclone';

export function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

export function extractMeetingId(url: string): string | null {
  try {
    // Format: zoomclone://meeting/<meeting-id>
    const parsed = new URL(url);
    if (parsed.protocol === `${PROTOCOL}:` && parsed.hostname === 'meeting') {
      return parsed.pathname.replace(/^\//, '');
    }
  } catch {
    // Not a valid URL
  }
  return null;
}
```

- [ ] **Step 2: Create preload script**

`packages/client/src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  executeRemoteControl: (event: unknown) => ipcRenderer.invoke('execute-remote-control', event),
  onDeepLink: (callback: (meetingId: string) => void) => {
    ipcRenderer.on('deep-link', (_event, meetingId) => callback(meetingId));
  },
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
});
```

- [ ] **Step 3: Create Electron main process**

`packages/client/src/main/index.ts`:
```typescript
import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from 'electron';
import path from 'path';
import { registerProtocol, extractMeetingId } from './protocol';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

registerProtocol();

// Handle deep links on macOS
app.on('open-url', (_event, url) => {
  const meetingId = extractMeetingId(url);
  if (meetingId && mainWindow) {
    mainWindow.webContents.send('deep-link', meetingId);
  }
});

// Handle deep links on Windows (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith('zoomclone://'));
    if (url) {
      const meetingId = extractMeetingId(url);
      if (meetingId && mainWindow) {
        mainWindow.webContents.send('deep-link', meetingId);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// IPC: Get desktop sources for screen sharing
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
});

// IPC: Get screen size for coordinate mapping
ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
  };
});
```

- [ ] **Step 4: Create electron-vite config**

`packages/client/electron.vite.config.ts`:
```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
  },
});
```

- [ ] **Step 5: Create electron-builder config**

`packages/client/electron-builder.json`:
```json
{
  "appId": "com.zoomclone.app",
  "productName": "ZoomClone",
  "protocols": {
    "name": "ZoomClone Meeting",
    "schemes": ["zoomclone"]
  },
  "win": {
    "target": "nsis"
  },
  "mac": {
    "target": "dmg"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

- [ ] **Step 6: Add @vitejs/plugin-react dependency**

Add to `packages/client/package.json` devDependencies:
```json
"@vitejs/plugin-react": "^4.3.0",
"electron-vite": "^2.2.0"
```

Then run:
```bash
npm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/client/
git commit -m "feat: set up Electron main process with custom protocol and IPC"
```

---

### Task 6: Renderer — React Entry, Router, and Global Styles

**Files:**
- Create: `packages/client/src/renderer/index.html`
- Create: `packages/client/src/renderer/index.tsx`
- Create: `packages/client/src/renderer/App.tsx`
- Create: `packages/client/src/renderer/global.css`

- [ ] **Step 1: Create HTML entry**

`packages/client/src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZoomClone</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create global dark theme styles**

`packages/client/src/renderer/global.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #0078d4;
  --accent-hover: #1a8de8;
  --danger: #e74c3c;
  --success: #2ecc71;
  --border: #2a2a4a;
  --toolbar-bg: #12122a;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
}

#root {
  height: 100%;
}

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: inherit;
}

input {
  font-family: inherit;
  font-size: inherit;
}
```

- [ ] **Step 3: Create React entry**

`packages/client/src/renderer/index.tsx`:
```typescript
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './global.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

- [ ] **Step 4: Create App with routing state**

`packages/client/src/renderer/App.tsx`:
```typescript
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
```

- [ ] **Step 5: Add TypeScript declaration for electronAPI**

`packages/client/src/renderer/env.d.ts`:
```typescript
interface ElectronAPI {
  getDesktopSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
  executeRemoteControl: (event: unknown) => Promise<void>;
  onDeepLink: (callback: (meetingId: string) => void) => void;
  getScreenSize: () => Promise<{ width: number; height: number }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
```

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/renderer/
git commit -m "feat: add React entry, App router, global dark theme styles"
```

---

### Task 7: HomeScreen Component

**Files:**
- Create: `packages/client/src/renderer/components/HomeScreen.tsx`
- Create: `packages/client/src/renderer/components/HomeScreen.module.css`

- [ ] **Step 1: Create HomeScreen component**

`packages/client/src/renderer/components/HomeScreen.tsx`:
```typescript
import { useState } from 'react';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  onCreateMeeting: (meetingId: string) => void;
  onJoinMeeting: (meetingId: string) => void;
}

export function HomeScreen({ onCreateMeeting, onJoinMeeting }: HomeScreenProps): JSX.Element {
  const [joinId, setJoinId] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    // Will connect to signaling server to create room
    // For now, generate a placeholder — will be wired in Task 10
    const { createRoom } = await import('../lib/socket-client');
    const meetingId = await createRoom();
    setCreatedId(meetingId);
    setIsCreating(false);
  };

  const handleCopyLink = () => {
    if (createdId) {
      navigator.clipboard.writeText(`zoomclone://meeting/${createdId}`);
    }
  };

  const handleJoinCreated = () => {
    if (createdId) onCreateMeeting(createdId);
  };

  const handleJoin = () => {
    const id = extractMeetingId(joinId.trim());
    if (id) onJoinMeeting(id);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ZoomClone</h1>
      <div className={styles.actions}>
        <div className={styles.card}>
          <h2>New Meeting</h2>
          {createdId ? (
            <div className={styles.createdRoom}>
              <p className={styles.meetingId}>{createdId}</p>
              <div className={styles.buttonRow}>
                <button className={styles.secondaryBtn} onClick={handleCopyLink}>
                  Copy Invite Link
                </button>
                <button className={styles.primaryBtn} onClick={handleJoinCreated}>
                  Join Meeting
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.primaryBtn}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Meeting'}
            </button>
          )}
        </div>

        <div className={styles.divider}>or</div>

        <div className={styles.card}>
          <h2>Join Meeting</h2>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter meeting ID or link"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            className={styles.primaryBtn}
            onClick={handleJoin}
            disabled={!joinId.trim()}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function extractMeetingId(input: string): string | null {
  // Handle full link: zoomclone://meeting/abc-defg-hij
  if (input.startsWith('zoomclone://')) {
    const match = input.match(/zoomclone:\/\/meeting\/(.+)/);
    return match ? match[1] : null;
  }
  // Handle raw meeting ID: abc-defg-hij
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(input)) {
    return input;
  }
  return input || null;
}
```

- [ ] **Step 2: Create HomeScreen styles**

`packages/client/src/renderer/components/HomeScreen.module.css`:
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: var(--accent);
}

.actions {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card h2 {
  font-size: 1.2rem;
  font-weight: 600;
}

.divider {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.primaryBtn {
  background: var(--accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.2s;
}

.primaryBtn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.primaryBtn:disabled {
  opacity: 0.5;
}

.secondaryBtn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.2s;
}

.secondaryBtn:hover {
  background: var(--accent);
}

.input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.75rem;
  border-radius: 8px;
  outline: none;
}

.input:focus {
  border-color: var(--accent);
}

.createdRoom {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.meetingId {
  font-family: monospace;
  font-size: 1.1rem;
  color: var(--accent);
  text-align: center;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 6px;
}

.buttonRow {
  display: flex;
  gap: 0.5rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/renderer/components/HomeScreen*
git commit -m "feat: add HomeScreen component with create/join meeting UI"
```

---

### Task 8: PreJoinScreen Component

**Files:**
- Create: `packages/client/src/renderer/components/PreJoinScreen.tsx`
- Create: `packages/client/src/renderer/components/PreJoinScreen.module.css`

- [ ] **Step 1: Create PreJoinScreen component**

`packages/client/src/renderer/components/PreJoinScreen.tsx`:
```typescript
import { useState, useEffect, useRef } from 'react';
import styles from './PreJoinScreen.module.css';

interface PreJoinScreenProps {
  meetingId: string;
  isHost: boolean;
  onJoin: (displayName: string, meetingId: string) => void;
  onBack: () => void;
}

export function PreJoinScreen({ meetingId, isHost, onJoin, onBack }: PreJoinScreenProps): JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        // Camera/mic unavailable — proceed without preview
      });

    return () => {
      currentStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
    }
  }, [videoEnabled, stream]);

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
    }
  }, [audioEnabled, stream]);

  const handleJoin = () => {
    if (displayName.trim()) {
      stream?.getTracks().forEach((track) => track.stop());
      onJoin(displayName.trim(), meetingId);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>
      <div className={styles.content}>
        <div className={styles.preview}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />
          {!videoEnabled && (
            <div className={styles.videoOff}>Camera Off</div>
          )}
          <div className={styles.previewControls}>
            <button
              className={`${styles.toggleBtn} ${!videoEnabled ? styles.off : ''}`}
              onClick={() => setVideoEnabled(!videoEnabled)}
            >
              {videoEnabled ? '📷' : '📷‍🚫'}
            </button>
            <button
              className={`${styles.toggleBtn} ${!audioEnabled ? styles.off : ''}`}
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </button>
          </div>
        </div>
        <div className={styles.form}>
          <h2>Ready to join?</h2>
          <p className={styles.meetingInfo}>
            Meeting: <span>{meetingId}</span>
          </p>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={!displayName.trim()}
          >
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PreJoinScreen styles**

`packages/client/src/renderer/components/PreJoinScreen.module.css`:
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  position: relative;
}

.backBtn {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  background: none;
  color: var(--text-secondary);
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}

.backBtn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.content {
  display: flex;
  gap: 3rem;
  align-items: center;
}

.preview {
  position: relative;
  width: 400px;
  height: 300px;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.videoOff {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.previewControls {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.75rem;
}

.toggleBtn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggleBtn.off {
  background: var(--danger);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 280px;
}

.form h2 {
  font-size: 1.5rem;
}

.meetingInfo {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.meetingInfo span {
  font-family: monospace;
  color: var(--accent);
}

.input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.75rem;
  border-radius: 8px;
  outline: none;
}

.input:focus {
  border-color: var(--accent);
}

.joinBtn {
  background: var(--accent);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  transition: background 0.2s;
}

.joinBtn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.joinBtn:disabled {
  opacity: 0.5;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/renderer/components/PreJoinScreen*
git commit -m "feat: add PreJoinScreen with camera preview and device toggles"
```

---

### Task 9: Socket Client Library

**Files:**
- Create: `packages/client/src/renderer/lib/socket-client.ts`

- [ ] **Step 1: Create socket client wrapper**

`packages/client/src/renderer/lib/socket-client.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/renderer/lib/socket-client.ts
git commit -m "feat: add Socket.IO client wrapper with typed events"
```

---

### Task 10: PeerManager — WebRTC Mesh Management

**Files:**
- Create: `packages/client/src/renderer/lib/peer-manager.ts`

- [ ] **Step 1: Create PeerManager class**

`packages/client/src/renderer/lib/peer-manager.ts`:
```typescript
import SimplePeer from 'simple-peer';
import { sendSignal } from './socket-client';

export interface PeerConnection {
  peerId: string;
  displayName: string;
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
}

type PeerEventCallback = {
  onStream: (peerId: string, stream: MediaStream) => void;
  onClose: (peerId: string) => void;
  onData: (peerId: string, data: unknown) => void;
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private callbacks: PeerEventCallback;

  constructor(callbacks: PeerEventCallback) {
    this.callbacks = callbacks;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    // Update stream on all existing peers
    this.peers.forEach((conn) => {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];
        const senders = (conn.peer as any)._pc?.getSenders?.();
        if (senders) {
          senders.forEach((sender: RTCRtpSender) => {
            if (sender.track?.kind === 'video' && videoTrack) {
              sender.replaceTrack(videoTrack);
            } else if (sender.track?.kind === 'audio' && audioTrack) {
              sender.replaceTrack(audioTrack);
            }
          });
        }
      }
    });
  }

  createPeer(peerId: string, displayName: string, initiator: boolean): void {
    if (this.peers.has(peerId)) return;

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream || undefined,
      trickle: true,
      config: { iceServers: ICE_SERVERS },
    });

    const connection: PeerConnection = {
      peerId,
      displayName,
      peer,
      stream: null,
    };

    peer.on('signal', (signalData) => {
      sendSignal(peerId, signalData);
    });

    peer.on('stream', (remoteStream) => {
      connection.stream = remoteStream;
      this.callbacks.onStream(peerId, remoteStream);
    });

    peer.on('data', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.callbacks.onData(peerId, parsed);
      } catch {
        // Ignore malformed data
      }
    });

    peer.on('close', () => {
      this.peers.delete(peerId);
      this.callbacks.onClose(peerId);
    });

    peer.on('error', (err) => {
      console.error(`Peer ${peerId} error:`, err);
      this.peers.delete(peerId);
      this.callbacks.onClose(peerId);
    });

    this.peers.set(peerId, connection);
  }

  handleSignal(peerId: string, signalData: unknown): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.signal(signalData as SimplePeer.SignalData);
    }
  }

  sendData(peerId: string, data: unknown): void {
    const connection = this.peers.get(peerId);
    if (connection && connection.peer.connected) {
      connection.peer.send(JSON.stringify(data));
    }
  }

  broadcastData(data: unknown): void {
    this.peers.forEach((conn) => {
      if (conn.peer.connected) {
        conn.peer.send(JSON.stringify(data));
      }
    });
  }

  removePeer(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
    }
  }

  getConnections(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  replaceTrackOnAll(track: MediaStreamTrack): void {
    this.peers.forEach((conn) => {
      const senders = (conn.peer as any)._pc?.getSenders?.();
      if (senders) {
        const sender = senders.find(
          (s: RTCRtpSender) => s.track?.kind === track.kind
        );
        if (sender) {
          sender.replaceTrack(track);
        }
      }
    });
  }

  destroyAll(): void {
    this.peers.forEach((conn) => conn.peer.destroy());
    this.peers.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/renderer/lib/peer-manager.ts
git commit -m "feat: add PeerManager class for WebRTC mesh connections"
```

---

### Task 11: React Hooks — useSocket, useMediaStream, usePeerManager

**Files:**
- Create: `packages/client/src/renderer/hooks/useSocket.ts`
- Create: `packages/client/src/renderer/hooks/useMediaStream.ts`
- Create: `packages/client/src/renderer/hooks/usePeerManager.ts`

- [ ] **Step 1: Create useSocket hook**

`packages/client/src/renderer/hooks/useSocket.ts`:
```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket, disconnectSocket, joinRoom, getSocket } from '../lib/socket-client';
import type { PeerInfo, JoinResult } from '@zoom-clone/shared';

interface UseSocketOptions {
  meetingId: string;
  displayName: string;
  onPeerJoined: (peer: PeerInfo) => void;
  onPeerLeft: (peerId: string) => void;
  onSignal: (fromPeerId: string, signalData: unknown) => void;
}

export function useSocket({ meetingId, displayName, onPeerJoined, onPeerLeft, onSignal }: UseSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      if (!joinedRef.current) {
        joinedRef.current = true;
        joinRoom(meetingId, displayName).then((result) => {
          if (!result.success) {
            setError(result.error);
            return;
          }
          // Notify about existing peers
          result.peers.forEach((peer) => onPeerJoined(peer));
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('peer-joined', (peer) => {
      onPeerJoined(peer);
    });

    socket.on('peer-left', (peerId) => {
      onPeerLeft(peerId);
    });

    socket.on('signal', (data) => {
      onSignal(data.fromPeerId, data.signalData);
    });

    return () => {
      joinedRef.current = false;
      disconnectSocket();
    };
  }, [meetingId, displayName]);

  return { connected, error };
}
```

- [ ] **Step 2: Create useMediaStream hook**

`packages/client/src/renderer/hooks/useMediaStream.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMediaStreamResult {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export function useMediaStream(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        streamRef.current = s;
        setStream(s);
      })
      .catch((err) => {
        console.error('Failed to get media:', err);
      });

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const enabled = !videoEnabled;
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled));
      setVideoEnabled(enabled);
    }
  }, [videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const enabled = !audioEnabled;
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
      setAudioEnabled(enabled);
    }
  }, [audioEnabled]);

  return { stream, videoEnabled, audioEnabled, toggleVideo, toggleAudio };
}
```

- [ ] **Step 3: Create usePeerManager hook**

`packages/client/src/renderer/hooks/usePeerManager.ts`:
```typescript
import { useRef, useState, useCallback, useEffect } from 'react';
import { PeerManager } from '../lib/peer-manager';
import type { PeerInfo } from '@zoom-clone/shared';

export interface RemotePeer {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
}

interface UsePeerManagerResult {
  remotePeers: RemotePeer[];
  peerManager: PeerManager | null;
  addPeer: (peer: PeerInfo, initiator: boolean) => void;
  removePeer: (peerId: string) => void;
  handleSignal: (fromPeerId: string, signalData: unknown) => void;
}

export function usePeerManager(
  localStream: MediaStream | null,
  onData?: (peerId: string, data: unknown) => void
): UsePeerManagerResult {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const managerRef = useRef<PeerManager | null>(null);

  useEffect(() => {
    const manager = new PeerManager({
      onStream: (peerId, stream) => {
        setRemotePeers((prev) =>
          prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p))
        );
      },
      onClose: (peerId) => {
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
      },
      onData: (peerId, data) => {
        onData?.(peerId, data);
      },
    });
    managerRef.current = manager;

    return () => {
      manager.destroyAll();
    };
  }, []);

  useEffect(() => {
    if (managerRef.current && localStream) {
      managerRef.current.setLocalStream(localStream);
    }
  }, [localStream]);

  const addPeer = useCallback((peer: PeerInfo, initiator: boolean) => {
    if (!managerRef.current) return;
    setRemotePeers((prev) => {
      if (prev.some((p) => p.peerId === peer.id)) return prev;
      return [...prev, { peerId: peer.id, displayName: peer.displayName, stream: null }];
    });
    managerRef.current.createPeer(peer.id, peer.displayName, initiator);
  }, []);

  const removePeer = useCallback((peerId: string) => {
    managerRef.current?.removePeer(peerId);
    setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const handleSignal = useCallback((fromPeerId: string, signalData: unknown) => {
    managerRef.current?.handleSignal(fromPeerId, signalData);
  }, []);

  return { remotePeers, peerManager: managerRef.current, addPeer, removePeer, handleSignal };
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/renderer/hooks/
git commit -m "feat: add useSocket, useMediaStream, and usePeerManager hooks"
```

---

### Task 12: VideoGrid, VideoTile, and Toolbar Components

**Files:**
- Create: `packages/client/src/renderer/components/VideoTile.tsx`
- Create: `packages/client/src/renderer/components/VideoTile.module.css`
- Create: `packages/client/src/renderer/components/VideoGrid.tsx`
- Create: `packages/client/src/renderer/components/VideoGrid.module.css`
- Create: `packages/client/src/renderer/components/Toolbar.tsx`
- Create: `packages/client/src/renderer/components/Toolbar.module.css`

- [ ] **Step 1: Create VideoTile component**

`packages/client/src/renderer/components/VideoTile.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream: MediaStream | null;
  displayName: string;
  isSelf?: boolean;
  muted?: boolean;
}

export function VideoTile({ stream, displayName, isSelf = false, muted = false }: VideoTileProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.tile}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf || muted}
          className={`${styles.video} ${isSelf ? styles.mirror : ''}`}
        />
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.avatar}>{displayName[0]?.toUpperCase()}</span>
        </div>
      )}
      <span className={styles.name}>{displayName}{isSelf ? ' (You)' : ''}</span>
    </div>
  );
}
```

`packages/client/src/renderer/components/VideoTile.module.css`:
```css
.tile {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mirror {
  transform: scaleX(-1);
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
}

.name {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}
```

- [ ] **Step 2: Create VideoGrid component**

`packages/client/src/renderer/components/VideoGrid.tsx`:
```typescript
import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../hooks/usePeerManager';
import styles from './VideoGrid.module.css';

interface VideoGridProps {
  localStream: MediaStream | null;
  localDisplayName: string;
  remotePeers: RemotePeer[];
}

export function VideoGrid({ localStream, localDisplayName, remotePeers }: VideoGridProps): JSX.Element {
  const totalParticipants = remotePeers.length + 1;
  const columns = totalParticipants <= 2 ? totalParticipants : totalParticipants <= 4 ? 2 : 3;

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      <VideoTile stream={localStream} displayName={localDisplayName} isSelf />
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.peerId}
          stream={peer.stream}
          displayName={peer.displayName}
        />
      ))}
    </div>
  );
}
```

`packages/client/src/renderer/components/VideoGrid.module.css`:
```css
.grid {
  display: grid;
  gap: 8px;
  padding: 8px;
  height: 100%;
  align-content: center;
}
```

- [ ] **Step 3: Create Toolbar component**

`packages/client/src/renderer/components/Toolbar.tsx`:
```typescript
import styles from './Toolbar.module.css';

interface ToolbarProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function Toolbar({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeave,
}: ToolbarProps): JSX.Element {
  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.btn} ${!audioEnabled ? styles.off : ''}`}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        <span className={styles.icon}>{audioEnabled ? '🎤' : '🔇'}</span>
        <span className={styles.label}>{audioEnabled ? 'Mute' : 'Unmute'}</span>
      </button>

      <button
        className={`${styles.btn} ${!videoEnabled ? styles.off : ''}`}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        <span className={styles.icon}>{videoEnabled ? '📷' : '📷'}</span>
        <span className={styles.label}>{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
      </button>

      <button
        className={`${styles.btn} ${isScreenSharing ? styles.active : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        <span className={styles.icon}>🖥️</span>
        <span className={styles.label}>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      <button
        className={`${styles.btn} ${styles.leave}`}
        onClick={onLeave}
        title="Leave meeting"
      >
        <span className={styles.icon}>📞</span>
        <span className={styles.label}>Leave</span>
      </button>
    </div>
  );
}
```

`packages/client/src/renderer/components/Toolbar.module.css`:
```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--toolbar-bg);
  border-top: 1px solid var(--border);
}

.btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: background 0.2s;
}

.btn:hover {
  background: var(--bg-tertiary);
}

.btn.off {
  background: var(--danger);
  color: white;
}

.btn.active {
  background: var(--accent);
  color: white;
}

.btn.leave {
  background: var(--danger);
  color: white;
  margin-left: 2rem;
}

.btn.leave:hover {
  background: #c0392b;
}

.icon {
  font-size: 1.3rem;
}

.label {
  font-size: 0.7rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/renderer/components/VideoTile* packages/client/src/renderer/components/VideoGrid* packages/client/src/renderer/components/Toolbar*
git commit -m "feat: add VideoTile, VideoGrid, and Toolbar components"
```

---

### Task 13: Screen Share Hook & ScreenShareView Component

**Files:**
- Create: `packages/client/src/renderer/hooks/useScreenShare.ts`
- Create: `packages/client/src/renderer/components/ScreenShareView.tsx`
- Create: `packages/client/src/renderer/components/ScreenShareView.module.css`

- [ ] **Step 1: Create useScreenShare hook**

`packages/client/src/renderer/hooks/useScreenShare.ts`:
```typescript
import { useState, useCallback, useRef } from 'react';
import type { PeerManager } from '../lib/peer-manager';

interface UseScreenShareResult {
  isSharing: boolean;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
}

export function useScreenShare(
  peerManager: PeerManager | null,
  originalStream: MediaStream | null
): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startSharing = useCallback(async () => {
    if (!peerManager) return;

    const sources = await window.electronAPI?.getDesktopSources();
    if (!sources || sources.length === 0) return;

    // Use the first screen source (primary display)
    // In a full implementation, show a picker dialog
    const sourceId = sources[0].id;

    try {
      const screenStream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track on all peers
      peerManager.replaceTrackOnAll(screenTrack);

      screenTrack.onended = () => {
        stopSharing();
      };

      setIsSharing(true);
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  }, [peerManager, originalStream]);

  const stopSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Restore original camera track
    if (peerManager && originalStream) {
      const cameraTrack = originalStream.getVideoTracks()[0];
      if (cameraTrack) {
        peerManager.replaceTrackOnAll(cameraTrack);
      }
    }

    setIsSharing(false);
  }, [peerManager, originalStream]);

  return { isSharing, startSharing, stopSharing };
}
```

- [ ] **Step 2: Create ScreenShareView component**

`packages/client/src/renderer/components/ScreenShareView.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import { VideoTile } from './VideoTile';
import type { RemotePeer } from '../hooks/usePeerManager';
import styles from './ScreenShareView.module.css';

interface ScreenShareViewProps {
  sharedStream: MediaStream;
  sharerName: string;
  localStream: MediaStream | null;
  localDisplayName: string;
  remotePeers: RemotePeer[];
  onScreenClick?: (x: number, y: number, button: 'left' | 'right') => void;
  onScreenMouseMove?: (x: number, y: number) => void;
  isControlling?: boolean;
}

export function ScreenShareView({
  sharedStream,
  sharerName,
  localStream,
  localDisplayName,
  remotePeers,
  onScreenClick,
  onScreenMouseMove,
  isControlling = false,
}: ScreenShareViewProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = sharedStream;
    }
  }, [sharedStream]);

  const handleMouseEvent = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isControlling || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (e.type === 'click') {
      onScreenClick?.(x, y, 'left');
    } else if (e.type === 'contextmenu') {
      e.preventDefault();
      onScreenClick?.(x, y, 'right');
    } else if (e.type === 'mousemove') {
      onScreenMouseMove?.(x, y);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainView}>
        <div className={styles.sharerLabel}>{sharerName} is sharing their screen</div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`${styles.screenVideo} ${isControlling ? styles.controlling : ''}`}
          onClick={handleMouseEvent}
          onContextMenu={handleMouseEvent}
          onMouseMove={isControlling ? handleMouseEvent : undefined}
        />
      </div>
      <div className={styles.sidebar}>
        <VideoTile stream={localStream} displayName={localDisplayName} isSelf />
        {remotePeers.map((peer) => (
          <VideoTile
            key={peer.peerId}
            stream={peer.stream}
            displayName={peer.displayName}
          />
        ))}
      </div>
    </div>
  );
}
```

`packages/client/src/renderer/components/ScreenShareView.module.css`:
```css
.container {
  display: flex;
  height: 100%;
  gap: 8px;
  padding: 8px;
}

.mainView {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sharerLabel {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 4px 8px;
}

.screenVideo {
  width: 100%;
  flex: 1;
  object-fit: contain;
  background: black;
  border-radius: 8px;
}

.screenVideo.controlling {
  cursor: crosshair;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/renderer/hooks/useScreenShare.ts packages/client/src/renderer/components/ScreenShareView*
git commit -m "feat: add screen sharing hook and ScreenShareView component"
```

---

### Task 14: Remote Control — Event Capture, Execution, and Overlay

**Files:**
- Create: `packages/client/src/renderer/lib/remote-control.ts`
- Create: `packages/client/src/main/remote-control-executor.ts`
- Create: `packages/client/src/renderer/components/RemoteControlOverlay.tsx`
- Create: `packages/client/src/renderer/components/RemoteControlOverlay.module.css`

- [ ] **Step 1: Create remote control event capture library**

`packages/client/src/renderer/lib/remote-control.ts`:
```typescript
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
```

- [ ] **Step 2: Create remote control executor (main process)**

`packages/client/src/main/remote-control-executor.ts`:
```typescript
import { ipcMain } from 'electron';

let nutjs: typeof import('@nut-tree/nut-js') | null = null;

async function getNutJs() {
  if (!nutjs) {
    nutjs = await import('@nut-tree/nut-js');
    nutjs.mouse.config.autoDelayMs = 0;
    nutjs.keyboard.config.autoDelayMs = 0;
  }
  return nutjs;
}

export function setupRemoteControlExecutor(): void {
  ipcMain.handle('execute-remote-control', async (_event, controlEvent) => {
    try {
      const { mouse, keyboard, Point, Button, Key } = await getNutJs();

      switch (controlEvent.type) {
        case 'mouse-move': {
          await mouse.setPosition(new Point(controlEvent.x, controlEvent.y));
          break;
        }
        case 'mouse-click': {
          await mouse.setPosition(new Point(controlEvent.x, controlEvent.y));
          const btn = controlEvent.button === 'left' ? Button.LEFT : Button.RIGHT;
          await mouse.click(btn);
          break;
        }
        case 'mouse-scroll': {
          await mouse.scrollDown(controlEvent.deltaY);
          break;
        }
        case 'key-down': {
          const key = mapKey(controlEvent.key, Key);
          if (key !== undefined) {
            await keyboard.pressKey(key);
          }
          break;
        }
        case 'key-up': {
          const key = mapKey(controlEvent.key, Key);
          if (key !== undefined) {
            await keyboard.releaseKey(key);
          }
          break;
        }
      }
    } catch (err) {
      // Silently skip failed remote control actions
      console.error('Remote control execution error:', err);
    }
  });
}

function mapKey(key: string, Key: any): number | undefined {
  // Map common keys to nut.js Key enum
  const keyMap: Record<string, string> = {
    'Enter': 'Return',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    ' ': 'Space',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
  };

  const mapped = keyMap[key] || key;

  // Try to find key in nut.js Key enum
  if (Key[mapped] !== undefined) return Key[mapped];
  if (Key[mapped.toUpperCase()] !== undefined) return Key[mapped.toUpperCase()];

  // Single character keys
  if (key.length === 1) {
    const upper = key.toUpperCase();
    if (Key[upper] !== undefined) return Key[upper];
  }

  return undefined;
}
```

- [ ] **Step 3: Wire remote control executor into main process**

Add to `packages/client/src/main/index.ts` — import and call at the top level:

Add import:
```typescript
import { setupRemoteControlExecutor } from './remote-control-executor';
```

Call after `app.whenReady().then(createWindow)`:
```typescript
setupRemoteControlExecutor();
```

- [ ] **Step 4: Create RemoteControlOverlay component**

`packages/client/src/renderer/components/RemoteControlOverlay.tsx`:
```typescript
import { useEffect, useCallback } from 'react';
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
  // Capture keyboard events when controlling
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
```

`packages/client/src/renderer/components/RemoteControlOverlay.module.css`:
```css
.overlay {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.sharerControls {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.controlInfo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--accent);
  font-size: 0.85rem;
}

.controllerInfo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 120, 212, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: white;
  font-size: 0.85rem;
}

.stopBtn {
  background: var(--danger);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.stopBtn:hover {
  background: #c0392b;
}
```

- [ ] **Step 5: Add nut.js dependency to client**

Add to `packages/client/package.json` dependencies:
```json
"@nut-tree/nut-js": "^4.2.0"
```

Then run:
```bash
npm install
```

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/main/remote-control-executor.ts packages/client/src/renderer/lib/remote-control.ts packages/client/src/renderer/components/RemoteControlOverlay*
git commit -m "feat: add remote control event capture, execution, and overlay"
```

---

### Task 15: Toast Notification Component

**Files:**
- Create: `packages/client/src/renderer/components/Toast.tsx`
- Create: `packages/client/src/renderer/components/Toast.module.css`

- [ ] **Step 1: Create Toast component**

`packages/client/src/renderer/components/Toast.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import styles from './Toast.module.css';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps): JSX.Element {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span>{toast.text}</span>
      <button className={styles.dismiss} onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  );
}

// Hook for managing toasts
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
```

`packages/client/src/renderer/components/Toast.module.css`:
```css
.container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: white;
  animation: slideIn 0.3s ease;
}

.info {
  background: var(--bg-tertiary);
}

.success {
  background: var(--success);
}

.error {
  background: var(--danger);
}

.dismiss {
  background: none;
  color: white;
  font-size: 1.2rem;
  padding: 0;
  opacity: 0.7;
}

.dismiss:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/renderer/components/Toast*
git commit -m "feat: add Toast notification component with useToasts hook"
```

---

### Task 16: MeetingRoom — Orchestrator Component

**Files:**
- Create: `packages/client/src/renderer/components/MeetingRoom.tsx`
- Create: `packages/client/src/renderer/components/MeetingRoom.module.css`

- [ ] **Step 1: Create MeetingRoom component**

`packages/client/src/renderer/components/MeetingRoom.tsx`:
```typescript
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
  const [screenSize, setScreenSize] = useState<{ width: number; height: number } | null>(null);

  const handleDataMessage = useCallback((peerId: string, data: unknown) => {
    const msg = data as RemoteControlMessage;

    switch (msg.type) {
      case 'request-control':
        if (allowRemoteControl) {
          addToast(`${msg.fromPeerId} is requesting control`, 'info');
          // Auto-grant for prototype — in production, show a dialog
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
        // Execute the remote control event on this machine
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

  const { isSharing, startSharing, stopSharing } = useScreenShare(peerManager, stream);

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
    // If we don't have this peer yet, add them as non-initiator
    if (!remotePeers.some((p) => p.peerId === fromPeerId)) {
      // We need the display name — for now use a placeholder
      addPeer({ id: fromPeerId, displayName: 'Peer' }, false);
    }
    handleSignal(fromPeerId, signalData);
  }, [remotePeers, addPeer, handleSignal]);

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
      startSharing();
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
    </div>
  );
}
```

`packages/client/src/renderer/components/MeetingRoom.module.css`:
```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.videoArea {
  flex: 1;
  overflow: hidden;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: var(--danger);
}

.error button {
  background: var(--accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
}

.connecting {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 1.2rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/renderer/components/MeetingRoom*
git commit -m "feat: add MeetingRoom orchestrator with video, screen share, and remote control"
```

---

### Task 17: Wire Remote Control Executor into Main Process

**Files:**
- Modify: `packages/client/src/main/index.ts`

- [ ] **Step 1: Add import and setup call**

Add to `packages/client/src/main/index.ts`:

Import at top:
```typescript
import { setupRemoteControlExecutor } from './remote-control-executor';
```

Add after the `app.whenReady().then(createWindow)` line:
```typescript
setupRemoteControlExecutor();
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/main/index.ts
git commit -m "feat: wire remote control executor into Electron main process"
```

---

### Task 18: Integration Test — Full Flow Verification

**Files:**
- No new files — manual testing

- [ ] **Step 1: Start the signaling server**

```bash
cd packages/server && npx tsx src/index.ts
```

Expected: `Signaling server running on port 3001`

- [ ] **Step 2: Start the Electron app**

In a separate terminal:
```bash
cd packages/client && npm run dev
```

Expected: Electron window opens with HomeScreen showing "New Meeting" and "Join Meeting" options.

- [ ] **Step 3: Test meeting creation**

1. Click "Create Meeting"
2. Verify a meeting ID appears in `abc-defg-hij` format
3. Click "Copy Invite Link"
4. Click "Join Meeting" next to the meeting ID
5. Verify PreJoinScreen shows with camera preview

- [ ] **Step 4: Test joining a meeting**

1. Enter a display name and click "Join Meeting"
2. Verify MeetingRoom loads with your camera in the video grid
3. Verify toolbar buttons are visible (Mute, Camera, Share Screen, Leave)

- [ ] **Step 5: Test with two instances**

1. Open a second Electron instance (or run dev again)
2. Join the same meeting ID
3. Verify both participants see each other's video
4. Verify toast notifications appear for join/leave events

- [ ] **Step 6: Test screen sharing**

1. Click "Share Screen" in one instance
2. Verify the other instance sees the shared screen in the large view
3. Verify camera feeds move to the sidebar
4. Click "Stop Share" and verify it returns to grid view

- [ ] **Step 7: Test remote control**

1. Start screen sharing in instance A
2. Enable "Allow remote control" toggle in instance A
3. In instance B, request control (via the shared screen view)
4. Verify control is granted and mouse/keyboard events are relayed

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: finalize Zoom clone application"
```
