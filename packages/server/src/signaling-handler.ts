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
