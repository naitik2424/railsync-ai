from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from backend.app.core.config import (
    PROJECT_NAME,
    VERSION,
    API_V1_PREFIX,
    CORS_ORIGINS
)
from backend.app.api.tasks import router as tasks_router
from backend.app.api.predictions import router as predictions_router
from backend.app.api.optimization import router as optimization_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.coordination import router as coordination_router
from backend.app.services.task_service import task_service
from backend.app.ml.train import train_and_save_model
from backend.app.core.config import MODEL_FILE


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure synthetic data and trained ML model are initialized
    print("=== RailSync AI Backend Starting Up ===")
    if not MODEL_FILE.exists():
        print("Training Random Forest delay prediction pipeline...")
        train_and_save_model()
    print("Initializing active maintenance tasks...")
    task_service.initialize()
    print("RailSync AI Backend Ready.")
    yield
    print("RailSync AI Backend Shutting Down.")


app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    description="AI-powered railway maintenance coordination and downtime optimization system. Uses Scikit-Learn for ML delay prediction and Google OR-Tools CP-SAT for schedule optimization.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(tasks_router, prefix=API_V1_PREFIX)
app.include_router(predictions_router, prefix=API_V1_PREFIX)
app.include_router(optimization_router, prefix=API_V1_PREFIX)
app.include_router(simulation_router, prefix=API_V1_PREFIX)
app.include_router(coordination_router, prefix=API_V1_PREFIX)


@app.get("/", tags=["Health & Info"])
def root():
    return {
        "system": "RailSync AI",
        "description": "Railway Maintenance Coordination & Downtime Optimization System",
        "version": VERSION,
        "status": "Operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "docs_url": "/docs",
        "disclaimer": "Hackathon prototype using synthetic operational data. Not connected to live railway signaling systems."
    }


@app.get("/health", tags=["Health & Info"])
def health():
    return {
        "status": "healthy",
        "tasks_count": len(task_service.get_all_tasks()),
        "model_loaded": MODEL_FILE.exists()
    }
