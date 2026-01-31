import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import connectDatabase from "./config/database.js";

// Modules
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import conversationRoutes from "./modules/chat/conversation.routes.js";
import callRoutes from "./modules/call/call.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import { InitializeSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = InitializeSocket(server);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(morgan("dev"));
// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log("🚀 Starting VoiceConnect Backend Server...");

// Connect to MongoDB
connectDatabase();

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "VoiceConnect Backend Server is running!",
    database: "MongoDB",
    timestamp: new Date().toISOString(),
    features: ["Chat", "Voice Calls", "Notifications", "Persistent Data"],
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 VoiceConnect Backend Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://[YOUR_IP]:${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🎯 API endpoints available at /api/*`);
  console.log(`💬 Chat with notifications enabled`);
  console.log(`📄 MongoDB integration active`);
  console.log(`🔔 Background notifications supported`);
});
