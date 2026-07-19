/**
 * Realtime layer (Socket.IO) — a thin authenticated pub/sub on top of the
 * existing HTTP API. Every connected client joins a room named after their
 * own userId, so server code anywhere can push an event to a specific user
 * without tracking socket ids. Single-process only (no Redis adapter) —
 * matches the rest of this app's single-instance deployment.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing token');
      const decoded = verifyAccessToken(token);
      (socket.data as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as any).userId as string;
    socket.join(userRoom(userId));
  });

  return io;
}

/** Emit an event to every connected socket for a given user. No-op if that user is offline or the server has no socket layer (e.g. tests). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function getIO(): SocketIOServer | null {
  return io;
}
