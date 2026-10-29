@echo off
setlocal
title Lucky Repair - Server
cd /d "%~dp0"

if not exist "node_modules" (
    echo node_modules is missing.
    echo Run "npm install" in the Server folder first.
    pause
    exit /b 1
)

echo Starting Server on http://localhost:3001
echo Press Ctrl+C to stop.
echo.
npm run dev
pause
endlocal
