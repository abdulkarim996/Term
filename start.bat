@echo off
echo.
echo ================================
echo   Student Dashboard - Startup
echo ================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

:: Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo [INFO] Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting dashboard...
echo [INFO] Open http://localhost:5173 in your browser
echo [INFO] On the same WiFi: http://[YOUR_LOCAL_IP]:5173
echo.

npm run dev

pause
