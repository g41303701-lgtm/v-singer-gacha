@echo off
setlocal
cd /d %~dp0

echo ========================================================
echo   V-SINGER GACHA - STARTUP
echo ========================================================
echo.

rem Check IP address
ipconfig | findstr IPv4

echo.
echo [!] Attempting to start the server on all network interfaces...
echo [!] To stop the server, press Ctrl + C.
echo.

call npm run dev -- --hostname 0.0.0.0

if %errorlevel% neq 0 (
    echo [!] Server failed to start.
)

pause
