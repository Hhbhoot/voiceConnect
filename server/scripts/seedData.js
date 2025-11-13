import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Call from "../models/Call.js";

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/voiceconnect";
    await mongoose.connect(mongoURI);
    console.log("📄 Connected to MongoDB for seeding");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  const users = [
    {
      username: "Alice",
      email: "alice@example.com",
      preferences: {
        notifications: true,
        sounds: true,
        micVolume: 85,
        speakerVolume: 90,
      },
    },
    {
      username: "Bob",
      email: "bob@example.com",
      preferences: {
        notifications: true,
        sounds: false,
        micVolume: 75,
        speakerVolume: 80,
      },
    },
    {
      username: "Charlie",
      email: "charlie@example.com",
      preferences: {
        notifications: false,
        sounds: true,
        micVolume: 90,
        speakerVolume: 95,
      },
    },
    {
      username: "Diana",
      email: "diana@example.com",
      preferences: {
        notifications: true,
        sounds: true,
        micVolume: 80,
        speakerVolume: 85,
      },
    },
    {
      username: "TestUser",
      preferences: {
        notifications: true,
        sounds: true,
        micVolume: 80,
        speakerVolume: 90,
      },
    },
  ];

  console.log("👥 Seeding users...");
  const createdUsers = [];

  for (const userData of users) {
    try {
      // Check if user already exists
      let user = await User.findByUsername(userData.username);
      if (!user) {
        user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${user.username}`);
      } else {
        console.log(`⚠️  User already exists: ${user.username}`);
      }
      createdUsers.push(user);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.username}:`, error);
    }
  }

  return createdUsers;
};

const seedMessages = async (users) => {
  if (users.length < 2) {
    console.log("⚠️  Need at least 2 users to seed messages");
    return;
  }

  console.log("💬 Seeding chat messages...");

  const messagePairs = [
    [users[0], users[1]], // Alice & Bob
    [users[0], users[2]], // Alice & Charlie
    [users[1], users[3]], // Bob & Diana
  ];

  const sampleMessages = [
    "Hey there! How are you doing?",
    "I'm good, thanks for asking!",
    "Want to hop on a call later?",
    "Sure, what time works for you?",
    "How about 3 PM?",
    "Perfect! Talk to you then.",
    "Thanks for the great conversation!",
    "Anytime! Let's catch up again soon.",
    "Did you see the new updates?",
    "Yes, they look amazing!",
  ];

  for (const [user1, user2] of messagePairs) {
    try {
      // Create conversation between two users
      const messageCount = Math.floor(Math.random() * 6) + 3; // 3-8 messages

      for (let i = 0; i < messageCount; i++) {
        const sender = i % 2 === 0 ? user1 : user2;
        const recipient = i % 2 === 0 ? user2 : user1;
        const content =
          sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

        const message = new Message({
          sender: sender._id,
          recipient: recipient._id,
          content,
          type: "text",
          status: Math.random() > 0.3 ? "read" : "delivered", // Most messages are read
          createdAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          ), // Within last 7 days
        });

        await message.save();
      }

      console.log(
        `✅ Created messages between ${user1.username} & ${user2.username}`,
      );
    } catch (error) {
      console.error(`❌ Error creating messages:`, error);
    }
  }
};

const seedCalls = async (users) => {
  if (users.length < 2) {
    console.log("⚠️  Need at least 2 users to seed calls");
    return;
  }

  console.log("📞 Seeding call history...");

  const callPairs = [
    [users[0], users[1]], // Alice & Bob
    [users[1], users[0]], // Bob calls Alice back
    [users[2], users[3]], // Charlie & Diana
    [users[0], users[3]], // Alice & Diana
  ];

  const callStatuses = ["answered", "missed", "rejected", "answered"];
  const durations = [0, 0, 0, 245, 567, 123, 890, 45]; // 0 for missed/rejected

  for (let i = 0; i < callPairs.length; i++) {
    try {
      const [caller, recipient] = callPairs[i];
      const status = callStatuses[i % callStatuses.length];
      const duration =
        status === "answered" ? durations[i % durations.length] : 0;

      const startedAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      );
      const answeredAt =
        status === "answered" ? new Date(startedAt.getTime() + 3000) : null;
      const endedAt =
        status === "answered"
          ? new Date(answeredAt.getTime() + duration * 1000)
          : new Date(startedAt.getTime() + 30000);

      const call = new Call({
        caller: caller._id,
        recipient: recipient._id,
        status,
        type: "voice",
        startedAt,
        answeredAt,
        endedAt,
        duration,
        quality:
          status === "answered"
            ? {
                rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
                issues: Math.random() > 0.8 ? ["audio"] : [],
              }
            : undefined,
      });

      await call.save();
      console.log(
        `✅ Created ${status} call: ${caller.username} → ${recipient.username}`,
      );
    } catch (error) {
      console.error(`❌ Error creating call:`, error);
    }
  }
};

const updateUserStats = async (users) => {
  console.log("📊 Updating user statistics...");

  for (const user of users) {
    try {
      // Count calls and messages for each user
      const [callCount, messageCount] = await Promise.all([
        Call.countDocuments({
          $or: [{ caller: user._id }, { recipient: user._id }],
        }),
        Message.countDocuments({
          $or: [{ sender: user._id }, { recipient: user._id }],
        }),
      ]);

      user.totalCalls = callCount;
      user.totalMessages = messageCount;
      await user.save();

      console.log(
        `✅ Updated stats for ${user.username}: ${callCount} calls, ${messageCount} messages`,
      );
    } catch (error) {
      console.error(`❌ Error updating stats for ${user.username}:`, error);
    }
  }
};

const seedData = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting database seeding...");
    console.log("================================");

    const users = await seedUsers();
    await seedMessages(users);
    await seedCalls(users);
    await updateUserStats(users);

    console.log("================================");
    console.log("🎉 Database seeding completed!");
    console.log(`👥 Users created: ${users.length}`);
    console.log(`💬 Sample conversations and calls added`);
    console.log("📊 User statistics updated");
    console.log("");
    console.log("🚀 You can now start the server with:");
    console.log("   npm run dev:mongodb");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("📄 Database connection closed");
    process.exit(0);
  }
};

// Run the seeding
seedData();
