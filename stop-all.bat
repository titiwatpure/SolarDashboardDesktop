@echo off
echo ========================================
echo   Solar Dashboard - Stopping Services
echo ========================================

echo.
echo [1/2] Stopping Backend...
taskkill /FI "WINDOWTITLE eq Solar Backend*" /F >nul 2>&1

echo [2/2] Stopping Frontend...
taskkill /FI "WINDOWTITLE eq Solar Frontend*" /F >nul 2>&1

echo.
echo ========================================
echo   All services stopped!
echo ========================================
pause
