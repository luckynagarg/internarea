const { Server } = require("socket.io");
const { getAuth } = require("firebase-admin/auth");
const {
  getOrCreateConversation,
  sendMessage,
  markAsRead,
} = require("./messageService");

// Map of firebaseUid -> Set of socket IDs (supports multiple tabs/devices).
const userSockets = new Map();

let io = null;

/**
 * Initialize Socket.IO server attached to the HTTP server.
 */
function initSocketServer(httpServer, options = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: options.corsOrigin || "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware: verify Firebase ID token before connecting.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required: missing token."));
      }

      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded?.uid) {
        return next(new Error("Authentication failed: invalid token."));
      }

      socket.data.uid = decoded.uid;
      socket.data.email = decoded.email || null;
      next();
    } catch (err) {
      console.error("[socket] auth failed:", err?.message);
      next(new Error("Authentication failed: token verification error."));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.uid;
    console.log(`[socket] connected: ${uid} (socket ${socket.id})`);

    // Track this socket for the user.
    if (!userSockets.has(uid)) {
      userSockets.set(uid, new Set());
    }
    userSockets.get(uid).add(socket.id);

    // Join a conversation room to receive messages for it.
    socket.on("join_conversation", ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on("leave_conversation", ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // Handle sending a message in realtime.
    socket.on("send_message", async (payload, callback) => {
      try {
        const { conversationId, text, imageUrl, messageType } = payload;

        if (!conversationId) {
          return callback?.({ success: false, error: "conversationId is required." });
        }

        const message = await sendMessage({
          conversationId,
          senderId: uid,
          text,
          imageUrl,
          messageType,
        });

        const receiverId = message.receiverId;

        // Broadcast to the conversation room (both participants).
        io.to(`conv:${conversationId}`).emit("new_message", {
          message: {
            _id: message._id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            receiverId: message.receiverId,
            messageType: message.messageType,
            text: message.text,
            imageUrl: message.imageUrl,
            createdAt: message.createdAt,
            readAt: message.readAt,
          },
        });

        // Also notify the receiver's personal channel (for unread counts).
        emitToUser(receiverId, "conversation_updated", { conversationId });

        callback?.({ success: true, data: { message } });
      } catch (err) {
        console.error("[socket] send_message error:", err?.message);
        callback?.({ success: false, error: err?.message || "Failed to send message." });
      }
    });

    // Handle typing indicator.
    socket.on("typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("typing", {
          conversationId,
          userId: uid,
        });
      }
    });

    socket.on("stop_typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("stop_typing", {
          conversationId,
          userId: uid,
        });
      }
    });

    // Handle marking messages as read.
    socket.on("mark_read", async ({ conversationId }, callback) => {
      try {
        if (!conversationId) {
          return callback?.({ success: false, error: "conversationId is required." });
        }

        const result = await markAsRead(conversationId, uid);

        // Notify the other participant that messages were read.
        socket.to(`conv:${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: uid,
          readAt: result.readAt,
        });

        callback?.({ success: true, data: result });
      } catch (err) {
        callback?.({ success: false, error: err?.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${uid} (socket ${socket.id})`);
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
        }
      }
    });
  });

  return io;
}

/**
 * Emit an event to all sockets of a specific user.
 */
function emitToUser(uid, event, data) {
  if (!io) return;
  const sockets = userSockets.get(uid);
  if (sockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

/**
 * Check if a user is currently online (has at least one active socket).
 */
function isUserOnline(uid) {
  const sockets = userSockets.get(uid);
  return sockets && sockets.size > 0;
}

/**
 * Get the Socket.IO server instance.
 */
function getIO() {
  return io;
}

module.exports = {
  initSocketServer,
  emitToUser,
  isUserOnline,
  getIO,
};
