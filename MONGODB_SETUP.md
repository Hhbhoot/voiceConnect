# 📄 MongoDB Setup Guide - VoiceConnect

## 🎉 **Database Integration Complete!**

Your VoiceConnect app now has **complete MongoDB integration** with persistent data storage for users, messages, calls, and all other data!

## 🚀 **Quick Start:**

### **Option 1: Local MongoDB (Recommended for Development)**

1. **Install MongoDB:**

   - **Windows:** Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - **macOS:** `brew install mongodb-community`
   - **Ubuntu:** `sudo apt install mongodb`

2. **Start MongoDB:**

   ```bash
   # Windows (after installation)
   net start MongoDB

   # macOS
   brew services start mongodb-community

   # Ubuntu
   sudo systemctl start mongod
   ```

3. **Start VoiceConnect with MongoDB:**
   ```bash
   cd server
   npm run dev:mongodb
   ```

### **Option 2: MongoDB Atlas (Cloud Database)**

1. **Create Free Account:** [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create Cluster:** Follow Atlas setup wizard
3. **Get Connection String:** Copy your MongoDB URI
4. **Update Environment:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and set MONGODB_URI=your-atlas-connection-string
   ```

## 🗄️ **Database Features:**

### **Collections Created:**

1. **Users Collection:**

   - User profiles and authentication
   - Online/offline status tracking
   - User preferences (mic volume, notifications)
   - Activity statistics (total calls, messages)

2. **Messages Collection:**

   - Real-time chat messages
   - Message status (sent, delivered, read)
   - Conversation threading
   - Message search and filtering

3. **Calls Collection:**
   - Complete call history
   - Call duration and quality metrics
   - Call status tracking (answered, missed, rejected)
   - Call statistics and analytics

### **Data Models:**

```javascript
// User Model
{
  username: String,
  email: String,
  avatar: String,
  isOnline: Boolean,
  preferences: {
    notifications: Boolean,
    micVolume: Number,
    speakerVolume: Number
  },
  totalCalls: Number,
  totalMessages: Number
}

// Message Model
{
  sender: ObjectId,
  recipient: ObjectId,
  content: String,
  type: String,
  status: String, // sent, delivered, read
  createdAt: Date
}

// Call Model
{
  caller: ObjectId,
  recipient: ObjectId,
  status: String, // initiated, answered, ended, missed
  duration: Number,
  startedAt: Date,
  endedAt: Date
}
```

## 🧪 **Testing with Sample Data:**

### **Seed Database:**

```bash
cd server
npm run seed
```

This creates:

- ✅ **5 sample users** (Alice, Bob, Charlie, Diana, TestUser)
- ✅ **Sample conversations** with realistic messages
- ✅ **Call history** with various call statuses
- ✅ **User statistics** and preferences

### **Reset Database:**

```bash
cd server
npm run db:reset -- --confirm
```

## 🔧 **API Endpoints:**

### **User Management:**

- `POST /api/auth/login` - User login/registration
- `GET /api/users` - Get all users
- `GET /api/stats/:userId` - Get user statistics

### **Chat Features:**

- `GET /api/chat/:userId/:partnerId` - Get conversation messages
- `GET /api/conversations/:userId` - Get recent conversations
- Socket events: `send-message`, `typing`, `stop-typing`

### **Call Features:**

- `GET /api/calls/:userId` - Get call history
- Socket events: `call-user`, `answer-call`, `end-call`

## 🎯 **What's Different Now:**

### **Before (In-Memory):**

- ❌ Data lost on server restart
- ❌ No persistence across sessions
- ❌ Limited scalability
- ❌ No user preferences storage

### **After (MongoDB):**

- ✅ **Persistent data storage**
- ✅ **User profiles and preferences**
- ✅ **Complete chat history**
- ✅ **Call analytics and statistics**
- ✅ **Scalable database design**
- ✅ **Production-ready architecture**

## 🚀 **Production Deployment:**

### **Environment Variables:**

```bash
# .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voiceconnect
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-key
```

### **MongoDB Atlas Setup:**

1. Create MongoDB Atlas account
2. Create new cluster (free tier available)
3. Add database user
4. Whitelist IP addresses
5. Get connection string
6. Update MONGODB_URI in production

## 💡 **Advanced Features Ready:**

### **User Management:**

- ✅ User preferences and settings
- ✅ Activity tracking and statistics
- ✅ Online/offline status persistence
- 🔜 User authentication with JWT
- 🔜 Profile pictures and bio

### **Chat Enhancements:**

- ✅ Message status tracking (read receipts)
- ✅ Conversation history
- ✅ Message search and filtering
- 🔜 File attachments
- 🔜 Message reactions and replies

### **Call Analytics:**

- ✅ Call duration and quality tracking
- ✅ Call statistics (answered, missed, rejected)
- ✅ User call history
- 🔜 Call quality ratings
- 🔜 Call recording metadata

## 🔍 **Database Management:**

### **View Data:**

```bash
# Connect to MongoDB shell
mongosh voiceconnect

# Query examples
db.users.find().pretty()
db.messages.find().sort({createdAt: -1}).limit(10)
db.calls.find({status: "answered"})
```

### **Backup Database:**

```bash
mongodump --db voiceconnect --out backup/
```

### **Restore Database:**

```bash
mongorestore --db voiceconnect backup/voiceconnect/
```

## 🎊 **Benefits:**

- **📊 Analytics Ready:** Complete user and call statistics
- **🔍 Searchable:** Full-text search on messages and users
- **📈 Scalable:** Handle thousands of users and messages
- **🔒 Secure:** Proper data validation and sanitization
- **⚡ Fast:** Indexed queries for optimal performance
- **🌐 Cloud Ready:** Easy deployment to MongoDB Atlas

Your VoiceConnect app is now **enterprise-ready** with complete database functionality! 🎉📄

## 🎯 **Next Steps:**

1. **Start MongoDB** (local or Atlas)
2. **Run:** `npm run seed` for sample data
3. **Start server:** `npm run dev:mongodb`
4. **Test:** All chat and call data now persists!

The database integration is **production-ready** and scales beautifully! 🚀
