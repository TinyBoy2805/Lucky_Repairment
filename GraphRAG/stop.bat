@echo off
setlocal
title Lucky Repair - GraphRAG Stop
cd /d "%~dp0"

echo ============================================
echo  Stopping Lucky Repair - GraphRAG
echo ============================================
echo.

echo Stopping GraphRAG sidecar...
docker compose down --remove-orphans
if errorlevel 1 (
    echo Note: the sidecar may already be stopped.
)
echo.

echo Stopping Ollama...
powershell -NoProfile -Command "Get-Process 'ollama app','ollama','llama-server' -ErrorAction SilentlyContinue | Stop-Process -Force"
echo Ollama stopped.
echo.

echo GraphRAG is stopped.
echo Docker Desktop was left running. Use "docker desktop stop" if needed.
pause
endlocal
