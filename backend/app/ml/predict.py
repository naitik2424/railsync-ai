import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from pathlib import Path

from backend.app.core.config import MODEL_FILE, METRICS_FILE
from backend.app.ml.train import train_and_save_model
from backend.app.ml.pipeline import ALL_FEATURE_COLUMNS


# Cached in-memory model
_CACHED_MODEL = None
_CACHED_METRICS = None


def get_model():
    """Returns the loaded trained pipeline, training it if not yet present."""
    global _CACHED_MODEL, _CACHED_METRICS
    if _CACHED_MODEL is not None:
        return _CACHED_MODEL
        
    if not MODEL_FILE.exists():
        print("Model file not found. Running training pipeline...")
        train_and_save_model()
        
    _CACHED_MODEL = joblib.load(MODEL_FILE)
    return _CACHED_MODEL


def get_model_metrics() -> Dict[str, Any]:
    """Returns the stored model evaluation metrics."""
    global _CACHED_METRICS
    if _CACHED_METRICS is not None:
        return _CACHED_METRICS
        
    if not METRICS_FILE.exists():
        train_and_save_model()
        
    with open(METRICS_FILE, "r", encoding="utf-8") as f:
        _CACHED_METRICS = json.load(f)
    return _CACHED_METRICS


def extract_features_from_task(task_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Safely maps an active MaintenanceTask or dictionary into the model's expected feature dict.
    Prevents leakage by ignoring any actual_duration fields.
    """
    resources = task_dict.get("resources", {})
    if isinstance(resources, dict):
        crew_size = task_dict.get("crew_size_allocated") or resources.get("crew_size", 4)
    else:
        crew_size = task_dict.get("crew_size_allocated") or getattr(resources, "crew_size", 4)
        
    if "crew_shortage_ratio" in task_dict and task_dict["crew_shortage_ratio"] is not None:
        crew_shortage = float(task_dict["crew_shortage_ratio"])
    else:
        crew_availability = task_dict.get("crew_availability_ratio", 1.0)
        crew_shortage = max(0.0, 1.0 - float(crew_availability))
    
    # Map section to historical delay rate default
    section = task_dict.get("section", "Section A-1 (Mainline North)")
    section_rates = {
        "Section A-1 (Mainline North)": 0.22,
        "Section A-2 (Junction Yard)": 0.38,
        "Section B-1 (Suburban Corridor)": 0.30,
        "Section B-2 (Freight Loop)": 0.24,
        "Section C-1 (Terminal Approaches)": 0.35,
    }
    hist_rate = task_dict.get("historical_section_delay_rate") or section_rates.get(section, 0.28)
    
    # Heuristic complexity score from maintenance type and priority
    m_type = task_dict.get("maintenance_type", "")
    priority = task_dict.get("priority", "Medium")
    
    if "complexity_score" in task_dict and task_dict["complexity_score"] is not None:
        complexity = int(task_dict["complexity_score"])
    else:
        complexity = 3
        if "Relaying" in m_type or "Interlocking" in m_type:
            complexity = 5 if priority == "Critical" else 4
        elif "Tamping" in m_type or "Power Block" in m_type:
            complexity = 3
        elif "Servicing" in m_type or "Overhaul" in m_type:
            complexity = 2
        
    dependencies = task_dict.get("dependencies", [])
    dep_count = task_dict.get("dependency_count") if "dependency_count" in task_dict else (len(dependencies) if isinstance(dependencies, list) else 0)
    
    is_night = task_dict.get("is_night_shift")
    if is_night is None:
        offset = task_dict.get("planned_start_offset_hours", 0)
        is_night = 1 if offset >= 20 or offset <= 5 else 0

    return {
        "department": task_dict.get("department", "Track"),
        "maintenance_type": m_type,
        "section": section,
        "planned_duration_hours": float(task_dict.get("planned_duration_hours", 3.0)),
        "complexity_score": complexity,
        "crew_experience_level": int(task_dict.get("crew_experience_level", 2)),
        "crew_size_allocated": int(crew_size),
        "crew_shortage_ratio": round(float(crew_shortage), 2),
        "equipment_age_years": int(task_dict.get("equipment_age_years", 6)),
        "weather_condition": task_dict.get("weather_condition", "Clear"),
        "is_night_shift": int(is_night),
        "dependency_count": int(dep_count),
        "historical_section_delay_rate": float(hist_rate)
    }


def identify_risk_factors(feature_dict: Dict[str, Any], prob: float) -> List[str]:
    """Generates human-readable, domain-specific explanations for the predicted risk."""
    factors = []
    
    if feature_dict.get("crew_shortage_ratio", 0) >= 0.25:
        shortage_pct = int(feature_dict["crew_shortage_ratio"] * 100)
        factors.append(f"Crew shortage of {shortage_pct}% below recommended staffing.")
        
    if feature_dict.get("complexity_score", 0) >= 4:
        factors.append(f"High task complexity score ({feature_dict['complexity_score']}/5) on primary corridor.")
        
    if feature_dict.get("dependency_count", 0) >= 2:
        factors.append(f"Multiple upstream task dependencies ({feature_dict['dependency_count']} prerequisites).")
        
    if feature_dict.get("weather_condition") in ["Rain", "Fog", "Severe Heat"]:
        factors.append(f"Adverse weather condition reported: {feature_dict['weather_condition']}.")
        
    if feature_dict.get("is_night_shift") == 1:
        factors.append("Night maintenance shift with restricted ambient visibility.")
        
    if feature_dict.get("historical_section_delay_rate", 0) >= 0.35:
        factors.append(f"Section historical delay rate is elevated ({int(feature_dict['historical_section_delay_rate']*100)}%).")
        
    if not factors:
        if prob > 0.5:
            factors.append("Aggregated operational friction from duration and track section congestion.")
        else:
            factors.append("Standard operating parameters and adequate crew allocation.")
            
    return factors


def predict_delay_for_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes real inference on a task using the trained Random Forest pipeline.
    Returns probability, categorical risk rating, confidence, and explanatory factors.
    """
    model = get_model()
    
    feature_dict = extract_features_from_task(task_data)
    df_input = pd.DataFrame([feature_dict])
    
    # Predict probability of delay
    prob = float(model.predict_proba(df_input)[0][1])
    prob = round(prob, 4)
    
    # Determine risk category
    if prob < 0.35:
        risk_level = "Low"
    elif prob < 0.60:
        risk_level = "Medium"
    elif prob < 0.80:
        risk_level = "High"
    else:
        risk_level = "Critical"
        
    will_delay = prob >= 0.50
    confidence = round(max(prob, 1.0 - prob), 3)
    
    factors = identify_risk_factors(feature_dict, prob)
    
    return {
        "task_id": task_data.get("id"),
        "delay_probability": prob,
        "will_delay": will_delay,
        "risk_level": risk_level,
        "top_risk_factors": factors,
        "confidence_score": confidence,
        "model_version": "RF-v1.0.0",
        "is_simulated_synthetic": True,
        "features_evaluated": feature_dict,
        "disclaimer": "Prediction generated using Scikit-Learn Random Forest trained on synthetic railway maintenance operations data for hackathon demonstration."
    }
