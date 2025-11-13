@echo off
echo VoiceConnect - Production Ready App
echo ====================================

REM Get local IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set LOCAL_IP=%%j
        goto :found_ip
    )
)
:found_ip

echo Detected local IP: %LOCAL_IP%

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Node.js found

REM Check MongoDB
echo Checking MongoDB connection...
mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
if errorlevel 1 (
    echo MongoDB not running. Please start MongoDB:
    echo    net start MongoDB
    pause
    exit /b 1
)
echo MongoDB is running

REM Install dependencies
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

if not exist "server\node_modules" (
    echo Installing backend dependencies...
    cd server
    npm install
    cd ..
)

echo Dependencies ready

REM Seed database if empty
echo Checking database...
cd server
npm run seed >nul 2>&1
cd ..

echo.
echo Starting VoiceConnect servers...
echo.

REM Start backend
echo Starting MongoDB backend server...
start /b cmd /c "cd server && npm run dev"

timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend server...
start /b cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo VoiceConnect is ready!
echo ======================
echo.
echo Access your app:
echo    Local:   http://localhost:5173
echo    Network: http://%LOCAL_IP%:5173
echo.
echo Database: MongoDB (persistent data)
echo Backend:  http://localhost:3001
echo.
echo Sample users available:
echo    Alice, Bob, Charlie, Diana, TestUser
echo.
echo Features:
echo    Real-time chat with notifications
echo    Voice calling with WebRTC
echo    Persistent user profiles
echo    Call and chat history
echo.
echo Notifications:
echo    Chat message notifications
echo    Incoming call alerts
echo    Background notifications
echo.
echo Press any key to stop all servers...
pause >nul

taskkill /f /im node.exe
