from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.app.models.prediction import (
    DelayPredictionRequest,
    DelayPredictionResponse,
    ModelMetrics
)
from backend.app.ml.predict import (
    predict_delay_for_task,
    get_model_metrics
)
from backend.app.ml.train import train_and_save_model
from backend.app.services.task_service import task_service

router = APIRouter(prefix="/predictions", tags=["ML Delay Predictions"])


@router.post("/predict", response_model=DelayPredictionResponse)
def predict_delay(request: DelayPredictionRequest):
    """
    Predicts maintenance delay probability using the trained Random Forest classifier.
    Returns probability, categorical risk rating, confidence score, and top explanatory factors.
    """
    result = predict_delay_for_task(request.model_dump())
    return result


@router.get("/metrics", response_model=ModelMetrics)
def get_metrics():
    """
    Retrieves the evaluation metrics of the Random Forest pipeline:
    Accuracy, Precision, Recall, F1, ROC-AUC, comparison vs Dummy baseline, and feature importances.
    """
    metrics = get_model_metrics()
    return metrics


@router.post("/train", response_model=ModelMetrics)
def retrain_model():
    """
    Trigger training and evaluation of the Random Forest model on historical data.
    Evaluates against holdout test set and updates cached model.
    """
    metrics = train_and_save_model()
    # Refresh cache
    import backend.app.ml.predict as p_mod
    p_mod._CACHED_MODEL = None
    p_mod._CACHED_METRICS = None
    # Re-enrich active tasks
    task_service._enrich_with_ml_predictions()
    return metrics


@router.get("/batch-pending", response_model=List[Dict[str, Any]])
def get_pending_predictions():
    """
    Retrieves the latest ML predictions for all pending railway maintenance tasks.
    """
    tasks = task_service.get_all_tasks(status="Pending")
    results = []
    for t in tasks:
        results.append({
            "task_id": t["id"],
            "title": t["title"],
            "department": t["department"],
            "section": t["section"],
            "delay_probability": t.get("predicted_delay_probability", 0.25),
            "risk_level": t.get("risk_level", "Low"),
            "delay_factors": t.get("delay_factors", []),
            "priority": t.get("priority")
        })
    return results
