import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/config/api";

let socket: Socket | null = null;

/**
 * Get or create the singleton Socket.IO connection.
 * Authenticates using the Firebase ID token.
 */
export function getSocket(token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] connect error:", err.message);
  });

  return socket;
}

/**
 * Disconnect and cleanup the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null).
 */
export function getSocketInstance(): Socket | null {
  return socket;
}
