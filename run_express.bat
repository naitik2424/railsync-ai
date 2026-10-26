@echo off
title RailSync AI - Main Backend (Express + TypeScript)
echo ========================================================
echo Starting RailSync AI Main Express Backend Server...
echo URL: http://localhost:5000
echo Health Check: http://localhost:5000/health
echo ========================================================
cd /d "%~dp0server"
npm run dev
pause
