# Zoom Clone — Design Spec

## Overview

A desktop video conferencing application (Electron + React + TypeScript) for a small team of 4-6 people. Features include video/audio calls, screen sharing, remote screen control (mouse + keyboard), and meeting invite links. No authentication — anyone with a link can join.

This is a functional prototype/portfolio project, not a production system.

## Tech Stack

- **Client:** Electron, React, TypeScript, simple-peer (WebRTC wrapper), socket.io-client, nut.js (remote control input execution)
- **Server:** Node.js, TypeScript, Socket.IO, uuid
- **Shared:** TypeScript types for signaling messages, events, and remote control commands
- **Build:** npm workspaces, electron-builder for packaging

## Project Structure

```
zoom-clone/
├── packages/
│   ├── client/              # Electron + React app
│   │   ├── src/
│   │   │   ├── main/        # Electron main process
│   │   │   ├── renderer/    # React UI
│   │   │   └── preload/     # Electron preload scripts
│   │   └── package.json
│   ├── server/              # Signaling server
│   │   ├── src/
│   │   └── package.json
│   └── shared/              # Shared types & constants
│       ├── src/
│       └── package.json
├── package.json             # Root workspace
└── tsconfig.base.json
```

## Signaling Server & Meeting Flow

The signaling server is minimal — it helps peers discover each other and exchange WebRTC connection info. No media passes through it. It is stateless beyond in-memory room tracking — no database needed.

### Meeting Lifecycle

1. **Host creates meeting** — client sends `create-room` to server, server generates a unique meeting ID (e.g., `abc-defg-hij`), returns a shareable link like `zoomclone://meeting/abc-defg-hij`
2. **Participant joins** — clicks the link, Electron app opens, client sends `join-room` with the meeting ID
3. **Signaling exchange** — server relays WebRTC offers/answers/ICE candidates between peers so they can establish direct connections
4. **Peers connected** — all video/audio/data flows peer-to-peer, server is no longer involved in media
5. **Participant leaves** — server notifies remaining peers, they clean up that connection

### Server Responsibilities

- Room management (create, join, leave, destroy when empty)
- Relay signaling messages (offer, answer, ICE candidates) between peers
- Track which peers are in which room
- Notify peers when someone joins/leaves

### Socket.IO Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-room` | Client → Server | Host creates a new meeting |
| `room-created` | Server → Client | Returns meeting ID |
| `join-room` | Client → Server | Participant joins with meeting ID |
| `peer-joined` | Server → Clients | Notifies existing peers of new participant |
| `signal` | Client → Server → Client | Relays WebRTC signaling data |
| `peer-left` | Server → Clients | Notifies when someone disconnects |

## WebRTC Mesh & Media

### Mesh Topology

Each participant maintains a direct WebRTC connection to every other participant. For 6 people, that's 15 total connections (n*(n-1)/2). Each connection carries video, audio, and a data channel.

### Connection Setup (when a new peer joins)

1. New peer receives list of existing peers from the server
2. New peer initiates a WebRTC connection (via `simple-peer`) to each existing peer
3. Existing peers accept and complete the handshake
4. Each connection creates:
   - **Media stream** — camera video + microphone audio
   - **Data channel** — used for remote control commands and screen control events

### Media Handling

- Video captured via `navigator.mediaDevices.getUserMedia()`
- Each peer's video rendered in a grid layout (auto-adjusts based on participant count)
- Users can toggle camera on/off and mute/unmute mic
- Audio/video tracks can be added/removed from existing connections without renegotiation using `replaceTrack()`

### Connection Management

- A `PeerManager` class manages all active connections
- Handles reconnection if a peer temporarily disconnects
- Cleans up connections when a peer leaves
- ICE servers: free public STUN servers (`stun:stun.l.google.com:19302`). No TURN server needed for a small team on similar networks

## Screen Sharing

