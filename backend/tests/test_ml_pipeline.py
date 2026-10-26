import pytest
import pandas as pd
from backend.app.ml.synthetic_data import generate_historical_dataset
from backend.app.ml.pipeline import ALL_FEATURE_COLUMNS, TARGET_COLUMN
from backend.app.ml.train import train_and_save_model
from backend.app.ml.predict import predict_delay_for_task, extract_features_from_task


def test_synthetic_data_generation():
    df = generate_historical_dataset(num_records=200, random_seed=42)
    assert len(df) == 200
    assert "is_delayed" in df.columns
    assert "actual_duration_hours" in df.columns
    assert "planned_duration_hours" in df.columns
    # Check that is_delayed has both classes 0 and 1
    assert set(df["is_delayed"].unique()) == {0, 1}


def test_no_target_leakage():
    """Ensure actual_duration_hours is strictly NOT in the feature columns used for training."""
    assert "actual_duration_hours" not in ALL_FEATURE_COLUMNS
    assert "is_delayed" not in ALL_FEATURE_COLUMNS
    assert TARGET_COLUMN == "is_delayed"


def test_model_training_and_metrics():
    metrics = train_and_save_model()
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics
    assert "roc_auc" in metrics
    assert "baseline_accuracy" in metrics
    assert metrics["roc_auc"] >= 0.70  # Model has real discriminatory power
    assert metrics["accuracy"] >= metrics["baseline_accuracy"]


def test_predict_delay_inference():
    sample_task = {
        "id": "TEST-TSK-01",
        "title": "Emergency Point Motor Replacement",
        "department": "Signalling & Telecommunications (S&T)",
        "section": "Section A-2 (Junction Yard)",
        "maintenance_type": "Point Machine Maintenance",
        "planned_duration_hours": 3.0,
        "priority": "Critical",
        "resources": {
            "crew_type": "Signal Engineers Group A",
            "crew_size": 4,
            "equipment": ["Point Machine Drive Calibrator"]
        },
        "crew_availability_ratio": 0.5,  # 50% crew deficit
        "weather_condition": "Rain",
        "dependencies": ["DEP-1", "DEP-2"]
    }
    
    result = predict_delay_for_task(sample_task)
    assert "delay_probability" in result
    assert 0.0 <= result["delay_probability"] <= 1.0
    assert result["risk_level"] in ["Low", "Medium", "High", "Critical"]
    assert len(result["top_risk_factors"]) > 0
    # Crew deficit + Rain + Dependencies should produce elevated risk
    assert result["delay_probability"] >= 0.40
    assert result["is_simulated_synthetic"] is True
