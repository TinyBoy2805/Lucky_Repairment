@echo off
title Lucky Repair - Dev Servers
cd /d "%~dp0"

echo Starting Server (port 3001)...
start "Server" cmd /k "cd /d Server && npm run dev"

echo Starting Client (port 5173)...
start "Client" cmd /k "cd /d Client && npm run dev"

echo.
echo Both servers starting...
echo Server:  http://localhost:3001
echo Client:  http://localhost:5173
echo.
pause