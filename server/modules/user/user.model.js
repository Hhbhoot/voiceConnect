import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    avatar: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    socketId: {
      type: String,
      default: null,
    },
    // User preferences
    preferences: {
      notifications: {
        type: Boolean,
        default: true,
      },
      sounds: {
        type: Boolean,
        default: true,
      },
      micVolume: {
        type: Number,
        default: 80,
        min: 0,
        max: 100,
      },
      speakerVolume: {
        type: Number,
        default: 90,
        min: 0,
        max: 100,
      },
    },
    // Activity tracking
    totalCalls: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Indexes for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ lastSeen: -1 });

// Virtual for user's full profile
userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    joinedAt: this.joinedAt,
    totalCalls: this.totalCalls,
    totalMessages: this.totalMessages,
  };
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(user.password, 12);
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  // Convert _id to id for frontend compatibility
  userObject.id = userObject._id;
  delete userObject._id;

  // Remove sensitive data
  delete userObject.password;
  delete userObject.socketId;
  delete userObject.__v;

  return userObject;
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    gender: this.gender,
    online: this.isOnline,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    totalCalls: this.totalCalls,
    totalMessages: this.totalMessages,
    joinedAt: this.joinedAt,
  };
};

userSchema.methods.updateActivity = async function (type) {
  if (type === "call") {
    this.totalCalls += 1;
  } else if (type === "message") {
    this.totalMessages += 1;
  }
  this.lastSeen = new Date();
  await this.save();
};

userSchema.methods.setOnline = async function (socketId = null) {
  this.isOnline = true;
  this.lastSeen = new Date();
  this.socketId = socketId;
  await this.save();
};

userSchema.methods.setOffline = async function () {
  this.isOnline = false;
  this.lastSeen = new Date();
  this.socketId = null;
  await this.save();
};

// Static methods
userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username: new RegExp(`^${username}$`, "i") });
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: new RegExp(`^${email}$`, "i") });
};

userSchema.statics.getOnlineUsers = function () {
  return this.find({ isOnline: true }).select("-socketId");
};

userSchema.statics.getUserStats = async function (userId) {
  const user = await this.findById(userId);
  if (!user) return null;

  return {
    totalCalls: user.totalCalls,
    totalMessages: user.totalMessages,
    joinedAt: user.joinedAt,
    lastSeen: user.lastSeen,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
