#!/bin/bash

echo "🚀 VoiceConnect - Production Ready App"
echo "====================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get local IP address
get_local_ip() {
    if command_exists ip; then
        ip route get 1 | awk '{print $7; exit}' 2>/dev/null
    elif command_exists ifconfig; then
        ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1
    else
        echo "localhost"
    fi
}

LOCAL_IP=$(get_local_ip)

echo "🔍 Detected local IP: $LOCAL_IP"

# Check if Node.js is installed
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found"

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if command_exists mongosh; then
    if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB not running. Attempting to start..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start mongodb-community
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo systemctl start mongod
        else
            echo "❌ Please start MongoDB manually:"
            echo "   Windows: net start MongoDB"
            echo "   macOS: brew services start mongodb-community"
            echo "   Linux: sudo systemctl start mongod"
            exit 1
        fi
    fi
else
    echo "⚠️  MongoDB not found. Please install MongoDB:"
    echo "   https://www.mongodb.com/try/download/community"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

echo "✅ Dependencies ready"

# Check if database has data
echo "🗄️  Checking database..."
cd server
HAS_DATA=$(node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceconnect')
  .then(() => mongoose.connection.db.listCollections().toArray())
  .then(collections => {
    console.log(collections.length > 0 ? 'true' : 'false');
    process.exit(0);
  })
  .catch(() => {
    console.log('false');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$HAS_DATA" != "true" ]; then
    echo "🌱 Database is empty. Seeding with sample data..."
    npm run seed
    if [ $? -ne 0 ]; then
        echo "❌ Failed to seed database"
        exit 1
    fi
else
    echo "✅ Database has data"
fi

cd ..

echo ""
echo "🎯 Starting VoiceConnect servers..."
echo ""

# Start backend server
echo "🗄️  Starting MongoDB backend server..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✨ VoiceConnect is ready!"
echo "======================"
echo ""
echo "📱 Access your app:"
echo "   🏠 Local:   http://localhost:5173"
echo "   🌐 Network: http://$LOCAL_IP:5173"
echo ""
echo "🗄️  Database: MongoDB (persistent data)"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "🧪 Sample users available:"
echo "   👤 Alice, Bob, Charlie, Diana, TestUser"
echo ""
echo "💬 Features:"
echo "   ✅ Real-time chat with notifications"
echo "   ✅ Voice calling with WebRTC"
echo "   ✅ Persistent user profiles"
echo "   ✅ Call and chat history"
echo ""
echo "🔔 Notifications:"
echo "   ✅ Chat message notifications"
echo "   ✅ Incoming call alerts"
echo "   ✅ Background notifications"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID
