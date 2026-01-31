import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import userSocketHandler from "./modules/user/user.socket.js";
import chatSocketHandler from "./modules/chat/chat.socket.js";
import callSocketHandler from "./modules/call/call.socket.js";

export const InitializeSocket = (server) => {
  const io = new Server(server, {
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    pingInterval: 30000,
    pingTimeout: 60000,
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decodedToken.id;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);

    // Initialize module socket handlers
    userSocketHandler(io, socket);
    chatSocketHandler(io, socket);
    callSocketHandler(io, socket);
  });

  return io;
};
