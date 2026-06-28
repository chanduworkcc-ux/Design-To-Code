import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

// Module-level map so getOnlineUserIds() can read it
const onlineUsers = new Map<string, string>(); // userId → socketId

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string | undefined;

    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);

      // Broadcast presence to everyone + admin room
      io.emit("user:online", { userId });
      io.to("admins").emit("user:online", { userId });

      socket.on("disconnect", () => {
        onlineUsers.delete(userId);
        io.emit("user:offline", { userId });
        io.to("admins").emit("user:offline", { userId });
      });
    }

    socket.on("admin:join", () => {
      socket.join("admins");
      // Immediately send the current online snapshot to this admin
      socket.emit("online:init", { userIds: Array.from(onlineUsers.keys()) });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

/** Returns the IDs of all currently connected (online) users. */
export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}
