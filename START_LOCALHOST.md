# 🚀 VoiceConnect - Localhost Development

## Quick Start (Fixed & Working!)

The app is now configured for easy localhost development.

### 1. Start Backend Server

```bash
cd server
npm run dev:simple
```

This starts the backend on `http://localhost:3001`

### 2. Start Frontend (in another terminal)

```bash
npm run dev
```

This starts the frontend on `http://localhost:5174`

### 3. Test the App

1. Open `http://localhost:5174` in your browser
2. Login with any username (e.g., "Alice")
3. Open another browser tab or incognito window
4. Login with a different username (e.g., "Bob")
5. You should see each other in the contacts list
6. Click "Call" to start a voice call!

## ⚠️ Important Notes for Localhost

- **WebRTC Limitation**: Voice calls work perfectly between tabs on the same computer
- **Microphone Access**: Browser will ask for microphone permission - click "Allow"
- **For Network Testing**: See the HTTPS setup guides in other files

## 🔧 Current Configuration

- **Frontend**: HTTP on port 5174
- **Backend**: HTTP on port 3001
- **Perfect for**: Localhost development and testing
- **Socket.io**: Real-time signaling working
- **WebRTC**: Peer-to-peer voice calls working

## ✅ Success Indicators

When everything works, you should see:

- ✅ Frontend loads without errors
- ✅ "Connected" badge in the dashboard
- ✅ Users appear in contacts when logged in from different tabs
- ✅ Voice calls connect between browser tabs

## 🐛 Quick Troubleshooting

**If frontend won't load:**

```bash
npm install
npm run dev
```

**If backend won't start:**

```bash
cd server
npm install
npm run dev:simple
```

**If voice calls don't work:**

- Check microphone permissions in browser
- Try in Chrome or Firefox
- Check browser console for errors

Happy coding! 🎉
