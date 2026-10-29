@echo off
setlocal
title Lucky Repair - GraphRAG
cd /d "%~dp0"

echo ============================================
echo  Lucky Repair - GraphRAG
echo ============================================
echo.

docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

echo Docker is not running. Starting Docker Desktop...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else (
    echo Docker Desktop was not found at the default path.
    echo Start Docker Desktop manually, then run this file again.
    pause
    exit /b 1
)

echo Waiting for Docker Desktop...
for /l %%i in (1,1,60) do (
    docker info >nul 2>&1
    if not errorlevel 1 goto docker_ready
    timeout /t 2 /nobreak >nul
)

echo Docker did not become ready in time.
pause
exit /b 1

:docker_ready
echo Docker is ready.
echo.

echo Starting Ollama (chat on GPU, embeddings on CPU)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-ollama.ps1"
if errorlevel 1 (
    echo Failed to start Ollama.
    pause
    exit /b 1
)
echo.

echo Starting GraphRAG sidecar...
docker compose up -d graphrag
if errorlevel 1 (
    echo Failed to start the GraphRAG sidecar.
    pause
    exit /b 1
)

echo.
echo Waiting for the sidecar...
timeout /t 6 /nobreak >nul
curl -s http://127.0.0.1:8000/health >nul 2>&1
if errorlevel 1 (
    echo Warning: the sidecar is not responding yet.
) else (
    echo Sidecar is ready.
)

echo.
echo GraphRAG is running:
echo   Chat       http://127.0.0.1:11434 (GPU)
echo   Embeddings http://127.0.0.1:11435 (CPU)
echo   Sidecar    http://127.0.0.1:8000
echo.
echo Use stop.bat to stop GraphRAG and Ollama.
pause
endlocal