- Uses Electron's `desktopCapturer` API to list available screens/windows
- User picks which screen or window to share from a picker dialog
- The screen stream replaces the camera video track on all peer connections using `replaceTrack()`
- Other participants see the shared screen in a large view with camera feeds in small thumbnails
- Only one person can share their screen at a time
- Stopping screen share switches back to camera feed

## Remote Control

Works over the WebRTC data channel between the controller and the sharer.

### Flow

1. Screen sharer enables "Allow remote control" toggle
2. A viewer clicks "Request control"
3. Sharer gets a prompt and approves/denies
4. Once approved, the viewer's mouse movements and keyboard inputs on the shared screen view are captured
5. These events are serialized and sent via the data channel to the sharer
6. On the sharer's machine, `nut.js` executes the mouse/keyboard actions on the actual OS

### Data Channel Messages

```typescript
type RemoteControlEvent =
  | { type: 'mouse-move'; x: number; y: number }
  | { type: 'mouse-click'; button: 'left' | 'right'; x: number; y: number }
  | { type: 'mouse-scroll'; deltaX: number; deltaY: number }
  | { type: 'key-down'; key: string; modifiers: string[] }
  | { type: 'key-up'; key: string; modifiers: string[] }
```

### Coordinate Mapping

The viewer's mouse position on the shared screen video element is mapped to the sharer's actual screen coordinates using the ratio of video dimensions to actual screen resolution.

### Safety

- Remote control only works while screen sharing is active
- Sharer can revoke control at any time with a floating "Stop Control" button
- Only one controller at a time
- Control is automatically revoked when screen sharing stops

## UI Layout & User Experience

### Main Screens

1. **Home Screen** — Two options: "New Meeting" (creates room, shows invite link to copy) and "Join Meeting" (paste a meeting ID/link)

2. **Meeting Room** — The core view:
   - **Video grid** — auto-layout grid showing all participants' camera feeds, adjusts columns based on count (1-2: side by side, 3-4: 2x2, 5-6: 3x2)
   - **Screen share mode** — shared screen takes 80% of the view, camera feeds shrink to a sidebar strip
   - **Bottom toolbar** — mic toggle, camera toggle, screen share, leave meeting
   - **Participant name labels** — each user enters a display name on join
   - **Remote control overlay** — subtle border when controlling; floating "Stop Control" button when being controlled

3. **Pre-join Screen** — After clicking a meeting link: enter display name, preview camera/mic, select audio/video devices, then "Join" button

### Notifications

- Toast notifications for: peer joined, peer left, remote control requested, control granted/revoked
- Connection status indicator (connected/reconnecting)

### Styling

Clean, minimal dark theme using CSS modules. Functional and clear.

## Data Flow

**Signaling (via Socket.IO server):**
```
Peer A → Server → Peer B    (WebRTC offers/answers/ICE candidates)
```

**Media (peer-to-peer, after connection established):**
```
Peer A ←→ Peer B    (video/audio streams via WebRTC media channels)
Peer A ←→ Peer C    (each pair has its own connection)
Peer B ←→ Peer C
```

**Remote control (peer-to-peer via data channel):**
```
Controller → Data Channel → Sharer    (mouse/keyboard events)
Sharer → Data Channel → Controller    (control granted/revoked status)
```

## Error Handling

- If signaling server is unreachable: show "Cannot connect to server" on home screen
- If a peer connection fails: attempt reconnection 3 times, then show "Connection lost" for that peer
- If screen share permission is denied: show toast and remain in camera mode
- If `nut.js` fails to execute a remote control action: silently skip (don't crash)

## Key Architectural Decisions

- Server is only involved during connection setup — never touches media or control data
- All real-time communication is peer-to-peer after signaling completes
- Data channels reuse the same WebRTC connections as media — no extra connections needed
- No persistent storage anywhere — everything is in-memory and ephemeral
- Custom protocol link (`zoomclone://`) registered by Electron for meeting invite deep linking
