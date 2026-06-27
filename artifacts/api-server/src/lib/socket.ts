import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  const onlineUsers = new Map<string, string>();

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string | undefined;

    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      io.emit("user:online", { userId });

      socket.on("disconnect", () => {
        onlineUsers.delete(userId);
        io.emit("user:offline", { userId });
      });
    }

    socket.on("admin:join", () => {
      socket.join("admins");
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
