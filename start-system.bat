@echo off
title Online Bus Ticket System
cd /d "%~dp0"

echo ========================================================
echo   🚌 Starting SwiftBus Online Bus Ticket System...
echo ========================================================
echo.
echo Customer Portal : http://localhost:3000
echo Admin Portal    : http://localhost:3000/admin.html
echo Health Check    : http://localhost:3000/api/health
echo.
echo Auto-Detect Storage Engine:
echo   - 🍃 MongoDB (if service is running on localhost:27017)
echo   - ⚡ Local Persistent JSON Storage (zero-setup fallback)
echo ========================================================
echo.

start http://localhost:3000
node server.js
pause
