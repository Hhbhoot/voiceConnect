import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    // MongoDB connection string - you can customize this
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/voiceconnect";

    const conn = await mongoose.connect(mongoURI);

    console.log(`📄 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🔌 Mongoose disconnected from MongoDB");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("📄 MongoDB connection closed through app termination");
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log("💡 Make sure MongoDB is running:");
    console.log("   - Install: https://www.mongodb.com/try/download/community");
    console.log("   - Start: mongod");
    console.log(
      "   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas",
    );
    process.exit(1);
  }
};

export default connectDatabase;
