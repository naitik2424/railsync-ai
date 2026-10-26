@echo off
title RailSync AI - Unified System Launcher
echo ========================================================
echo Starting RailSync AI Architecture:
echo 1. Python AI/ML & OR-Tools Service (Port 8000)
echo 2. Express.js Main Backend Server (Port 5000)
echo 3. React + TypeScript + Vite Frontend (Port 5173)
echo ========================================================
cd /d "%~dp0"

echo [1/3] Launching Python AI/ML Microservice...
start "RailSync AI - Python ML (8000)" cmd /c "run_backend.bat"

timeout /t 3 /nobreak >nul

echo [2/3] Launching Express Main Backend...
start "RailSync AI - Express Backend (5000)" cmd /c "run_express.bat"

timeout /t 2 /nobreak >nul

echo [3/3] Launching React Frontend...
start "RailSync AI - React Frontend (5173)" cmd /c "run_frontend.bat"

echo.
echo ========================================================
echo RailSync AI is running!
echo - Python ML Service:  http://127.0.0.1:8000 (Swagger: /docs)
echo - Express Backend:    http://localhost:5000 (Health: /health)
echo - React Frontend:     http://localhost:5173
echo ========================================================
echo.
pause
