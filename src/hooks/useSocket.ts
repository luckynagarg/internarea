import { useEffect, useRef, useCallback } from "react";
import { getSocket, disconnectSocket, getSocketInstance } from "@/lib/socketClient";
import { getAuthToken } from "@/lib/authHeaders";

type EventHandler = (data: any) => void;

/**
 * Hook to manage a Socket.IO connection with automatic authentication,
 * reconnection, and event listener cleanup.
 */
export function useSocket() {
  const handlersRef = useRef<Map<string, EventHandler>>(new Map());
  const connectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        const token = await getAuthToken();
        if (!token || !mounted) return;

        const socket = getSocket(token);

        if (socket.connected) {
          connectedRef.current = true;
        }

        socket.on("connect", () => {
          connectedRef.current = true;
        });

        socket.on("disconnect", () => {
          connectedRef.current = false;
        });

        // Re-register any handlers that were added before connection.
        handlersRef.current.forEach((handler, event) => {
          socket.on(event, handler);
        });
      } catch (err) {
        console.error("[useSocket] connection error:", err);
      }
    }

    connect();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    handlersRef.current.set(event, handler);
    const socket = getSocketInstance();
    if (socket) {
      socket.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string, handler?: EventHandler) => {
    if (handler) {
      handlersRef.current.delete(event);
      const socket = getSocketInstance();
      if (socket) {
        socket.off(event, handler);
      }
    } else {
      // Remove all handlers for this event.
      handlersRef.current.delete(event);
      const socket = getSocketInstance();
      if (socket) {
        socket.off(event);
      }
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const socket = getSocketInstance();
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }, []);

  return { on, off, emit, isConnected: () => connectedRef.current };
}
