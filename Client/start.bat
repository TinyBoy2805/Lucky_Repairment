@echo off
setlocal
title Lucky Repair - Client
cd /d "%~dp0"

if not exist "node_modules" (
    echo node_modules is missing.
    echo Run "npm install" in the Client folder first.
    pause
    exit /b 1
)

echo Starting Client on http://localhost:5173
echo Press Ctrl+C to stop.
echo.
npm run dev
pause
endlocal
