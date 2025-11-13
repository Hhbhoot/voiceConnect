# 🔧 Fix Connection Issues - VoiceConnect

## 🚨 **Issue: Users Connecting & Disconnecting Immediately**

You're seeing this pattern in backend logs:

```
[0] User connected: dX3dwLGpny6laaH_AAAD
[0] User disconnected: dX3dwLGpny6laaH_AAAD
```

This means the frontend is trying to connect to Socket.io but failing.

## 🎯 **Root Cause**

The most likely cause is that **the backend server is not running** or not accessible.

## ✅ **Step-by-Step Fix:**

### **Step 1: Start Backend Server**

Open a new terminal and run:

```bash
cd server
npm run dev:simple
```

You should see:

```
🚀 VoiceConnect Backend Server running on:
   - Local:   http://localhost:3001
   - Network: http://[YOUR_IP]:3001
📡 Socket.io server ready for connections
🎯 API endpoints available at /api/*
```

### **Step 2: Verify Backend is Running**

Open your browser and go to: `http://localhost:3001`

You should see:

```json
{ "message": "VoiceConnect Backend Server is running!" }
```

### **Step 3: Check Frontend Connection**

1. Open the frontend: `http://localhost:5174`
2. Open browser developer tools (F12)
3. Login with any username
4. Check the Console tab for:
   - ✅ `🔌 Connecting to Socket.io server: http://localhost:3001`
   - ✅ `✅ Connected to server with ID: [socket-id]`
   - ✅ `🟢 Socket connected successfully`

### **Step 4: Look for the Green Badge**

In the Dashboard, you should see a green "Connected" badge in the header. If you see:

- 🔴 **Red "Disconnected"** - Backend not running
- 🟡 **Yellow "Checking..."** - Connection issues

## 🐛 **Common Issues & Fixes:**

### **Issue 1: Backend Not Starting**

```bash
cd server
npm install
npm run dev:simple
```

### **Issue 2: Port 3001 Already in Use**

Kill the process using port 3001:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

### **Issue 3: CORS Issues**

The backend is configured to allow all origins for development. If you still see CORS errors, restart both servers:

```bash
# Terminal 1: Backend
cd server
npm run dev:simple

# Terminal 2: Frontend
npm run dev
```

### **Issue 4: Socket.io Transport Issues**

The frontend now uses both WebSocket and polling transports for better compatibility.

## 🎉 **Success Indicators**

When everything works correctly:

1. **Backend logs show:**

   ```
   👤 User connected: [socket-id]
   📝 User joined: [username]
   ```

2. **Frontend shows:**

   - ✅ Green "Connected" badge
   - ✅ Users appear in contacts list
   - ✅ No console errors

3. **Test calls work:**
   - Open multiple tabs
   - Login with different usernames
   - See each other in contacts
   - Voice calls connect successfully

## 🚀 **Easy Startup Script**

Use the provided startup scripts:

**Windows:**

```cmd
start-localhost.bat
```

**macOS/Linux:**

```bash
./start-localhost.sh
```

These scripts will:

1. Install dependencies if needed
2. Start backend server
3. Start frontend server
4. Show you the correct URLs

## 💡 **Pro Tips**

1. **Always start backend first** before frontend
2. **Check browser console** for connection errors
3. **Use the BackendStatus component** - it shows when backend is offline
4. **Keep both terminals open** to see logs
5. **Restart both servers** if connection issues persist

Your VoiceConnect app should now connect properly and stop the connect/disconnect loop! 🎉
