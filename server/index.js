import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import connectDatabase from "./config/database.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import Call from "./models/Call.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Create uploads directory if it doesn't exist
import fs from "fs";
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

console.log("🚀 Starting VoiceConnect Backend Server...");

// Connect to MongoDB
connectDatabase();

// In-memory storage for active connections (still needed for Socket.io)
const activeUsers = new Map(); // userId -> socketId mapping

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "VoiceConnect Backend Server is running!",
    database: "MongoDB",
    timestamp: new Date().toISOString(),
    features: ["Chat", "Voice Calls", "Notifications", "Persistent Data"],
  });
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Set user as online
    await user.setOnline();

    console.log(`✅ User logged in: ${username} (${user._id})`);

    res.json({
      user: user.toPublicJSON(),
      token: user._id.toString(), // Simple token (in production, use JWT)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Register endpoint
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, gender } = req.body;

    if (!username || !password || !gender) {
      return res
        .status(400)
        .json({ error: "Username, password, and gender are required" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters long" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Create new user
    const user = new User({
      username: username.trim(),
      password,
      gender,
    });

    await user.save();

    // Set user as online
    await user.setOnline();

    console.log(`✅ New user registered: ${username} (${user._id})`);

    res.status(201).json({
      user: user.toPublicJSON(),
      token: user._id.toString(), // Simple token (in production, use JWT)
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// Get users endpoint
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find(
      {},
      "username avatar isOnline lastSeen totalCalls totalMessages joinedAt",
    ).sort({ isOnline: -1, lastSeen: -1 });

    // Convert to public JSON format with id instead of _id
    const usersWithId = users.map((user) => user.toPublicJSON());
    res.json(usersWithId);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get call history endpoint
app.get("/api/calls/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const calls = await Call.getUserCallHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(calls);
  } catch (error) {
    console.error("Get call history error:", error);
    res.status(500).json({ error: "Failed to fetch call history" });
  }
});

// Get chat messages endpoint
app.get("/api/chat/:userId/:partnerId", async (req, res) => {
  try {
    const { userId, partnerId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const messages = await Message.getConversation(userId, partnerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      before: before ? new Date(before) : null,
    });

    // Reverse to get chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get recent conversations endpoint
app.get("/api/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await Message.getRecentConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get user stats endpoint
app.get("/api/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "all" } = req.query;

    const [userStats, callStats] = await Promise.all([
      User.getUserStats(userId),
      Call.getCallStats(userId, timeframe),
    ]);

    res.json({
      user: userStats,
      calls: callStats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Image upload endpoint
app.post("/api/upload/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

    res.json({
      success: true,
      imageUrl: fullUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Audio upload endpoint
const audioUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio
  },
});

app.post("/api/upload/audio", audioUpload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${audioUrl}`;

    res.json({
      success: true,
      audioUrl: fullUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      duration: 0, // Duration would need to be calculated separately
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  // User joins
  socket.on("join", async (userData) => {
    try {
      socket.userId = userData.id;
      socket.username = userData.username;

      // Update user in database
      const user = await User.findById(userData.id);
      if (user) {
        await user.setOnline(socket.id);
        activeUsers.set(userData.id, socket.id);

        console.log(`📝 User joined: ${userData.username}`);

        // Notify all clients about user status
        socket.broadcast.emit("user-online", user.toPublicJSON());
      }
    } catch (error) {
      console.error("Join error:", error);
    }
  });

  // Chat functionality
  socket.on("join-chat", async (data) => {
    try {
      const { userId, chatPartnerId } = data;
      const roomId = [userId, chatPartnerId].sort().join("-");
      socket.join(roomId);
      console.log(`💬 User ${socket.username} joined chat room: ${roomId}`);

      // Mark messages as delivered
      await Message.updateMany(
        {
          sender: chatPartnerId,
          recipient: userId,
          status: "sent",
        },
        {
          $set: {
            status: "delivered",
            deliveredAt: new Date(),
          },
        },
      );

      // Send existing messages for this chat
      const existingMessages = await Message.getConversation(
        userId,
        chatPartnerId,
        { limit: 50 },
      );
      socket.emit("chat-history", existingMessages.reverse());
    } catch (error) {
      console.error("Join chat error:", error);
    }
  });

  socket.on("send-message", async (data) => {
    try {
      const { recipientId, message } = data;

      // Prepare message data
      const messageData = {
        sender: socket.userId,
        recipient: recipientId,
        content: message.content,
        type: message.type || "text",
      };

      // Handle image messages
      if (message.type === "image" && message.imageUrl) {
        messageData.attachment = {
          url: message.imageUrl,
          caption: message.caption,
          filename: message.imageUrl.split("/").pop(),
          mimeType: "image/jpeg", // Default, could be determined from URL
          originalName: "shared_image.jpg",
        };
      }

      // Handle voice messages
      if (message.type === "voice" && message.audioUrl) {
        messageData.attachment = {
          url: message.audioUrl,
          duration: message.duration,
          filename: message.audioUrl.split("/").pop(),
          mimeType: "audio/webm", // Default, could be determined from URL
          originalName: "voice_message.webm",
        };
      }

      // Save message to database
      const newMessage = new Message(messageData);
      await newMessage.save();

      // Populate sender info
      await newMessage.populate("sender", "username avatar isOnline");
      await newMessage.populate("recipient", "username avatar isOnline");

      // Update user message count
      const user = await User.findById(socket.userId);
      if (user) {
        await user.updateActivity("message");
      }

      const roomId = [socket.userId, recipientId].sort().join("-");

      console.log(
        `💬 ${message.type === "image" ? "Image" : "Message"} from ${socket.username} to ${newMessage.recipient.username}: ${message.content}`,
      );

      // Send to all users in the chat room
      const messageResponse = {
        id: newMessage.id || newMessage._id,
        senderId: newMessage.sender.id || newMessage.sender._id,
        senderName: newMessage.sender.username,
        content: newMessage.content,
        timestamp: newMessage.createdAt.toISOString(),
        type: newMessage.type,
        imageUrl: message.imageUrl,
        caption: message.caption,
        audioUrl: message.audioUrl,
        duration: message.duration,
      };

      io.to(roomId).emit("message", messageResponse);
    } catch (error) {
      console.error("Send message error:", error);
    }
  });

  socket.on("typing", (data) => {
    const { recipientId, userId, userName } = data;
    const roomId = [userId, recipientId].sort().join("-");
    socket.to(roomId).emit("typing", { userId, userName });
  });

  socket.on("stop-typing", (data) => {
    const { recipientId, userId } = data;
    const roomId = [userId, recipientId].sort().join("-");
    socket.to(roomId).emit("stop-typing", { userId });
  });

  socket.on("mark-messages-read", async (data) => {
    try {
      const { senderId, recipientId } = data;

      console.log(`📖 Marking messages as read: ${senderId} -> ${recipientId}`);

      // Mark messages as read in database
      await Message.updateMany(
        {
          sender: senderId,
          recipient: recipientId,
          status: { $ne: "read" },
        },
        {
          $set: {
            status: "read",
            readAt: new Date(),
          },
        },
      );

      console.log(
        `📖 Messages marked as read for conversation: ${senderId} <-> ${recipientId}`,
      );
    } catch (error) {
      console.error("Mark messages as read error:", error);
    }
  });

  // Voice call functionality
  socket.on("call-user", async (data) => {
    try {
      const { targetUserId, offer, isVideoCall = false } = data;

      // Create call record
      const call = new Call({
        caller: socket.userId,
        recipient: targetUserId,
        status: "initiated",
        type: isVideoCall ? "video" : "voice",
        startedAt: new Date(),
      });
      await call.save();

      const targetSocketId = activeUsers.get(targetUserId);
      const caller = await User.findById(socket.userId);

      if (targetSocketId && caller) {
        console.log(
          `📞 Call initiated: ${caller.username} → ${(await User.findById(targetUserId)).username}`,
        );

        io.to(targetSocketId).emit("incoming-call", {
          from: caller.toPublicJSON(),
          offer,
          callId: call._id,
          isVideoCall,
        });

        // Update call status
        call.status = "ringing";
        await call.save();
      }
    } catch (error) {
      console.error("Call user error:", error);
    }
  });

  socket.on("answer-call", async (data) => {
    try {
      const { targetUserId, answer, isVideoCall = false } = data;
      const targetSocketId = activeUsers.get(targetUserId);

      if (targetSocketId) {
        console.log(`✅ Call answered`);
        io.to(targetSocketId).emit("call-answered", { answer });

        // Find and update call record
        const call = await Call.findOne({
          $or: [
            { caller: socket.userId, recipient: targetUserId },
            { caller: targetUserId, recipient: socket.userId },
          ],
          status: "ringing",
        }).sort({ createdAt: -1 });

        if (call) {
          await call.markAsAnswered();
        }
      }
    } catch (error) {
      console.error("Answer call error:", error);
    }
  });

  socket.on("end-call", async (data) => {
    try {
      const { targetUserId, duration } = data;
      const targetSocketId = activeUsers.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("call-ended");
      }

      console.log(`📴 Call ended: ${duration}s`);

      // Update call record
      const call = await Call.findOne({
        $or: [
          { caller: socket.userId, recipient: targetUserId },
          { caller: targetUserId, recipient: socket.userId },
        ],
        status: { $in: ["ringing", "answered"] },
      }).sort({ createdAt: -1 });

      if (call) {
        await call.markAsEnded(duration);

        // Update user call count
        const [caller, recipient] = await Promise.all([
          User.findById(call.caller),
          User.findById(call.recipient),
        ]);

        if (caller) await caller.updateActivity("call");
        if (recipient) await recipient.updateActivity("call");
      }
    } catch (error) {
      console.error("End call error:", error);
    }
  });

  socket.on("reject-call", async (data) => {
    try {
      const { targetUserId } = data;
      const targetSocketId = activeUsers.get(targetUserId);

      if (targetSocketId) {
        console.log(`❌ Call rejected`);
        io.to(targetSocketId).emit("call-rejected");
      }

      // Update call record
      const call = await Call.findOne({
        caller: targetUserId,
        recipient: socket.userId,
        status: "ringing",
      }).sort({ createdAt: -1 });

      if (call) {
        await call.markAsRejected();
      }
    } catch (error) {
      console.error("Reject call error:", error);
    }
  });

  // ICE candidate exchange
  socket.on("ice-candidate", (data) => {
    const { targetUserId, candidate } = data;
    const targetSocketId = activeUsers.get(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", { candidate });
    }
  });

  // User disconnect
  socket.on("disconnect", async () => {
    try {
      if (socket.userId) {
        const user = await User.findById(socket.userId);
        if (user) {
          await user.setOffline();
          activeUsers.delete(socket.userId);

          socket.broadcast.emit("user-offline", { id: socket.userId });
          console.log(`👋 User disconnected: ${user.username}`);
        }
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  });
});

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
