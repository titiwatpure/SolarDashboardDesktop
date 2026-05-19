@echo off
echo Stopping Solar Dashboard...
taskkill /F /IM "Solar Dashboard.exe" 2>nul
taskkill /F /IM electron.exe 2>nul
echo Done.
