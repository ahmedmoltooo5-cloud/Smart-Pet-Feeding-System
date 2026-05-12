import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let activeToken: string | null = null;

export function connectSocket(token: string) {
  if (socket && activeToken === token) {
    return socket;
  }

  disconnectSocket();

  activeToken = token;
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ["websocket"],
    auth: {
      token,
    },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = null;
  activeToken = null;
}
