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
