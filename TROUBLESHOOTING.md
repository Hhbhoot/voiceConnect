# VoiceConnect Troubleshooting Guide

## 🎯 Quick Fix for Current Issues

The app has been fixed and is now working! Here's how to run it:

### ✅ **Fixed Issues:**

1. ✅ Missing `socket.io-client` dependency - INSTALLED
2. ✅ Wrong proxy port configuration - FIXED
3. ✅ HTTPS setup for WebRTC over IP - CONFIGURED
4. ✅ Dynamic IP configuration - IMPLEMENTED

### 🚀 **How to Run (Choose One):**

#### **Option 1: Simple Development (Recommended)**

```bash
# Windows
start-simple.bat

# macOS/Linux
./start-simple.sh
```

#### **Option 2: Manual Start**

```bash
# Terminal 1: Start backend (HTTP)
cd server
npm run dev:simple

# Terminal 2: Start frontend (HTTPS)
npm run dev
```

### 📱 **Access Your App:**

- **Local:** `https://localhost:5174`
- **Network:** `https://YOUR_IP:5174` (IP shown in terminal)

### 🔧 **Current Configuration:**

- **Frontend:** HTTPS on port 5174 (auto-assigned by Vite)
- **Backend:** HTTP on port 3001
- **Mixed Content:** Allowed for development
- **WebRTC:** Works over network with HTTPS frontend

---

## 🛠 Common Issues & Solutions

### Issue: "socket.io-client could not be resolved"

**Solution:**

```bash
npm install socket.io-client
```

### Issue: "Port already in use"

**Solution:** Vite automatically finds available ports. Check the terminal output for the actual port.

### Issue: "getUserMedia not allowed over HTTP"

**Solution:** Use HTTPS for frontend (already configured). WebRTC requires secure context over network.

### Issue: "Mixed content blocked"

**Solution:**

- For development: Modern browsers allow mixed content from localhost
- For production: Use HTTPS for both frontend and backend

### Issue: "SSL Certificate errors"

**Solution:**

1. Click "Advanced" in browser
2. Click "Proceed to localhost" or "Proceed to [IP]"
3. This is normal for self-signed development certificates

### Issue: "Can't connect from other devices"

**Solution:**

1. Make sure devices are on same WiFi network
2. Check firewall settings (allow ports 3001 and 5174)
3. Use the network IP address shown in terminal
4. Accept SSL certificate on each device

### Issue: "Microphone not working"

**Solution:**

1. Browser will ask for microphone permission
2. Click "Allow"
3. Check browser settings if permission was previously denied
4. HTTPS is required for microphone access over network

---

## 🧪 Testing Checklist

- [ ] Frontend loads at `https://localhost:5174`
- [ ] Backend responds at `http://localhost:3001`
- [ ] Can login with username
- [ ] Can see contacts list
- [ ] Socket connection established (check browser console)
- [ ] Can access from network IP on other devices
- [ ] Microphone permission granted
- [ ] Voice calls work between devices

---

## 🔍 Debug Commands

```bash
# Check if dependencies are installed
npm list socket.io-client

# Run type checking
npm run typecheck

# Build for production
npm run build

# Check if ports are available
# Windows: netstat -an | findstr :3001
# macOS/Linux: lsof -i :3001
```

---

## 📞 Support

If you're still having issues:

1. **Check Browser Console:** Look for error messages
2. **Check Network Tab:** Verify API calls are working
3. **Test WebRTC:** Visit https://test.webrtc.org/
4. **Verify Microphone:** Test at https://webcammictest.com/check-mic

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. ✅ Frontend loads without errors
2. ✅ "Connected" badge in the dashboard
3. ✅ Other users appear in contacts list
4. ✅ Voice calls connect successfully
5. ✅ No console errors related to WebRTC or Socket.io

**Happy voice calling! 🎤📞**
