import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { getSystemStatus } from "../services/systemStateService.js";

let io = null;

export function initializeSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      next(new Error("Authentication token is required."));
      return;
    }

    try {
      socket.data.auth = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      next(new Error("Invalid socket authentication token."));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.auth.userId;
    socket.join(`user:${userId}`);

    const status = await getSystemStatus();
    socket.emit("system:status", status);
  });

  return io;
}

export function emitGlobal(event, payload) {
  io?.emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  if (!userId) {
    emitGlobal(event, payload);
    return;
  }

  io?.to(`user:${userId}`).emit(event, payload);
}
