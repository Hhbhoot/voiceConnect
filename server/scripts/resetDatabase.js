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
    console.log("📄 Connected to MongoDB");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

const resetDatabase = async () => {
  try {
    await connectDB();

    console.log("🗑️  Resetting VoiceConnect Database...");
    console.log("=====================================");

    // Drop all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    for (const collection of collections) {
      try {
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`✅ Dropped collection: ${collection.name}`);
      } catch (error) {
        console.log(
          `⚠️  Collection ${collection.name} doesn't exist or already dropped`,
        );
      }
    }

    console.log("=====================================");
    console.log("🎉 Database reset completed!");
    console.log("");
    console.log("🌱 To seed with sample data, run:");
    console.log("   npm run seed");
    console.log("");
    console.log("🚀 To start fresh, run:");
    console.log("   npm run dev:mongodb");
  } catch (error) {
    console.error("❌ Reset failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("📄 Database connection closed");
    process.exit(0);
  }
};

// Confirmation prompt
const args = process.argv.slice(2);
if (args.includes("--confirm")) {
  resetDatabase();
} else {
  console.log(
    "⚠️  WARNING: This will delete all data in the VoiceConnect database!",
  );
  console.log("");
  console.log("To confirm reset, run:");
  console.log("   npm run db:reset -- --confirm");
  console.log("");
  console.log("Or manually:");
  console.log("   node scripts/resetDatabase.js --confirm");
  process.exit(0);
}
