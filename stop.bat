@echo off
echo Stopping servers...
taskkill /FI "WindowTitle eq Backend*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Frontend*" /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
echo Done!
pause
