@echo off
title RailSync AI - Backend (FastAPI)
echo ========================================================
echo Starting RailSync AI Backend Server...
echo URL: http://127.0.0.1:8000
echo Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
cd /d "%~dp0"
python backend/run.py
pause
