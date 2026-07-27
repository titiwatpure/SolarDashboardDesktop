@echo off
echo ========================================
echo   Solar Dashboard - Starting All Services
echo ========================================

echo.
echo [1/2] Starting Backend (port 5000)...
start "Solar Backend" /min cmd /c "cd /d %~dp0backend && node src/index.js"

echo [2/2] Starting Frontend (port 3000)...
start "Solar Frontend" /min cmd /c "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo   Services are starting in background!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   Login:    admin / admin
echo ========================================
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000
