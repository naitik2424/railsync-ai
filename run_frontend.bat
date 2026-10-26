@echo off
title RailSync AI - Frontend (React + Vite)
echo ========================================================
echo Starting RailSync AI Frontend Server...
echo URL: http://localhost:5173
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
