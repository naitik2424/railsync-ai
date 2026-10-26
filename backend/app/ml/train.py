import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

from backend.app.core.config import (
    HISTORICAL_DATA_CSV,
    MODEL_FILE,
    METRICS_FILE,
    MODEL_DIR
)
from backend.app.ml.synthetic_data import generate_historical_dataset, save_synthetic_data_files
from backend.app.ml.pipeline import (
    build_ml_pipeline,
    ALL_FEATURE_COLUMNS,
    TARGET_COLUMN
)


def load_or_generate_dataset(force_regenerate: bool = False) -> pd.DataFrame:
    """Loads historical CSV dataset, generating it if it doesn't already exist or if forced."""
    if force_regenerate or not HISTORICAL_DATA_CSV.exists():
        print(f"Generating synthetic historical dataset at {HISTORICAL_DATA_CSV}...")
        save_synthetic_data_files()
    
    df = pd.read_csv(HISTORICAL_DATA_CSV)
    return df


def train_and_save_model(force_regenerate_data: bool = True) -> Dict[str, Any]:
    """
    Trains the Random Forest delay classification pipeline.
    Ensures strict prevention of target leakage:
    - Features: only planned properties, crew shortages, weather, dependencies, complexity.
    - Excluded: actual_duration_hours is NEVER in X.
    - Splits 80% train / 20% test stratified by is_delayed.
    - Compares vs baseline DummyClassifier.
    - Saves model and evaluation metrics to disk.
    """
    df = load_or_generate_dataset(force_regenerate=force_regenerate_data)
    
    # Feature matrix X and Target y
    X = df[ALL_FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].values
    
    # Train / Test split (80/20 stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Baseline comparison model (majority class classifier)
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train, y_train)
    dummy_pred = dummy.predict(X_test)
    baseline_acc = float(accuracy_score(y_test, dummy_pred))
    
    # Train ML Pipeline
    pipeline = build_ml_pipeline()
    pipeline.fit(X_train, y_train)
    
    # Evaluation on holdout test set
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    
    # Extract Feature Importances from RF inside Pipeline
    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]
    
    cat_names = preprocessor.named_transformers_["cat"].get_feature_names_out()
    num_names = pipeline.named_steps["preprocessor"].transformers[1][2]
    all_feature_names = list(cat_names) + list(num_names)
    
    importances = classifier.feature_importances_
    feature_imp_dict = {
        name: round(float(imp), 4)
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)[:12]
    }
    
    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "baseline_accuracy": round(baseline_acc, 4),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_type": "RandomForestClassifier(Pipeline)",
        "feature_importances": feature_imp_dict,
        "is_simulated_synthetic": True,
        "notes": "Trained on deterministic synthetic railway maintenance operations data. Prevents target leakage."
    }
    
    # Save artifacts
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_FILE)
    with open(METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"Model saved to {MODEL_FILE}")
    print(f"Metrics: Acc={acc:.3f}, F1={f1:.3f}, ROC-AUC={roc_auc:.3f} (Baseline Acc={baseline_acc:.3f})")
    return metrics


if __name__ == "__main__":
    train_and_save_model()
