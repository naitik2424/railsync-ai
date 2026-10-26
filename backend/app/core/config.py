import os
from pathlib import Path

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
APP_DIR = BACKEND_DIR / "app"
DATA_DIR = BACKEND_DIR / "data"
ML_DIR = APP_DIR / "ml"
MODEL_DIR = ML_DIR / "artifacts"

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# File paths
HISTORICAL_DATA_CSV = DATA_DIR / "historical_maintenance.csv"
ACTIVE_TASKS_FILE = DATA_DIR / "active_tasks.json"
MODEL_FILE = MODEL_DIR / "delay_rf_model.joblib"
METRICS_FILE = MODEL_DIR / "model_metrics.json"

# App settings
PROJECT_NAME = "RailSync AI — Railway Maintenance Coordination & Downtime Optimization"
VERSION = "1.0.0"
API_V1_PREFIX = "/api"

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "*",
]
