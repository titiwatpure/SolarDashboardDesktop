@echo off
echo ========================================
echo   Solar Dashboard - Starting...
echo ========================================

echo.
echo [1/3] Initializing database...
cd /d "%~dp0backend"
node src/init-db.cjs

echo.
echo [2/3] Starting Backend (port 5000)...
start "Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting Frontend (port 3000)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo ========================================
echo   Servers are starting!
echo   Open: http://localhost:3000
echo   Login: admin / admin
echo ========================================
pause
